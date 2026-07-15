import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateThesis } from "@/lib/ai";
import { auth } from "@/lib/auth";
import type { TechnicalSnapshot } from "@/lib/indicators";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const signal = await prisma.signal.findUnique({
    where: { id: params.id },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  if (!signal) return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  return NextResponse.json({ signal });
}

/** POST regenerates the AI thesis on demand. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const signal = await prisma.signal.findUnique({ where: { id: params.id } });
  if (!signal) return NextResponse.json({ error: "Signal not found" }, { status: 404 });

  // Signal ↔ portfolio awareness: fold the user's existing position into the thesis
  const held = await prisma.brokeragePosition.findFirst({
    where: { symbol: signal.symbol, connection: { userId: session.user.id, status: { not: "DISCONNECTED" } } },
  });
  let userPosition: { quantity: number; avgCost: number; unrealizedPnlPercent: number } | undefined;
  if (held) {
    userPosition = {
      quantity: held.quantity,
      avgCost: held.avgCost,
      unrealizedPnlPercent: held.avgCost > 0 ? ((signal.priceAtScan - held.avgCost) / held.avgCost) * 100 : 0,
    };
  }

  const tech = (signal.technicals ?? {}) as Partial<TechnicalSnapshot> & { reasons?: string[] };
  const { thesis, risks, proNotes, source } = await generateThesis(
    {
      userPosition,
      symbol: signal.symbol,
      setupType: signal.setupType,
      direction: signal.direction,
      confidence: signal.confidence,
      entryLow: signal.entryLow,
      entryHigh: signal.entryHigh,
      stopLoss: signal.stopLoss,
      target1: signal.target1,
      target2: signal.target2,
      snapshot: tech,
      reasons: tech.reasons ?? [],
    },
    session.user.id
  );
  const updated = await prisma.signal.update({ where: { id: signal.id }, data: { thesis, risks, proNotes } });
  return NextResponse.json({ signal: updated, source });
}
