import { PrismaClient, BrokerageOrderStatus } from "@prisma/client";
import { getBrokerageProvider } from "./index";
import { BrokerageAuth, BrokerageError } from "./types";
import { decryptJson, encryptJson } from "../crypto";
import { getMarketDataProvider } from "../marketdata";

/**
 * Pulls a connection's balances, positions, open orders, and activity from
 * its provider, persists them, snapshots equity for the curve, and
 * auto-journals newly filled orders so AI coaching runs on real trades.
 *
 * Used by the worker (every SYNC_INTERVAL) and the on-demand refresh button.
 */
export async function syncConnection(prisma: PrismaClient, connectionId: string): Promise<{ ok: boolean; error?: string }> {
  const conn = await prisma.brokerageConnection.findUnique({ where: { id: connectionId } });
  if (!conn || conn.status === "DISCONNECTED") return { ok: false, error: "Connection not found" };

  const provider = getBrokerageProvider(conn.provider);
  let auth: BrokerageAuth;
  try {
    auth = decryptJson<BrokerageAuth>(conn.encryptedAuth);
  } catch {
    return { ok: false, error: "Could not decrypt connection tokens" };
  }

  try {
    const snap = await provider.fetchAccount(auth);

    // Equity = cash + Σ position marked at live prices
    const symbols = snap.positions.map((p) => p.symbol);
    const quotes = symbols.length ? await getMarketDataProvider().getQuotes(symbols) : [];
    const priceMap = new Map(quotes.map((q) => [q.symbol, q.price]));
    const marketValue = snap.positions.reduce((a, p) => a + p.quantity * (priceMap.get(p.symbol) ?? p.avgCost), 0);
    const equity = snap.balances.cash + marketValue;

    await prisma.$transaction(async (tx) => {
      await tx.brokerageConnection.update({
        where: { id: conn.id },
        data: {
          cash: snap.balances.cash,
          buyingPower: snap.balances.buyingPower,
          equity,
          lastSyncAt: new Date(),
          status: "ACTIVE",
          ...(snap.updatedAuth ? { encryptedAuth: encryptJson(snap.updatedAuth) } : {}),
        },
      });

      // Positions: replace-set semantics
      await tx.brokeragePosition.deleteMany({
        where: { connectionId: conn.id, symbol: { notIn: symbols.length ? symbols : ["__none__"] } },
      });
      for (const p of snap.positions) {
        await tx.brokeragePosition.upsert({
          where: { connectionId_symbol: { connectionId: conn.id, symbol: p.symbol } },
          update: { quantity: p.quantity, avgCost: p.avgCost, syncedAt: new Date() },
          create: { connectionId: conn.id, symbol: p.symbol, quantity: p.quantity, avgCost: p.avgCost },
        });
      }

      // Order status reconciliation (orders we placed + any provider-side ones)
      for (const o of snap.orders) {
        const existing = await tx.brokerageOrder.findFirst({
          where: { connectionId: conn.id, providerOrderId: o.providerOrderId },
        });
        if (existing) {
          if (existing.status !== o.status || (o.fillPrice && existing.fillPrice !== o.fillPrice)) {
            await tx.brokerageOrder.update({
              where: { id: existing.id },
              data: {
                status: o.status as BrokerageOrderStatus,
                fillPrice: o.fillPrice ?? existing.fillPrice,
                filledAt: o.filledAt ? new Date(o.filledAt) : existing.filledAt,
              },
            });
          }
        } else if (o.symbol) {
          // Order placed outside MarketMind — record it for the audit trail
          await tx.brokerageOrder.create({
            data: {
              connectionId: conn.id,
              userId: conn.userId,
              providerOrderId: o.providerOrderId,
              idempotencyKey: `ext-${conn.id}-${o.providerOrderId}`,
              symbol: o.symbol,
              side: o.side,
              orderType: o.orderType,
              quantity: o.quantity,
              limitPrice: o.limitPrice,
              status: o.status as BrokerageOrderStatus,
              fillPrice: o.fillPrice,
              filledAt: o.filledAt ? new Date(o.filledAt) : null,
            },
          });
        }
      }

      // Activities (idempotent on externalId)
      for (const act of snap.activities) {
        await tx.brokerageActivity.upsert({
          where: { connectionId_externalId: { connectionId: conn.id, externalId: act.externalId } },
          update: {},
          create: {
            connectionId: conn.id,
            externalId: act.externalId,
            type: act.type,
            symbol: act.symbol,
            quantity: act.quantity,
            price: act.price,
            amount: act.amount,
            description: act.description,
            occurredAt: new Date(act.occurredAt),
          },
        });
      }

      // Equity snapshot for the curve (throttle: one per 30 min)
      const lastSnap = await tx.portfolioSnapshot.findFirst({
        where: { connectionId: conn.id },
        orderBy: { createdAt: "desc" },
      });
      if (!lastSnap || Date.now() - lastSnap.createdAt.getTime() > 30 * 60_000) {
        await tx.portfolioSnapshot.create({ data: { connectionId: conn.id, equity, cash: snap.balances.cash } });
      }
    });

    await journalNewFills(prisma, conn.id, conn.userId);
    return { ok: true };
  } catch (e) {
    if (e instanceof BrokerageError && e.authExpired) {
      await prisma.brokerageConnection.update({ where: { id: conn.id }, data: { status: "EXPIRED" } });
      return { ok: false, error: "Connection expired — please reconnect" };
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`sync failed for connection ${conn.id} (${conn.provider}):`, msg);
    return { ok: false, error: msg };
  }
}

/**
 * Auto-log newly filled brokerage orders into the Trade Journal:
 * BUY fills open an entry; SELL fills close the oldest open brokerage entry
 * for that symbol (computing P&L and R against its stop, if set).
 */
async function journalNewFills(prisma: PrismaClient, connectionId: string, userId: string) {
  const fills = await prisma.brokerageOrder.findMany({
    where: { connectionId, status: "FILLED", journaled: false },
    orderBy: { filledAt: "asc" },
  });
  for (const order of fills) {
    const price = order.fillPrice ?? order.limitPrice ?? 0;
    if (order.side === "BUY") {
      await prisma.journalEntry.create({
        data: {
          userId,
          signalId: order.signalId,
          source: "brokerage",
          symbol: order.symbol,
          side: "BUY",
          entryPrice: price,
          quantity: order.quantity,
          stopLoss: order.stopLoss,
          target: order.takeProfit,
          notes: `Auto-logged from brokerage fill (order ${order.id.slice(-6)})`,
          openedAt: order.filledAt ?? order.placedAt,
        },
      });
    } else {
      const open = await prisma.journalEntry.findFirst({
        where: { userId, symbol: order.symbol, source: "brokerage", closedAt: null, side: "BUY" },
        orderBy: { openedAt: "asc" },
      });
      if (open) {
        const pnl = (price - open.entryPrice) * Math.min(order.quantity, open.quantity);
        const riskPerShare = open.stopLoss ? Math.abs(open.entryPrice - open.stopLoss) : null;
        await prisma.journalEntry.update({
          where: { id: open.id },
          data: {
            exitPrice: price,
            pnl,
            rMultiple: riskPerShare ? (price - open.entryPrice) / riskPerShare : null,
            closedAt: order.filledAt ?? new Date(),
            notes: `${open.notes ?? ""}\nClosed by brokerage fill (order ${order.id.slice(-6)})`.trim(),
          },
        });
      } else {
        await prisma.journalEntry.create({
          data: {
            userId,
            signalId: order.signalId,
            source: "brokerage",
            symbol: order.symbol,
            side: "SELL",
            entryPrice: price,
            quantity: order.quantity,
            notes: `Auto-logged sell fill with no matching open entry (order ${order.id.slice(-6)})`,
            openedAt: order.filledAt ?? order.placedAt,
          },
        });
      }
    }
    await prisma.brokerageOrder.update({ where: { id: order.id }, data: { journaled: true } });
  }
}

/** Today's realized P&L from brokerage-sourced journal closes (loss guard input). */
export async function todaysRealizedPnl(prisma: PrismaClient, userId: string): Promise<number> {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const closed = await prisma.journalEntry.findMany({
    where: { userId, source: "brokerage", closedAt: { gte: dayStart }, pnl: { not: null } },
    select: { pnl: true },
  });
  return closed.reduce((a, e) => a + (e.pnl ?? 0), 0);
}
