import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth, TIER_LIMITS } from "@/lib/auth";
import { getBrokerageProvider, liveTradingEnabled, BrokerageError } from "@/lib/brokerage";
import { syncConnection, todaysRealizedPnl } from "@/lib/brokerage/sync";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** GET — the user's order audit log. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const orders = await prisma.brokerageOrder.findMany({
    where: { userId: session.user.id },
    orderBy: { placedAt: "desc" },
    take: 100,
    include: { connection: { select: { institution: true, accountMask: true } } },
  });
  return NextResponse.json({ orders });
}

const orderSchema = z.object({
  connectionId: z.string(),
  symbol: z.string().regex(/^[A-Za-z.]{1,10}$/),
  side: z.enum(["BUY", "SELL"]),
  orderType: z.enum(["LIMIT", "MARKET"]),
  quantity: z.number().positive().max(100_000),
  limitPrice: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  signalId: z.string().optional(),
  idempotencyKey: z.string().min(8).max(64),
  /** Explicit confirmation from the review step — orders without it are rejected. */
  confirmed: z.literal(true),
});

/**
 * POST — place a live order. Hard rules enforced server-side:
 * feature flag, premium tier, explicit confirmation, daily loss guard,
 * rate limit, idempotency. Orders originate ONLY from this user-driven
 * endpoint — the scanner and AI have no code path to it.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  if (!liveTradingEnabled()) {
    return NextResponse.json({ error: "Live trading is disabled on this deployment (ENABLE_LIVE_TRADING=false)" }, { status: 403 });
  }
  if (!TIER_LIMITS[session.user.role].realtimeSignals) {
    return NextResponse.json({ error: "Live order placement is a Premium feature", upgrade: true }, { status: 403 });
  }

  const parsed = orderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order — every order requires the review-and-confirm step" }, { status: 400 });
  }
  const body = parsed.data;
  const symbol = body.symbol.toUpperCase();

  const rl = rateLimit(`order:${session.user.id}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Order rate limit — retry in ${rl.retryAfterSec}s` }, { status: 429 });

  // Daily loss guard
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { maxDailyLoss: true } });
  if (user?.maxDailyLoss != null) {
    const todayPnl = await todaysRealizedPnl(prisma, session.user.id);
    if (todayPnl <= -user.maxDailyLoss) {
      return NextResponse.json(
        { error: `Daily loss limit reached ($${Math.abs(todayPnl).toFixed(2)} ≥ $${user.maxDailyLoss.toFixed(2)}). Orders are locked until tomorrow — step away, review the journal, come back fresh.`, lossGuard: true },
        { status: 423 }
      );
    }
  }

  const conn = await prisma.brokerageConnection.findUnique({ where: { id: body.connectionId } });
  if (!conn || conn.userId !== session.user.id || conn.status !== "ACTIVE") {
    return NextResponse.json({ error: "Active brokerage connection not found" }, { status: 404 });
  }
  if (!conn.supportsTrading) {
    return NextResponse.json({ error: `${conn.institution} is a read-only connection — trading is not supported` }, { status: 400 });
  }

  // Idempotency: same key returns the original order instead of re-submitting
  const existing = await prisma.brokerageOrder.findUnique({
    where: { userId_idempotencyKey: { userId: session.user.id, idempotencyKey: body.idempotencyKey } },
  });
  if (existing) return NextResponse.json({ order: existing, duplicate: true });

  const provider = getBrokerageProvider(conn.provider);
  if (!provider.placeOrder) {
    return NextResponse.json({ error: "Provider does not support order placement" }, { status: 400 });
  }

  // Record first (PENDING) so the audit trail exists even if the provider call dies mid-flight
  const order = await prisma.brokerageOrder.create({
    data: {
      connectionId: conn.id,
      userId: session.user.id,
      idempotencyKey: body.idempotencyKey,
      signalId: body.signalId,
      symbol,
      side: body.side,
      orderType: body.orderType,
      quantity: body.quantity,
      limitPrice: body.limitPrice,
      stopLoss: body.stopLoss,
      takeProfit: body.takeProfit,
    },
  });

  try {
    const result = await provider.placeOrder(
      decryptJson(conn.encryptedAuth),
      { symbol, side: body.side, orderType: body.orderType, quantity: body.quantity, limitPrice: body.limitPrice, stopLoss: body.stopLoss, takeProfit: body.takeProfit },
      body.idempotencyKey
    );
    if (result.updatedAuth) {
      await prisma.brokerageConnection.update({ where: { id: conn.id }, data: { encryptedAuth: encryptJson(result.updatedAuth) } });
    }
    const updated = await prisma.brokerageOrder.update({
      where: { id: order.id },
      data: {
        providerOrderId: result.providerOrderId,
        status: result.status,
        fillPrice: result.fillPrice,
        filledAt: result.status === "FILLED" ? new Date() : null,
      },
    });
    // Refresh balances/positions and auto-journal the fill
    await syncConnection(prisma, conn.id);
    return NextResponse.json({ order: updated });
  } catch (e) {
    await prisma.brokerageOrder.update({ where: { id: order.id }, data: { status: "REJECTED" } });
    const msg = e instanceof BrokerageError ? e.message : "Order submission failed";
    console.error("order placement failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
