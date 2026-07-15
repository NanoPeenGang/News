import { MarketDataProvider } from "./types";
import { MockProvider } from "./mock";
import { PolygonProvider } from "./polygon";
import { FinnhubProvider } from "./finnhub";

let provider: MarketDataProvider | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  if (provider) return provider;
  const which = (process.env.MARKET_DATA_PROVIDER ?? "mock").toLowerCase();
  switch (which) {
    case "polygon":
      provider = new PolygonProvider(process.env.POLYGON_API_KEY ?? "");
      break;
    case "finnhub":
      provider = new FinnhubProvider(process.env.FINNHUB_API_KEY ?? "");
      break;
    default:
      provider = new MockProvider();
  }
  return provider;
}

export * from "./types";
export { MOCK_UNIVERSE } from "./mock";
