"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Radar } from "lucide-react";
import { useLive } from "@/components/Providers";
import { useSignals } from "@/components/hooks";
import { Badge, Card, InfoTip, NumberTicker, SectionTitle, Skeleton, cn } from "@/components/ui";
import { fmtPercent, fmtVolume, SETUP_LABELS } from "@/lib/format";

type SortKey = "symbol" | "price" | "changePercent" | "volume" | "relVol";

export default function ScannerPage() {
  const { quotes, connected } = useLive();
  const { signals } = useSignals("status=open&limit=100");
  const [sort, setSort] = useState<SortKey>("changePercent");
  const [desc, setDesc] = useState(true);

  const signalsBySymbol = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of signals ?? []) {
      m.set(s.symbol, [...(m.get(s.symbol) ?? []), s.setupType]);
    }
    return m;
  }, [signals]);

  const rows = useMemo(() => {
    const all = Array.from(quotes.values()).map((q) => ({ ...q, relVol: q.avgVolume > 0 ? q.volume / q.avgVolume : 0 }));
    all.sort((a, b) => {
      const va = a[sort as keyof typeof a];
      const vb = b[sort as keyof typeof b];
      const cmp = typeof va === "string" ? String(va).localeCompare(String(vb)) : Number(va) - Number(vb);
      return desc ? -cmp : cmp;
    });
    return all;
  }, [quotes, sort, desc]);

  const header = (key: SortKey, label: string, term?: string) => (
    <th
      className="cursor-pointer select-none px-3 py-2 text-right font-medium text-mist-500 transition-colors first:text-left hover:text-mist-200"
      onClick={() => {
        if (sort === key) setDesc(!desc);
        else {
          setSort(key);
          setDesc(true);
        }
      }}
    >
      {term ? <InfoTip term={term} label={label} /> : label}
      {sort === key && <span className="ml-1 text-teal-glow">{desc ? "↓" : "↑"}</span>}
    </th>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-mist-100">
            <Radar size={20} className="text-teal-glow" /> Market Scanner
          </h1>
          <p className="text-sm text-mist-400">
            The autonomous engine scans this universe every minute. Rows with badges have active setups.
          </p>
        </div>
        <Badge tone={connected ? "teal" : "red"}>{connected ? "Engine live" : "Engine offline"}</Badge>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-xs">
          <thead className="border-b border-white/[0.07] text-[11px] uppercase tracking-wider">
            <tr>
              {header("symbol", "Symbol")}
              {header("price", "Last")}
              {header("changePercent", "Change")}
              {header("volume", "Volume")}
              {header("relVol", "Rel Vol", "Relative Volume")}
              <th className="px-3 py-2 text-left font-medium text-mist-500">Active Setups</th>
            </tr>
          </thead>
          <tbody className="tnum divide-y divide-white/[0.04] font-mono">
            {rows.length === 0 &&
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-3 py-2">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}
            {rows.map((q) => {
              const setups = signalsBySymbol.get(q.symbol);
              return (
                <tr key={q.symbol} className="transition-colors hover:bg-ink-700/30">
                  <td className="px-3 py-2">
                    <Link href={`/ticker/${q.symbol}`} className="font-semibold text-mist-100 hover:text-teal-glow">
                      {q.symbol}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right"><NumberTicker value={q.price} /></td>
                  <td className={cn("px-3 py-2 text-right", q.changePercent >= 0 ? "text-profit" : "text-loss")}>
                    {fmtPercent(q.changePercent)}
                  </td>
                  <td className="px-3 py-2 text-right text-mist-400">{fmtVolume(q.volume)}</td>
                  <td className={cn("px-3 py-2 text-right", q.relVol >= 2 ? "font-semibold text-amber-warn" : "text-mist-400")}>
                    {q.relVol.toFixed(2)}x
                  </td>
                  <td className="px-3 py-2 font-sans">
                    <div className="flex flex-wrap gap-1">
                      {setups?.map((s, i) => (
                        <Badge key={i} tone="teal">{SETUP_LABELS[s] ?? s}</Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
