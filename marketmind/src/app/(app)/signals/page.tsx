"use client";

import { useState } from "react";
import { useSignals } from "@/components/hooks";
import { SignalCard, SignalCardSkeleton } from "@/components/SignalCard";
import { Badge, Card, cn } from "@/components/ui";
import { SETUP_LABELS } from "@/lib/format";

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "open", label: "Open" },
  { key: "ENTRY_ACTIVE", label: "Entry Active" },
  { key: "closed", label: "Closed" },
];

export default function SignalsPage() {
  const [status, setStatus] = useState("open");
  const [setup, setSetup] = useState("");
  const query = new URLSearchParams({ limit: "60", ...(status && { status }), ...(setup && { setup }) }).toString();
  const { signals, delayed } = useSignals(query);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-mist-100">Signals</h1>
          <p className="text-sm text-mist-400">Every setup the scanner has flagged, with full lifecycle history.</p>
        </div>
        {delayed && <Badge tone="amber">Free tier — 15 min delay</Badge>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={cn(
              "focus-ring rounded-full border px-3 py-1 text-xs transition-colors",
              status === f.key ? "border-teal-glow/40 bg-teal-dim/15 text-teal-glow" : "border-white/10 text-mist-400 hover:text-mist-100"
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="mx-1 text-mist-600">·</span>
        <select
          value={setup}
          onChange={(e) => setSetup(e.target.value)}
          className="rounded-full border border-white/10 bg-ink-800 px-3 py-1 text-xs text-mist-300"
        >
          <option value="">All setups</option>
          {Object.entries(SETUP_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {signals === null && Array.from({ length: 5 }).map((_, i) => <SignalCardSkeleton key={i} />)}
        {signals?.length === 0 && (
          <Card className="py-12 text-center text-sm text-mist-400">No signals match these filters yet.</Card>
        )}
        {signals?.map((s) => (
          <div key={s.id} className="animate-fade-in">
            <SignalCard signal={s} />
          </div>
        ))}
      </div>
    </div>
  );
}
