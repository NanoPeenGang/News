import Link from "next/link";
import { redirect } from "next/navigation";
import { Zap, Radar, Bot, GraduationCap, Shield, LineChart, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-5xl px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-dim/20 text-teal-glow shadow-glow">
            <Zap size={17} strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold tracking-tight text-mist-100">MarketMind</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-mist-300 transition-colors hover:text-mist-100">Sign in</Link>
          <Link href="/signup" className="rounded-lg bg-teal-dim px-4 py-2 font-semibold text-ink-950 transition-all hover:bg-teal-soft hover:shadow-glow">
            Get started
          </Link>
        </nav>
      </header>

      <section className="animate-slide-up py-20 text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-teal-glow/20 bg-teal-dim/10 px-3 py-1 text-xs text-teal-glow">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-teal-glow" />
          Autonomous scanner live — every 60 seconds
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-mist-100 sm:text-6xl">
          The market never sleeps.
          <span className="block bg-gradient-to-r from-teal-glow to-blue-400 bg-clip-text text-transparent">Neither does your analyst.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-mist-400">
          MarketMind autonomously scans the market, analyzes charts and technicals, surfaces the strongest trade setups with
          AI-generated entry and exit zones — and coaches you into a better trader while it works.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-teal-dim px-6 py-3 font-semibold text-ink-950 transition-all hover:bg-teal-soft hover:shadow-glow">
            Start free <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="rounded-lg border border-white/10 px-6 py-3 text-mist-200 transition-colors hover:border-white/25">
            Demo login
          </Link>
        </div>
        <p className="mt-4 text-xs text-mist-500">Demo accounts: premium@marketmind.demo / demo1234 · free@marketmind.demo / demo1234</p>
      </section>

      <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: Radar, title: "Autonomous Scanner", body: "Six institutional setup patterns — breakouts, VWAP reclaims, gap-and-go, unusual volume — scored and streamed to you in real time." },
          { icon: LineChart, title: "Entry/Exit Intelligence", body: "Every signal ships with a shaded entry zone, an ATR-based stop, and 2R/3R targets rendered directly on the chart." },
          { icon: Bot, title: "AI Research Analyst", body: "Claude-powered trade theses, risk breakdowns, daily briefings, and a chat analyst with live technicals injected as context." },
          { icon: GraduationCap, title: "Built-in Coaching", body: "A structured curriculum, contextual explainers on every term, and weekly AI reviews of your trade journal." },
          { icon: Zap, title: "Paper Trading", body: "Practice every signal risk-free with a simulated account — win rate, average R, profit factor, equity curve." },
          { icon: Shield, title: "Education-first Guardrails", body: "Probabilistic language, no buy/sell instructions, full AI audit logs. An analysis tool — never financial advice." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="glass glass-hover p-5">
            <Icon size={20} className="mb-3 text-teal-glow" />
            <h3 className="mb-1.5 font-semibold text-mist-100">{title}</h3>
            <p className="text-sm leading-relaxed text-mist-400">{body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-white/[0.06] py-8 text-center text-xs leading-relaxed text-mist-500">
        MarketMind is an analysis and education platform — not financial advice. Signals are probabilistic observations of technical
        conditions and guarantee nothing. Trading involves substantial risk of loss and is not suitable for every investor.
      </footer>
    </div>
  );
}
