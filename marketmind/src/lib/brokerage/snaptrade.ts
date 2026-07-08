import crypto from "crypto";
import { signState, verifyState } from "../crypto";
import {
  AccountSnapshot, BrokerageAuth, BrokerageError, BrokerageProvider, LinkResult, LinkSession, OrderRequest, OrderResult,
} from "./types";

/**
 * SnapTrade adapter — the official brokerage-connection API (Robinhood is a
 * supported institution for both portfolio data and order placement). Users
 * authenticate on SnapTrade's hosted connection portal; MarketMind stores
 * only the SnapTrade user secret + connection ids (encrypted at rest) and
 * never sees Robinhood credentials.
 *
 * Env: SNAPTRADE_CLIENT_ID, SNAPTRADE_CONSUMER_KEY (sandbox keys work —
 * see README). Request signing follows SnapTrade's HMAC-SHA256 scheme.
 */

const BASE = "https://api.snaptrade.com/api/v1";

interface SnapAuth extends BrokerageAuth {
  snapUserId: string;
  userSecret: string;
  accountId: string;
}

function creds() {
  const clientId = process.env.SNAPTRADE_CLIENT_ID;
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;
  if (!clientId || !consumerKey) {
    throw new BrokerageError("SnapTrade is not configured — set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY");
  }
  return { clientId, consumerKey };
}

async function snapFetch<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  query: Record<string, string> = {},
  body?: unknown
): Promise<T> {
  const { clientId, consumerKey } = creds();
  const fullQuery: Record<string, string> = { ...query, clientId, timestamp: String(Math.floor(Date.now() / 1000)) };
  const queryString = Object.keys(fullQuery)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(fullQuery[k])}`)
    .join("&");
  const sigContent = JSON.stringify({ content: body ?? null, path: `/api/v1${path}`, query: queryString });
  const signature = crypto.createHmac("sha256", consumerKey).update(sigContent).digest("base64");

  const res = await fetch(`${BASE}${path}?${queryString}`, {
    method,
    headers: { "content-type": "application/json", Signature: signature },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) {
    throw new BrokerageError(`SnapTrade auth failed (${res.status})`, true);
  }
  if (!res.ok) {
    // Never include tokens/params in errors — status + provider message only
    const text = await res.text().catch(() => "");
    throw new BrokerageError(`SnapTrade ${method} ${path} failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export class SnapTradeProvider implements BrokerageProvider {
  readonly name = "snaptrade";
  readonly displayName = "Robinhood (via SnapTrade)";
  readonly supportsTrading = true;

  async createLinkSession(userId: string, redirectUri: string): Promise<LinkSession> {
    const snapUserId = `marketmind-${userId}`;
    // Idempotent user registration: 400 "already exists" falls through to login
    let userSecret: string;
    try {
      const reg = await snapFetch<{ userId: string; userSecret: string }>("POST", "/snapTrade/registerUser", {}, { userId: snapUserId });
      userSecret = reg.userSecret;
    } catch (e) {
      throw new BrokerageError(
        `Could not register with SnapTrade: ${e instanceof Error ? e.message : e}. If this user was registered before, delete it in the SnapTrade dashboard or use a fresh account.`
      );
    }
    const state = signState({ userId, snapUserId, userSecret, provider: "snaptrade" });
    const login = await snapFetch<{ redirectURI: string }>(
      "POST",
      "/snapTrade/login",
      { userId: snapUserId, userSecret },
      { broker: "ROBINHOOD", immediateRedirect: true, customRedirect: `${redirectUri}?state=${encodeURIComponent(state)}` }
    );
    return { url: login.redirectURI };
  }

  async completeLink(userId: string, params: Record<string, string>): Promise<LinkResult> {
    const state = verifyState<{ userId: string; snapUserId: string; userSecret: string }>(params.state ?? "");
    if (!state || state.userId !== userId) throw new BrokerageError("Invalid or expired link state");
    const accounts = await snapFetch<{ id: string; number?: string; institution_name?: string }[]>(
      "GET",
      "/accounts",
      { userId: state.snapUserId, userSecret: state.userSecret }
    );
    if (!accounts.length) throw new BrokerageError("No brokerage account returned by SnapTrade — the connection may not have completed");
    const acct = accounts[0];
    const auth: SnapAuth = { snapUserId: state.snapUserId, userSecret: state.userSecret, accountId: acct.id };
    return {
      auth,
      institution: acct.institution_name ?? "Robinhood",
      accountMask: (acct.number ?? "0000").slice(-4),
      supportsTrading: true,
    };
  }

  async fetchAccount(auth: BrokerageAuth): Promise<AccountSnapshot> {
    const a = auth as SnapAuth;
    const q = { userId: a.snapUserId, userSecret: a.userSecret };

    type Holdings = {
      account: { cash_restrictions?: unknown };
      balances: { cash?: number; buying_power?: number }[];
      positions: { symbol?: { symbol?: { symbol?: string } }; units?: number; average_purchase_price?: number }[];
      orders: {
        brokerage_order_id: string;
        status: string;
        symbol?: { symbol?: string } | string;
        universal_symbol?: { symbol?: string };
        action?: string;
        order_type?: string;
        total_quantity?: number;
        limit_price?: number;
        execution_price?: number;
        time_executed?: string;
      }[];
    };
    const h = await snapFetch<Holdings>("GET", `/accounts/${a.accountId}/holdings`, q);

    type Activity = {
      id: string;
      type: string;
      symbol?: { symbol?: string };
      units?: number;
      price?: number;
      amount?: number;
      description?: string;
      trade_date?: string;
      settlement_date?: string;
    };
    let activities: Activity[] = [];
    try {
      activities = await snapFetch<Activity[]>("GET", "/activities", { ...q, accounts: a.accountId });
    } catch {
      // activities endpoint is plan-dependent; portfolio sync still works without it
    }

    const cash = h.balances?.[0]?.cash ?? 0;
    return {
      balances: { cash, buyingPower: h.balances?.[0]?.buying_power ?? cash },
      positions: (h.positions ?? [])
        .map((p) => ({
          symbol: p.symbol?.symbol?.symbol ?? "",
          quantity: p.units ?? 0,
          avgCost: p.average_purchase_price ?? 0,
        }))
        .filter((p) => p.symbol && p.quantity > 0),
      orders: (h.orders ?? []).map((o) => ({
        providerOrderId: o.brokerage_order_id,
        symbol: (typeof o.symbol === "string" ? o.symbol : o.symbol?.symbol) ?? o.universal_symbol?.symbol ?? "",
        side: o.action?.toUpperCase().includes("SELL") ? ("SELL" as const) : ("BUY" as const),
        orderType: o.order_type ?? "LIMIT",
        quantity: o.total_quantity ?? 0,
        limitPrice: o.limit_price ?? undefined,
        status:
          o.status === "EXECUTED" || o.status === "FILLED"
            ? ("FILLED" as const)
            : o.status === "CANCELED" || o.status === "CANCELLED"
              ? ("CANCELED" as const)
              : o.status === "REJECTED" || o.status === "FAILED"
                ? ("REJECTED" as const)
                : ("PENDING" as const),
        fillPrice: o.execution_price ?? undefined,
        filledAt: o.time_executed ?? undefined,
      })),
      activities: activities.map((act) => ({
        externalId: act.id,
        type:
          act.type === "BUY" || act.type === "SELL"
            ? ("FILL" as const)
            : act.type === "DIVIDEND"
              ? ("DIVIDEND" as const)
              : act.type === "CONTRIBUTION"
                ? ("DEPOSIT" as const)
                : act.type === "WITHDRAWAL"
                  ? ("WITHDRAWAL" as const)
                  : ("OTHER" as const),
        symbol: act.symbol?.symbol,
        quantity: act.units,
        price: act.price,
        amount: act.amount ?? undefined,
        description: act.description ?? act.type,
        occurredAt: act.trade_date ?? act.settlement_date ?? new Date().toISOString(),
      })),
    };
  }

  async placeOrder(auth: BrokerageAuth, order: OrderRequest, idempotencyKey: string): Promise<OrderResult> {
    const a = auth as SnapAuth;
    const q = { userId: a.snapUserId, userSecret: a.userSecret };

    // Resolve the universal symbol id for the ticker
    const symbols = await snapFetch<{ id: string; symbol: string }[]>(
      "POST",
      `/accounts/${a.accountId}/symbols`,
      q,
      { substring: order.symbol }
    );
    const match = symbols.find((s) => s.symbol === order.symbol);
    if (!match) throw new BrokerageError(`SnapTrade could not resolve symbol ${order.symbol} for this account`);

    type Placed = { brokerage_order_id?: string; status?: string; execution_price?: number };
    const placed = await snapFetch<Placed>(
      "POST",
      `/accounts/${a.accountId}/orders/place`,
      q,
      {
        account_id: a.accountId,
        action: order.side,
        order_type: order.orderType === "LIMIT" ? "Limit" : "Market",
        price: order.limitPrice,
        stop: order.stopLoss,
        time_in_force: "Day",
        units: order.quantity,
        universal_symbol_id: match.id,
        // SnapTrade dedupes on this where supported; our DB unique constraint
        // on (userId, idempotencyKey) is the primary duplicate guard
        idempotency_key: idempotencyKey,
      }
    );
    return {
      providerOrderId: placed.brokerage_order_id ?? `snap-${idempotencyKey}`,
      status: placed.status === "EXECUTED" || placed.status === "FILLED" ? "FILLED" : "PENDING",
      fillPrice: placed.execution_price,
    };
  }

  async revoke(auth: BrokerageAuth): Promise<void> {
    const a = auth as SnapAuth;
    try {
      await snapFetch("DELETE", "/snapTrade/deleteUser", { userId: a.snapUserId });
    } catch (e) {
      console.error("SnapTrade revoke failed (connection data deleted locally anyway):", e instanceof Error ? e.message : e);
    }
  }
}
