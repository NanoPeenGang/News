import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const entries = await prisma.journalEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { openedAt: "desc" },
    take: 200,
    include: { signal: { select: { setupType: true, direction: true } } },
  });
  return NextResponse.json({ entries });
}

const createSchema = z.object({
  symbol: z.string().regex(/^[A-Za-z.]{1,10}$/),
  side: z.enum(["BUY", "SELL"]),
  entryPrice: z.number().positive(),
  quantity: z.number().positive(),
  stopLoss: z.number().positive().optional(),
  target: z.number().positive().optional(),
  notes: z.string().max(4000).optional(),
  signalId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = createSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid trade entry" }, { status: 400 });
  const entry = await prisma.journalEntry.create({
    data: { ...body.data, symbol: body.data.symbol.toUpperCase(), userId: session.user.id },
  });
  return NextResponse.json({ entry });
}
