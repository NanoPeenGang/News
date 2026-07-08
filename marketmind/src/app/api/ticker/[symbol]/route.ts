import { NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/marketdata";
import { computeSnapshot } from "@/lib/indicators";
import { currentSessionBars } from "@/lib/scanner";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  if (!/^[A-Z.]{1,10}$/.test(symbol)) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });

  const provider = getMarketDataProvider();
  const [quote, bars, universe, signals] = await Promise.all([
    provider.getQuote(symbol),
    provider.getBars(symbol, "5min", 400),
    provider.getUniverse(),
    prisma.signal.findMany({ where: { symbol }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const snapshot = bars.length >= 60
    ? computeSnapshot(bars, currentSessionBars(bars), {
        prevClose: quote.prevClose, open: quote.open, volume: quote.volume, avgVolume: quote.avgVolume,
      })
    : null;
  const info = universe.find((s) => s.symbol === symbol) ?? { symbol, name: symbol, sector: "—" };
  return NextResponse.json({ quote, snapshot, info, signals });
}
