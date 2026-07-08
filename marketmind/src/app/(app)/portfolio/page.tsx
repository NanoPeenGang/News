"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Link2, RefreshCw, Sparkles } from "lucide-react";
import { useFetch } from "@/components/hooks";
import { useLive } from "@/components/Providers";
import { Badge, Card, InfoTip, Markdown, NumberTicker, SectionTitle, Skeleton, cn } from "@/components/ui";
import { fmtMoney, fmtPercent, fmtPrice, timeAgo } from "@/lib/format";

interface Position {
  symbol: string;
  sector: string;
  quantity: number;
  avgCost: number;
  price: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  dayPnl: number;
  weightPercent: number;
  support: number | null;
  resistance: number | null;
  supportDistPercent: number | null;
  resistanceDistPercent: number | null;
}

interface PortfolioData {
  connected: boolean;
  summary?: { equity: number; cash: number; buyingPower: number; totalPnl: number; dayPnl: number; lastSyncAt: string | null };
  positions?: Position[];
  allocation?: { sector: string; value: number; percent: number }[];
  curve?: { time: string; equity: number }[];
  connections?: { id: string; institution: string; accountMask: string; status: string; supportsTrading: boolean }[];
}

interface BrokerOrder {
  id: string;
  symbol: string;
  side: string;
  orderType: string;
  quantity: number;
  limitPrice: number | null;
  status: string;
  fillPrice: number | null;
  signalId: string | null;
  placedAt: string;
  connection: { institution: string; accountMask: string };
}

const DONUT_COLORS = ["#2DD4BF", "#60A5FA", "#F59E0B", "#A78BFA", "#F472B6", "#34D399", "#FB923C", "#94A3B8", "#38BDF8", "#5B6980"];

export default function PortfolioPage() {
  const { data, loading, refresh } = useFetch<PortfolioData>("/api/portfolio");
  const orders = useFetch<{ orders: BrokerOrder[] }>("/api/brokerage/orders");
  const { quotes } = useLive();
  const [syncing, setSyncing] = useState(false);
  const [health, setHealth] = useState<string | null>(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthError, setHealthError] = useState("");

  // Re-mark positions with streaming live prices between syncs
  const positions = useMemo(() => {
    if (!data?.positions) return [];
    return data.positions.map((p) => {
      const q = quotes.get(p.symbol);
      const price = q?.price ?? p.price;
      return {
        ...p,
        price,
        marketValue: p.quantity * price,
        unrealizedPnl: (price - p.avgCost) * p.quantity,
        unrealizedPnlPercent: p.avgCost > 0 ? ((price - p.avgCost) / p.avgCost) * 100 : 0,
        dayPnl: q ? (q.price - q.prevClose) * p.quantity : p.dayPnl,
      };
    });
  }, [data?.positions, quotes]);

  const live = useMemo(() => {
    if (!data?.summary) return null;
    const marketValue = positions.reduce((a, p) => a + p.marketValue, 0);
    return {
      equity: data.summary.cash + marketValue,
      dayPnl: positions.reduce((a, p) => a + p.dayPnl, 0),
      totalPnl: positions.reduce((a, p) => a + p.unrealizedPnl, 0),
    };
  }, [positions, data?.summary]);

  async function syncAll() {
    if (!data?.connections) return;
    setSyncing(true);
    for (const c of data.connections) {
      await fetch(`/api/brokerage/connections/${c.id}`, { method: "POST" });
    }
    await refresh();
    await orders.refresh();
    setSyncing(false);
  }

  async function runHealth() {
    setHealthBusy(true);
    setHealthError("");
    const res = await fetch("/api/portfolio/health", { method: "POST" });
    const d = await res.json();
    if (!res.ok) setHealthError(d.error ?? "Review failed");
    else setHealth(d.review);
    setHealthBusy(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (data && !data.connected) {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <Briefcase size={32} className="mx-auto mb-3 text-teal-glow/60" />
        <h1 className="text-xl font-bold text-mist-100">No brokerage connected</h1>
        <p className="mt-2 text-sm leading-relaxed text-mist-400">
          Link your brokerage to see your real positions, P&amp;L, allocation, and AI portfolio health reviews — synced automatically
          every few minutes.
        </p>
        <Link href="/settings/connections" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-dim px-5 py-2.5 text-sm font-semibold text-ink-950 transition-all hover:bg-teal-soft hover:shadow-glow">
          <Link2 size={15} /> Connect brokerage
        </Link>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-mist-100">
            <Briefcase size={20} className="text-teal-glow" /> Portfolio
          </h1>
          <p className="text-sm text-mist-400">
            {data?.connections?.map((c) => `${c.institution} ••••${c.accountMask}`).join(" · ")}
            {s?.lastSyncAt && <> · synced {timeAgo(s.lastSyncAt)}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings/connections" className="text-xs text-mist-400 hover:text-teal-glow">Manage connections</Link>
          <button
            onClick={syncAll}
            disabled={syncing}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-mist-200 transition-colors hover:border-teal-glow/40 disabled:opacity-50"
          >
            <RefreshCw size={13} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Summary tickers */}
      <div className="tnum grid grid-cols-2 gap-3 font-mono lg:grid-cols-5">
        <SummaryTile label="Total Value" big>
          <NumberTicker value={live?.equity ?? s?.equity ?? 0} className="text-xl font-bold text-mist-100" />
        </SummaryTile>
        <SummaryTile label="Day P&L">
          <span className={cn("text-lg font-semibold", (live?.dayPnl ?? 0) >= 0 ? "text-profit" : "text-loss")}>
            {(live?.dayPnl ?? 0) >= 0 ? "+" : ""}{fmtMoney(live?.dayPnl ?? 0)}
          </span>
        </SummaryTile>
        <SummaryTile label="Total P&L (unrealized)">
          <span className={cn("text-lg font-semibold", (live?.totalPnl ?? 0) >= 0 ? "text-profit" : "text-loss")}>
            {(live?.totalPnl ?? 0) >= 0 ? "+" : ""}{fmtMoney(live?.totalPnl ?? 0)}
          </span>
        </SummaryTile>
        <SummaryTile label="Cash">
          <span className="text-lg font-semibold text-mist-200">{fmtMoney(s?.cash ?? 0)}</span>
        </SummaryTile>
        <SummaryTile label="Buying Power">
          <span className="text-lg font-semibold text-mist-200">{fmtMoney(s?.buyingPower ?? 0)}</span>
        </SummaryTile>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Positions */}
          <div>
            <SectionTitle>Positions</SectionTitle>
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[720px] text-xs">
                <thead className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-mist-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Symbol</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Avg Cost</th>
                    <th className="px-3 py-2 text-right font-medium">Last</th>
                    <th className="px-3 py-2 text-right font-medium">Value</th>
                    <th className="px-3 py-2 text-right font-medium">Unrealized</th>
                    <th className="px-3 py-2 text-right font-medium">% Port</th>
                    <th className="px-3 py-2 text-right font-medium"><InfoTip term="Support/Resistance" label="S / R dist" /></th>
                  </tr>
                </thead>
                <tbody className="tnum divide-y divide-white/[0.04] font-mono">
                  {positions.map((p) => (
                    <tr key={p.symbol} className="transition-colors hover:bg-ink-700/30">
                      <td className="px-3 py-2.5">
                        <Link href={`/ticker/${p.symbol}`} className="font-semibold text-mist-100 hover:text-teal-glow">{p.symbol}</Link>
                        <span className="ml-1.5 font-sans text-[9px] uppercase text-mist-600">{p.sector}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-mist-300">{p.quantity}</td>
                      <td className="px-3 py-2.5 text-right text-mist-400">{fmtPrice(p.avgCost)}</td>
                      <td className="px-3 py-2.5 text-right"><NumberTicker value={p.price} className="text-mist-100" /></td>
                      <td className="px-3 py-2.5 text-right text-mist-200">{fmtMoney(p.marketValue)}</td>
                      <td className={cn("px-3 py-2.5 text-right", p.unrealizedPnl >= 0 ? "text-profit" : "text-loss")}>
                        {fmtMoney(p.unrealizedPnl)}
                        <span className="ml-1 text-[10px] opacity-80">({fmtPercent(p.unrealizedPnlPercent, 1)})</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-mist-300">{p.weightPercent.toFixed(1)}%</td>
                      <td className="px-3 py-2.5 text-right text-[10px] leading-tight">
                        {p.supportDistPercent !== null && <div className="text-profit/80">S −{p.supportDistPercent.toFixed(1)}%</div>}
                        {p.resistanceDistPercent !== null && <div className="text-loss/80">R +{p.resistanceDistPercent.toFixed(1)}%</div>}
                        {p.supportDistPercent === null && p.resistanceDistPercent === null && <span className="text-mist-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Equity curve */}
          {data?.curve && data.curve.length > 1 && (
            <div>
              <SectionTitle>Equity Curve</SectionTitle>
              <Card>
                <CurveSvg curve={data.curve} />
                <p className="mt-1 text-[10px] text-mist-500">Snapshots recorded on each portfolio sync.</p>
              </Card>
            </div>
          )}

          {/* Order audit log */}
          <div>
            <SectionTitle>Order History (audit log)</SectionTitle>
            <Card className="max-h-72 overflow-y-auto p-0">
              <table className="w-full text-xs">
                <tbody className="tnum divide-y divide-white/[0.04] font-mono">
                  {orders.data?.orders.length === 0 && (
                    <tr><td className="p-5 text-center font-sans text-mist-400">No orders placed through MarketMind yet.</td></tr>
                  )}
                  {orders.data?.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-ink-700/30">
                      <td className="px-3 py-2 font-semibold text-mist-100">{o.symbol}</td>
                      <td className={cn("px-3 py-2", o.side === "BUY" ? "text-profit" : "text-loss")}>{o.side}</td>
                      <td className="px-3 py-2 text-mist-300">{o.quantity} @ {o.orderType === "LIMIT" ? fmtPrice(o.limitPrice) : "MKT"}</td>
                      <td className="px-3 py-2">
                        <Badge tone={o.status === "FILLED" ? "green" : o.status === "PENDING" ? "teal" : o.status === "REJECTED" ? "red" : "neutral"}>
                          {o.status}{o.fillPrice ? ` @ ${fmtPrice(o.fillPrice)}` : ""}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-sans text-[10px] text-mist-500">
                        {o.signalId && <Link href={`/signals/${o.signalId}`} className="text-teal-glow hover:underline">from signal</Link>}
                      </td>
                      <td className="px-3 py-2 text-right font-sans text-[10px] text-mist-500">{timeAgo(o.placedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>

        <div className="space-y-5">
          {/* Allocation donut */}
          <div>
            <SectionTitle>Allocation</SectionTitle>
            <Card>
              {data?.allocation && <Donut allocation={data.allocation} />}
            </Card>
          </div>

          {/* AI Portfolio Health */}
          <div>
            <SectionTitle
              right={
                <button onClick={runHealth} disabled={healthBusy} className="focus-ring flex items-center gap-1 text-xs text-teal-glow hover:underline disabled:opacity-50">
                  <Sparkles size={12} /> {healthBusy ? "Reviewing…" : health ? "Re-run" : "Run review"}
                </button>
              }
            >
              AI Portfolio Health
            </SectionTitle>
            <Card>
              {healthError && <p className="text-xs text-amber-warn">{healthError}</p>}
              {!health && !healthError && !healthBusy && (
                <p className="text-xs leading-relaxed text-mist-400">
                  The AI reviews concentration risk, correlated holdings, and how the book aligns with your stated risk profile
                  (set it in <Link href="/settings" className="text-teal-glow underline">Settings</Link>).
                </p>
              )}
              {healthBusy && (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /><Skeleton className="h-3 w-2/3" />
                </div>
              )}
              {health && <Markdown text={health} />}
            </Card>
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-mist-500">
        Portfolio data is synced from your linked brokerage and marked to MarketMind&apos;s live data feed between syncs; values can
        differ slightly from your brokerage app. Analysis and education only — not financial advice.
      </p>
    </div>
  );
}

function SummaryTile({ label, children, big }: { label: string; children: React.ReactNode; big?: boolean }) {
  return (
    <div className={cn("glass p-4", big && "border-teal-glow/20")}>
      <div className="mb-1 font-sans text-[10px] uppercase tracking-wider text-mist-500">{label}</div>
      {children}
    </div>
  );
}

function Donut({ allocation }: { allocation: { sector: string; value: number; percent: number }[] }) {
  const total = allocation.reduce((a, s) => a + s.value, 0) || 1;
  let angle = -90;
  const segs = allocation.map((s, i) => {
    const sweep = (s.value / total) * 360;
    const seg = { ...s, start: angle, sweep, color: DONUT_COLORS[i % DONUT_COLORS.length] };
    angle += sweep;
    return seg;
  });
  const arc = (cx: number, cy: number, r: number, start: number, sweep: number) => {
    const rad = (d: number) => (d * Math.PI) / 180;
    const clamped = Math.min(sweep, 359.9);
    const x1 = cx + r * Math.cos(rad(start));
    const y1 = cy + r * Math.sin(rad(start));
    const x2 = cx + r * Math.cos(rad(start + clamped));
    const y2 = cy + r * Math.sin(rad(start + clamped));
    return `M ${x1} ${y1} A ${r} ${r} 0 ${clamped > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0" role="img" aria-label="Portfolio allocation">
        {segs.map((s) => (
          <path key={s.sector} d={arc(60, 60, 44, s.start + 1, Math.max(s.sweep - 2, 0.5))} fill="none" stroke={s.color} strokeWidth="14" strokeLinecap="butt" />
        ))}
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segs.slice(0, 8).map((s) => (
          <div key={s.sector} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="truncate text-mist-300">{s.sector}</span>
            <span className="tnum ml-auto font-mono text-mist-400">{s.percent.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CurveSvg({ curve }: { curve: { time: string; equity: number }[] }) {
  const min = Math.min(...curve.map((p) => p.equity));
  const max = Math.max(...curve.map((p) => p.equity));
  const range = max - min || 1;
  const w = 600;
  const h = 140;
  const pts = curve.map((p, i) => ({
    x: (i / (curve.length - 1)) * w,
    y: h - 8 - ((p.equity - min) / range) * (h - 20),
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const up = curve[curve.length - 1].equity >= curve[0].equity;
  const color = up ? "#22C55E" : "#EF4444";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Equity curve">
      <defs>
        <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill="url(#eqfill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
