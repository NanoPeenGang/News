import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const lessons = await prisma.lesson.findMany({ orderBy: [{ level: "asc" }, { order: "asc" }] });
  let progress: Record<string, boolean> = {};
  if (session?.user) {
    const rows = await prisma.lessonProgress.findMany({ where: { userId: session.user.id, completedAt: { not: null } } });
    progress = Object.fromEntries(rows.map((r) => [r.lessonId, true]));
  }
  return NextResponse.json({
    lessons: lessons.map(({ content, ...rest }) => rest),
    progress,
    role: session?.user?.role ?? "FREE",
  });
}
