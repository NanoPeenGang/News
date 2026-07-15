import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, TIER_LIMITS } from "@/lib/auth";
import { liveTradingEnabled } from "@/lib/brokerage";
import { todaysRealizedPnl } from "@/lib/brokerage/sync";

export const dynamic = "force-dynamic";

/** Everything the UI needs to decide whether "Trade this setup" is available. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const flagEnabled = liveTradingEnabled();
  const premium = TIER_LIMITS[session.user.role].realtimeSignals;
  const connection = await prisma.brokerageConnection.findFirst({
    where: { userId: session.user.id, status: "ACTIVE", supportsTrading: true },
    select: { id: true, institution: true, accountMask: true, cash: true, buyingPower: true, equity: true },
  });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { maxDailyLoss: true } });
  const todayPnl = await todaysRealizedPnl(prisma, session.user.id);
  const lossGuardTripped = user?.maxDailyLoss != null && todayPnl <= -user.maxDailyLoss;

  return NextResponse.json({
    enabled: flagEnabled && premium && !!connection && !lossGuardTripped,
    flagEnabled,
    premium,
    connection,
    maxDailyLoss: user?.maxDailyLoss ?? null,
    todayRealizedPnl: todayPnl,
    lossGuardTripped,
    reason: !flagEnabled
      ? "Live trading is disabled on this deployment (ENABLE_LIVE_TRADING)"
      : !premium
        ? "Live order placement is a Premium feature"
        : !connection
          ? "No active trading-capable brokerage connection"
          : lossGuardTripped
            ? `Daily loss limit reached (${todayPnl.toFixed(2)} vs -${user?.maxDailyLoss?.toFixed(2)}). Orders unlock tomorrow — use the time to review your journal.`
            : null,
  });
}
