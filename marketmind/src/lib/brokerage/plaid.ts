import { signState, verifyState } from "../crypto";
import {
  AccountSnapshot, BrokerageAuth, BrokerageError, BrokerageProvider, LinkResult, LinkSession, OrderRequest, OrderResult,
} from "./types";

/**
 * Plaid Investments adapter — read-only fallback for users who only want
 * portfolio tracking. Uses Plaid Hosted Link so no client-side SDK is
 * required, then /investments/holdings/get + /investments/transactions/get.
 *
 * Env: PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV (sandbox|development|production).
 */

interface PlaidAuth extends BrokerageAuth {
  accessToken: string;
  itemId: string;
  accountId: string;
}

function baseUrl(): string {
  const env = (process.env.PLAID_ENV ?? "sandbox").toLowerCase();
  return `https://${env === "production" ? "production" : env === "development" ? "development" : "sandbox"}.plaid.com`;
}

async function plaidFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    throw new BrokerageError("Plaid is not configured — set PLAID_CLIENT_ID and PLAID_SECRET");
  }
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: clientId, secret, ...body }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error_code?: string; error_message?: string };
    if (data.error_code === "ITEM_LOGIN_REQUIRED") throw new BrokerageError("Plaid connection needs re-authentication", true);
    throw new BrokerageError(`Plaid ${path} failed: ${data.error_code ?? res.status} ${data.error_message ?? ""}`);
  }
  return res.json() as Promise<T>;
}

export class PlaidProvider implements BrokerageProvider {
  readonly name = "plaid";
  readonly displayName = "Plaid Investments (read-only)";
  readonly supportsTrading = false;

  async createLinkSession(userId: string, redirectUri: string): Promise<LinkSession> {
    // Hosted Link: Plaid hosts the whole flow; user returns to our callback
    const create = await plaidFetch<{ link_token: string; hosted_link_url?: string }>("/link/token/create", {
      user: { client_user_id: userId },
      client_name: "MarketMind",
      products: ["investments"],
      country_codes: ["US"],
      language: "en",
      hosted_link: {
        completion_redirect_uri: `${redirectUri}?state=${encodeURIComponent(signState({ userId, provider: "plaid", pending: true }))}`,
      },
    });
    if (!create.hosted_link_url) throw new BrokerageError("Plaid did not return a hosted link URL (Hosted Link may need enabling for your client)");
    // Carry link_token through the round-trip inside the signed state
    const state = signState({ userId, linkToken: create.link_token, provider: "plaid" });
    const url = new URL(create.hosted_link_url);
    // Recreate with the token-bearing state (Plaid preserves the redirect URI we set above)
    return { url: `${url.toString()}#mmstate=${encodeURIComponent(state)}` };
  }

  async completeLink(userId: string, params: Record<string, string>): Promise<LinkResult> {
    // Accept either our token-bearing state or the pending marker + explicit link_token param
    const state = verifyState<{ userId: string; linkToken?: string }>(params.mmstate ?? params.state ?? "");
    if (!state || state.userId !== userId) throw new BrokerageError("Invalid or expired link state");
    const linkToken = state.linkToken ?? params.link_token;
    if (!linkToken) throw new BrokerageError("Missing Plaid link token in callback");

    const session = await plaidFetch<{
      link_sessions?: { results?: { item_add_results?: { public_token: string }[] } }[];
    }>("/link/token/get", { link_token: linkToken });
    const publicToken = session.link_sessions?.[0]?.results?.item_add_results?.[0]?.public_token;
    if (!publicToken) throw new BrokerageError("Plaid link was not completed — no public token found");

    const exchange = await plaidFetch<{ access_token: string; item_id: string }>("/item/public_token/exchange", {
      public_token: publicToken,
    });
    const holdings = await plaidFetch<{
      accounts: { account_id: string; mask?: string; name?: string }[];
      item: { institution_name?: string };
    }>("/investments/holdings/get", { access_token: exchange.access_token });
    const acct = holdings.accounts[0];
    if (!acct) throw new BrokerageError("No investment account found on this Plaid item");

    const auth: PlaidAuth = { accessToken: exchange.access_token, itemId: exchange.item_id, accountId: acct.account_id };
    return {
      auth,
      institution: holdings.item.institution_name ?? acct.name ?? "Brokerage (Plaid)",
      accountMask: acct.mask ?? "0000",
      supportsTrading: false,
    };
  }

  async fetchAccount(auth: BrokerageAuth): Promise<AccountSnapshot> {
    const a = auth as PlaidAuth;
    const h = await plaidFetch<{
      accounts: { account_id: string; balances: { available?: number; current?: number } }[];
      holdings: { account_id: string; security_id: string; quantity: number; cost_basis?: number; institution_price?: number }[];
      securities: { security_id: string; ticker_symbol?: string }[];
    }>("/investments/holdings/get", { access_token: a.accessToken });

    const tickers = new Map(h.securities.map((s) => [s.security_id, s.ticker_symbol]));
    const account = h.accounts.find((acc) => acc.account_id === a.accountId) ?? h.accounts[0];
    const cash = account?.balances.available ?? 0;

    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    let txns: {
      investment_transaction_id: string; type: string; subtype?: string; security_id?: string;
      quantity?: number; price?: number; amount?: number; name?: string; date: string;
    }[] = [];
    try {
      const t = await plaidFetch<{ investment_transactions: typeof txns }>("/investments/transactions/get", {
        access_token: a.accessToken,
        start_date: start,
        end_date: end,
      });
      txns = t.investment_transactions;
    } catch {
      // transactions are optional for the read-only sync
    }

    return {
      balances: { cash, buyingPower: 0 },
      positions: h.holdings
        .filter((hold) => hold.account_id === a.accountId)
        .map((hold) => ({
          symbol: tickers.get(hold.security_id) ?? "",
          quantity: hold.quantity,
          avgCost: hold.cost_basis && hold.quantity ? hold.cost_basis / hold.quantity : hold.institution_price ?? 0,
        }))
        .filter((p) => p.symbol && p.quantity > 0),
      orders: [], // Plaid is read-only; no open-order feed
      activities: txns.map((t) => ({
        externalId: t.investment_transaction_id,
        type: t.type === "buy" || t.type === "sell" ? ("FILL" as const) : t.type === "cash" ? ("DEPOSIT" as const) : ("OTHER" as const),
        symbol: t.security_id ? tickers.get(t.security_id) : undefined,
        quantity: t.quantity,
        price: t.price,
        amount: t.amount,
        description: t.name ?? `${t.type}${t.subtype ? ` (${t.subtype})` : ""}`,
        occurredAt: new Date(t.date).toISOString(),
      })),
    };
  }

  async placeOrder(): Promise<OrderResult> {
    throw new BrokerageError("Plaid connections are read-only — trading is not supported");
  }

  async revoke(auth: BrokerageAuth): Promise<void> {
    const a = auth as PlaidAuth;
    try {
      await plaidFetch("/item/remove", { access_token: a.accessToken });
    } catch (e) {
      console.error("Plaid item removal failed (connection data deleted locally anyway):", e instanceof Error ? e.message : e);
    }
  }
}
