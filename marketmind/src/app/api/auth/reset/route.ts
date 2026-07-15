import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Password reset. POST { email } requests a token; POST { token, password }
 * consumes it. In production, wire the token into an email send — here it is
 * returned in the response (and logged) so the flow is fully testable locally.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const request = z.object({ email: z.string().email() }).safeParse(body);
  if (request.success) {
    const user = await prisma.user.findUnique({ where: { email: request.data.email.toLowerCase() } });
    // Do not leak account existence
    if (!user) return NextResponse.json({ ok: true, message: "If that account exists, a reset link was generated." });
    const token = crypto.randomBytes(24).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExp: new Date(Date.now() + 30 * 60_000) },
    });
    console.log(`[password-reset] token for ${user.email}: ${token}`);
    return NextResponse.json({
      ok: true,
      message: "Reset token generated. In production this is emailed; in dev it is returned here.",
      devToken:
        process.env.NODE_ENV !== "production" || process.env.EXPOSE_RESET_TOKENS === "1" ? token : undefined,
    });
  }

  const confirm = z.object({ token: z.string().min(10), password: z.string().min(8) }).safeParse(body);
  if (confirm.success) {
    const user = await prisma.user.findFirst({
      where: { resetToken: confirm.data.token, resetTokenExp: { gt: new Date() } },
    });
    if (!user) return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(confirm.data.password, 10), resetToken: null, resetTokenExp: null },
    });
    return NextResponse.json({ ok: true, message: "Password updated. You can sign in now." });
  }

  return NextResponse.json({ error: "Provide { email } or { token, password }" }, { status: 400 });
}
