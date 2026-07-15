"use client";

import Link from "next/link";
import { CheckCircle2, Circle, GraduationCap, Lock } from "lucide-react";
import { useFetch } from "@/components/hooks";
import { Badge, Card, SectionTitle, Skeleton, cn } from "@/components/ui";

interface LessonMeta {
  id: string;
  slug: string;
  title: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  order: number;
  summary: string;
  minutes: number;
  premiumOnly: boolean;
}

const LEVELS = [
  { key: "BEGINNER", label: "Beginner", blurb: "Foundations: reading candles, key levels, and how the scanner thinks." },
  { key: "INTERMEDIATE", label: "Intermediate", blurb: "The setups the scanner trades, and the risk math that keeps you alive." },
  { key: "ADVANCED", label: "Advanced", blurb: "Psychology, journaling discipline, and building a repeatable process." },
] as const;

export default function LearnPage() {
  const { data, loading } = useFetch<{ lessons: LessonMeta[]; progress: Record<string, boolean>; role: string }>("/api/lessons");
  const done = data?.progress ?? {};
  const total = data?.lessons.length ?? 0;
  const completed = data ? data.lessons.filter((l) => done[l.id]).length : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-mist-100">
            <GraduationCap size={20} className="text-teal-glow" /> Learning Center
          </h1>
          <p className="text-sm text-mist-400">A structured path from first candle to consistent process.</p>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-ink-700">
              <div className="h-full bg-teal-glow transition-all duration-500" style={{ width: `${(completed / total) * 100}%` }} />
            </div>
            <span className="tnum font-mono text-xs text-mist-400">{completed}/{total}</span>
          </div>
        )}
      </div>

      {loading && <Skeleton className="h-64 w-full" />}

      {LEVELS.map(({ key, label, blurb }) => {
        const lessons = data?.lessons.filter((l) => l.level === key) ?? [];
        if (!loading && lessons.length === 0) return null;
        return (
          <div key={key}>
            <SectionTitle>{label}</SectionTitle>
            <p className="-mt-2 mb-3 text-xs text-mist-500">{blurb}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {lessons.map((l) => {
                const locked = l.premiumOnly && data?.role === "FREE";
                return (
                  <Link
                    key={l.id}
                    href={locked ? "/pricing" : `/learn/${l.slug}`}
                    className={cn("glass glass-hover flex items-start gap-3 p-4", locked && "opacity-70")}
                  >
                    {done[l.id] ? (
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-profit" />
                    ) : locked ? (
                      <Lock size={16} className="mt-0.5 shrink-0 text-amber-warn" />
                    ) : (
                      <Circle size={18} className="mt-0.5 shrink-0 text-mist-600" />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-mist-100">{l.title}</span>
                        {l.premiumOnly && <Badge tone="amber">PRO</Badge>}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-mist-400">{l.summary}</p>
                      <span className="mt-1.5 block text-[10px] uppercase tracking-wider text-mist-500">{l.minutes} min</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
