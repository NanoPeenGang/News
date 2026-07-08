"use client";

import { useState } from "react";
import Link from "next/link";
import { NotebookPen, Plus, Sparkles, X } from "lucide-react";
import { useFetch } from "@/components/hooks";
import { Badge, Button, Card, Input, Markdown, Modal, SectionTitle, Skeleton, cn } from "@/components/ui";
import { fmtMoney, fmtPrice, SETUP_LABELS } from "@/lib/format";

interface Entry {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  stopLoss: number | null;
  pnl: number | null;
  rMultiple: number | null;
  notes: string | null;
  mistakes: string | null;
  openedAt: string;
  closedAt: string | null;
  signal?: { setupType: string; direction: string } | null;
}

interface Report {
  id: string;
  content: string;
  createdAt: string;
}

const MISTAKE_TAGS = ["moved-stop", "oversized", "chased", "no-plan", "revenge-trade", "early-exit"];

export default function JournalPage() {
  const { data, loading, refresh } = useFetch<{ entries: Entry[] }>("/api/journal");
  const reports = useFetch<{ reports: Report[] }>("/api/journal/coaching");
  const [showNew, setShowNew] = useState(false);
  const [closing, setClosing] = useState<Entry | null>(null);
  const [generating, setGenerating] = useState(false);
  const [coachError, setCoachError] = useState("");

  const entries = data?.entries ?? [];
  const closed = entries.filter((e) => e.closedAt);
  const wins = closed.filter((e) => (e.pnl ?? 0) > 0);
  const totalPnl = closed.reduce((a, e) => a + (e.pnl ?? 0), 0);
  const rVals = closed.map((e) => e.rMultiple).filter((r): r is number => r !== null);

  async function generateReport() {
    setGenerating(true);
    setCoachError("");
    const res = await fetch("/api/journal/coaching", { method: "POST" });
    const d = await res.json();
    if (!res.ok) setCoachError(d.error ?? "Failed");
    await reports.refresh();
    setGenerating(false);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-mist-100">
            <NotebookPen size={20} className="text-teal-glow" /> Trade Journal
          </h1>
          <p className="text-sm text-mist-400">Log every trade — the AI coach reviews your patterns weekly.</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="flex items-center gap-1.5"><Plus size={14} /> Log trade</Button>
      </div>

      {/* Stats strip */}
      <div className="tnum grid grid-cols-2 gap-3 font-mono text-sm sm:grid-cols-4">
        <Stat label="Closed trades" value={String(closed.length)} />
        <Stat label="Win rate" value={closed.length ? `${((wins.length / closed.length) * 100).toFixed(0)}%` : "—"} />
        <Stat label="Total P&L" value={fmtMoney(totalPnl)} tone={totalPnl >= 0 ? "up" : "down"} />
        <Stat label="Avg R" value={rVals.length ? `${(rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(2)}R` : "—"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle>Trades</SectionTitle>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-xs">
              <thead className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-mist-500">
                <tr>
                  {["Symbol", "Side", "Qty", "Entry", "Exit", "P&L", "R", ""].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="tnum divide-y divide-white/[0.04] font-mono">
                {loading && (
                  <tr><td colSpan={8} className="p-3"><Skeleton className="h-24 w-full" /></td></tr>
                )}
                {!loading && entries.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center font-sans text-mist-400">No trades yet. Log one manually or one-click from any signal page.</td></tr>
                )}
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-ink-700/30">
                    <td className="px-3 py-2">
                      <Link href={`/ticker/${e.symbol}`} className="font-semibold text-mist-100 hover:text-teal-glow">{e.symbol}</Link>
                      {e.signal && <span className="ml-1.5 font-sans text-[9px] text-mist-500">{SETUP_LABELS[e.signal.setupType]}</span>}
                    </td>
                    <td className={cn("px-3 py-2", e.side === "BUY" ? "text-profit" : "text-loss")}>{e.side}</td>
                    <td className="px-3 py-2 text-mist-300">{e.quantity}</td>
                    <td className="px-3 py-2 text-mist-300">{fmtPrice(e.entryPrice)}</td>
                    <td className="px-3 py-2 text-mist-300">{e.exitPrice !== null ? fmtPrice(e.exitPrice) : "open"}</td>
                    <td className={cn("px-3 py-2", (e.pnl ?? 0) > 0 ? "text-profit" : e.pnl !== null ? "text-loss" : "text-mist-500")}>
                      {e.pnl !== null ? fmtMoney(e.pnl) : "—"}
                    </td>
                    <td className={cn("px-3 py-2", (e.rMultiple ?? 0) > 0 ? "text-profit" : e.rMultiple !== null ? "text-loss" : "text-mist-500")}>
                      {e.rMultiple !== null ? `${e.rMultiple.toFixed(1)}R` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-sans">
                      {!e.closedAt && (
                        <button onClick={() => setClosing(e)} className="text-teal-glow hover:underline">Close</button>
                      )}
                      {e.mistakes && <Badge tone="amber" className="ml-2">{e.mistakes.split(",")[0]}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div>
          <SectionTitle
            right={
              <button onClick={generateReport} disabled={generating} className="focus-ring flex items-center gap-1 text-xs text-teal-glow hover:underline disabled:opacity-50">
                <Sparkles size={12} /> {generating ? "Reviewing…" : "New review"}
              </button>
            }
          >
            AI Coaching
          </SectionTitle>
          {coachError && (
            <p className="mb-2 text-xs text-amber-warn">
              {coachError} {coachError.includes("Premium") && <Link href="/pricing" className="underline">Upgrade →</Link>}
            </p>
          )}
          <div className="space-y-3">
            {reports.data?.reports.length === 0 && (
              <Card className="py-8 text-center text-xs text-mist-400">
                No coaching reports yet. Close a few trades, then request a review — the AI looks for patterns and rule violations.
              </Card>
            )}
            {reports.data?.reports.map((r) => (
              <Card key={r.id}>
                <div className="mb-2 text-[10px] uppercase tracking-wider text-mist-500">{new Date(r.createdAt).toLocaleDateString()}</div>
                <Markdown text={r.content} />
              </Card>
            ))}
          </div>
        </div>
      </div>

      <NewTradeModal open={showNew} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); void refresh(); }} />
      <CloseTradeModal entry={closing} onClose={() => setClosing(null)} onSaved={() => { setClosing(null); void refresh(); }} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="glass p-3">
      <div className="mb-1 font-sans text-[10px] uppercase tracking-wider text-mist-500">{label}</div>
      <div className={cn("text-base font-semibold", tone === "up" ? "text-profit" : tone === "down" ? "text-loss" : "text-mist-100")}>{value}</div>
    </div>
  );
}

function NewTradeModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ symbol: "", side: "BUY", entryPrice: "", quantity: "", stopLoss: "", notes: "" });
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        symbol: form.symbol,
        side: form.side,
        entryPrice: parseFloat(form.entryPrice),
        quantity: parseFloat(form.quantity),
        stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : undefined,
        notes: form.notes || undefined,
      }),
    });
    if (!res.ok) return setError((await res.json()).error ?? "Failed");
    setForm({ symbol: "", side: "BUY", entryPrice: "", quantity: "", stopLoss: "", notes: "" });
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="mb-4 text-lg font-bold text-mist-100">Log a trade</h2>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Symbol" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} required className="font-mono uppercase" />
          <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })} className="rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-mist-100">
            <option value="BUY">BUY (long)</option>
            <option value="SELL">SELL (short)</option>
          </select>
          <Input type="number" step="0.01" placeholder="Entry price" value={form.entryPrice} onChange={(e) => setForm({ ...form, entryPrice: e.target.value })} required />
          <Input type="number" step="1" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          <Input type="number" step="0.01" placeholder="Stop-loss (for R)" value={form.stopLoss} onChange={(e) => setForm({ ...form, stopLoss: e.target.value })} className="col-span-2" />
        </div>
        <textarea
          placeholder="Why did you take this trade? (plan, setup, emotion)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-ink-800/80 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500"
        />
        {error && <p className="text-xs text-loss">{error}</p>}
        <Button type="submit" className="w-full">Save trade</Button>
      </form>
    </Modal>
  );
}

function CloseTradeModal({ entry, onClose, onSaved }: { entry: Entry | null; onClose: () => void; onSaved: () => void }) {
  const [exitPrice, setExitPrice] = useState("");
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!entry) return;
    const res = await fetch(`/api/journal/${entry.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ exitPrice: parseFloat(exitPrice), mistakes: mistakes.join(",") || undefined, notes: notes || undefined }),
    });
    if (!res.ok) return setError((await res.json()).error ?? "Failed");
    setExitPrice("");
    setMistakes([]);
    setNotes("");
    onSaved();
  }

  return (
    <Modal open={!!entry} onClose={onClose}>
      <h2 className="mb-1 text-lg font-bold text-mist-100">Close {entry?.symbol}</h2>
      <p className="mb-4 text-xs text-mist-400">Honest tagging is what makes the AI coaching useful.</p>
      <form onSubmit={save} className="space-y-3">
        <Input type="number" step="0.01" placeholder="Exit price" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} required autoFocus />
        <div>
          <span className="mb-1.5 block text-[11px] text-mist-400">Rule violations (tag honestly)</span>
          <div className="flex flex-wrap gap-1.5">
            {MISTAKE_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setMistakes((m) => (m.includes(tag) ? m.filter((t) => t !== tag) : [...m, tag]))}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  mistakes.includes(tag) ? "border-amber-warn/50 bg-amber-warn/15 text-amber-warn" : "border-white/10 text-mist-400 hover:text-mist-200"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <textarea
          placeholder="Exit notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-ink-800/80 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500"
        />
        {error && <p className="text-xs text-loss">{error}</p>}
        <Button type="submit" className="w-full">Close trade</Button>
      </form>
    </Modal>
  );
}
