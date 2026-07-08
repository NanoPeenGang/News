export function fmtPrice(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPercent(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

export function fmtVolume(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v));
}

export function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export const SETUP_LABELS: Record<string, string> = {
  MOMENTUM_BREAKOUT: "Momentum Breakout",
  VWAP_RECLAIM: "VWAP Reclaim",
  OVERSOLD_BOUNCE: "Oversold Bounce",
  GAP_AND_GO: "Gap & Go",
  UNUSUAL_VOLUME: "Unusual Volume",
  EMA_CROSSOVER: "EMA Crossover",
};

export const STATUS_LABELS: Record<string, string> = {
  WAITING: "Waiting",
  ENTRY_ACTIVE: "Entry Zone Active",
  TARGET1_HIT: "Target 1 Hit",
  TARGET2_HIT: "Target 2 Hit",
  STOPPED_OUT: "Stopped Out",
  EXPIRED: "Expired",
};

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
