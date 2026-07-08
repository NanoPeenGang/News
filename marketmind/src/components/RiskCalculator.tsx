"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { Card, InfoTip, Input, SectionTitle } from "./ui";
import { fmtMoney, fmtPrice } from "@/lib/format";

interface Props {
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
}

export function RiskCalculator({ entryPrice, stopLoss, target1, target2 }: Props) {
  const [accountSize, setAccountSize] = useState(25000);
  const [riskPct, setRiskPct] = useState(1);

  const dollarRisk = accountSize * (riskPct / 100);
  const stopDistance = Math.abs(entryPrice - stopLoss);
  const shares = stopDistance > 0 ? Math.floor(dollarRisk / stopDistance) : 0;
  const positionValue = shares * entryPrice;
  const rewardT1 = shares * Math.abs(target1 - entryPrice);
  const rewardT2 = shares * Math.abs(target2 - entryPrice);

  return (
    <Card>
      <SectionTitle right={<Calculator size={14} className="text-mist-500" />}>
        Risk Calculator <InfoTip term="R Multiple" />
      </SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[11px] text-mist-400">Account size ($)</span>
          <Input type="number" min={100} value={accountSize} onChange={(e) => setAccountSize(Number(e.target.value))} className="tnum font-mono" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-mist-400">Risk per trade (%)</span>
          <Input type="number" min={0.1} max={100} step={0.25} value={riskPct} onChange={(e) => setRiskPct(Number(e.target.value))} className="tnum font-mono" />
        </label>
      </div>
      <div className="tnum mt-4 space-y-2 font-mono text-sm">
        <Row label="Dollar risk (1R)" value={fmtMoney(dollarRisk)} valueClass="text-loss" />
        <Row label={`Stop distance`} value={`$${fmtPrice(stopDistance)} / share`} />
        <Row label="Position size" value={`${shares.toLocaleString()} shares`} valueClass="text-teal-glow" bold />
        <Row label="Position value" value={fmtMoney(positionValue)} />
        <Row label="Reward at T1 (2R)" value={fmtMoney(rewardT1)} valueClass="text-profit" />
        <Row label="Reward at T2 (3R)" value={fmtMoney(rewardT2)} valueClass="text-profit" />
      </div>
      {riskPct > 2 && (
        <p className="mt-3 rounded-lg border border-amber-warn/20 bg-amber-warn/5 p-2 text-[11px] leading-relaxed text-amber-warn">
          Risking more than 2% per trade is above what most professionals consider survivable across a losing streak.
        </p>
      )}
      {positionValue > accountSize && (
        <p className="mt-2 rounded-lg border border-loss/25 bg-loss/5 p-2 text-[11px] leading-relaxed text-loss">
          This position exceeds your account size — it would require margin. The calculator caps nothing; your risk plan should.
        </p>
      )}
    </Card>
  );
}

function Row({ label, value, valueClass, bold }: { label: string; value: string; valueClass?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-sans text-xs text-mist-400">{label}</span>
      <span className={`${valueClass ?? "text-mist-200"} ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
