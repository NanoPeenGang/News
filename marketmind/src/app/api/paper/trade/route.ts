import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getMarketDataProvider } from "@/lib/marketdata";

export const dynamic = "force-dynamic";

const schema = z.object({
  symbol: z.string().regex(/^[A-Za-z.]{1,10}$/),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive().max(1_000_000),
  signalId: z.string().optional(),
});

/** Executes a simulated market order at the live price. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  const { side, quantity, signalId } = body.data;
  const symbol = body.data.symbol.toUpperCase();

  const account = await prisma.paperAccount.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
    include: { positions: true },
  });
  const quote = await getMarketDataProvider().getQuote(symbol);
  const price = quote.price;
  if (!isFinite(price) || price <= 0) return NextResponse.json({ error: "No market price available" }, { status: 400 });

  const position = account.positions.find((p) => p.symbol === symbol);
  const cost = price * quantity;

  if (side === "BUY") {
    if (cost > account.cash) return NextResponse.json({ error: `Insufficient paper cash: order costs $${cost.toFixed(2)}, you have $${account.cash.toFixed(2)}` }, { status: 400 });
    await prisma.$transaction([
      prisma.paperAccount.update({ where: { id: account.id }, data: { cash: { decrement: cost } } }),
      position
        ? prisma.paperPosition.update({
            where: { id: position.id },
            data: {
              quantity: position.quantity + quantity,
              avgPrice: (position.avgPrice * position.quantity + cost) / (position.quantity + quantity),
            },
          })
        : prisma.paperPosition.create({ data: { accountId: account.id, symbol, quantity, avgPrice: price } }),
      prisma.paperTrade.create({ data: { accountId: account.id, symbol, side, quantity, price, signalId } }),
    ]);
  } else {
    if (!position || position.quantity < quantity) {
      return NextResponse.json({ error: "Cannot sell more than you hold (short selling is not simulated)" }, { status: 400 });
    }
    const pnl = (price - position.avgPrice) * quantity;
    await prisma.$transaction([
      prisma.paperAccount.update({ where: { id: account.id }, data: { cash: { increment: cost } } }),
      position.quantity === quantity
        ? prisma.paperPosition.delete({ where: { id: position.id } })
        : prisma.paperPosition.update({ where: { id: position.id }, data: { quantity: position.quantity - quantity } }),
      prisma.paperTrade.create({ data: { accountId: account.id, symbol, side, quantity, price, pnl, signalId } }),
    ]);
  }
  return NextResponse.json({ ok: true, fillPrice: price });
}
