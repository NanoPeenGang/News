import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth, TIER_LIMITS } from "@/lib/auth";
import { analystChat } from "@/lib/ai";
import { getMarketDataProvider } from "@/lib/marketdata";
import { computeSnapshot } from "@/lib/indicators";
import { currentSessionBars } from "@/lib/scanner";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const messages = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!TIER_LIMITS[session.user.role].aiChat) {
    return NextResponse.json({ error: "The AI Analyst is a Premium feature. Upgrade to chat with the analyst.", upgrade: true }, { status: 403 });
  }

  const body = z
    .object({ question: z.string().min(1).max(2000), symbol: z.string().regex(/^[A-Za-z.]{1,10}$/).optional(), signalId: z.string().optional() })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Question required" }, { status: 400 });
  const { question, symbol, signalId } = body.data;

  // Assemble live technical context for the AI
  let context = "No specific ticker in context.";
  try {
    if (signalId) {
      const signal = await prisma.signal.findUnique({ where: { id: signalId } });
      if (signal) {
        context = `Signal under discussion:\n${JSON.stringify(
          { symbol: signal.symbol, setup: signal.setupType, direction: signal.direction, status: signal.status, confidence: signal.confidence, entryZone: [signal.entryLow, signal.entryHigh], stopLoss: signal.stopLoss, targets: [signal.target1, signal.target2], technicals: signal.technicals },
          null, 1
        )}`;
      }
    } else if (symbol) {
      const provider = getMarketDataProvider();
      const sym = symbol.toUpperCase();
      const [quote, bars] = await Promise.all([provider.getQuote(sym), provider.getBars(sym, "5min", 300)]);
      const snap = computeSnapshot(bars, currentSessionBars(bars), {
        prevClose: quote.prevClose, open: quote.open, volume: quote.volume, avgVolume: quote.avgVolume,
      });
      context = `Live technicals for ${sym}:\n${JSON.stringify({ quote, technicals: snap }, null, 1)}`;
    }
  } catch (e) {
    console.error("context assembly failed:", e);
  }

  const history = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const answer = await analystChat(
    question,
    context,
    history.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    session.user.id
  );

  await prisma.chatMessage.createMany({
    data: [
      { userId: session.user.id, role: "user", content: question, context: symbol ?? signalId },
      { userId: session.user.id, role: "assistant", content: answer, context: symbol ?? signalId },
    ],
  });
  return NextResponse.json({ answer });
}
