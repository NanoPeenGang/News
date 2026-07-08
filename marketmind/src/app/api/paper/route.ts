import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getMarketDataProvider } from "@/lib/marketdata";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let account = await prisma.paperAccount.findUnique({
    where: { userId: session.user.id },
    include: { positions: true, trades: { orderBy: { createdAt: "desc" }, take: 100 } },
  });
  if (!account) {
    account = await prisma.paperAccount.create({
      data: { userId: session.user.id },
      include: { positions: true, trades: true },
    });
  }

  // Mark positions to market
  const symbols = account.positions.map((p) => p.symbol);
  const quotes = symbols.length ? await getMarketDataProvider().getQuotes(symbols) : [];
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q.price]));
  const positions = account.positions.map((p) => {
    const last = quoteMap.get(p.symbol) ?? p.avgPrice;
    return { ...p, last, marketValue: p.quantity * last, unrealizedPnl: (last - p.avgPrice) * p.quantity };
  });
  const equity = account.cash + positions.reduce((a, p) => a + p.marketValue, 0);

  // Performance stats from closed (realized) trades
  const realized = account.trades.filter((t) => t.pnl !== null);
  const wins = realized.filter((t) => (t.pnl ?? 0) > 0);
  const grossWin = wins.reduce((a, t) => a + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(realized.filter((t) => (t.pnl ?? 0) <= 0).reduce((a, t) => a + (t.pnl ?? 0), 0));

  // Equity curve from trade history (realized pnl cumulative)
  const curve: { time: string; equity: number }[] = [];
  let eq = account.startBalance;
  for (const t of [...account.trades].reverse()) {
    if (t.pnl !== null) {
      eq += t.pnl;
      curve.push({ time: t.createdAt.toISOString(), equity: eq });
    }
  }

  return NextResponse.json({
    account: { id: account.id, cash: account.cash, startBalance: account.startBalance, equity },
    positions,
    trades: account.trades,
    stats: {
      totalReturn: ((equity - account.startBalance) / account.startBalance) * 100,
      realizedTrades: realized.length,
      winRate: realized.length ? (wins.length / realized.length) * 100 : null,
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
      curve,
    },
  });
}
