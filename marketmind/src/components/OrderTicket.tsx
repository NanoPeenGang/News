"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Lock, ShieldAlert } from "lucide-react";
import { Button, Card, Input, Modal, cn } from "./ui";
import { useFetch } from "./hooks";
import { fmtMoney, fmtPrice } from "@/lib/format";
import type { LiveSignal } from "./Providers";

interface TradingStatus {
  enabled: boolean;
  flagEnabled: boolean;
  premium: boolean;
  connection: { id: string; institution: string; accountMask: string; cash: number; buyingPower: number; equity: number } | null;
  maxDailyLoss: number | null;
  todayRealizedPnl: number;
  lossGuardTripped: boolean;
  reason: string | null;
}

function newIdempotencyKey(): string {
  return `mm-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * "Trade this setup" — pre-fills an order ticket from the signal and the risk
 * calculator's sizing model. Two-step by design: edit → review-and-confirm.
 * There is no code path that submits without the explicit confirm click.
 */
export function TradeSetupButton({ signal }: { signal: LiveSignal }) {
  const { data: status } = useFetch<TradingStatus>("/api/brokerage/trading-status");
  const [open, setOpen] = useState(false);

  if (!status) return null;

  if (!status.flagEnabled) return null; // feature-flagged off: hide entirely

  if (status.lossGuardTripped) {
    return (
      <div className="rounded-lg border border-amber-warn/25 bg-amber-warn/5 p-3 text-xs leading-relaxed text-amber-warn">
        <span className="flex items-center gap-1.5 font-semibold"><Lock size={13} /> Trading locked for today</span>
        <p className="mt-1">{status.reason}</p>
      </div>
    );
  }

  if (!status.enabled) {
    return (
      <div className="rounded-lg border border-white/10 bg-ink-800/50 p-3 text-xs leading-relaxed text-mist-400">
        <span className="flex items-center gap-1.5 font-medium text-mist-300"><Lock size={13} /> Live trading unavailable</span>
        <p className="mt-1">
          {status.reason}
          {!status.premium && <> — <Link href="/pricing" className="text-teal-glow underline">upgrade</Link></>}
          {status.premium && !status.connection && <> — <Link href="/settings/connections" className="text-teal-glow underline">connect a brokerage</Link></>}
        </p>
      </div>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2">
        <ArrowRight size={15} /> Trade this setup
      </Button>
      <p className="mt-1.5 text-center text-[10px] text-mist-500">
        Opens an order ticket for review — nothing is sent without your explicit confirmation.
      </p>
      {open && status.connection && <OrderTicketModal signal={signal} status={status} onClose={() => setOpen(false)} />}
    </>
  );
}

function OrderTicketModal({ signal, status, onClose }: { signal: LiveSignal; status: TradingStatus; onClose: () => void }) {
  const conn = status.connection!;
  const isLong = signal.direction === "LONG";
  const entryMid = (signal.entryLow + signal.entryHigh) / 2;
  const stopDist = Math.abs(entryMid - signal.stopLoss);

  // Risk-calculator sizing: 1% of real account equity ÷ stop distance
  const suggestedQty = Math.max(1, Math.floor((conn.equity * 0.01) / Math.max(stopDist, 0.01)));

  const [step, setStep] = useState<"edit" | "confirm" | "done">("edit");
  const [side] = useState<"BUY" | "SELL">(isLong ? "BUY" : "SELL");
  const [quantity, setQuantity] = useState(suggestedQty);
  const [limitPrice, setLimitPrice] = useState(Number(entryMid.toFixed(2)));
  const [useStop, setUseStop] = useState(true);
  const [stopLoss, setStopLoss] = useState(Number(signal.stopLoss.toFixed(2)));
  const [useTarget, setUseTarget] = useState(true);
  const [takeProfit, setTakeProfit] = useState(Number(signal.target1.toFixed(2)));
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ status: string; fillPrice: number | null } | null>(null);

  const estCost = quantity * limitPrice;
  const riskAmount = useStop ? Math.abs(limitPrice - stopLoss) * quantity : null;
  const rewardAmount = useTarget ? Math.abs(takeProfit - limitPrice) * quantity : null;
  const riskPercentOfAccount = riskAmount !== null && conn.equity > 0 ? (riskAmount / conn.equity) * 100 : null;

  async function submit() {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/brokerage/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        connectionId: conn.id,
        symbol: signal.symbol,
        side,
        orderType: "LIMIT",
        quantity,
        limitPrice,
        stopLoss: useStop ? stopLoss : undefined,
        takeProfit: useTarget ? takeProfit : undefined,
        signalId: signal.id,
        idempotencyKey,
        confirmed: true,
      }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (!res.ok) return setError(d.error ?? "Order failed");
    setResult({ status: d.order.status, fillPrice: d.order.fillPrice });
    setStep("done");
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-1 text-lg font-bold text-mist-100">
        Order ticket — <span className="font-mono">{signal.symbol}</span>
      </h2>
      <p className="mb-4 text-xs text-mist-400">
        {conn.institution} ••••{conn.accountMask} · buying power <span className="tnum font-mono">{fmtMoney(conn.buyingPower)}</span>
      </p>

      {step === "edit" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-ink-800/60 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-mist-500">Side</div>
              <div className={cn("text-sm font-semibold", side === "BUY" ? "text-profit" : "text-loss")}>{side} (limit, day)</div>
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] text-mist-400">Quantity (1% risk sizing: {suggestedQty})</span>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value))))} className="tnum font-mono" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-mist-400">Limit price (entry zone {fmtPrice(signal.entryLow)}–{fmtPrice(signal.entryHigh)})</span>
              <Input type="number" step="0.01" value={limitPrice} onChange={(e) => setLimitPrice(Number(e.target.value))} className="tnum font-mono" />
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-mist-300">
                <input type="checkbox" checked={useStop} onChange={(e) => setUseStop(e.target.checked)} className="accent-teal-500" />
                Stop-loss
              </label>
              {useStop && <Input type="number" step="0.01" value={stopLoss} onChange={(e) => setStopLoss(Number(e.target.value))} className="tnum font-mono" />}
              <label className="flex items-center gap-2 text-xs text-mist-300">
                <input type="checkbox" checked={useTarget} onChange={(e) => setUseTarget(e.target.checked)} className="accent-teal-500" />
                Take-profit (T1)
              </label>
              {useTarget && <Input type="number" step="0.01" value={takeProfit} onChange={(e) => setTakeProfit(Number(e.target.value))} className="tnum font-mono" />}
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-mist-500">
            Stop/target legs are sent as bracket instructions where your brokerage supports them; otherwise they&apos;re stored here and
            monitored by your alerts.
          </p>
          <Button onClick={() => setStep("confirm")} className="w-full" disabled={quantity < 1 || limitPrice <= 0}>
            Review order
          </Button>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-3">
          <Card className="border-teal-glow/25 bg-ink-800/60">
            <div className="tnum space-y-2 font-mono text-sm">
              <Row label="Order" value={`${side} ${quantity} ${signal.symbol} @ ${fmtPrice(limitPrice)} limit`} />
              <Row label="Estimated cost" value={fmtMoney(estCost)} strong />
              <Row label="Risk if stop hits (1R)" value={riskAmount !== null ? `${fmtMoney(riskAmount)}${riskPercentOfAccount !== null ? ` (${riskPercentOfAccount.toFixed(2)}% of account)` : ""}` : "no stop attached"} tone="loss" />
              <Row label="Stop-loss" value={useStop ? fmtPrice(stopLoss) : "—"} tone="loss" />
              <Row label="Take-profit" value={useTarget ? `${fmtPrice(takeProfit)} (reward ${rewardAmount !== null ? fmtMoney(rewardAmount) : "—"})` : "—"} tone="profit" />
              {status.maxDailyLoss !== null && (
                <Row label="Daily loss guard" value={`${fmtMoney(status.todayRealizedPnl)} today / limit ${fmtMoney(-status.maxDailyLoss)}`} />
              )}
            </div>
          </Card>
          {riskPercentOfAccount !== null && riskPercentOfAccount > 2 && (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-warn/25 bg-amber-warn/5 p-2 text-[11px] text-amber-warn">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              This risks {riskPercentOfAccount.toFixed(1)}% of your account — above the 0.5–2% range most professionals use.
            </p>
          )}
          {!useStop && (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-warn/25 bg-amber-warn/5 p-2 text-[11px] text-amber-warn">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              No stop-loss attached — the trade has no defined risk.
            </p>
          )}
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-mist-500">
            <ShieldAlert size={13} className="mt-0.5 shrink-0" />
            This order is transmitted to and executed by {conn.institution} under your sole direction. MarketMind is not a
            broker-dealer or investment adviser and never places orders on its own.
          </p>
          {error && <p className="text-xs text-loss">{error}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep("edit")} className="flex-1" disabled={submitting}>
              Back to edit
            </Button>
            <Button onClick={submit} disabled={submitting} className="flex-1">
              {submitting ? "Submitting…" : `Confirm & place ${side}`}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-3 text-center">
          <CheckCircle2 size={32} className={cn("mx-auto", result.status === "FILLED" ? "text-profit" : "text-teal-glow")} />
          <p className="text-sm text-mist-100">
            Order {result.status.toLowerCase()}
            {result.fillPrice ? <> at <span className="tnum font-mono text-profit">{fmtPrice(result.fillPrice)}</span></> : " — status updates as your brokerage reports fills"}
            .
          </p>
          <p className="text-xs text-mist-400">
            {result.status === "FILLED" && "The fill was auto-logged to your Trade Journal and your portfolio was re-synced."}
          </p>
          <div className="flex justify-center gap-2">
            <Link href="/portfolio"><Button variant="ghost">View portfolio</Button></Link>
            <Link href="/journal"><Button variant="ghost">Open journal</Button></Link>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "loss" | "profit" }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-sans text-xs text-mist-400">{label}</span>
      <span className={cn("text-right", strong && "font-semibold", tone === "loss" ? "text-loss" : tone === "profit" ? "text-profit" : "text-mist-200")}>
        {value}
      </span>
    </div>
  );
}
