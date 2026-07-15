import { getMarketDataProvider } from "../marketdata";
import { signState, verifyState } from "../crypto";
import {
  AccountSnapshot, BrokerageAuth, BrokerageProvider, LinkResult, LinkSession, OrderRequest, OrderResult,
} from "./types";

/**
 * Mock brokerage ("Robinwood Demo Brokerage"). The entire fake account lives
 * inside the connection's encrypted auth blob, so the provider stays
 * stateless and the sync/order plumbing is exercised exactly like a real
 * provider: hosted "portal" page → callback → tokens → sync → orders.
 * Limit orders fill instantly at the limit price; market orders at the quote.
 */

interface MockOrder {
  providerOrderId: string;
  idempotencyKey: string;
  symbol: string;
  side: "BUY" | "SELL";
  orderType: string;
  quantity: number;
  limitPrice?: number;
  status: "PENDING" | "FILLED" | "CANCELED" | "REJECTED";
  fillPrice?: number;
  filledAt?: string;
}

interface MockActivity {
  externalId: string;
  type: "FILL" | "DIVIDEND" | "DEPOSIT" | "WITHDRAWAL" | "OTHER";
  symbol?: string;
  quantity?: number;
  price?: number;
  amount?: number;
  description: string;
  occurredAt: string;
}

interface MockAccount {
  cash: number;
  positions: { symbol: string; quantity: number; avgCost: number }[];
  orders: MockOrder[];
  activities: MockActivity[];
}

interface MockAuth extends BrokerageAuth {
  mockToken: string;
  account: MockAccount;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString();
}

async function seedAccount(): Promise<MockAccount> {
  // Cost bases anchored slightly off current sim prices so P&L is non-trivial
  const provider = getMarketDataProvider();
  const seeds = [
    { symbol: "AAPL", quantity: 25, drift: 0.94 },
    { symbol: "NVDA", quantity: 60, drift: 0.82 },
    { symbol: "MSFT", quantity: 15, drift: 1.06 },
    { symbol: "TSLA", quantity: 30, drift: 1.12 },
    { symbol: "SPY", quantity: 12, drift: 0.9 },
    { symbol: "AMD", quantity: 45, drift: 0.97 },
  ];
  const quotes = await provider.getQuotes(seeds.map((s) => s.symbol));
  const qmap = new Map(quotes.map((q) => [q.symbol, q.price]));
  const positions = seeds.map((s) => ({
    symbol: s.symbol,
    quantity: s.quantity,
    avgCost: Number(((qmap.get(s.symbol) ?? 100) * s.drift).toFixed(2)),
  }));
  const activities: MockActivity[] = [
    { externalId: "seed-dep-1", type: "DEPOSIT", amount: 25000, description: "ACH deposit", occurredAt: daysAgo(45) },
    ...positions.map((p, i) => ({
      externalId: `seed-fill-${i}`,
      type: "FILL" as const,
      symbol: p.symbol,
      quantity: p.quantity,
      price: p.avgCost,
      amount: -p.quantity * p.avgCost,
      description: `Bought ${p.quantity} ${p.symbol} @ ${p.avgCost.toFixed(2)}`,
      occurredAt: daysAgo(40 - i * 3),
    })),
    { externalId: "seed-div-1", type: "DIVIDEND", symbol: "AAPL", amount: 6.25, description: "AAPL dividend", occurredAt: daysAgo(10) },
  ];
  return { cash: 4816.42, positions, orders: [], activities };
}

export class MockBrokerageProvider implements BrokerageProvider {
  readonly name = "mock";
  readonly displayName = "Robinwood (Demo)";
  readonly supportsTrading = true;

  async createLinkSession(userId: string, redirectUri: string): Promise<LinkSession> {
    const state = signState({ userId, redirectUri, provider: "mock" });
    return { url: `/connect/mock?state=${encodeURIComponent(state)}` };
  }

  async completeLink(userId: string, params: Record<string, string>): Promise<LinkResult> {
    const state = verifyState<{ userId: string }>(params.state ?? "");
    if (!state || state.userId !== userId) throw new Error("Invalid or expired link state");
    const auth: MockAuth = {
      mockToken: `mock-${Math.random().toString(36).slice(2)}`,
      account: await seedAccount(),
    };
    return { auth, institution: "Robinwood (Demo)", accountMask: "6789", supportsTrading: true };
  }

  async fetchAccount(auth: BrokerageAuth): Promise<AccountSnapshot> {
    const a = auth as MockAuth;
    const acct = a.account;
    return {
      balances: { cash: acct.cash, buyingPower: acct.cash },
      positions: acct.positions,
      orders: acct.orders.map(({ idempotencyKey: _ik, ...o }) => o),
      activities: acct.activities.slice(-50),
    };
  }

  async placeOrder(auth: BrokerageAuth, order: OrderRequest, idempotencyKey: string): Promise<OrderResult> {
    const a = { ...(auth as MockAuth) };
    const acct: MockAccount = JSON.parse(JSON.stringify(a.account));

    const existing = acct.orders.find((o) => o.idempotencyKey === idempotencyKey);
    if (existing) {
      return { providerOrderId: existing.providerOrderId, status: existing.status === "FILLED" ? "FILLED" : "PENDING", fillPrice: existing.fillPrice };
    }

    const quote = await getMarketDataProvider().getQuote(order.symbol);
    const fillPrice = order.orderType === "LIMIT" && order.limitPrice ? order.limitPrice : quote.price;
    const cost = fillPrice * order.quantity;
    const providerOrderId = `mock-ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const pos = acct.positions.find((p) => p.symbol === order.symbol);
    let status: "FILLED" | "REJECTED" = "FILLED";
    let reason = "";
    if (order.side === "BUY" && cost > acct.cash) {
      status = "REJECTED";
      reason = "insufficient buying power";
    } else if (order.side === "SELL" && (!pos || pos.quantity < order.quantity)) {
      status = "REJECTED";
      reason = "insufficient shares";
    }

    if (status === "FILLED") {
      if (order.side === "BUY") {
        acct.cash -= cost;
        if (pos) {
          pos.avgCost = (pos.avgCost * pos.quantity + cost) / (pos.quantity + order.quantity);
          pos.quantity += order.quantity;
        } else {
          acct.positions.push({ symbol: order.symbol, quantity: order.quantity, avgCost: fillPrice });
        }
      } else {
        acct.cash += cost;
        if (pos) {
          pos.quantity -= order.quantity;
          if (pos.quantity <= 0.0001) acct.positions = acct.positions.filter((p) => p.symbol !== order.symbol);
        }
      }
      acct.activities.push({
        externalId: `fill-${providerOrderId}`,
        type: "FILL",
        symbol: order.symbol,
        quantity: order.quantity,
        price: fillPrice,
        amount: order.side === "BUY" ? -cost : cost,
        description: `${order.side === "BUY" ? "Bought" : "Sold"} ${order.quantity} ${order.symbol} @ ${fillPrice.toFixed(2)}`,
        occurredAt: new Date().toISOString(),
      });
    }

    acct.orders.push({
      providerOrderId,
      idempotencyKey,
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      quantity: order.quantity,
      limitPrice: order.limitPrice,
      status,
      fillPrice: status === "FILLED" ? fillPrice : undefined,
      filledAt: status === "FILLED" ? new Date().toISOString() : undefined,
    });

    if (status === "REJECTED") {
      return { providerOrderId, status: "REJECTED", updatedAuth: { ...a, account: acct } };
    }
    return { providerOrderId, status: "FILLED", fillPrice, updatedAuth: { ...a, account: acct } };
  }

  async revoke(): Promise<void> {
    // Nothing to revoke server-side for the mock
  }
}
