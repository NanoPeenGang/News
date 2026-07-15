import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { availableBrokerageProviders, getBrokerageProvider } from "@/lib/brokerage";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const connections = await prisma.brokerageConnection.findMany({
    where: { userId: session.user.id, status: { not: "DISCONNECTED" } },
    select: {
      id: true, provider: true, status: true, institution: true, accountMask: true,
      supportsTrading: true, cash: true, buyingPower: true, equity: true, lastSyncAt: true, createdAt: true,
      // encryptedAuth deliberately excluded — tokens never leave the server
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ connections, providers: availableBrokerageProviders() });
}

/** POST { provider } → hosted-portal URL to open. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rl = rateLimit(`link:${session.user.id}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Too many attempts — retry in ${rl.retryAfterSec}s` }, { status: 429 });

  const body = z.object({ provider: z.enum(["mock", "snaptrade", "plaid"]) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });

  const provider = getBrokerageProvider(body.data.provider);
  const origin = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    const link = await provider.createLinkSession(session.user.id, `${origin}/api/brokerage/callback/${provider.name}`);
    return NextResponse.json({ url: link.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start link flow" }, { status: 502 });
  }
}
