import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const closeSchema = z.object({
  exitPrice: z.number().positive(),
  notes: z.string().max(4000).optional(),
  mistakes: z.string().max(500).optional(),
});

/** PATCH closes a trade and computes P&L + R multiple. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const entry = await prisma.journalEntry.findUnique({ where: { id: params.id } });
  if (!entry || entry.userId !== session.user.id) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  const body = closeSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "exitPrice required" }, { status: 400 });

  const dir = entry.side === "BUY" ? 1 : -1;
  const pnl = (body.data.exitPrice - entry.entryPrice) * entry.quantity * dir;
  const riskPerShare = entry.stopLoss ? Math.abs(entry.entryPrice - entry.stopLoss) : null;
  const rMultiple = riskPerShare ? ((body.data.exitPrice - entry.entryPrice) * dir) / riskPerShare : null;

  const updated = await prisma.journalEntry.update({
    where: { id: entry.id },
    data: {
      exitPrice: body.data.exitPrice,
      notes: body.data.notes ?? entry.notes,
      mistakes: body.data.mistakes ?? entry.mistakes,
      pnl,
      rMultiple,
      closedAt: new Date(),
    },
  });
  return NextResponse.json({ entry: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const entry = await prisma.journalEntry.findUnique({ where: { id: params.id } });
  if (!entry || entry.userId !== session.user.id) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  await prisma.journalEntry.delete({ where: { id: entry.id } });
  return NextResponse.json({ ok: true });
}
