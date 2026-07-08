"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sunrise, Sunset, TrendingDown, TrendingUp } from "lucide-react";
import { useLive } from "@/components/Providers";
import { useFetch, useSignals } from "@/components/hooks";
import { SignalCard, SignalCardSkeleton } from "@/components/SignalCard";
import { Badge, Card, Markdown, NumberTicker, SectionTitle, Skeleton, cn } from "@/components/ui";
import { fmtPercent, fmtVolume } from "@/lib/format";

export default function DashboardPage() {
  const { quotes, connected } = useLive();
  const { signals, delayed } = useSignals("limit=12");
  const [briefingSession, setBriefingSession] = useState<"premarket" | "postmarket">("premarket");
  const briefing = useFetch<{ briefing: string }>(`/api/briefing?session=${briefingSession}`);

  const movers = useMemo(() => {
    const all = Array.from(quotes.values()).filter((q) => q.symbol !== "SPY" && q.symbol !== "QQQ");
    const sorted = [...all].sort((a, b) => b.changePercent - a.changePercent);
    return { gainers: sorted.slice(0, 5), losers: sorted.slice(-5).reverse() };
  }, [quotes]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-mist-100">Dashboard</h1>
          <p className="text-sm text-mist-400">Market overview and the live signal feed.</p>
        </div>
        {delayed && <Badge tone="amber">Free tier — signals delayed 15 min</Badge>}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Signal feed */}
        <div className="space-y-3 lg:col-span-2">
          <SectionTitle
            right={
              <Link href="/signals" className="text-xs text-teal-glow hover:underline">
                View all →
              </Link>
            }
          >
            Live Signal Feed
          </SectionTitle>
          {signals === null && Array.from({ length: 4 }).map((_, i) => <SignalCardSkeleton key={i} />)}
          {signals?.length === 0 && (
            <Card className="py-10 text-center text-sm text-mist-400">
              {connected
                ? "No signals yet — the scanner runs every minute and new setups will stream in here."
                : "Live engine offline. Start the worker with `npm run worker` to begin scanning."}
            </Card>
          )}
          {signals?.map((s) => (
            <div key={s.id} className="animate-fade-in">
              <SignalCard signal={s} />
            </div>
          ))}
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <div>
            <SectionTitle>Top Movers</SectionTitle>
            <Card className="divide-y divide-white/[0.05] p-0">
              {quotes.size === 0 && (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              )}
              {[...movers.gainers, ...movers.losers].map((q, i) => (
                <Link key={q.symbol} href={`/ticker/${q.symbol}`} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-ink-700/40">
                  {i === 0 && <TrendingUp size={13} className="text-profit" />}
                  {i === movers.gainers.length && <TrendingDown size={13} className="text-loss" />}
                  {i !== 0 && i !== movers.gainers.length && <span className="w-[13px]" />}
                  <span className="w-14 font-mono text-xs font-semibold text-mist-200">{q.symbol}</span>
                  <NumberTicker value={q.price} className="flex-1 text-right text-xs text-mist-300" />
                  <span className={cn("tnum w-16 text-right font-mono text-xs", q.changePercent >= 0 ? "text-profit" : "text-loss")}>
                    {fmtPercent(q.changePercent)}
                  </span>
                  <span className="tnum hidden w-14 text-right font-mono text-[10px] text-mist-500 sm:block">{fmtVolume(q.volume)}</span>
                </Link>
              ))}
            </Card>
          </div>

          <div>
            <SectionTitle
              right={
                <div className="flex gap-1">
                  <button
                    onClick={() => setBriefingSession("premarket")}
                    className={cn("focus-ring rounded-md p-1.5", briefingSession === "premarket" ? "bg-teal-dim/20 text-teal-glow" : "text-mist-500 hover:text-mist-200")}
                    title="Pre-market briefing"
                  >
                    <Sunrise size={13} />
                  </button>
                  <button
                    onClick={() => setBriefingSession("postmarket")}
                    className={cn("focus-ring rounded-md p-1.5", briefingSession === "postmarket" ? "bg-teal-dim/20 text-teal-glow" : "text-mist-500 hover:text-mist-200")}
                    title="Post-market recap"
                  >
                    <Sunset size={13} />
                  </button>
                </div>
              }
            >
              Daily Briefing
            </SectionTitle>
            <Card>
              {briefing.loading && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              )}
              {briefing.data && <Markdown text={briefing.data.briefing} />}
              {briefing.error && <p className="text-sm text-mist-400">{briefing.error}</p>}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
