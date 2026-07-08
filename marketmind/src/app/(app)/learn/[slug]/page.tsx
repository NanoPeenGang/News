"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useFetch } from "@/components/hooks";
import { Badge, Button, Card, Markdown, Skeleton } from "@/components/ui";

interface LessonData {
  lesson: { slug: string; title: string; level: string; content: string; minutes: number; summary: string };
  completed: boolean;
  locked: boolean;
}

export default function LessonPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error, refresh } = useFetch<LessonData>(`/api/lessons/${slug}`);
  const [marking, setMarking] = useState(false);

  async function complete() {
    setMarking(true);
    await fetch(`/api/lessons/${slug}`, { method: "POST" });
    await refresh();
    setMarking(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/learn" className="inline-flex items-center gap-1.5 text-sm text-mist-400 hover:text-teal-glow">
        <ArrowLeft size={14} /> Learning Center
      </Link>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {error && !data && (
        <Card className="py-10 text-center">
          <p className="text-sm text-amber-warn">{error}</p>
          <Link href="/pricing" className="mt-2 inline-block text-sm text-teal-glow underline">See Premium plans</Link>
        </Card>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-mist-100">{data.lesson.title}</h1>
            <Badge tone="teal">{data.lesson.level}</Badge>
            <Badge>{data.lesson.minutes} min</Badge>
            {data.completed && <Badge tone="green"><CheckCircle2 size={11} /> Completed</Badge>}
          </div>
          <Card className="p-6">
            <Markdown text={data.lesson.content} className="text-[15px]" />
          </Card>
          {!data.completed && (
            <Button onClick={complete} disabled={marking} className="flex items-center gap-2">
              <CheckCircle2 size={15} /> {marking ? "Saving…" : "Mark as complete"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
