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

  // --- Real-trading behavior analysis (synced brokerage trades included) ---
  const realTrades = entries.filter((e) => e.source === "brokerage");
  const chronological = [...entries].sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());

  // Revenge pattern: opening a new trade within 30 min of closing a loser
  let revengeCount = 0;
  for (const e of chronological) {
    const priorLoss = chronological.find(
      (p) =>
        p.id !== e.id &&
        p.closedAt &&
        (p.pnl ?? 0) < 0 &&
        e.openedAt.getTime() - p.closedAt.getTime() > 0 &&
        e.openedAt.getTime() - p.closedAt.getTime() < 30 * 60_000
    );
    if (priorLoss) revengeCount++;
  }

  // Overtrading: trades per active day
  const dayKeys = new Set(chronological.map((e) => e.openedAt.toISOString().slice(0, 10)));
  const tradesPerDay = dayKeys.size ? entries.length / dayKeys.size : 0;

  // Sizing consistency vs the risk calculator's constant-dollar-risk model:
  // dollar risk (|entry-stop| * qty) should be roughly constant across trades
  const dollarRisks = entries
    .filter((e) => e.stopLoss)
    .map((e) => Math.abs(e.entryPrice - (e.stopLoss as number)) * e.quantity);
  let sizingConsistency: string = "n/a (no stops logged)";
  if (dollarRisks.length >= 3) {
    const mean = dollarRisks.reduce((a, b) => a + b, 0) / dollarRisks.length;
    const cv = Math.sqrt(dollarRisks.reduce((a, v) => a + (v - mean) ** 2, 0) / dollarRisks.length) / mean;
    sizingConsistency = `${cv < 0.35 ? "consistent" : cv < 0.75 ? "uneven" : "erratic"} (risk per trade varies ${(cv * 100).toFixed(0)}% around a $${mean.toFixed(0)} average)`;
  }

  const stats = {
    trades: entries.length,
    realBrokerageTrades: realTrades.length,
    winRate: entries.length ? (wins.length / entries.length) * 100 : 0,
    totalPnl,
    avgR,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    mistakeCounts,
    revengeCount,
    tradesPerDay,
  };

  const summary = `Closed trades: ${stats.trades} (${realTrades.length} synced from a real brokerage account, ${entries.length - realTrades.length} manually journaled)
Win rate: ${stats.winRate.toFixed(1)}%
Total P&L: ${fmtMoney(totalPnl)}
Average R multiple: ${avgR !== null ? avgR.toFixed(2) : "n/a (no stops logged)"}
Profit factor: ${stats.profitFactor !== null ? stats.profitFactor?.toFixed(2) : "n/a"}
Rule-violation tags: ${Object.entries(mistakeCounts).map(([m, c]) => `${m} x${c}`).join(", ") || "none tagged"}
Possible revenge trades (opened <30min after a loss): ${revengeCount}
Trading frequency: ${tradesPerDay.toFixed(1)} trades per active day${tradesPerDay > 5 ? " (high — check for overtrading)" : ""}
Position-sizing consistency vs constant-dollar-risk model: ${sizingConsistency}
Recent trades: ${entries.slice(0, 15).map((e) => `${e.symbol} ${e.side} ${e.rMultiple !== null ? `${e.rMultiple.toFixed(1)}R` : fmtMoney(e.pnl ?? 0)}${e.source === "brokerage" ? " (real)" : ""}${e.mistakes ? ` [${e.mistakes}]` : ""}`).join("; ")}`;

  const content = await generateCoachingReport(summary, session.user.id);
  const report = await prisma.coachingReport.create({
    data: { userId: session.user.id, content, stats },
  });
  return NextResponse.json({ report });
}
