import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth, TIER_LIMITS } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const watchlists = await prisma.watchlist.findMany({
    where: { userId: session.user.id },
    include: { items: { orderBy: { addedAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ watchlists });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = z.object({ name: z.string().min(1).max(60) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Name required" }, { status: 400 });

  if (session.user.role === "FREE") {
    const count = await prisma.watchlist.count({ where: { userId: session.user.id } });
    if (count >= 1) {
      return NextResponse.json({ error: "Free tier includes one watchlist. Upgrade to Premium for unlimited watchlists.", upgrade: true }, { status: 403 });
    }
  }
  const watchlist = await prisma.watchlist.create({
    data: { userId: session.user.id, name: body.data.name },
    include: { items: true },
  });
  return NextResponse.json({ watchlist });
}
