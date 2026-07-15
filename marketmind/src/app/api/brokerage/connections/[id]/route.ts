import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getBrokerageProvider } from "@/lib/brokerage";
import { syncConnection } from "@/lib/brokerage/sync";
import { decryptJson } from "@/lib/crypto";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

async function ownedConnection(id: string, userId: string) {
  const conn = await prisma.brokerageConnection.findUnique({ where: { id } });
  if (!conn || conn.userId !== userId) return null;
  return conn;
}

/** POST — on-demand sync (rate-limited). */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const conn = await ownedConnection(params.id, session.user.id);
  if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  const rl = rateLimit(`sync:${session.user.id}`, 6, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Sync rate limit — retry in ${rl.retryAfterSec}s` }, { status: 429 });

  const result = await syncConnection(prisma, conn.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  const updated = await prisma.brokerageConnection.findUnique({
    where: { id: conn.id },
    select: { id: true, status: true, lastSyncAt: true, equity: true, cash: true, buyingPower: true },
  });
  return NextResponse.json({ ok: true, connection: updated });
}

/** DELETE — disconnect and delete all synced data (positions, orders, activity, snapshots). */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const conn = await ownedConnection(params.id, session.user.id);
  if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  try {
    const provider = getBrokerageProvider(conn.provider);
    await provider.revoke(decryptJson(conn.encryptedAuth));
  } catch (e) {
    console.error("provider revoke failed (deleting local data anyway):", e instanceof Error ? e.message : e);
  }
  // Cascade wipes positions, orders, activities, snapshots
  await prisma.brokerageConnection.delete({ where: { id: conn.id } });
  return NextResponse.json({ ok: true });
}
