import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Prisma, SignalStatus, SetupType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const where: Prisma.SignalWhereInput = {};

  const status = searchParams.get("status");
  if (status === "open") where.status = { in: ["WAITING", "ENTRY_ACTIVE", "TARGET1_HIT"] };
  else if (status === "closed") where.status = { in: ["TARGET2_HIT", "STOPPED_OUT", "EXPIRED"] };
  else if (status) where.status = status as SignalStatus;

  const setup = searchParams.get("setup");
  if (setup) where.setupType = setup as SetupType;
  const symbol = searchParams.get("symbol");
  if (symbol) where.symbol = symbol.toUpperCase();
  const direction = searchParams.get("direction");
  if (direction === "LONG" || direction === "SHORT") where.direction = direction;

  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  // Free tier sees signals on a 15-minute delay; premium/admin get real time
  const role = session?.user?.role ?? "FREE";
  if (role === "FREE") {
    where.createdAt = { lt: new Date(Date.now() - 15 * 60_000) };
  }

  const signals = await prisma.signal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ signals, delayed: role === "FREE" });
}
