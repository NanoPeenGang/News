"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge, ConfidenceMeter, InfoTip, StatusPill, NumberTicker, cn } from "./ui";
import { useLiveQuote, LiveSignal } from "./Providers";
import { SETUP_LABELS, fmtPrice, timeAgo } from "@/lib/format";

export function SignalCard({ signal, compact = false }: { signal: LiveSignal; compact?: boolean }) {
  const quote = useLiveQuote(signal.symbol);
  const isLong = signal.direction === "LONG";

  return (
    <Link
      href={`/signals/${signal.id}`}
      className="glass glass-hover group block p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", isLong ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
            {isLong ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-tight text-mist-100">{signal.symbol}</span>
              <Badge tone={isLong ? "green" : "red"}>{signal.direction}</Badge>
            </div>
            <div className="mt-0.5 text-xs text-mist-400">
              {SETUP_LABELS[signal.setupType] ?? signal.setupType} · {timeAgo(signal.createdAt)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusPill status={signal.status} />
          <ConfidenceMeter value={signal.confidence} />
        </div>
      </div>

      {!compact && (
        <div className="tnum mt-3 grid grid-cols-4 gap-2 border-t border-white/[0.05] pt-3 font-mono text-xs">
          <div>
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-mist-500">Last</div>
            {quote ? <NumberTicker value={quote.price} className="text-mist-100" /> : <span className="text-mist-300">{fmtPrice(signal.priceAtScan)}</span>}
          </div>
          <div>
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-mist-500">Entry</div>
            <span className="text-teal-glow">{fmtPrice(signal.entryLow)}–{fmtPrice(signal.entryHigh)}</span>
          </div>
          <div>
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-mist-500">Stop</div>
            <span className="text-loss">{fmtPrice(signal.stopLoss)}</span>
          </div>
          <div>
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-mist-500">T1 / T2</div>
            <span className="text-profit">{fmtPrice(signal.target1)} / {fmtPrice(signal.target2)}</span>
          </div>
        </div>
      )}
    </Link>
  );
}

export function SignalCardSkeleton() {
  return (
    <div className="glass space-y-3 p-4">
      <div className="flex items-center gap-2.5">
        <div className="skeleton h-9 w-9 rounded-lg" />
        <div className="space-y-1.5">
          <div className="skeleton h-3.5 w-24" />
          <div className="skeleton h-3 w-36" />
        </div>
      </div>
      <div className="skeleton h-8 w-full" />
    </div>
  );
}
