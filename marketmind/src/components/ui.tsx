"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { fmtPrice } from "@/lib/format";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("glass p-4", className)}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400">{children}</h2>
      {right}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "teal" | "green" | "red" | "amber" | "blue";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-ink-700/60 text-mist-300 border-white/5",
    teal: "bg-teal-dim/15 text-teal-glow border-teal-glow/20",
    green: "bg-profit/10 text-profit border-profit/20",
    red: "bg-loss/10 text-loss border-loss/25",
    amber: "bg-amber-warn/10 text-amber-warn border-amber-warn/25",
    blue: "bg-blue-500/10 text-blue-400 border-blue-400/20",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: "neutral" | "teal" | "green" | "red" | "amber" }> = {
    WAITING: { label: "Waiting", tone: "neutral" },
    ENTRY_ACTIVE: { label: "Entry Zone Active", tone: "teal" },
    TARGET1_HIT: { label: "Target 1 Hit", tone: "green" },
    TARGET2_HIT: { label: "Target 2 Hit", tone: "green" },
    STOPPED_OUT: { label: "Stopped Out", tone: "red" },
    EXPIRED: { label: "Expired", tone: "neutral" },
  };
  const m = map[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Badge tone={m.tone}>
      {(status === "ENTRY_ACTIVE" || status === "WAITING") && (
        <span className={cn("h-1.5 w-1.5 rounded-full", status === "ENTRY_ACTIVE" ? "animate-pulse-dot bg-teal-glow" : "bg-mist-400")} />
      )}
      {m.label}
    </Badge>
  );
}

export function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2" title={`Setup-conditions score: ${value}/100 — probabilistic, never a guarantee`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-700">
        <div
          className={cn("h-full rounded-full transition-all", value >= 75 ? "bg-teal-glow" : value >= 60 ? "bg-teal-soft" : "bg-mist-500")}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="tnum text-xs text-mist-400">{value}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/** Animated live price with green/red flash on change. */
export function NumberTicker({ value, digits = 2, className }: { value: number; digits?: number; className?: string }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (value > prev.current) setFlash("up");
    else if (value < prev.current) setFlash("down");
    prev.current = value;
    const t = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <span className={cn("tnum rounded px-0.5 font-mono transition-colors", flash === "up" && "animate-flash-up", flash === "down" && "animate-flash-down", className)}>
      {fmtPrice(value, digits)}
    </span>
  );
}

// ---------------- Contextual learning: InfoTip ----------------

export const GLOSSARY: Record<string, string> = {
  RSI: "Relative Strength Index — momentum oscillator from 0–100. Above 70 is traditionally 'overbought', below 30 'oversold'. Best used for divergences and washouts, not as an automatic buy/sell trigger.",
  MACD: "Moving Average Convergence Divergence — the gap between a fast and slow EMA. A rising histogram means momentum is building; crossovers of its signal line are common trend-change cues.",
  VWAP: "Volume-Weighted Average Price — the session's average price weighted by volume. Institutions benchmark fills to it, so reclaiming/losing VWAP often marks a shift in intraday control.",
  EMA: "Exponential Moving Average — a moving average that weights recent prices more heavily. The 9/21 pair tracks short-term trend; 50 and 200 mark intermediate and long-term trend.",
  ATR: "Average True Range — the average size of recent price bars. Used to set stops that respect the stock's normal noise (a stop inside 1 ATR gets hit by randomness).",
  "Bollinger Bands": "Bands 2 standard deviations around a 20-period average. Price at the lower band with an RSI washout is a classic mean-reversion context.",
  "Relative Volume": "Today's volume as a multiple of the average. 2x+ means unusual participation — moves on heavy volume carry more information than quiet drifts.",
  "Entry Zone": "The price band where the setup's risk/reward is favorable. Entering above the zone silently worsens your risk-to-reward ratio.",
  "Stop-Loss": "The price that proves the setup wrong. Its distance from entry determines position size: risk budget ÷ stop distance = shares.",
  "R Multiple": "Profit or loss measured in units of initial risk. Risking $100 and making $250 is +2.5R. Thinking in R separates process from luck.",
  "Risk/Reward": "Potential reward relative to defined risk. Targets here are set at 2R and 3R — a 40% win rate is profitable at 2R if losses are contained to 1R.",
  "Gap %": "How far today's open was from yesterday's close, in percent. Large gaps show an overnight imbalance of buyers/sellers.",
  Confidence: "A 0–100 score of how many setup conditions are met and how strongly. It is a measure of pattern quality, never a probability of profit or a guarantee.",
  "Support/Resistance": "Price areas where buying (support) or selling (resistance) repeatedly appeared, detected here from swing pivots. Levels matter because memory and orders cluster there.",
  "Paper Trading": "Simulated trading with fake money and real prices — the professional way to test a strategy before risking capital.",
  "Profit Factor": "Gross profits ÷ gross losses. Above 1.5 is solid; below 1.0 means the strategy loses money.",
};

export function InfoTip({ term, label }: { term: keyof typeof GLOSSARY | string; label?: string }) {
  const [open, setOpen] = useState(false);
  const text = GLOSSARY[term] ?? term;
  return (
    <span className="relative inline-flex items-center">
      {label && <span>{label}</span>}
      <button
        type="button"
        aria-label={`Explain ${term}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="focus-ring ml-1 text-mist-500 transition-colors hover:text-teal-glow"
      >
        <Info size={12} />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-white/10 bg-ink-800 p-3 text-xs font-normal normal-case leading-relaxed text-mist-200 shadow-xl">
          <span className="mb-1 block font-semibold text-teal-glow">{term}</span>
          {text}
        </span>
      )}
    </span>
  );
}

// ---------------- Tiny markdown renderer (headings, bold, lists) ----------------

export function Markdown({ text, className }: { text: string; className?: string }) {
  const html = renderMarkdown(text);
  return <div className={cn("prose-mm", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function renderMarkdown(md: string): string {
  const lines = escapeHtml(md).split("\n");
  const out: string[] = [];
  let inList: "ul" | "ol" | null = null;
  const closeList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };
  for (const line of lines) {
    const h = line.match(/^(#{1,3})\s+(.*)/);
    const ul = line.match(/^\s*[-*]\s+(.*)/);
    const ol = line.match(/^\s*\d+\.\s+(.*)/);
    if (h) {
      closeList();
      const lvl = h[1].length;
      out.push(`<h${lvl + 1}>${inline(h[2])}</h${lvl + 1}>`);
    } else if (ul) {
      if (inList !== "ul") {
        closeList();
        out.push("<ul>");
        inList = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
    } else if (ol) {
      if (inList !== "ol") {
        closeList();
        out.push("<ol>");
        inList = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

export function Modal({ open, onClose, children, closable = true }: { open: boolean; onClose: () => void; children: React.ReactNode; closable?: boolean }) {
  // Portal to <body>: ancestors with backdrop-filter (glass cards) create new
  // containing blocks that would otherwise trap this fixed overlay behind them
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closable ? onClose : undefined} />
      <div className="glass animate-slide-up relative max-h-[85vh] w-full max-w-lg overflow-y-auto p-6">
        {closable && (
          <button onClick={onClose} className="focus-ring absolute right-4 top-4 text-mist-400 hover:text-mist-100" aria-label="Close">
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const variants = {
    primary:
      "bg-teal-dim text-ink-950 font-semibold hover:bg-teal-soft hover:shadow-glow disabled:opacity-40 disabled:hover:shadow-none",
    ghost: "border border-white/10 text-mist-200 hover:border-white/25 hover:bg-ink-700/50",
    danger: "bg-loss/15 text-loss border border-loss/30 hover:bg-loss/25",
  };
  return (
    <button
      className={cn("focus-ring rounded-lg px-4 py-2 text-sm transition-all duration-150 active:scale-[0.98]", variants[variant], className)}
      {...props}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-white/10 bg-ink-800/80 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500",
        props.className
      )}
    />
  );
}
