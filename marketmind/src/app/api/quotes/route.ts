import { NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/marketdata";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z.]{1,10}$/.test(s))
    .slice(0, 100);
  if (symbols.length === 0) {
    const universe = await getMarketDataProvider().getUniverse();
    return NextResponse.json({ universe });
  }
  const quotes = await getMarketDataProvider().getQuotes(symbols);
  return NextResponse.json({ quotes });
}
