import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  const lesson = await prisma.lesson.findUnique({ where: { slug: params.slug } });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const role = session?.user?.role ?? "FREE";
  if (lesson.premiumOnly && role === "FREE") {
    return NextResponse.json(
      { lesson: { ...lesson, content: "" }, locked: true, error: "This lesson is part of the Premium curriculum." },
      { status: 403 }
    );
  }
  let completed = false;
  if (session?.user) {
    const prog = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: session.user.id, lessonId: lesson.id } },
      update: {},
      create: { userId: session.user.id, lessonId: lesson.id },
    });
    completed = !!prog.completedAt;
  }
  return NextResponse.json({ lesson, completed, locked: false });
}

/** POST marks the lesson complete. */
export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const lesson = await prisma.lesson.findUnique({ where: { slug: params.slug } });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: session.user.id, lessonId: lesson.id } },
    update: { completedAt: new Date() },
    create: { userId: session.user.id, lessonId: lesson.id, completedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
