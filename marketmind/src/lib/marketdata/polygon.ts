import { Bar, BarInterval, MarketDataProvider, Quote, SymbolInfo } from "./types";
import { MOCK_UNIVERSE } from "./mock";

const BASE = "https://api.polygon.io";

export class PolygonProvider implements MarketDataProvider {
  readonly name = "polygon";

  constructor(private apiKey: string) {
    if (!apiKey) throw new Error("POLYGON_API_KEY is required for the polygon provider");
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${BASE}${path}${sep}apiKey=${this.apiKey}`);
    if (!res.ok) throw new Error(`Polygon ${path} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async getQuote(symbol: string): Promise<Quote> {
    type Snap = {
      ticker: {
        day: { o: number; h: number; l: number; c: number; v: number };
        prevDay: { c: number; v: number };
        lastTrade: { p: number };
        todaysChange: number;
        todaysChangePerc: number;
      };
    };
    const data = await this.fetchJson<Snap>(`/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`);
    const t = data.ticker;
    return {
      symbol,
      price: t.lastTrade?.p ?? t.day?.c ?? t.prevDay.c,
      change: t.todaysChange,
      changePercent: t.todaysChangePerc,
      volume: t.day?.v ?? 0,
      avgVolume: t.prevDay?.v ?? 0,
      prevClose: t.prevDay?.c ?? 0,
      open: t.day?.o ?? 0,
      high: t.day?.h ?? 0,
      low: t.day?.l ?? 0,
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
    const [mult, span] =
      interval === "1min" ? [1, "minute"] : interval === "5min" ? [5, "minute"] : interval === "15min" ? [15, "minute"] : [1, "day"];
    const to = new Date();
    const from = new Date(to.getTime() - (span === "day" ? limit * 2 : Math.ceil(limit / 60) + 7) * 86400_000);
    type Aggs = { results?: { t: number; o: number; h: number; l: number; c: number; v: number }[] };
    const data = await this.fetchJson<Aggs>(
      `/v2/aggs/ticker/${symbol}/range/${mult}/${span}/${from.toISOString().slice(0, 10)}/${to.toISOString().slice(0, 10)}?adjusted=true&sort=asc&limit=${limit * 2}`
    );
    return (data.results ?? [])
      .map((b) => ({ time: Math.floor(b.t / 1000), open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v }))
      .slice(-limit);
  }

  async getUniverse(): Promise<SymbolInfo[]> {
    // A full S&P 500 constituents feed requires a reference-data subscription;
    // fall back to the built-in large-cap universe.
    return MOCK_UNIVERSE;
  }
}
