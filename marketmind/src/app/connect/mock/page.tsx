"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Simulated hosted brokerage-auth portal (stands in for SnapTrade's portal in
 * local dev). Demonstrates the exact flow: the user authorizes on the
 * provider's page and returns via our callback — MarketMind never renders a
 * brokerage credential form itself.
 */
function MockPortalInner() {
  const params = useSearchParams();
  const router = useRouter();
  const state = params.get("state") ?? "";
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d1117] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-emerald-500/20 bg-[#161b22] p-6 shadow-2xl">
        <div className="mb-1 flex items-center gap-2 text-emerald-400">
          <Building2 size={18} />
          <span className="text-sm font-bold tracking-wide">Robinwood Securities</span>
        </div>
        <p className="mb-5 text-[11px] uppercase tracking-widest text-slate-500">Demo connection portal</p>

        <div className="mb-5 space-y-3 text-sm leading-relaxed text-slate-300">
          <p>
            <strong className="text-slate-100">MarketMind</strong> is requesting access to your Robinwood brokerage account:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-400">
            <li className="flex items-center gap-2"><ShieldCheck size={13} className="text-emerald-400" /> View balances, positions &amp; cost basis</li>
            <li className="flex items-center gap-2"><ShieldCheck size={13} className="text-emerald-400" /> View orders and account activity</li>
            <li className="flex items-center gap-2"><ShieldCheck size={13} className="text-emerald-400" /> Place orders you explicitly confirm</li>
          </ul>
          <p className="flex items-start gap-2 rounded-lg bg-black/30 p-3 text-[11px] text-slate-400">
            <Lock size={13} className="mt-0.5 shrink-0 text-emerald-400" />
            Your credentials stay with your brokerage. MarketMind receives only a revocable access token (demo account ••••6789).
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1 !bg-emerald-500 hover:!bg-emerald-400"
            disabled={busy || !state}
            onClick={() => {
              setBusy(true);
              window.location.href = `/api/brokerage/callback/mock?state=${encodeURIComponent(state)}`;
            }}
          >
            {busy ? "Authorizing…" : "Authorize access"}
          </Button>
          <Button variant="ghost" onClick={() => router.push("/settings/connections?error=cancelled")}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MockPortalPage() {
  return (
    <Suspense>
      <MockPortalInner />
    </Suspense>
  );
}
