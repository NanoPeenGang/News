import { NextResponse } from "next/server";
import { getMarketDataProvider, BarInterval } from "@/lib/marketdata";

export const dynamic = "force-dynamic";

const INTERVALS: BarInterval[] = ["1min", "5min", "15min", "1day"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "").toUpperCase();
  if (!/^[A-Z.]{1,10}$/.test(symbol)) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  const interval = (searchParams.get("interval") ?? "5min") as BarInterval;
  if (!INTERVALS.includes(interval)) return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "300"), 10), 1000);
  const bars = await getMarketDataProvider().getBars(symbol, interval, limit);
  return NextResponse.json({ bars });
}
