import { Bar, BarInterval, MarketDataProvider, Quote, SymbolInfo } from "./types";

/**
 * Deterministic simulated market. Every price is a pure function of
 * (symbol, minute-bucket), so the web server and the worker process compute
 * identical prices with no shared state. The walk includes daily gaps,
 * momentum bursts, and volume spikes so the scanner has real setups to find.
 */

export const MOCK_UNIVERSE: SymbolInfo[] = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology" },
  { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology" },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Discretionary" },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Communication Services" },
  { symbol: "META", name: "Meta Platforms", sector: "Communication Services" },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Consumer Discretionary" },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology" },
  { symbol: "AVGO", name: "Broadcom Inc.", sector: "Technology" },
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Financials" },
  { symbol: "V", name: "Visa Inc.", sector: "Financials" },
  { symbol: "BAC", name: "Bank of America", sector: "Financials" },
  { symbol: "GS", name: "Goldman Sachs", sector: "Financials" },
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy" },
  { symbol: "CVX", name: "Chevron Corp.", sector: "Energy" },
  { symbol: "UNH", name: "UnitedHealth Group", sector: "Healthcare" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { symbol: "LLY", name: "Eli Lilly & Co.", sector: "Healthcare" },
  { symbol: "PFE", name: "Pfizer Inc.", sector: "Healthcare" },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer Staples" },
  { symbol: "COST", name: "Costco Wholesale", sector: "Consumer Staples" },
  { symbol: "KO", name: "Coca-Cola Co.", sector: "Consumer Staples" },
  { symbol: "PEP", name: "PepsiCo Inc.", sector: "Consumer Staples" },
  { symbol: "DIS", name: "Walt Disney Co.", sector: "Communication Services" },
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Communication Services" },
  { symbol: "CRM", name: "Salesforce Inc.", sector: "Technology" },
  { symbol: "ORCL", name: "Oracle Corp.", sector: "Technology" },
  { symbol: "ADBE", name: "Adobe Inc.", sector: "Technology" },
  { symbol: "INTC", name: "Intel Corp.", sector: "Technology" },
  { symbol: "QCOM", name: "Qualcomm Inc.", sector: "Technology" },
  { symbol: "CAT", name: "Caterpillar Inc.", sector: "Industrials" },
  { symbol: "BA", name: "Boeing Co.", sector: "Industrials" },
  { symbol: "GE", name: "GE Aerospace", sector: "Industrials" },
  { symbol: "UPS", name: "United Parcel Service", sector: "Industrials" },
  { symbol: "HD", name: "Home Depot", sector: "Consumer Discretionary" },
  { symbol: "MCD", name: "McDonald's Corp.", sector: "Consumer Discretionary" },
  { symbol: "NKE", name: "Nike Inc.", sector: "Consumer Discretionary" },
  { symbol: "SBUX", name: "Starbucks Corp.", sector: "Consumer Discretionary" },
  { symbol: "PLTR", name: "Palantir Technologies", sector: "Technology" },
  { symbol: "COIN", name: "Coinbase Global", sector: "Financials" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", sector: "Index" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", sector: "Index" },
];

// FNV-1a string hash -> 32-bit uint
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Deterministic uniform [0,1) from an integer seed
function rand(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Gaussian-ish noise in ~[-1, 1] (sum of 3 uniforms, centered)
function noise(seed: number): number {
  return (rand(seed) + rand(seed ^ 0x9e3779b9) + rand(seed ^ 0x85ebca6b)) / 1.5 - 1;
}

const MINUTE = 60;
const DAY_MINUTES = 1440;

function basePrice(symbol: string): number {
  const h = hash(symbol);
  return 20 + (h % 4800) / 10; // $20 – $500
}

function volatility(symbol: string): number {
  const h = hash(symbol + ":vol");
  return 0.0004 + (h % 100) / 100_000; // per-minute stdev ~0.04%–0.14%
}

function baseVolume(symbol: string): number {
  const h = hash(symbol + ":bvol");
  return 200_000 + (h % 3_000_000);
}

/** Per-minute return, deterministic in (symbol, minuteIndex). */
function minuteReturn(symbol: string, minuteIdx: number): number {
  const h = hash(symbol);
  const vol = volatility(symbol);
  const dayIdx = Math.floor(minuteIdx / DAY_MINUTES);
  const minuteOfDay = minuteIdx % DAY_MINUTES;

  // Base random walk
  let r = noise(h ^ Math.imul(minuteIdx, 2654435761)) * vol;

  // Daily gap at the day boundary (some days gap hard: gap-and-go fuel)
  if (minuteOfDay === 0) {
    const g = noise(h ^ Math.imul(dayIdx, 40503) ^ 0x5f356495);
    const gapChance = rand(h ^ Math.imul(dayIdx, 69069));
    r += gapChance > 0.72 ? g * 0.035 : g * 0.004;
  }

  // Momentum bursts: a few 45-minute windows per day trend hard one way
  const windowIdx = Math.floor(minuteIdx / 45);
  const burstRoll = rand(h ^ Math.imul(windowIdx, 22695477));
  if (burstRoll > 0.9) {
    const dir = rand(h ^ Math.imul(windowIdx, 134775813)) > 0.5 ? 1 : -1;
    r += dir * vol * 2.2;
  }

  // Gentle multi-day drift
  const drift = noise(h ^ Math.imul(dayIdx, 1103515245)) * 0.00006;
  return r + drift;
}

const HISTORY_MINUTES = 12 * DAY_MINUTES; // simulate 12 days of history

function minuteVolume(symbol: string, minuteIdx: number): number {
  const h = hash(symbol + ":v");
  const base = baseVolume(symbol) / 390;
  const spikeRoll = rand(h ^ Math.imul(minuteIdx, 747796405));
  const spike = spikeRoll > 0.965 ? 4 + rand(h ^ minuteIdx) * 6 : 1;
  return Math.round(base * (0.5 + rand(h ^ Math.imul(minuteIdx, 2891336453))) * spike);
}

function nowMinuteIdx(): number {
  return Math.floor(Date.now() / 1000 / MINUTE);
}

/** Prices for [endMinute-count+1 .. endMinute], computed in one pass. */
function priceSeries(symbol: string, endMinute: number, count: number): number[] {
  const startMinute = endMinute - count + 1;
  const walkStart = endMinute - HISTORY_MINUTES;
  let cum = 0;
  const out: number[] = [];
  for (let i = walkStart + 1; i <= endMinute; i++) {
    cum += minuteReturn(symbol, i);
    if (i >= startMinute) out.push(basePrice(symbol) * Math.exp(cum));
  }
  return out;
}

export class MockProvider implements MarketDataProvider {
  readonly name = "mock";

  async getQuote(symbol: string): Promise<Quote> {
    const [q] = await this.getQuotes([symbol]);
    return q;
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const m = nowMinuteIdx();
    const dayStart = m - (m % DAY_MINUTES);
    const secondsFrac = (Date.now() / 1000) % MINUTE;

    return symbols.map((symbol) => {
      const count = m - dayStart + 2;
      const series = priceSeries(symbol, m, Math.max(count, 2));
      const prices = series.slice(-count);
      const prevClose = prices[0];
      const open = prices.length > 1 ? prices[1] : prevClose;
      // sub-minute jitter so the tape moves between minute buckets
      const jitterSeed = hash(symbol) ^ (m * 61 + Math.floor(secondsFrac / 2));
      const price = prices[prices.length - 1] * (1 + noise(jitterSeed) * 0.0004);
      let volume = 0;
      for (let i = dayStart + 1; i <= m; i++) volume += minuteVolume(symbol, i);
      const high = Math.max(...prices.slice(1), price);
      const low = Math.min(...prices.slice(1), price);
      return {
        symbol,
        price,
        change: price - prevClose,
        changePercent: ((price - prevClose) / prevClose) * 100,
        volume,
        avgVolume: baseVolume(symbol),
        prevClose,
        open,
        high,
        low,
        timestamp: Date.now(),
      };
    });
  }

  async getBars(symbol: string, interval: BarInterval, limit: number): Promise<Bar[]> {
    const step = interval === "1min" ? 1 : interval === "5min" ? 5 : interval === "15min" ? 15 : DAY_MINUTES;
    const m = nowMinuteIdx();
    const minutesNeeded = Math.min(step * limit, HISTORY_MINUTES - 10);
    const prices = priceSeries(symbol, m, minutesNeeded + 1);
    const bars: Bar[] = [];
    const hlSeed = hash(symbol + ":hl");
    for (let i = 1; i + step - 1 < prices.length; i += step) {
      const chunk = prices.slice(i, i + step);
      const minuteEnd = m - (prices.length - 1 - (i + step - 1));
      const wiggle =
        Math.abs(noise(hlSeed ^ Math.imul(minuteEnd, 1597334677))) *
        volatility(symbol) *
        chunk[chunk.length - 1] *
        Math.sqrt(step);
      let vol = 0;
      for (let k = 0; k < step; k++) vol += minuteVolume(symbol, minuteEnd - step + 1 + k);
      bars.push({
        time: minuteEnd * MINUTE,
        open: prices[i - 1],
        high: Math.max(...chunk, prices[i - 1]) + wiggle,
        low: Math.min(...chunk, prices[i - 1]) - wiggle,
        close: chunk[chunk.length - 1],
        volume: vol,
      });
    }
    return bars.slice(-limit);
  }

  async getUniverse(): Promise<SymbolInfo[]> {
    return MOCK_UNIVERSE;
  }
}
