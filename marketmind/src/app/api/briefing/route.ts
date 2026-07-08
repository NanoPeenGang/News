import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBriefing } from "@/lib/ai";
import { getMarketDataProvider } from "@/lib/marketdata";
import { SETUP_LABELS, fmtPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session = (searchParams.get("session") === "postmarket" ? "postmarket" : "premarket") as "premarket" | "postmarket";
  const date = new Date().toISOString().slice(0, 10);

  const cached = await prisma.dailyBriefing.findUnique({ where: { date_session: { date, session } } });
  if (cached) return NextResponse.json({ briefing: cached.content, date, session, cached: true });

  // Assemble market summary from live data + top open signals
  const provider = getMarketDataProvider();
  const universe = await provider.getUniverse();
  const quotes = await provider.getQuotes(universe.map((s) => s.symbol));
  const bySector = new Map<string, number[]>();
  for (const q of quotes) {
    const info = universe.find((s) => s.symbol === q.symbol);
    if (!info) continue;
    const arr = bySector.get(info.sector) ?? [];
    arr.push(q.changePercent);
    bySector.set(info.sector, arr);
  }
  const sectorLines = Array.from(bySector.entries())
    .map(([sector, moves]) => ({ sector, avg: moves.reduce((a, b) => a + b, 0) / moves.length }))
    .sort((a, b) => b.avg - a.avg)
    .map((s) => `${s.sector}: ${fmtPercent(s.avg)}`);

  const topSignals = await prisma.signal.findMany({
    where: { status: { in: ["WAITING", "ENTRY_ACTIVE"] } },
    orderBy: { confidence: "desc" },
    take: 5,
  });
  const spy = quotes.find((q) => q.symbol === "SPY");
  const qqq = quotes.find((q) => q.symbol === "QQQ");

  const summary = `**Index tape:** SPY ${spy ? fmtPercent(spy.changePercent) : "n/a"}, QQQ ${qqq ? fmtPercent(qqq.changePercent) : "n/a"}

**Sector moves (avg):**
${sectorLines.map((l) => `- ${l}`).join("\n")}

**Top setups on watch:**
${topSignals.length ? topSignals.map((s) => `- ${s.symbol} — ${SETUP_LABELS[s.setupType]} (${s.direction}, conditions score ${s.confidence})`).join("\n") : "- Scanner has no open setups right now."}`;

  const content = await generateBriefing(session, summary);
  await prisma.dailyBriefing.upsert({
    where: { date_session: { date, session } },
    update: { content },
    create: { date, session, content },
  });
  return NextResponse.json({ briefing: content, date, session, cached: false });
}
