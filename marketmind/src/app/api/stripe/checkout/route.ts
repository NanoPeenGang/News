import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Stripe checkout stub — ready to wire up.
 *
 * With a real STRIPE_SECRET_KEY you would:
 *   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
 *   const session = await stripe.checkout.sessions.create({
 *     mode: "subscription",
 *     line_items: [{ price: "price_xxx", quantity: 1 }],
 *     success_url: `${process.env.NEXTAUTH_URL}/settings?upgraded=1`,
 *     cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
 *     customer_email: session.user.email,
 *   });
 *   return NextResponse.json({ url: session.url });
 * ...and flip the role to PREMIUM in the webhook on `checkout.session.completed`.
 *
 * Without a key, this endpoint simulates a successful upgrade so the full
 * premium experience is demoable locally.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  if (process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe key detected but checkout is not wired yet — see the comment in this route." },
      { status: 501 }
    );
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { role: "PREMIUM" } });
  return NextResponse.json({ ok: true, simulated: true, message: "Demo mode: account upgraded to Premium. Sign out and back in, or refresh." });
}
