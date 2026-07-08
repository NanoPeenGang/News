import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, TIER_LIMITS } from "@/lib/auth";
import { generateCoachingReport } from "@/lib/ai";
import { fmtMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const reports = await prisma.coachingReport.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return NextResponse.json({ reports });
}

/** POST generates a fresh coaching report from the user's journal. */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!TIER_LIMITS[session.user.role].coachingReports) {
    return NextResponse.json({ error: "AI coaching reports are a Premium feature.", upgrade: true }, { status: 403 });
  }

  const entries = await prisma.journalEntry.findMany({
    where: { userId: session.user.id, closedAt: { not: null } },
    orderBy: { closedAt: "desc" },
    take: 100,
  });
  if (entries.length === 0) {
    return NextResponse.json({ error: "Close at least one journaled trade first — the coach needs data to review." }, { status: 400 });
  }

  const wins = entries.filter((e) => (e.pnl ?? 0) > 0);
  const losses = entries.filter((e) => (e.pnl ?? 0) <= 0);
  const totalPnl = entries.reduce((a, e) => a + (e.pnl ?? 0), 0);
  const rValues = entries.map((e) => e.rMultiple).filter((r): r is number => r !== null);
  const avgR = rValues.length ? rValues.reduce((a, b) => a + b, 0) / rValues.length : null;
  const grossWin = wins.reduce((a, e) => a + (e.pnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((a, e) => a + (e.pnl ?? 0), 0));
  const mistakes = entries.flatMap((e) => (e.mistakes ? e.mistakes.split(",").map((m) => m.trim()) : []));
  const mistakeCounts = mistakes.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m]: (acc[m] ?? 0) + 1 }), {});

  const stats = {
    trades: entries.length,
    winRate: entries.length ? (wins.length / entries.length) * 100 : 0,
    totalPnl,
    avgR,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    mistakeCounts,
  };

  const summary = `Closed trades: ${stats.trades}
Win rate: ${stats.winRate.toFixed(1)}%
Total P&L: ${fmtMoney(totalPnl)}
Average R multiple: ${avgR !== null ? avgR.toFixed(2) : "n/a (no stops logged)"}
Profit factor: ${stats.profitFactor !== null ? stats.profitFactor?.toFixed(2) : "n/a"}
Rule-violation tags: ${Object.entries(mistakeCounts).map(([m, c]) => `${m} x${c}`).join(", ") || "none tagged"}
Recent trades: ${entries.slice(0, 15).map((e) => `${e.symbol} ${e.side} ${e.rMultiple !== null ? `${e.rMultiple.toFixed(1)}R` : fmtMoney(e.pnl ?? 0)}${e.mistakes ? ` [${e.mistakes}]` : ""}`).join("; ")}`;

  const content = await generateCoachingReport(summary, session.user.id);
  const report = await prisma.coachingReport.create({
    data: { userId: session.user.id, content, stats },
  });
  return NextResponse.json({ report });
}
