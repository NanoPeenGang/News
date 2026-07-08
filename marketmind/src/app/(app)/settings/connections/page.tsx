"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, Link2, RefreshCw, ShieldAlert, Trash2, Unplug } from "lucide-react";
import { useFetch } from "@/components/hooks";
import { Badge, Button, Card, SectionTitle, Skeleton, cn } from "@/components/ui";
import { fmtMoney, timeAgo } from "@/lib/format";

interface Connection {
  id: string;
  provider: string;
  status: "ACTIVE" | "EXPIRED";
  institution: string;
  accountMask: string;
  supportsTrading: boolean;
  cash: number;
  buyingPower: number;
  equity: number;
  lastSyncAt: string | null;
  createdAt: string;
}

interface ProviderInfo {
  name: string;
  displayName: string;
  supportsTrading: boolean;
  configured: boolean;
}

function ConnectionsInner() {
  const params = useSearchParams();
  const { data, loading, refresh } = useFetch<{ connections: Connection[]; providers: ProviderInfo[] }>("/api/brokerage/connections");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(params.get("error") ?? "");
  const justConnected = params.get("connected") === "1";

  async function connect(provider: string) {
    setBusy(provider);
    setError("");
    const res = await fetch("/api/brokerage/connections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const d = await res.json();
    setBusy(null);
    if (!res.ok) return setError(d.error ?? "Could not start the connection flow");
    window.location.href = d.url; // hosted auth portal (provider-side)
  }

  async function syncNow(id: string) {
    setBusy(id);
    setError("");
    const res = await fetch(`/api/brokerage/connections/${id}`, { method: "POST" });
    if (!res.ok) setError((await res.json()).error ?? "Sync failed");
    await refresh();
    setBusy(null);
  }

  async function disconnect(id: string, institution: string) {
    if (!confirm(`Disconnect ${institution} and permanently delete all synced positions, orders, and activity from MarketMind?`)) return;
    setBusy(id);
    await fetch(`/api/brokerage/connections/${id}`, { method: "DELETE" });
    await refresh();
    setBusy(null);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-mist-400 hover:text-teal-glow">
        <ArrowLeft size={14} /> Settings
      </Link>
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-mist-100">
          <Link2 size={20} className="text-teal-glow" /> Brokerage Connections
        </h1>
        <p className="text-sm text-mist-400">
          Link your brokerage to sync your real portfolio. You authenticate on the provider&apos;s secure portal — MarketMind never
          sees or stores your brokerage credentials, only encrypted, revocable access tokens.
        </p>
      </div>

      {justConnected && (
        <Card className="border-profit/25 bg-profit/5 text-sm text-profit">Brokerage connected and synced. View it on the <Link href="/portfolio" className="underline">Portfolio page</Link>.</Card>
      )}
      {error && <Card className="border-loss/25 bg-loss/5 text-sm text-loss">{decodeURIComponent(error)}</Card>}

      <div>
        <SectionTitle>Linked accounts</SectionTitle>
        {loading && <Skeleton className="h-28 w-full" />}
        {data?.connections.length === 0 && (
          <Card className="py-8 text-center text-sm text-mist-400">No brokerage linked yet — connect one below.</Card>
        )}
        <div className="space-y-3">
          {data?.connections.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-dim/15 text-teal-glow">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-mist-100">{c.institution}</span>
                      <span className="tnum font-mono text-xs text-mist-500">••••{c.accountMask}</span>
                      {c.status === "EXPIRED" ? <Badge tone="amber">Reconnect needed</Badge> : <Badge tone="green">Active</Badge>}
                      {c.supportsTrading ? <Badge tone="teal">Trading</Badge> : <Badge>Read-only</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-mist-500">
                      {c.lastSyncAt ? `Last synced ${timeAgo(c.lastSyncAt)}` : "Never synced"} · equity{" "}
                      <span className="tnum font-mono text-mist-300">{fmtMoney(c.equity)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.status === "EXPIRED" ? (
                    <Button variant="ghost" onClick={() => connect(c.provider)} className="flex items-center gap-1.5 text-xs">
                      <Link2 size={13} /> Reconnect
                    </Button>
                  ) : (
                    <Button variant="ghost" onClick={() => syncNow(c.id)} disabled={busy === c.id} className="flex items-center gap-1.5 text-xs">
                      <RefreshCw size={13} className={busy === c.id ? "animate-spin" : ""} /> Sync now
                    </Button>
                  )}
                  <button
                    onClick={() => disconnect(c.id, c.institution)}
                    className="focus-ring rounded-lg p-2 text-mist-500 transition-colors hover:bg-loss/10 hover:text-loss"
                    title="Disconnect & delete data"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Connect a brokerage</SectionTitle>
        <div className="space-y-3">
          {data?.providers.map((p) => (
            <Card key={p.name} className={cn("flex flex-wrap items-center justify-between gap-3", !p.configured && "opacity-60")}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-mist-100">{p.displayName}</span>
                  {p.supportsTrading ? <Badge tone="teal">Data + trading</Badge> : <Badge>Data only</Badge>}
                  {p.name === "mock" && <Badge tone="amber">Local demo</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-mist-500">
                  {p.name === "snaptrade" && "Official brokerage-connection API. Authenticate with Robinhood on SnapTrade's hosted portal."}
                  {p.name === "plaid" && "Read-only holdings & transactions via Plaid Investments — portfolio tracking without trading."}
                  {p.name === "mock" && "Fake brokerage with a seeded portfolio and instant fills — exercises the entire flow with no API keys."}
                </p>
              </div>
              {p.configured ? (
                <Button onClick={() => connect(p.name)} disabled={busy === p.name} className="flex items-center gap-1.5">
                  <Link2 size={14} /> {busy === p.name ? "Opening…" : "Connect"}
                </Button>
              ) : (
                <span className="text-[11px] text-mist-500">Set {p.name === "snaptrade" ? "SNAPTRADE_*" : "PLAID_*"} env keys</span>
              )}
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-amber-warn/15">
        <div className="flex items-start gap-2.5">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-warn" />
          <div className="text-[11px] leading-relaxed text-mist-400">
            <strong className="text-mist-300">Disclosure:</strong> MarketMind is not a broker-dealer or investment adviser. Any orders
            you place are transmitted to and executed by <em>your</em> brokerage, under your sole direction; MarketMind never places
            orders autonomously. Portfolio data is synced read-only and can be deleted at any time with Disconnect. Trading involves
            substantial risk of loss, including loss of principal. Connection tokens are encrypted at rest; account numbers are stored
            and displayed masked (last 4 only).
          </div>
        </div>
      </Card>
      <div className="flex items-center gap-2 text-xs text-mist-500">
        <Unplug size={13} />
        Disconnecting removes the provider-side authorization and deletes every synced position, order, and activity row from MarketMind.
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense>
      <ConnectionsInner />
    </Suspense>
  );
}
