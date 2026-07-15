import { Bar } from "./marketdata/types";

export function sma(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (prev === null) {
      if (i === period - 1) {
        prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
        out[i] = prev;
      }
      continue;
    }
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function rsi(closes: number[], period = 14): number[] {
  const out: number[] = new Array(closes.length).fill(NaN);
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      if (i === period) out[i] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss));
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      out[i] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss));
    }
  }
  return out;
}

export interface MacdResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = closes.map((_, i) =>
    isNaN(emaFast[i]) || isNaN(emaSlow[i]) ? NaN : emaFast[i] - emaSlow[i]
  );
  const valid = macdLine.filter((v) => !isNaN(v));
  const signalValid = ema(valid, signalPeriod);
  const signalLine: number[] = new Array(closes.length).fill(NaN);
  let vi = 0;
  for (let i = 0; i < closes.length; i++) {
    if (!isNaN(macdLine[i])) {
      signalLine[i] = signalValid[vi];
      vi++;
    }
  }
  const histogram = macdLine.map((v, i) => (isNaN(v) || isNaN(signalLine[i]) ? NaN : v - signalLine[i]));
  return { macd: macdLine, signal: signalLine, histogram };
}

/** Session VWAP computed over the supplied bars (pass current-session bars). */
export function vwap(bars: Bar[]): number[] {
  const out: number[] = [];
  let cumPV = 0;
  let cumV = 0;
  for (const b of bars) {
    const typical = (b.high + b.low + b.close) / 3;
    cumPV += typical * b.volume;
    cumV += b.volume;
    out.push(cumV > 0 ? cumPV / cumV : typical);
  }
  return out;
}

export interface BollingerResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function bollinger(closes: number[], period = 20, mult = 2): BollingerResult {
  const middle = sma(closes, period);
  const upper: number[] = new Array(closes.length).fill(NaN);
  const lower: number[] = new Array(closes.length).fill(NaN);
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const sd = Math.sqrt(slice.reduce((a, v) => a + (v - mean) ** 2, 0) / period);
    upper[i] = mean + mult * sd;
    lower[i] = mean - mult * sd;
  }
  return { upper, middle, lower };
}

export function atr(bars: Bar[], period = 14): number[] {
  const out: number[] = new Array(bars.length).fill(NaN);
  let prev: number | null = null;
  for (let i = 1; i < bars.length; i++) {
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i - 1].close),
      Math.abs(bars[i].low - bars[i - 1].close)
    );
    if (prev === null) {
      if (i >= period) {
        let sum = 0;
        for (let k = i - period + 1; k <= i; k++) {
          sum += Math.max(
            bars[k].high - bars[k].low,
            Math.abs(bars[k].high - bars[k - 1].close),
            Math.abs(bars[k].low - bars[k - 1].close)
          );
        }
        prev = sum / period;
        out[i] = prev;
      }
    } else {
      prev = (prev * (period - 1) + tr) / period;
      out[i] = prev;
    }
  }
  return out;
}

export interface PivotLevels {
  supports: number[];
  resistances: number[];
}

/**
 * Swing-pivot support/resistance: a bar is a pivot high/low if it is the
 * extreme of `lookback` bars on each side. Nearby levels are clustered.
 */
export function pivotLevels(bars: Bar[], lookback = 5, maxLevels = 4): PivotLevels {
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = lookback; i < bars.length - lookback; i++) {
    let isHigh = true;
    let isLow = true;
    for (let k = i - lookback; k <= i + lookback; k++) {
      if (k === i) continue;
      if (bars[k].high >= bars[i].high) isHigh = false;
      if (bars[k].low <= bars[i].low) isLow = false;
    }
    if (isHigh) highs.push(bars[i].high);
    if (isLow) lows.push(bars[i].low);
  }
  const cluster = (levels: number[]): number[] => {
    const sorted = [...levels].sort((a, b) => a - b);
    const clustered: number[] = [];
    for (const lv of sorted) {
      const last = clustered[clustered.length - 1];
      if (last !== undefined && Math.abs(lv - last) / last < 0.004) {
        clustered[clustered.length - 1] = (last + lv) / 2;
      } else {
        clustered.push(lv);
      }
    }
    return clustered;
  };
  const price = bars[bars.length - 1]?.close ?? 0;
  const supports = cluster(lows).filter((l) => l < price).slice(-maxLevels);
  const resistances = cluster(highs).filter((l) => l > price).slice(0, maxLevels);
  return { supports, resistances };
}

export interface TechnicalSnapshot {
  price: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  vwap: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  atr14: number;
  relVolume: number;
  gapPercent: number;
  supports: number[];
  resistances: number[];
}

const last = (arr: number[]) => {
  for (let i = arr.length - 1; i >= 0; i--) if (!isNaN(arr[i])) return arr[i];
  return NaN;
};

/**
 * Full indicator snapshot from intraday bars plus day-level context.
 * `sessionBars` should be the current session's bars (for VWAP);
 * `bars` the longer intraday series.
 */
export function computeSnapshot(
  bars: Bar[],
  sessionBars: Bar[],
  ctx: { prevClose: number; open: number; volume: number; avgVolume: number }
): TechnicalSnapshot {
  const closes = bars.map((b) => b.close);
  const price = closes[closes.length - 1];
  const m = macd(closes);
  const bb = bollinger(closes);
  const { supports, resistances } = pivotLevels(bars);
  return {
    price,
    rsi14: last(rsi(closes)),
    macd: last(m.macd),
    macdSignal: last(m.signal),
    macdHistogram: last(m.histogram),
    ema9: last(ema(closes, 9)),
    ema21: last(ema(closes, 21)),
    ema50: last(ema(closes, 50)),
    ema200: last(ema(closes, 200)),
    vwap: last(vwap(sessionBars.length ? sessionBars : bars)),
    bbUpper: last(bb.upper),
    bbMiddle: last(bb.middle),
    bbLower: last(bb.lower),
    atr14: last(atr(bars)),
    relVolume: ctx.avgVolume > 0 ? ctx.volume / ctx.avgVolume : 1,
    gapPercent: ctx.prevClose > 0 ? ((ctx.open - ctx.prevClose) / ctx.prevClose) * 100 : 0,
    supports,
    resistances,
  };
}
