export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  timestamp: number;
}

export interface Bar {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type BarInterval = "1min" | "5min" | "15min" | "1day";

export interface SymbolInfo {
  symbol: string;
  name: string;
  sector: string;
}

/**
 * Swappable market data source. Implementations: mock (local dev),
 * Polygon.io, Finnhub. Select via MARKET_DATA_PROVIDER env var.
 */
export interface MarketDataProvider {
  readonly name: string;
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getBars(symbol: string, interval: BarInterval, limit: number): Promise<Bar[]>;
  getUniverse(): Promise<SymbolInfo[]>;
}
