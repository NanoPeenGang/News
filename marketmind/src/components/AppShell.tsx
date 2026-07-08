"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Radar, Zap, ListChecks, Bot, GraduationCap, NotebookPen,
  FlaskConical, Settings, Shield, Bell, LogOut, CreditCard, X, Menu,
} from "lucide-react";
import { useLive } from "./Providers";
import { Badge, Button, Modal, cn } from "./ui";
import { TickerTape } from "./TickerTape";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scanner", label: "Scanner", icon: Radar },
  { href: "/signals", label: "Signals", icon: Zap },
  { href: "/watchlists", label: "Watchlists", icon: ListChecks },
  { href: "/analyst", label: "AI Analyst", icon: Bot, premium: true },
  { href: "/learn", label: "Learning Center", icon: GraduationCap },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/paper", label: "Paper Trading", icon: FlaskConical },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = NAV.filter((n) => ["/dashboard", "/scanner", "/signals", "/analyst", "/learn"].includes(n.href));

function DisclaimerGate() {
  const [ack, setAck] = useState<boolean | null>(null);
  useEffect(() => {
    setAck(localStorage.getItem("mm-disclaimer-ack") === "1");
  }, []);
  if (ack !== false) return null;
  return (
    <Modal open onClose={() => {}} closable={false}>
      <div className="mb-3 flex items-center gap-2 text-amber-warn">
        <Shield size={20} />
        <h2 className="text-lg font-bold text-mist-100">Before you begin</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-mist-300">
        <p>
          <strong className="text-mist-100">MarketMind is an analysis and education tool. It is not financial advice.</strong>
        </p>
        <p>
          Signals describe technical setup conditions — they are probabilistic observations, never predictions or recommendations to
          buy or sell any security. No signal, score, or AI-generated analysis guarantees any outcome.
        </p>
        <p>
          Trading involves <strong className="text-mist-100">substantial risk of loss</strong> and is not suitable for everyone. Past
          patterns do not guarantee future results. You are solely responsible for your trading decisions; consider consulting a
          licensed financial advisor.
        </p>
      </div>
      <Button
        className="mt-5 w-full"
        onClick={() => {
          localStorage.setItem("mm-disclaimer-ack", "1");
          setAck(true);
        }}
      >
        I understand — this is education, not advice
      </Button>
    </Modal>
  );
}

function AlertsBell() {
  const { alerts, clearAlert } = useLive();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="focus-ring relative rounded-lg p-2 text-mist-400 transition-colors hover:bg-ink-700/60 hover:text-mist-100"
        aria-label="Alerts"
      >
        <Bell size={17} />
        {alerts.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-glow text-[10px] font-bold text-ink-950">
            {alerts.length}
          </span>
        )}
      </button>
      {open && (
        <div className="glass absolute right-0 top-full z-50 mt-2 w-80 p-2">
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-mist-400">Live Alerts</div>
          {alerts.length === 0 && <div className="p-3 text-sm text-mist-400">No new alerts. They appear here in real time.</div>}
          {alerts.map((a) => (
            <div key={a.id} className="group flex items-start gap-2 rounded-lg p-2 hover:bg-ink-700/50">
              <Badge tone={a.kind === "TARGET_HIT" ? "green" : a.kind === "STOP_THREAT" ? "red" : "teal"}>{a.symbol}</Badge>
              <div className="flex-1 text-xs leading-relaxed text-mist-300">{a.message}</div>
              <button onClick={() => clearAlert(a.id)} className="text-mist-500 opacity-0 transition-opacity hover:text-mist-200 group-hover:opacity-100">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { connected } = useLive();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = session?.user?.role ?? "FREE";

  return (
    <div className="flex min-h-screen">
      <DisclaimerGate />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/[0.06] bg-ink-950/80 backdrop-blur-xl lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-dim/20 text-teal-glow shadow-glow">
            <Zap size={17} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-mist-100">MarketMind</div>
            <div className="text-[10px] uppercase tracking-widest text-mist-500">AI Trading Intelligence</div>
          </div>
        </Link>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {NAV.map(({ href, label, icon: Icon, premium }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                  active ? "bg-teal-dim/15 font-medium text-teal-glow" : "text-mist-400 hover:bg-ink-700/50 hover:text-mist-100"
                )}
              >
                <Icon size={16} className={cn("transition-transform duration-150 group-hover:scale-110", active && "text-teal-glow")} />
                {label}
                {premium && role === "FREE" && <Badge tone="amber" className="ml-auto">PRO</Badge>}
              </Link>
            );
          })}
          {role === "ADMIN" && (
            <Link
              href="/admin"
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname.startsWith("/admin") ? "bg-teal-dim/15 font-medium text-teal-glow" : "text-mist-400 hover:bg-ink-700/50 hover:text-mist-100"
              )}
            >
              <Shield size={16} />
              Admin
            </Link>
          )}
        </nav>
        <div className="border-t border-white/[0.06] p-3">
          {role === "FREE" && (
            <Link href="/pricing" className="glass-hover glass mb-3 block p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-glow">
                <CreditCard size={13} /> Upgrade to Premium
              </div>
              <div className="mt-1 text-[11px] leading-snug text-mist-400">Real-time signals, AI analyst, coaching reports.</div>
            </Link>
          )}
          <div className="flex items-center gap-2 px-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-700 text-xs font-bold text-teal-glow">
              {(session?.user?.name ?? session?.user?.email ?? "?")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-mist-200">{session?.user?.name ?? session?.user?.email}</div>
              <div className="text-[10px] uppercase tracking-wider text-mist-500">{role}</div>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="focus-ring rounded p-1.5 text-mist-500 hover:text-loss" aria-label="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="animate-slide-up absolute inset-y-0 left-0 w-64 border-r border-white/10 bg-ink-950 p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-bold text-mist-100">MarketMind</span>
              <button onClick={() => setMobileOpen(false)} className="text-mist-400"><X size={18} /></button>
            </div>
            {[...NAV, ...(role === "ADMIN" ? [{ href: "/admin", label: "Admin", icon: Shield, premium: false }] : [])].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm", pathname.startsWith(href) ? "bg-teal-dim/15 text-teal-glow" : "text-mist-300")}>
                <Icon size={16} /> {label}
              </Link>
            ))}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-900/80 backdrop-blur-xl">
          <div className="flex h-12 items-center gap-3 px-4">
            <button className="focus-ring rounded p-1 text-mist-300 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Menu">
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1 overflow-hidden">
              <TickerTape />
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn("h-2 w-2 rounded-full", connected ? "animate-pulse-dot bg-profit" : "bg-loss")}
                title={connected ? "Live data connected" : "Live data disconnected — start the worker (npm run worker)"}
              />
              <span className="hidden text-[10px] uppercase tracking-wider text-mist-500 sm:block">{connected ? "Live" : "Offline"}</span>
            </div>
            <AlertsBell />
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 lg:px-6 lg:pb-8">{children}</main>

        {/* Persistent compliance footer */}
        <footer className="hidden border-t border-white/[0.06] px-6 py-2.5 lg:block">
          <p className="text-[11px] leading-relaxed text-mist-500">
            MarketMind is an analysis &amp; education tool — not financial advice. Signals describe setup conditions probabilistically and
            guarantee nothing. Trading involves substantial risk of loss.
          </p>
        </footer>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-ink-950/90 backdrop-blur-xl lg:hidden">
          <div className="flex items-stretch justify-around">
            {MOBILE_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={cn("flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px]", pathname.startsWith(href) ? "text-teal-glow" : "text-mist-500")}>
                <Icon size={18} />
                {label.split(" ")[0]}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
