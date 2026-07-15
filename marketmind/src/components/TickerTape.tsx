"use client";

import Link from "next/link";
import { useLive } from "./Providers";
import { NumberTicker, cn } from "./ui";
import { fmtPercent } from "@/lib/format";

const TAPE_SYMBOLS = ["SPY", "QQQ", "AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "META", "AMD", "GOOGL"];

export function TickerTape() {
  const { quotes } = useLive();
  return (
    <div className="flex items-center gap-5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TAPE_SYMBOLS.map((sym) => {
        const q = quotes.get(sym);
        return (
          <Link key={sym} href={`/ticker/${sym}`} className="group flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-mist-300 transition-colors group-hover:text-teal-glow">{sym}</span>
            {q ? (
              <>
                <NumberTicker value={q.price} className="text-mist-200" />
                <span className={cn("tnum font-mono", q.changePercent >= 0 ? "text-profit" : "text-loss")}>
                  {fmtPercent(q.changePercent)}
                </span>
              </>
            ) : (
              <span className="skeleton inline-block h-3 w-16" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
