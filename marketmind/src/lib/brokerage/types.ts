/**
 * Swappable brokerage-connection layer, mirroring MarketDataProvider.
 *
 * Implementations:
 *  - mock      — fake portfolio, instant fills; local dev with no keys
 *  - snaptrade — official brokerage-connection API (Robinhood supported for
 *                data AND trading); users authenticate on SnapTrade's hosted
 *                portal so MarketMind never sees brokerage credentials
 *  - plaid     — Plaid Investments; read-only holdings/transactions fallback
 *
 * All methods run server-side only. `auth` is the provider's token bundle,
 * stored AES-256-GCM-encrypted in BrokerageConnection.encryptedAuth and
 * decrypted just-in-time. Providers may return `updatedAuth` when tokens
 * rotate (or, for mock, when the fake account state changes).
 */

export type BrokerageAuth = Record<string, unknown>;

export interface LinkSession {
  /** Hosted auth portal URL to open in a popup/redirect. */
  url: string;
}

export interface LinkResult {
  auth: BrokerageAuth;
  institution: string;
  /** Last 4 characters only — never the full account number. */
  accountMask: string;
  supportsTrading: boolean;
}

export interface BrokerageBalances {
  cash: number;
  buyingPower: number;
}

export interface BrokeragePositionData {
  symbol: string;
  quantity: number;
  avgCost: number;
}

export interface BrokerageOrderSnapshot {
  providerOrderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  orderType: string;
  quantity: number;
  limitPrice?: number;
  status: "PENDING" | "FILLED" | "CANCELED" | "REJECTED";
  fillPrice?: number;
  filledAt?: string; // ISO
}

export interface BrokerageActivityData {
  externalId: string;
  type: "FILL" | "DIVIDEND" | "DEPOSIT" | "WITHDRAWAL" | "OTHER";
  symbol?: string;
  quantity?: number;
  price?: number;
  amount?: number;
  description: string;
  occurredAt: string; // ISO
}

export interface AccountSnapshot {
  balances: BrokerageBalances;
  positions: BrokeragePositionData[];
  orders: BrokerageOrderSnapshot[];
  activities: BrokerageActivityData[];
  /** Providers return this when tokens rotate or internal state changes. */
  updatedAuth?: BrokerageAuth;
}

export interface OrderRequest {
  symbol: string;
  side: "BUY" | "SELL";
  orderType: "LIMIT" | "MARKET";
  quantity: number;
  limitPrice?: number;
  /** Bracket legs, applied where the provider supports them. */
  stopLoss?: number;
  takeProfit?: number;
}

export interface OrderResult {
  providerOrderId: string;
  status: "PENDING" | "FILLED" | "REJECTED";
  fillPrice?: number;
  updatedAuth?: BrokerageAuth;
}

export interface BrokerageProvider {
  readonly name: string;
  readonly displayName: string;
  readonly supportsTrading: boolean;

  /** Start the hosted-portal link flow. `redirectUri` is our callback URL. */
  createLinkSession(userId: string, redirectUri: string): Promise<LinkSession>;

  /** Complete the link from callback query params; returns tokens to encrypt. */
  completeLink(userId: string, params: Record<string, string>): Promise<LinkResult>;

  /** Pull balances, positions, open orders, and recent activity. */
  fetchAccount(auth: BrokerageAuth): Promise<AccountSnapshot>;

  /** Place an order (only when supportsTrading). Must be idempotent per key. */
  placeOrder?(auth: BrokerageAuth, order: OrderRequest, idempotencyKey: string): Promise<OrderResult>;

  /** Revoke tokens / delete the provider-side connection. */
  revoke(auth: BrokerageAuth): Promise<void>;
}

export class BrokerageError extends Error {
  constructor(
    message: string,
    /** true → connection needs re-auth (mark EXPIRED, show reconnect) */
    public readonly authExpired = false
  ) {
    super(message);
  }
}
