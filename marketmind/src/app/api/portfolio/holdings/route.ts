import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Lightweight symbol → {quantity, avgCost} map for "You own this" badges. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ holdings: {} });
  const positions = await prisma.brokeragePosition.findMany({
    where: { connection: { userId: session.user.id, status: { not: "DISCONNECTED" } } },
    select: { symbol: true, quantity: true, avgCost: true },
  });
  const holdings: Record<string, { quantity: number; avgCost: number }> = {};
  for (const p of positions) {
    const h = holdings[p.symbol];
    if (h) {
      const total = h.quantity + p.quantity;
      h.avgCost = (h.avgCost * h.quantity + p.avgCost * p.quantity) / total;
      h.quantity = total;
    } else {
      holdings[p.symbol] = { quantity: p.quantity, avgCost: p.avgCost };
    }
  }
  return NextResponse.json({ holdings });
}
