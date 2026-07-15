import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const prefs = await prisma.alertPreference.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });
  return NextResponse.json({ prefs });
}

const schema = z.object({
  entryZone: z.boolean().optional(),
  stopThreatened: z.boolean().optional(),
  targetHit: z.boolean().optional(),
  browserPush: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  const prefs = await prisma.alertPreference.upsert({
    where: { userId: session.user.id },
    update: body.data,
    create: { userId: session.user.id, ...body.data },
  });
  return NextResponse.json({ prefs });
}
