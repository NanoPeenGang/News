"use client";

import { Shield, Activity, Users, Zap, Bot } from "lucide-react";
import { useFetch } from "@/components/hooks";
import { Badge, Card, SectionTitle, Skeleton, cn } from "@/components/ui";
import { SETUP_LABELS, STATUS_LABELS } from "@/lib/format";

interface AdminStats {
  users: { total: number; byRole: { role: string; count: number }[]; recent: { email: string; name: string | null; role: string; createdAt: string }[] };
  signals: {
    total: number;
    open: number;
    byStatus: { status: string; count: number }[];
    setupPerformance: { setup: string; t1: number; t2: number; stopped: number; expired: number; open: number; resolved: number; hitRate: number | null }[];
  };
  ai: { auditLogCount: number };
  system: { worker: { ok: boolean; provider?: string; uptime?: number }; database: boolean; provider: string };
}

export default function AdminPage() {
  const { data, loading, error } = useFetch<AdminStats>("/api/admin/stats");

  if (error) {
    return (
      <Card className="mx-auto max-w-md py-10 text-center">
        <Shield size={24} className="mx-auto mb-2 text-loss" />
        <p className="text-sm text-mist-300">{error}</p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-mist-100">
          <Shield size={20} className="text-teal-glow" /> Admin
        </h1>
        <p className="text-sm text-mist-400">User metrics, signal performance, and system health.</p>
      </div>

      {loading && <Skeleton className="h-64 w-full" />}

      {data && (
        <>
          <div className="tnum grid grid-cols-2 gap-3 font-mono text-sm lg:grid-cols-4">
            <StatCard icon={Users} label="Total users" value={String(data.users.total)} sub={data.users.byRole.map((r) => `${r.count} ${r.role.toLowerCase()}`).join(" · ")} />
            <StatCard icon={Zap} label="Signals generated" value={String(data.signals.total)} sub={`${data.signals.open} open now`} />
            <StatCard icon={Bot} label="AI outputs logged" value={String(data.ai.auditLogCount)} sub="full audit trail" />
            <StatCard
              icon={Activity}
              label="Engine"
              value={data.system.worker.ok ? "Online" : "Offline"}
              sub={data.system.worker.ok ? `${data.system.provider} · up ${Math.floor((data.system.worker.uptime ?? 0) / 60)}m` : "start: npm run worker"}
              tone={data.system.worker.ok ? "up" : "down"}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <SectionTitle>Signal Performance by Setup</SectionTitle>
              <Card className="overflow-x-auto p-0">
                <table className="w-full text-xs">
                  <thead className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-mist-500">
                    <tr>
                      {["Setup", "Open", "T1", "T2", "Stopped", "Hit Rate"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium last:text-right">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="tnum divide-y divide-white/[0.04] font-mono">
                    {data.signals.setupPerformance.length === 0 && (
                      <tr><td colSpan={6} className="p-5 text-center font-sans text-mist-400">No signals yet.</td></tr>
                    )}
                    {data.signals.setupPerformance.map((s) => (
                      <tr key={s.setup} className="hover:bg-ink-700/30">
                        <td className="px-3 py-2 font-sans text-mist-200">{SETUP_LABELS[s.setup] ?? s.setup}</td>
                        <td className="px-3 py-2 text-mist-400">{s.open}</td>
                        <td className="px-3 py-2 text-profit">{s.t1}</td>
                        <td className="px-3 py-2 text-profit">{s.t2}</td>
                        <td className="px-3 py-2 text-loss">{s.stopped}</td>
                        <td className={cn("px-3 py-2 text-right font-semibold", s.hitRate !== null && s.hitRate >= 50 ? "text-profit" : "text-mist-300")}>
                          {s.hitRate !== null ? `${s.hitRate.toFixed(0)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <p className="mt-2 text-[10px] text-mist-500">Hit rate = (T1 + T2 hits) ÷ resolved signals. Descriptive stats, not a promise of future performance.</p>
            </div>

            <div className="space-y-5">
              <div>
                <SectionTitle>Signals by Status</SectionTitle>
                <Card className="flex flex-wrap gap-2">
                  {data.signals.byStatus.map((s) => (
                    <Badge key={s.status} tone={s.status.includes("TARGET") ? "green" : s.status === "STOPPED_OUT" ? "red" : "neutral"}>
                      {STATUS_LABELS[s.status] ?? s.status}: {s.count}
                    </Badge>
                  ))}
                </Card>
              </div>
              <div>
                <SectionTitle>Recent Signups</SectionTitle>
                <Card className="divide-y divide-white/[0.04] p-0">
                  {data.users.recent.map((u) => (
                    <div key={u.email} className="flex items-center gap-3 px-4 py-2 text-xs">
                      <span className="flex-1 truncate text-mist-200">{u.name ?? u.email}</span>
                      <Badge tone={u.role === "ADMIN" ? "red" : u.role === "PREMIUM" ? "teal" : "neutral"}>{u.role}</Badge>
                      <span className="text-[10px] text-mist-500">{new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </Card>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: typeof Shield; label: string; value: string; sub?: string; tone?: "up" | "down" }) {
  return (
    <div className="glass p-4">
      <div className="mb-1.5 flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-wider text-mist-500">
        <Icon size={12} /> {label}
      </div>
      <div className={cn("text-xl font-bold", tone === "up" ? "text-profit" : tone === "down" ? "text-loss" : "text-mist-100")}>{value}</div>
      {sub && <div className="mt-0.5 font-sans text-[10px] text-mist-500">{sub}</div>}
    </div>
  );
}
