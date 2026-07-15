import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getMarketDataProvider } from "@/lib/marketdata";
import { pivotLevels } from "@/lib/indicators";

export const dynamic = "force-dynamic";

/** Aggregated portfolio across all of the user's active connections. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const connections = await prisma.brokerageConnection.findMany({
    where: { userId: session.user.id, status: { not: "DISCONNECTED" } },
    include: {
      positions: true,
      snapshots: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (connections.length === 0) return NextResponse.json({ connected: false });

  const provider = getMarketDataProvider();
  const universe = await provider.getUniverse();
  const sectorMap = new Map(universe.map((s) => [s.symbol, s.sector]));

  // Merge positions across connections
  const merged = new Map<string, { symbol: string; quantity: number; costTotal: number }>();
  for (const conn of connections) {
    for (const p of conn.positions) {
      const m = merged.get(p.symbol) ?? { symbol: p.symbol, quantity: 0, costTotal: 0 };
      m.quantity += p.quantity;
      m.costTotal += p.quantity * p.avgCost;
      merged.set(p.symbol, m);
    }
  }
  const symbols = Array.from(merged.keys());
  const quotes = symbols.length ? await provider.getQuotes(symbols) : [];
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

  const positions = await Promise.all(
    Array.from(merged.values()).map(async (m) => {
      const q = quoteMap.get(m.symbol);
      const price = q?.price ?? m.costTotal / m.quantity;
      const avgCost = m.costTotal / m.quantity;
      // Distance from AI-detected support/resistance (pivot levels on 5min bars)
      let support: number | null = null;
      let resistance: number | null = null;
      try {
        const bars = await provider.getBars(m.symbol, "5min", 300);
        if (bars.length >= 60) {
          const lv = pivotLevels(bars);
          support = lv.supports[lv.supports.length - 1] ?? null;
          resistance = lv.resistances[0] ?? null;
        }
      } catch {
        /* levels are best-effort */
      }
      return {
        symbol: m.symbol,
        sector: sectorMap.get(m.symbol) ?? "Other",
        quantity: m.quantity,
        avgCost,
        price,
        dayChangePercent: q?.changePercent ?? 0,
        marketValue: m.quantity * price,
        unrealizedPnl: (price - avgCost) * m.quantity,
        unrealizedPnlPercent: avgCost > 0 ? ((price - avgCost) / avgCost) * 100 : 0,
        dayPnl: q ? (q.price - q.prevClose) * m.quantity : 0,
        support,
        resistance,
        supportDistPercent: support ? ((price - support) / price) * 100 : null,
        resistanceDistPercent: resistance ? ((resistance - price) / price) * 100 : null,
      };
    })
  );

  const cash = connections.reduce((a, c) => a + c.cash, 0);
  const buyingPower = connections.reduce((a, c) => a + c.buyingPower, 0);
  const marketValue = positions.reduce((a, p) => a + p.marketValue, 0);
  const equity = cash + marketValue;
  const totalPnl = positions.reduce((a, p) => a + p.unrealizedPnl, 0);
  const dayPnl = positions.reduce((a, p) => a + p.dayPnl, 0);

  positions.sort((a, b) => b.marketValue - a.marketValue);
  const withWeights = positions.map((p) => ({ ...p, weightPercent: equity > 0 ? (p.marketValue / equity) * 100 : 0 }));

  // Sector allocation (cash counted as its own slice)
  const sectors = new Map<string, number>();
  for (const p of withWeights) sectors.set(p.sector, (sectors.get(p.sector) ?? 0) + p.marketValue);
  if (cash > 0) sectors.set("Cash", cash);
  const allocation = Array.from(sectors.entries())
    .map(([sector, value]) => ({ sector, value, percent: equity > 0 ? (value / equity) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  // Merge equity-curve snapshots across connections by summing per timestamp bucket
  const curve = connections
    .flatMap((c) => c.snapshots)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((s) => ({ time: s.createdAt.toISOString(), equity: s.equity }));

  const lastSyncAt = connections.reduce<Date | null>(
    (latest, c) => (c.lastSyncAt && (!latest || c.lastSyncAt > latest) ? c.lastSyncAt : latest),
    null
  );

  return NextResponse.json({
    connected: true,
    summary: { equity, cash, buyingPower, marketValue, totalPnl, dayPnl, lastSyncAt },
    positions: withWeights,
    allocation,
    curve,
    connections: connections.map((c) => ({
      id: c.id, provider: c.provider, institution: c.institution, accountMask: c.accountMask,
      status: c.status, supportsTrading: c.supportsTrading, lastSyncAt: c.lastSyncAt,
    })),
  });
}
