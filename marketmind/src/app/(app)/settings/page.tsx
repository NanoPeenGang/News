"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ChevronRight, Link2, Settings, ShieldAlert } from "lucide-react";
import { useFetch } from "@/components/hooks";
import { Badge, Button, Card, Input, SectionTitle, Skeleton, cn } from "@/components/ui";

interface Prefs {
  entryZone: boolean;
  stopThreatened: boolean;
  targetHit: boolean;
  browserPush: boolean;
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const prefsData = useFetch<{ prefs: Prefs }>("/api/alerts/prefs");
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (prefsData.data) setPrefs(prefsData.data.prefs);
  }, [prefsData.data]);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  async function savePrefs(next: Prefs) {
    setPrefs(next);
    if (next.browserPush && typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    await fetch("/api/alerts/prefs", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name || undefined, password: password || undefined }),
    });
    setMsg(res.ok ? "Profile updated." : (await res.json()).error ?? "Failed");
    setPassword("");
    if (res.ok) void update();
    setTimeout(() => setMsg(""), 4000);
  }

  const role = session?.user?.role ?? "FREE";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-mist-100">
          <Settings size={20} className="text-teal-glow" /> Settings
        </h1>
        <p className="text-sm text-mist-400">Profile, plan, and alert preferences.</p>
      </div>

      <Card>
        <SectionTitle>Profile</SectionTitle>
        <form onSubmit={saveProfile} className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-mist-400">{session?.user?.email}</span>
            <Badge tone={role === "FREE" ? "neutral" : "teal"}>{role}</Badge>
            {role === "FREE" && <Link href="/pricing" className="text-xs text-teal-glow underline">Upgrade</Link>}
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] text-mist-400">Display name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-mist-400">New password (leave blank to keep)</span>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} placeholder="••••••••" />
          </label>
          {msg && <p className="text-xs text-teal-glow">{msg}</p>}
          <Button type="submit">Save profile</Button>
        </form>
      </Card>

      <Link href="/settings/connections" className="glass glass-hover flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-dim/15 text-teal-glow">
          <Link2 size={16} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-mist-100">Brokerage Connections</div>
          <div className="text-xs text-mist-400">Link Robinhood (via SnapTrade), Plaid, or the demo brokerage — sync your real portfolio.</div>
        </div>
        <ChevronRight size={16} className="text-mist-500" />
      </Link>

      <Card>
        <SectionTitle>Trading Guardrails</SectionTitle>
        <TradingGuardrails />
      </Card>

      <Card>
        <SectionTitle>Alert Preferences</SectionTitle>
        {!prefs && <Skeleton className="h-32 w-full" />}
        {prefs && (
          <div className="space-y-1">
            <Toggle label="Price enters entry zone" checked={prefs.entryZone} onChange={(v) => savePrefs({ ...prefs, entryZone: v })} />
            <Toggle label="Stop-loss threatened / hit" checked={prefs.stopThreatened} onChange={(v) => savePrefs({ ...prefs, stopThreatened: v })} />
            <Toggle label="Target hit" checked={prefs.targetHit} onChange={(v) => savePrefs({ ...prefs, targetHit: v })} />
            <Toggle label="Browser push notifications" checked={prefs.browserPush} onChange={(v) => savePrefs({ ...prefs, browserPush: v })} />
          </div>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-mist-500">
          Alerts fire for tickers on your watchlists when their signals change state. In-app alerts arrive via the live connection;
          browser push requires notification permission.
        </p>
      </Card>
    </div>
  );
}

function TradingGuardrails() {
  const { data, refresh } = useFetch<{ user: { maxDailyLoss: number | null; riskProfile: string | null } }>("/api/me");
  const [maxLoss, setMaxLoss] = useState("");
  const [profile, setProfile] = useState("");
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (data?.user && !loaded) {
      setMaxLoss(data.user.maxDailyLoss?.toString() ?? "");
      setProfile(data.user.riskProfile ?? "");
      setLoaded(true);
    }
  }, [data, loaded]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        maxDailyLoss: maxLoss ? Number(maxLoss) : null,
        riskProfile: profile || null,
      }),
    });
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] text-mist-400">Max daily loss ($) — locks live orders for the day when hit</span>
          <Input type="number" min={1} step="1" placeholder="e.g. 500 (blank = off)" value={maxLoss} onChange={(e) => setMaxLoss(e.target.value)} className="tnum font-mono" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-mist-400">Risk profile — used by the AI Portfolio Health review</span>
          <select value={profile} onChange={(e) => setProfile(e.target.value)} className="w-full rounded-lg border border-white/10 bg-ink-800/80 px-3 py-2 text-sm text-mist-100">
            <option value="">Not set</option>
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit">Save guardrails</Button>
        {saved && <span className="text-xs text-profit">Saved ✓</span>}
      </div>
      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-mist-500">
        <ShieldAlert size={13} className="mt-0.5 shrink-0" />
        The daily loss guard counts realized P&amp;L from synced brokerage trades. When tripped, order placement locks until the next
        day — a cooling-off period, not a punishment.
      </p>
    </form>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="focus-ring flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-left text-sm text-mist-200 transition-colors hover:bg-ink-700/40"
    >
      {label}
      <span className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-teal-dim" : "bg-ink-600")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  );
}
