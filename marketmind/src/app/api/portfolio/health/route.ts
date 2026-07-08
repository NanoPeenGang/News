import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generatePortfolioHealth } from "@/lib/ai";
import { getMarketDataProvider } from "@/lib/marketdata";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** POST — AI Portfolio Health review over the user's synced holdings. */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rl = rateLimit(`health:${session.user.id}`, 4, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Rate limit — retry in ${rl.retryAfterSec}s` }, { status: 429 });

  const [user, connections] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { riskProfile: true } }),
    prisma.brokerageConnection.findMany({
      where: { userId: session.user.id, status: { not: "DISCONNECTED" } },
      include: { positions: true },
    }),
  ]);
  const positions = connections.flatMap((c) => c.positions);
  if (positions.length === 0) {
    return NextResponse.json({ error: "No synced holdings yet — connect a brokerage and sync first." }, { status: 400 });
  }

  const provider = getMarketDataProvider();
  const universe = await provider.getUniverse();
  const sectorMap = new Map(universe.map((s) => [s.symbol, s.sector]));
  const quotes = await provider.getQuotes(positions.map((p) => p.symbol));
  const priceMap = new Map(quotes.map((q) => [q.symbol, q.price]));

  const cash = connections.reduce((a, c) => a + c.cash, 0);
  const rows = positions.map((p) => {
    const price = priceMap.get(p.symbol) ?? p.avgCost;
    return {
      symbol: p.symbol,
      sector: sectorMap.get(p.symbol) ?? "Other",
      value: p.quantity * price,
      unrealizedPnlPercent: p.avgCost > 0 ? ((price - p.avgCost) / p.avgCost) * 100 : 0,
    };
  });
  const equity = cash + rows.reduce((a, r) => a + r.value, 0);
  const sectors = new Map<string, number>();
  for (const r of rows) sectors.set(r.sector, (sectors.get(r.sector) ?? 0) + r.value);

  const content = await generatePortfolioHealth(
    {
      riskProfile: user?.riskProfile ?? null,
      equity,
      cashPercent: equity > 0 ? (cash / equity) * 100 : 0,
      positions: rows
        .map((r) => ({
          symbol: r.symbol,
          sector: r.sector,
          weightPercent: equity > 0 ? (r.value / equity) * 100 : 0,
          unrealizedPnlPercent: r.unrealizedPnlPercent,
        }))
        .sort((a, b) => b.weightPercent - a.weightPercent),
      sectorWeights: Array.from(sectors.entries())
        .map(([sector, value]) => ({ sector, percent: equity > 0 ? (value / equity) * 100 : 0 }))
        .sort((a, b) => b.percent - a.percent),
    },
    session.user.id
  );
  return NextResponse.json({ review: content });
}
