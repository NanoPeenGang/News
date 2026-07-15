import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true, image: true, maxDailyLoss: true, riskProfile: true },
  });
  return NextResponse.json({ user });
}

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(8).max(200).optional(),
  maxDailyLoss: z.number().positive().max(1_000_000).nullable().optional(),
  riskProfile: z.enum(["conservative", "moderate", "aggressive"]).nullable().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const data: { name?: string; passwordHash?: string; maxDailyLoss?: number | null; riskProfile?: string | null } = {};
  if (body.data.name) data.name = body.data.name;
  if (body.data.password) data.passwordHash = await bcrypt.hash(body.data.password, 10);
  if ("maxDailyLoss" in body.data) data.maxDailyLoss = body.data.maxDailyLoss;
  if ("riskProfile" in body.data) data.riskProfile = body.data.riskProfile;
  const user = await prisma.user.update({ where: { id: session.user.id }, data, select: { id: true, name: true, email: true } });
  return NextResponse.json({ user });
}
