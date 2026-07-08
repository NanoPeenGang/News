"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { useFetch } from "@/components/hooks";
import { Badge, Button, Card, Input, NumberTicker, SectionTitle, Skeleton, cn } from "@/components/ui";
import { fmtMoney, fmtPrice, fmtPercent } from "@/lib/format";

interface PaperData {
  account: { cash: number; startBalance: number; equity: number };
  positions: { id: string; symbol: string; quantity: number; avgPrice: number; last: number; marketValue: number; unrealizedPnl: number }[];
  trades: { id: string; symbol: string; side: string; quantity: number; price: number; pnl: number | null; createdAt: string }[];
  stats: { totalReturn: number; realizedTrades: number; winRate: number | null; profitFactor: number | null; curve: { time: string; equity: number }[] };
}

export default function PaperPage() {
  const { data, loading, refresh } = useFetch<PaperData>("/api/paper");
  const [form, setForm] = useState({ symbol: "", side: "BUY", quantity: "10" });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function trade(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/paper/trade", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: form.symbol, side: form.side, quantity: parseFloat(form.quantity) }),
    });
    const d = await res.json();
    setMsg(res.ok ? { text: `Filled at $${fmtPrice(d.fillPrice)}`, ok: true } : { text: d.error, ok: false });
    if (res.ok) void refresh();
    setTimeout(() => setMsg(null), 5000);
  }

  const s = data?.stats;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-mist-100">
          <FlaskConical size={20} className="text-teal-glow" /> Paper Trading
        </h1>
        <p className="text-sm text-mist-400">A $100,000 simulated account. Practice the scanner&apos;s signals risk-free.</p>
      </div>

      {loading && <Skeleton className="h-40 w-full" />}

      {data && (
        <>
          <div className="tnum grid grid-cols-2 gap-3 font-mono text-sm lg:grid-cols-5">
            <Stat label="Equity" value={fmtMoney(data.account.equity)} big />
            <Stat label="Cash" value={fmtMoney(data.account.cash)} />
            <Stat label="Total Return" value={fmtPercent(s?.totalReturn ?? 0)} tone={(s?.totalReturn ?? 0) >= 0 ? "up" : "down"} />
            <Stat label="Win Rate" value={s?.winRate !== null && s?.winRate !== undefined ? `${s.winRate.toFixed(0)}%` : "—"} />
            <Stat label="Profit Factor" value={s?.profitFactor ? s.profitFactor.toFixed(2) : "—"} />
          </div>

          {s && s.curve.length > 1 && (
            <Card>
              <SectionTitle>Equity Curve (realized)</SectionTitle>
              <EquityCurve curve={s.curve} start={data.account.startBalance} />
            </Card>
          )}

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <div>
                <SectionTitle>Open Positions</SectionTitle>
                <Card className="overflow-x-auto p-0">
                  <table className="w-full min-w-[480px] text-xs">
                    <thead className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-mist-500">
                      <tr>{["Symbol", "Qty", "Avg Cost", "Last", "Mkt Value", "Unrealized"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
                    </thead>
                    <tbody className="tnum divide-y divide-white/[0.04] font-mono">
                      {data.positions.length === 0 && (
                        <tr><td colSpan={6} className="p-5 text-center font-sans text-mist-400">No open positions. Place a paper order or trade a signal.</td></tr>
                      )}
                      {data.positions.map((p) => (
                        <tr key={p.id} className="hover:bg-ink-700/30">
                          <td className="px-3 py-2"><Link href={`/ticker/${p.symbol}`} className="font-semibold text-mist-100 hover:text-teal-glow">{p.symbol}</Link></td>
                          <td className="px-3 py-2 text-mist-300">{p.quantity}</td>
                          <td className="px-3 py-2 text-mist-300">{fmtPrice(p.avgPrice)}</td>
                          <td className="px-3 py-2"><NumberTicker value={p.last} /></td>
                          <td className="px-3 py-2 text-mist-300">{fmtMoney(p.marketValue)}</td>
                          <td className={cn("px-3 py-2", p.unrealizedPnl >= 0 ? "text-profit" : "text-loss")}>{fmtMoney(p.unrealizedPnl)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>

              <div>
                <SectionTitle>Trade History</SectionTitle>
                <Card className="max-h-80 overflow-y-auto p-0">
                  <table className="w-full text-xs">
                    <tbody className="tnum divide-y divide-white/[0.04] font-mono">
                      {data.trades.length === 0 && <tr><td className="p-5 text-center font-sans text-mist-400">No trades yet.</td></tr>}
                      {data.trades.map((t) => (
                        <tr key={t.id} className="hover:bg-ink-700/30">
                          <td className="px-3 py-2 font-semibold text-mist-100">{t.symbol}</td>
                          <td className={cn("px-3 py-2", t.side === "BUY" ? "text-profit" : "text-loss")}>{t.side}</td>
                          <td className="px-3 py-2 text-mist-300">{t.quantity} @ {fmtPrice(t.price)}</td>
                          <td className={cn("px-3 py-2", (t.pnl ?? 0) >= 0 ? "text-profit" : "text-loss")}>{t.pnl !== null ? fmtMoney(t.pnl) : ""}</td>
                          <td className="px-3 py-2 text-right font-sans text-[10px] text-mist-500">{new Date(t.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            </div>

            <div>
              <SectionTitle>Place Paper Order</SectionTitle>
              <Card>
                <form onSubmit={trade} className="space-y-3">
                  <Input placeholder="Symbol" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} required className="font-mono uppercase" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })} className="rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-mist-100">
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                    </select>
                    <Input type="number" min="1" placeholder="Qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                  </div>
                  {msg && <p className={cn("text-xs", msg.ok ? "text-profit" : "text-loss")}>{msg.text}</p>}
                  <Button type="submit" className="w-full">Execute at market</Button>
                  <p className="text-[10px] leading-relaxed text-mist-500">
                    Simulated fills at the live quote. Short selling isn&apos;t simulated — SELL closes long positions.
                  </p>
                </form>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone, big }: { label: string; value: string; tone?: "up" | "down"; big?: boolean }) {
  return (
    <div className="glass p-3">
      <div className="mb-1 font-sans text-[10px] uppercase tracking-wider text-mist-500">{label}</div>
      <div className={cn(big ? "text-lg" : "text-base", "font-semibold", tone === "up" ? "text-profit" : tone === "down" ? "text-loss" : "text-mist-100")}>
        {value}
      </div>
    </div>
  );
}

function EquityCurve({ curve, start }: { curve: { time: string; equity: number }[]; start: number }) {
  const points = [{ time: "", equity: start }, ...curve];
  const min = Math.min(...points.map((p) => p.equity));
  const max = Math.max(...points.map((p) => p.equity));
  const range = max - min || 1;
  const w = 600;
  const h = 120;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (points.length - 1)) * w} ${h - ((p.equity - min) / range) * (h - 10) - 5}`)
    .join(" ");
  const up = points[points.length - 1].equity >= start;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Equity curve">
      <path d={path} fill="none" stroke={up ? "#22C55E" : "#EF4444"} strokeWidth="2" strokeLinejoin="round" />
      <line x1="0" x2={w} y1={h - ((start - min) / range) * (h - 10) - 5} y2={h - ((start - min) / range) * (h - 10) - 5} stroke="#5B6980" strokeWidth="1" strokeDasharray="4 4" />
    </svg>
  );
}
