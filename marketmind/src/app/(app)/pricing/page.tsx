"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Sparkles } from "lucide-react";
import { Badge, Button, Card, cn } from "@/components/ui";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    tagline: "Learn the ropes",
    features: [
      "Signal feed (15-minute delay)",
      "3 watchlist tickers",
      "Beginner curriculum",
      "Trade journal",
      "Paper trading account",
      "Daily market briefing",
    ],
  },
  {
    name: "Premium",
    price: "$49",
    per: "/month",
    tagline: "The full trading desk",
    highlight: true,
    features: [
      "Real-time signals as they fire",
      "Unlimited watchlists & tickers",
      "AI Analyst chat with live technicals",
      "Weekly AI coaching reports",
      "Full curriculum incl. advanced lessons",
      "Priority signal alerts",
    ],
  },
];

export default function PricingPage() {
  const { data: session, update } = useSession();
  const role = session?.user?.role ?? "FREE";
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function upgrade() {
    setBusy(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const d = await res.json();
    setMsg(d.message ?? d.error ?? "");
    setBusy(false);
    if (res.ok) {
      if (d.url) window.location.href = d.url;
      else void update();
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-mist-100">Plans</h1>
        <p className="mt-1 text-sm text-mist-400">Start free. Upgrade when the scanner earns its keep.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {TIERS.map((tier) => (
          <Card key={tier.name} className={cn("relative p-6", tier.highlight && "border-teal-glow/30 shadow-glow")}>
            {tier.highlight && (
              <Badge tone="teal" className="absolute -top-2.5 left-6"><Sparkles size={10} /> Most popular</Badge>
            )}
            <h2 className="text-lg font-bold text-mist-100">{tier.name}</h2>
            <p className="text-xs text-mist-400">{tier.tagline}</p>
            <div className="tnum my-4 font-mono">
              <span className="text-3xl font-bold text-mist-100">{tier.price}</span>
              {tier.per && <span className="text-sm text-mist-400">{tier.per}</span>}
            </div>
            <ul className="space-y-2.5 text-sm text-mist-300">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check size={15} className="mt-0.5 shrink-0 text-teal-glow" /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {tier.highlight ? (
                role === "FREE" ? (
                  <Button onClick={upgrade} disabled={busy} className="w-full">{busy ? "Processing…" : "Upgrade to Premium"}</Button>
                ) : (
                  <Button disabled className="w-full">Current plan ✓</Button>
                )
              ) : (
                <Button variant="ghost" disabled className="w-full">{role === "FREE" ? "Current plan ✓" : "Included"}</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {msg && <p className="text-center text-sm text-teal-glow">{msg}</p>}
      <p className="text-center text-[11px] leading-relaxed text-mist-500">
        Payments are processed by Stripe (integration stubbed in this build — upgrading in demo mode is instant and free).
        Subscriptions can be canceled anytime. MarketMind provides analysis and education, not financial advice.
      </p>
    </div>
  );
}
