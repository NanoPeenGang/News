import { Bar, BarInterval, MarketDataProvider, Quote, SymbolInfo } from "./types";
import { MOCK_UNIVERSE } from "./mock";

const BASE = "https://finnhub.io/api/v1";

export class FinnhubProvider implements MarketDataProvider {
  readonly name = "finnhub";

  constructor(private apiKey: string) {
    if (!apiKey) throw new Error("FINNHUB_API_KEY is required for the finnhub provider");
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${BASE}${path}${sep}token=${this.apiKey}`);
    if (!res.ok) throw new Error(`Finnhub ${path} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async getQuote(symbol: string): Promise<Quote> {
    type Q = { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number };
    const q = await this.fetchJson<Q>(`/quote?symbol=${symbol}`);
    return {
      symbol,
      price: q.c,
      change: q.d,
      changePercent: q.dp,
      volume: 0, // Finnhub /quote has no volume; bars carry it
      avgVolume: 0,
      prevClose: q.pc,
      open: q.o,
      high: q.h,
      low: q.l,
      timestamp: Date.now(),
    };
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const results = await Promise.allSettled(symbols.map((s) => this.getQuote(s)));
    return results
      .filter((r): r is PromiseFulfilledResult<Quote> => r.status === "fulfilled")
      .map((r) => r.value);
  }

  async getBars(symbol: string, interval: BarInterval, limit: number): Promise<Bar[]> {
    const res = interval === "1min" ? "1" : interval === "5min" ? "5" : interval === "15min" ? "15" : "D";
    const secondsPerBar = interval === "1day" ? 86400 : parseInt(res) * 60;
    const to = Math.floor(Date.now() / 1000);
    const from = to - secondsPerBar * limit * 3;
    type Candles = { s: string; t: number[]; o: number[]; h: number[]; l: number[]; c: number[]; v: number[] };
    const d = await this.fetchJson<Candles>(`/stock/candle?symbol=${symbol}&resolution=${res}&from=${from}&to=${to}`);
    if (d.s !== "ok") return [];
    return d.t
      .map((t, i) => ({ time: t, open: d.o[i], high: d.h[i], low: d.l[i], close: d.c[i], volume: d.v[i] }))
      .slice(-limit);
  }

  async getUniverse(): Promise<SymbolInfo[]> {
    return MOCK_UNIVERSE;
  }
}
