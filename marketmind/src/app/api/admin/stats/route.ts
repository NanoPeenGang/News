import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const [totalUsers, usersByRole, totalSignals, openSignals, signalsByStatus, signalsBySetup, aiCalls, recentUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ["role"], _count: true }),
      prisma.signal.count(),
      prisma.signal.count({ where: { status: { in: ["WAITING", "ENTRY_ACTIVE", "TARGET1_HIT"] } } }),
      prisma.signal.groupBy({ by: ["status"], _count: true }),
      prisma.signal.groupBy({ by: ["setupType", "status"], _count: true }),
      prisma.aiAuditLog.count(),
      prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { email: true, name: true, role: true, createdAt: true } }),
    ]);

  // Hit rate by setup: (T1+T2 hits) / resolved
  const setups = new Map<string, { t1: number; t2: number; stopped: number; expired: number; open: number }>();
  for (const row of signalsBySetup) {
    const s = setups.get(row.setupType) ?? { t1: 0, t2: 0, stopped: 0, expired: 0, open: 0 };
    if (row.status === "TARGET1_HIT") s.t1 += row._count;
    else if (row.status === "TARGET2_HIT") s.t2 += row._count;
    else if (row.status === "STOPPED_OUT") s.stopped += row._count;
    else if (row.status === "EXPIRED") s.expired += row._count;
    else s.open += row._count;
    setups.set(row.setupType, s);
  }
  const setupPerformance = Array.from(setups.entries()).map(([setup, s]) => {
    // T1 is still "open" (may hit T2); count it as a hit for hit-rate purposes
    const resolved = s.t1 + s.t2 + s.stopped;
    return {
      setup,
      ...s,
      resolved,
      hitRate: resolved > 0 ? ((s.t1 + s.t2) / resolved) * 100 : null,
    };
  });

  let workerHealth: { ok: boolean; provider?: string; uptime?: number } = { ok: false };
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001"}/health`, { cache: "no-store" });
    if (res.ok) workerHealth = { ok: true, ...(await res.json()) };
  } catch {
    /* worker offline */
  }

  return NextResponse.json({
    users: { total: totalUsers, byRole: usersByRole.map((r) => ({ role: r.role, count: r._count })), recent: recentUsers },
    signals: {
      total: totalSignals,
      open: openSignals,
      byStatus: signalsByStatus.map((r) => ({ status: r.status, count: r._count })),
      setupPerformance,
    },
    ai: { auditLogCount: aiCalls },
    system: { worker: workerHealth, database: true, provider: process.env.MARKET_DATA_PROVIDER ?? "mock" },
  });
}
