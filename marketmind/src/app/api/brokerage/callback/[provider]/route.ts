import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getBrokerageProvider } from "@/lib/brokerage";
import { syncConnection } from "@/lib/brokerage/sync";
import { encryptJson } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/**
 * Hosted-portal return leg. Exchanges callback params for provider tokens,
 * stores them encrypted, and kicks the initial sync. Redirects back to the
 * Connections page with a status flag either way.
 */
export async function GET(req: Request, { params }: { params: { provider: string } }) {
  const origin = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const back = (q: string) => NextResponse.redirect(`${origin}/settings/connections?${q}`);

  const session = await auth();
  if (!session?.user) return NextResponse.redirect(`${origin}/login`);

  let provider;
  try {
    provider = getBrokerageProvider(params.provider);
  } catch {
    return back("error=unknown-provider");
  }

  const query = Object.fromEntries(new URL(req.url).searchParams.entries());
  try {
    const result = await provider.completeLink(session.user.id, query);
    const connection = await prisma.brokerageConnection.create({
      data: {
        userId: session.user.id,
        provider: provider.name,
        institution: result.institution,
        accountMask: result.accountMask.slice(-4),
        encryptedAuth: encryptJson(result.auth),
        supportsTrading: result.supportsTrading,
      },
    });
    await syncConnection(prisma, connection.id);
    return back("connected=1");
  } catch (e) {
    // Never log callback params (they can carry tokens) — message only
    console.error(`brokerage link failed (${params.provider}):`, e instanceof Error ? e.message : "error");
    return back(`error=${encodeURIComponent(e instanceof Error ? e.message.slice(0, 140) : "link-failed")}`);
  }
}
