"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useFetch } from "@/components/hooks";
import { useLiveQuote } from "@/components/Providers";
import { PriceChart, ChartBar } from "@/components/PriceChart";
import { SignalCard } from "@/components/SignalCard";
import { Badge, Card, InfoTip, NumberTicker, SectionTitle, Skeleton, cn } from "@/components/ui";
import { fmtPercent, fmtPrice, fmtVolume } from "@/lib/format";
import type { LiveSignal } from "@/components/Providers";
import type { TechnicalSnapshot } from "@/lib/indicators";

interface TickerData {
  quote: { price: number; changePercent: number; volume: number; avgVolume: number; open: number; prevClose: number; high: number; low: number };
  snapshot: TechnicalSnapshot | null;
  info: { symbol: string; name: string; sector: string };
  signals: LiveSignal[];
}

const INTERVALS = ["1min", "5min", "15min", "1day"] as const;

export default function TickerPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol?.toUpperCase();
  const { data, loading } = useFetch<TickerData>(symbol ? `/api/ticker/${symbol}` : null);
  const quote = useLiveQuote(symbol);
  const [interval, setInterval_] = useState<(typeof INTERVALS)[number]>("5min");
  const [bars, setBars] = useState<ChartBar[]>([]);

  useEffect(() => {
    if (!symbol) return;
    setBars([]);
    fetch(`/api/bars?symbol=${symbol}&interval=${interval}&limit=300`)
      .then((r) => r.json())
      .then((d) => setBars(d.bars ?? []));
  }, [symbol, interval]);

  const live = quote ?? (data ? { ...data.quote, symbol } : null);
  const snap = data?.snapshot;
  const openSignal = data?.signals.find((s) => ["WAITING", "ENTRY_ACTIVE", "TARGET1_HIT"].includes(s.status));

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-mist-100">{symbol}</h1>
            {data && <Badge>{data.info.sector}</Badge>}
          </div>
          <p className="text-sm text-mist-400">{data?.info.name ?? (loading ? "Loading…" : symbol)}</p>
        </div>
        {live && (
          <div className="text-right">
            <NumberTicker value={live.price} className="text-2xl font-semibold text-mist-100" />
            <div className={cn("tnum font-mono text-sm", live.changePercent >= 0 ? "text-profit" : "text-loss")}>
              {fmtPercent(live.changePercent)} today
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-2 sm:p-4">
            <div className="mb-2 flex gap-1 px-2">
              {INTERVALS.map((iv) => (
                <button
                  key={iv}
                  onClick={() => setInterval_(iv)}
                  className={cn(
                    "focus-ring rounded-md px-2.5 py-1 text-xs transition-colors",
                    interval === iv ? "bg-teal-dim/20 text-teal-glow" : "text-mist-500 hover:text-mist-200"
                  )}
                >
                  {iv}
                </button>
              ))}
            </div>
            <PriceChart
              bars={bars}
              livePrice={quote?.price}
              levels={
                openSignal
                  ? {
                      entryLow: openSignal.entryLow,
                      entryHigh: openSignal.entryHigh,
                      stopLoss: openSignal.stopLoss,
                      target1: openSignal.target1,
                      target2: openSignal.target2,
                    }
                  : undefined
              }
            />
          </Card>

          {snap && (
            <Card>
              <SectionTitle>Technicals Snapshot</SectionTitle>
              <div className="tnum grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-sm sm:grid-cols-4">
                <Tech label="RSI (14)" term="RSI" value={snap.rsi14.toFixed(1)} highlight={snap.rsi14 > 70 || snap.rsi14 < 30} />
                <Tech label="MACD Hist" term="MACD" value={snap.macdHistogram.toFixed(3)} tone={snap.macdHistogram >= 0 ? "up" : "down"} />
                <Tech label="VWAP" term="VWAP" value={fmtPrice(snap.vwap)} />
                <Tech label="ATR (14)" term="ATR" value={fmtPrice(snap.atr14)} />
                <Tech label="EMA 9 / 21" term="EMA" value={`${fmtPrice(snap.ema9)} / ${fmtPrice(snap.ema21)}`} />
                <Tech label="EMA 50 / 200" term="EMA" value={`${fmtPrice(snap.ema50)} / ${fmtPrice(snap.ema200)}`} />
                <Tech label="Bollinger" term="Bollinger Bands" value={`${fmtPrice(snap.bbLower)}–${fmtPrice(snap.bbUpper)}`} />
                <Tech label="Rel Volume" term="Relative Volume" value={`${snap.relVolume.toFixed(2)}x`} highlight={snap.relVolume >= 2} />
              </div>
              {(snap.supports.length > 0 || snap.resistances.length > 0) && (
                <div className="mt-4 border-t border-white/[0.05] pt-3 text-xs">
                  <InfoTip term="Support/Resistance" label="Key levels" />
                  <div className="tnum mt-2 flex flex-wrap gap-2 font-mono">
                    {snap.supports.map((s) => (
                      <Badge key={`s${s}`} tone="green">S {fmtPrice(s)}</Badge>
                    ))}
                    {snap.resistances.map((r) => (
                      <Badge key={`r${r}`} tone="red">R {fmtPrice(r)}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {live && (
            <Card>
              <SectionTitle>Session</SectionTitle>
              <div className="tnum space-y-2 font-mono text-sm">
                {[
                  ["Open", fmtPrice(live.open)],
                  ["Prev Close", fmtPrice(live.prevClose)],
                  ["Day High", fmtPrice(live.high)],
                  ["Day Low", fmtPrice(live.low)],
                  ["Volume", fmtVolume(live.volume)],
                  ["Avg Volume", fmtVolume(live.avgVolume)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="font-sans text-xs text-mist-400">{l}</span>
                    <span className="text-mist-200">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Link href={`/analyst?symbol=${symbol}`} className="glass glass-hover flex items-center gap-3 p-4">
            <Sparkles size={18} className="text-teal-glow" />
            <div>
              <div className="text-sm font-semibold text-mist-100">Ask the AI Analyst</div>
              <div className="text-xs text-mist-400">Live technicals for {symbol} are injected as context.</div>
            </div>
          </Link>

          <div>
            <SectionTitle>Signal History</SectionTitle>
            <div className="space-y-3">
              {data?.signals.length === 0 && <Card className="py-6 text-center text-xs text-mist-400">No signals for {symbol} yet.</Card>}
              {data?.signals.map((s) => (
                <SignalCard key={s.id} signal={s} compact />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tech({ label, value, term, highlight, tone }: { label: string; value: string; term?: string; highlight?: boolean; tone?: "up" | "down" }) {
  return (
    <div>
      <div className="mb-0.5 font-sans text-[10px] uppercase tracking-wider text-mist-500">
        {term ? <InfoTip term={term} label={label} /> : label}
      </div>
      <div className={cn("font-medium", highlight ? "text-amber-warn" : tone === "up" ? "text-profit" : tone === "down" ? "text-loss" : "text-mist-200")}>
        {value}
      </div>
    </div>
  );
}
