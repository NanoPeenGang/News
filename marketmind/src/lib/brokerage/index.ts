import { BrokerageProvider } from "./types";
import { MockBrokerageProvider } from "./mock";
import { SnapTradeProvider } from "./snaptrade";
import { PlaidProvider } from "./plaid";

const providers: Record<string, BrokerageProvider> = {
  mock: new MockBrokerageProvider(),
  snaptrade: new SnapTradeProvider(),
  plaid: new PlaidProvider(),
};

export function getBrokerageProvider(name: string): BrokerageProvider {
  const p = providers[name];
  if (!p) throw new Error(`Unknown brokerage provider: ${name}`);
  return p;
}

/** Providers offered on the Connections page, given current env config. */
export function availableBrokerageProviders(): { name: string; displayName: string; supportsTrading: boolean; configured: boolean }[] {
  return [
    {
      name: "snaptrade",
      displayName: "Robinhood (via SnapTrade)",
      supportsTrading: true,
      configured: !!(process.env.SNAPTRADE_CLIENT_ID && process.env.SNAPTRADE_CONSUMER_KEY),
    },
    {
      name: "plaid",
      displayName: "Plaid Investments (read-only)",
      supportsTrading: false,
      configured: !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET),
    },
    {
      name: "mock",
      displayName: "Robinwood (Demo)",
      supportsTrading: true,
      configured: true,
    },
  ];
}

export function liveTradingEnabled(): boolean {
  return process.env.ENABLE_LIVE_TRADING === "true";
}

export * from "./types";
