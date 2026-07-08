import { Bar, Quote } from "./marketdata/types";
import { TechnicalSnapshot, computeSnapshot, ema, rsi, vwap as vwapSeries } from "./indicators";

export type SetupTypeName =
  | "MOMENTUM_BREAKOUT"
  | "VWAP_RECLAIM"
  | "OVERSOLD_BOUNCE"
  | "GAP_AND_GO"
  | "UNUSUAL_VOLUME"
  | "EMA_CROSSOVER";

export interface SignalCandidate {
  symbol: string;
  setupType: SetupTypeName;
  direction: "LONG" | "SHORT";
  confidence: number; // 0-100 setup-conditions score, never a guarantee
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  target1: number; // 1:2 risk/reward
  target2: number; // 1:3 risk/reward
  priceAtScan: number;
  snapshot: TechnicalSnapshot;
  reasons: string[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function buildLevels(
  price: number,
  atr: number,
  direction: "LONG" | "SHORT"
): Pick<SignalCandidate, "entryLow" | "entryHigh" | "stopLoss" | "target1" | "target2"> {
  const band = atr * 0.35;
  const stopDist = atr * 1.5;
  if (direction === "LONG") {
    const entryMid = price;
    const stopLoss = entryMid - stopDist;
    return {
      entryLow: entryMid - band,
      entryHigh: entryMid + band,
      stopLoss,
      target1: entryMid + stopDist * 2,
      target2: entryMid + stopDist * 3,
    };
  }
  const entryMid = price;
  const stopLoss = entryMid + stopDist;
  return {
    entryLow: entryMid - band,
    entryHigh: entryMid + band,
    stopLoss,
    target1: entryMid - stopDist * 2,
    target2: entryMid - stopDist * 3,
  };
}

/**
 * Evaluate one symbol's data against all setup patterns.
 * Returns at most one candidate — the highest-confidence match — so the
 * feed stays readable and a ticker isn't spammed with overlapping setups.
 */
export function evaluateSymbol(
  symbol: string,
  quote: Quote,
  bars: Bar[],
  sessionBars: Bar[]
): SignalCandidate | null {
  if (bars.length < 60) return null;
  const snap = computeSnapshot(bars, sessionBars, {
    prevClose: quote.prevClose,
    open: quote.open,
    volume: quote.volume,
    avgVolume: quote.avgVolume,
  });
  if (!isFinite(snap.atr14) || snap.atr14 <= 0) return null;

  const closes = bars.map((b) => b.close);
  const candidates: SignalCandidate[] = [];
  const price = snap.price;

  const push = (
    setupType: SetupTypeName,
    direction: "LONG" | "SHORT",
    confidence: number,
    reasons: string[]
  ) => {
    candidates.push({
      symbol,
      setupType,
      direction,
      confidence: Math.round(clamp(confidence, 5, 97)),
      priceAtScan: price,
      snapshot: snap,
      reasons,
      ...buildLevels(price, snap.atr14, direction),
    });
  };

  // --- Momentum breakout: price clears nearest resistance with volume ---
  const nearestRes = snap.resistances[0];
  const recentHigh = Math.max(...bars.slice(-30, -1).map((b) => b.high));
  if (price > recentHigh && snap.relVolume > 1.15 && snap.macdHistogram > 0) {
    let conf = 55 + (snap.relVolume - 1) * 15 + (snap.rsi14 > 55 && snap.rsi14 < 75 ? 10 : 0);
    if (price > snap.ema21 && snap.ema9 > snap.ema21) conf += 8;
    push("MOMENTUM_BREAKOUT", "LONG", conf, [
      `Price ${price.toFixed(2)} cleared 30-bar high ${recentHigh.toFixed(2)}`,
      `Relative volume ${snap.relVolume.toFixed(2)}x`,
      `MACD histogram positive (${snap.macdHistogram.toFixed(3)})`,
      ...(nearestRes ? [`Next resistance ${nearestRes.toFixed(2)}`] : []),
    ]);
  }

  // --- VWAP reclaim: crossed above VWAP after trading below it ---
  if (sessionBars.length >= 10) {
    const vw = vwapSeries(sessionBars);
    const closesSession = sessionBars.map((b) => b.close);
    const n = sessionBars.length;
    const belowCount = closesSession.slice(-12, -2).filter((c, i) => c < vw[n - 12 + i]).length;
    const nowAbove = closesSession[n - 1] > vw[n - 1] && closesSession[n - 2] > vw[n - 2];
    const wasBelow = belowCount >= 6;
    if (nowAbove && wasBelow) {
      let conf = 52 + (snap.relVolume > 1 ? 10 : 0) + (snap.macdHistogram > 0 ? 8 : 0);
      if (snap.rsi14 > 50) conf += 6;
      push("VWAP_RECLAIM", "LONG", conf, [
        `Reclaimed session VWAP ${vw[n - 1].toFixed(2)} after holding below it`,
        `RSI ${snap.rsi14.toFixed(1)}`,
        `Relative volume ${snap.relVolume.toFixed(2)}x`,
      ]);
    }
  }

  // --- Oversold bounce: RSI washed out and turning up near support/lower band ---
  const rsiSeries = rsi(closes);
  const rsiPrev = rsiSeries[rsiSeries.length - 2];
  const nearLowerBand = price <= snap.bbLower * 1.01;
  const nearSupport = snap.supports.length > 0 && price <= snap.supports[snap.supports.length - 1] * 1.02;
  if (snap.rsi14 < 35 && snap.rsi14 > rsiPrev && (nearLowerBand || nearSupport)) {
    let conf = 48 + (35 - snap.rsi14) + (nearLowerBand && nearSupport ? 10 : 0);
    push("OVERSOLD_BOUNCE", "LONG", conf, [
      `RSI ${snap.rsi14.toFixed(1)} turning up from oversold (prev ${rsiPrev.toFixed(1)})`,
      nearLowerBand ? `At lower Bollinger band ${snap.bbLower.toFixed(2)}` : `Near support ${snap.supports[snap.supports.length - 1]?.toFixed(2)}`,
    ]);
  }

  // --- Gap and go: opened with a gap and holding/extending in gap direction ---
  if (Math.abs(snap.gapPercent) >= 1.5 && sessionBars.length >= 6) {
    const holdingUp = snap.gapPercent > 0 && price >= quote.open && price > snap.vwap;
    const holdingDown = snap.gapPercent < 0 && price <= quote.open && price < snap.vwap;
    if (holdingUp || holdingDown) {
      const dir = holdingUp ? "LONG" : "SHORT";
      let conf = 50 + Math.min(Math.abs(snap.gapPercent) * 5, 20) + (snap.relVolume > 1.3 ? 12 : 0);
      push("GAP_AND_GO", dir, conf, [
        `Gapped ${snap.gapPercent.toFixed(1)}% and holding ${holdingUp ? "above" : "below"} the open`,
        `${holdingUp ? "Above" : "Below"} VWAP ${snap.vwap.toFixed(2)}`,
        `Relative volume ${snap.relVolume.toFixed(2)}x`,
      ]);
    }
  }

  // --- Unusual volume: heavy tape with directional close ---
  if (snap.relVolume >= 2 && sessionBars.length >= 5) {
    const dayChange = quote.changePercent;
    if (Math.abs(dayChange) > 0.8) {
      const dir = dayChange > 0 ? "LONG" : "SHORT";
      const aligned = dir === "LONG" ? price > snap.vwap : price < snap.vwap;
      let conf = 45 + Math.min((snap.relVolume - 2) * 8, 20) + (aligned ? 10 : 0);
      push("UNUSUAL_VOLUME", dir, conf, [
        `Volume running ${snap.relVolume.toFixed(1)}x the daily average`,
        `Day change ${dayChange.toFixed(1)}% ${aligned ? "with" : "against"} VWAP alignment`,
      ]);
    }
  }

  // --- EMA crossover: 9 crossing 21 with trend alignment ---
  const e9 = ema(closes, 9);
  const e21 = ema(closes, 21);
  const n = closes.length;
  const crossedUp = e9[n - 1] > e21[n - 1] && e9[n - 3] <= e21[n - 3];
  const crossedDown = e9[n - 1] < e21[n - 1] && e9[n - 3] >= e21[n - 3];
  if (crossedUp || crossedDown) {
    const dir = crossedUp ? "LONG" : "SHORT";
    const withTrend = crossedUp ? price > snap.ema50 : price < snap.ema50;
    let conf = 46 + (withTrend ? 14 : 0) + (snap.relVolume > 1 ? 6 : 0);
    if (crossedUp && snap.macdHistogram > 0) conf += 6;
    if (crossedDown && snap.macdHistogram < 0) conf += 6;
    push("EMA_CROSSOVER", dir, conf, [
      `EMA 9 crossed ${crossedUp ? "above" : "below"} EMA 21`,
      withTrend ? `Aligned with EMA-50 trend` : `Counter to EMA-50 trend`,
      `MACD histogram ${snap.macdHistogram.toFixed(3)}`,
    ]);
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0];
}

/** Split intraday bars into "current session" (last trading day of bars). */
export function currentSessionBars(bars: Bar[]): Bar[] {
  if (bars.length === 0) return [];
  const lastTime = bars[bars.length - 1].time;
  const dayStart = lastTime - (lastTime % 86400);
  return bars.filter((b) => b.time >= dayStart);
}
