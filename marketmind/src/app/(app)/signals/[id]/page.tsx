"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookmarkPlus, FlaskConical, RefreshCw, Sparkles } from "lucide-react";
import { useFetch, useHoldings } from "@/components/hooks";
import { useLive, useLiveQuote } from "@/components/Providers";
import { PriceChart, ChartBar } from "@/components/PriceChart";
import { RiskCalculator } from "@/components/RiskCalculator";
import { TradeSetupButton } from "@/components/OrderTicket";
import { Badge, Button, Card, ConfidenceMeter, InfoTip, Markdown, NumberTicker, SectionTitle, Skeleton, StatusPill, cn } from "@/components/ui";
import { SETUP_LABELS, fmtPrice, timeAgo } from "@/lib/format";

interface SignalDetail {
  id: string;
  symbol: string;
  setupType: string;
  direction: string;
  status: string;
  confidence: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  target1: number;
  target2: number;
  priceAtScan: number;
  atr: number;
  rsi: number | null;
  relVolume: number | null;
  vwap: number | null;
  thesis: string | null;
  risks: string | null;
  proNotes: string | null;
  createdAt: string;
  technicals: Record<string, unknown> | null;
  events: { id: string; toState: string; price: number | null; note: string | null; createdAt: string }[];
}

export default function SignalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, refresh } = useFetch<{ signal: SignalDetail }>(`/api/signals/${id}`);
  const signal = data?.signal;
  const quote = useLiveQuote(signal?.symbol);
  const holdings = useHoldings();
  const held = signal ? holdings[signal.symbol] : undefined;
  const { lastSignalUpdate } = useLive();
  const [bars, setBars] = useState<ChartBar[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!signal?.symbol) return;
    fetch(`/api/bars?symbol=${signal.symbol}&interval=5min&limit=300`)
      .then((r) => r.json())
      .then((d) => setBars(d.bars ?? []));
  }, [signal?.symbol]);

  useEffect(() => {
    if (lastSignalUpdate?.id === id) void refresh();
  }, [lastSignalUpdate, id, refresh]);

  async function regenerate() {
    setRegenerating(true);
    await fetch(`/api/signals/${id}`, { method: "POST" });
    await refresh();
    setRegenerating(false);
  }

  async function logToJournal() {
    if (!signal) return;
    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        symbol: signal.symbol,
        side: signal.direction === "LONG" ? "BUY" : "SELL",
        entryPrice: quote?.price ?? signal.priceAtScan,
        quantity: 100,
        stopLoss: signal.stopLoss,
        target: signal.target1,
        signalId: signal.id,
        notes: `Logged from ${SETUP_LABELS[signal.setupType]} signal`,
      }),
    });
    setToast(res.ok ? "Logged to journal (100 shares — edit it there)." : "Failed to log trade.");
    setTimeout(() => setToast(""), 4000);
  }

  async function paperTrade() {
    if (!signal) return;
    const res = await fetch("/api/paper/trade", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: signal.symbol, side: "BUY", quantity: 10, signalId: signal.id }),
    });
    const d = await res.json();
    setToast(res.ok ? `Paper order filled at $${fmtPrice(d.fillPrice)} (10 shares).` : d.error ?? "Order failed.");
    setTimeout(() => setToast(""), 4000);
  }

  if (loading || !signal) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[420px] w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isLong = signal.direction === "LONG";
  const entryMid = (signal.entryLow + signal.entryHigh) / 2;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-teal-glow/30 bg-ink-800 px-4 py-2 text-sm text-mist-100 shadow-glow lg:bottom-8">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/signals" className="focus-ring rounded-lg p-2 text-mist-400 hover:bg-ink-700/50 hover:text-mist-100">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <Link href={`/ticker/${signal.symbol}`} className="font-mono text-xl font-bold text-mist-100 hover:text-teal-glow">
                {signal.symbol}
              </Link>
              <Badge tone={isLong ? "green" : "red"}>{signal.direction}</Badge>
              <StatusPill status={signal.status} />
              {held && (
                <Badge tone="blue" className="whitespace-nowrap">
                  You own this · {held.quantity} sh @ {fmtPrice(held.avgCost)}
                </Badge>
              )}
            </div>
            <div className="mt-0.5 text-sm text-mist-400">
              {SETUP_LABELS[signal.setupType]} · flagged {timeAgo(signal.createdAt)} at ${fmtPrice(signal.priceAtScan)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {quote && (
            <div className="text-right">
              <NumberTicker value={quote.price} className="text-lg font-semibold text-mist-100" />
              <div className={cn("tnum font-mono text-xs", quote.changePercent >= 0 ? "text-profit" : "text-loss")}>
                {quote.changePercent >= 0 ? "+" : ""}
                {quote.changePercent.toFixed(2)}% today
              </div>
            </div>
          )}
          <ConfidenceMeter value={signal.confidence} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-2 sm:p-4">
            <PriceChart
              bars={bars}
              levels={{
                entryLow: signal.entryLow,
                entryHigh: signal.entryHigh,
                stopLoss: signal.stopLoss,
                target1: signal.target1,
                target2: signal.target2,
              }}
              livePrice={quote?.price}
            />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-2 text-[10px] text-mist-500">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-teal-glow/40" />Entry zone</span>
              <span className="text-loss/80">— Stop</span>
              <span className="text-profit/80">— Targets (2R / 3R)</span>
              <span className="text-teal-glow/70">— EMA 9</span>
              <span className="text-blue-400/70">— EMA 21</span>
              <span className="text-amber-warn/60">— EMA 50</span>
              <span className="text-fuchsia-400/70">— VWAP</span>
            </div>
          </Card>

          {/* Levels strip */}
          <div className="tnum grid grid-cols-2 gap-3 font-mono text-sm sm:grid-cols-5">
            <LevelTile label="Entry Zone" term="Entry Zone" value={`${fmtPrice(signal.entryLow)}–${fmtPrice(signal.entryHigh)}`} tone="teal" />
            <LevelTile label="Stop-Loss" term="Stop-Loss" value={fmtPrice(signal.stopLoss)} tone="red" sub={`ATR ${fmtPrice(signal.atr)}`} />
            <LevelTile label="Target 1 · 2R" term="Risk/Reward" value={fmtPrice(signal.target1)} tone="green" />
            <LevelTile label="Target 2 · 3R" term="Risk/Reward" value={fmtPrice(signal.target2)} tone="green" />
            <LevelTile label="RSI / RelVol" term="RSI" value={`${signal.rsi?.toFixed(0) ?? "—"} / ${signal.relVolume?.toFixed(1) ?? "—"}x`} tone="neutral" />
          </div>

          {/* AI analysis */}
          <Card>
            <SectionTitle
              right={
                <button onClick={regenerate} disabled={regenerating} className="focus-ring flex items-center gap-1.5 text-xs text-teal-glow hover:underline disabled:opacity-50">
                  <RefreshCw size={12} className={regenerating ? "animate-spin" : ""} /> Regenerate
                </button>
              }
            >
              <span className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-teal-glow" /> AI Trade Thesis
              </span>
            </SectionTitle>
            {signal.thesis ? (
              <Markdown text={signal.thesis} />
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <p className="pt-1 text-xs text-mist-500">Analysis is being generated — it appears automatically, or click Regenerate.</p>
              </div>
            )}
            {signal.risks && (
              <>
                <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-mist-400">Key Risks &amp; Catalysts</h3>
                <Markdown text={signal.risks} />
              </>
            )}
            {signal.proNotes && (
              <>
                <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-mist-400">What Would a Pro Do</h3>
                <Markdown text={signal.proNotes} />
              </>
            )}
            <p className="mt-4 border-t border-white/[0.05] pt-3 text-[11px] text-mist-500">
              AI-generated educational analysis of setup conditions — not financial advice, and never a guarantee of outcome.
            </p>
          </Card>
        </div>

        <div className="space-y-5">
          <RiskCalculator entryPrice={entryMid} stopLoss={signal.stopLoss} target1={signal.target1} target2={signal.target2} />

          <Card>
            <SectionTitle>Actions</SectionTitle>
            <div className="space-y-2">
              <TradeSetupButton signal={signal} />
              <Button onClick={logToJournal} variant="ghost" className="flex w-full items-center justify-center gap-2">
                <BookmarkPlus size={15} /> Log to Journal
              </Button>
              <Button onClick={paperTrade} variant="ghost" className="flex w-full items-center justify-center gap-2">
                <FlaskConical size={15} /> Paper Trade (10 sh)
              </Button>
              <Link href={`/analyst?symbol=${signal.symbol}&signalId=${signal.id}`} className="block">
                <Button variant="primary" className="flex w-full items-center justify-center gap-2">
                  <Sparkles size={15} /> Ask the AI Analyst
                </Button>
              </Link>
            </div>
          </Card>

          <Card>
            <SectionTitle>Signal Timeline</SectionTitle>
            <ol className="relative ml-2 space-y-4 border-l border-white/10 pl-4">
              {signal.events.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-ink-850 bg-teal-glow" />
                  <div className="flex items-center gap-2">
                    <StatusPill status={ev.toState} />
                    <span className="text-[10px] text-mist-500">{timeAgo(ev.createdAt)}</span>
                  </div>
                  {ev.note && <p className="mt-1 text-xs leading-relaxed text-mist-400">{ev.note}</p>}
                  {ev.price !== null && <p className="tnum font-mono text-[11px] text-mist-500">@ {fmtPrice(ev.price)}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LevelTile({ label, value, tone, sub, term }: { label: string; value: string; tone: "teal" | "red" | "green" | "neutral"; sub?: string; term?: string }) {
  const tones = {
    teal: "text-teal-glow border-teal-glow/20",
    red: "text-loss border-loss/20",
    green: "text-profit border-profit/20",
    neutral: "text-mist-200 border-white/10",
  };
  return (
    <div className={cn("glass border p-3", tones[tone])}>
      <div className="mb-1 font-sans text-[10px] uppercase tracking-wider text-mist-500">
        {term ? <InfoTip term={term} label={label} /> : label}
      </div>
      <div className="font-semibold">{value}</div>
      {sub && <div className="mt-0.5 font-sans text-[10px] text-mist-500">{sub}</div>}
    </div>
  );
}
