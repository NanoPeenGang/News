import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function ownedWatchlist(id: string, userId: string) {
  const wl = await prisma.watchlist.findUnique({ where: { id }, include: { items: true } });
  if (!wl || wl.userId !== userId) return null;
  return wl;
}

/** POST adds a symbol; body { symbol }. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const wl = await ownedWatchlist(params.id, session.user.id);
  if (!wl) return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });

  const body = z.object({ symbol: z.string().regex(/^[A-Za-z.]{1,10}$/) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Valid symbol required" }, { status: 400 });
  const symbol = body.data.symbol.toUpperCase();

  if (session.user.role === "FREE") {
    const total = await prisma.watchlistItem.count({ where: { watchlist: { userId: session.user.id } } });
    if (total >= 3) {
      return NextResponse.json({ error: "Free tier tracks up to 3 tickers. Upgrade to Premium for unlimited.", upgrade: true }, { status: 403 });
    }
  }
  const item = await prisma.watchlistItem.upsert({
    where: { watchlistId_symbol: { watchlistId: wl.id, symbol } },
    update: {},
    create: { watchlistId: wl.id, symbol },
  });
  return NextResponse.json({ item });
}

/** DELETE removes the list, or a single symbol when ?symbol= is given. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const wl = await ownedWatchlist(params.id, session.user.id);
  if (!wl) return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });

  const symbol = new URL(req.url).searchParams.get("symbol");
  if (symbol) {
    await prisma.watchlistItem.deleteMany({ where: { watchlistId: wl.id, symbol: symbol.toUpperCase() } });
    return NextResponse.json({ ok: true });
  }
  await prisma.watchlist.delete({ where: { id: wl.id } });
  return NextResponse.json({ ok: true });
}
