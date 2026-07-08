/**
 * MarketMind autonomous scanning engine.
 *
 * Runs as a standalone Node service beside the Next.js web app:
 *  - hosts the Socket.IO server that streams prices/signals/alerts to clients
 *  - ticks live quotes every PRICE_TICK_SECONDS
 *  - runs the setup scanner every SCAN_INTERVAL_SECONDS
 *  - manages signal lifecycle (Waiting → Entry Active → Targets/Stop) with a
 *    full audit trail in SignalEvent, and fans out per-user alerts.
 */
import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient, SignalStatus, Prisma } from "@prisma/client";
import { getMarketDataProvider, Quote } from "../lib/marketdata";
import { evaluateSymbol, currentSessionBars } from "../lib/scanner";
import { generateThesis } from "../lib/ai";
import { syncConnection } from "../lib/brokerage/sync";

const prisma = new PrismaClient();
const provider = getMarketDataProvider();

const WS_PORT = parseInt(process.env.WS_PORT ?? "3001");
const TICK_SECONDS = Math.max(1, parseInt(process.env.PRICE_TICK_SECONDS ?? "2"));
const SCAN_SECONDS = Math.max(15, parseInt(process.env.SCAN_INTERVAL_SECONDS ?? "60"));
const SIGNAL_TTL_HOURS = 8; // WAITING signals expire after this long

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, provider: provider.name, uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: { origin: process.env.NEXTAUTH_URL ?? "http://localhost:3000", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  // Clients join a per-user room to receive their alerts
  socket.on("identify", (userId: string) => {
    if (typeof userId === "string" && userId.length < 64) socket.join(`user:${userId}`);
  });
  socket.on("watch", (symbol: string) => {
    if (typeof symbol === "string" && /^[A-Z.]{1,10}$/.test(symbol)) socket.join(`sym:${symbol}`);
  });
  socket.on("unwatch", (symbol: string) => {
    if (typeof symbol === "string") socket.leave(`sym:${symbol}`);
  });
});

async function universeSymbols(): Promise<string[]> {
  const base = (await provider.getUniverse()).map((s) => s.symbol);
  const watched = await prisma.watchlistItem.findMany({ select: { symbol: true }, distinct: ["symbol"] });
  return Array.from(new Set([...base, ...watched.map((w) => w.symbol)]));
}

// ---------------- price ticks + signal lifecycle ----------------

let lastQuotes = new Map<string, Quote>();

async function priceTick() {
  try {
    const symbols = await universeSymbols();
    const quotes = await provider.getQuotes(symbols);
    lastQuotes = new Map(quotes.map((q) => [q.symbol, q]));
    io.emit("prices", quotes);
    await advanceSignals(quotes);
  } catch (e) {
    console.error("price tick failed:", e);
  }
}

async function advanceSignals(quotes: Quote[]) {
  const open = await prisma.signal.findMany({
    where: { status: { in: ["WAITING", "ENTRY_ACTIVE", "TARGET1_HIT"] } },
  });
  const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));
  for (const sig of open) {
    const q = bySymbol.get(sig.symbol);
    if (!q) continue;
    const p = q.price;
    const isLong = sig.direction === "LONG";
    let next: SignalStatus | null = null;
    let note = "";

    if (sig.status === "WAITING") {
      if (p >= sig.entryLow && p <= sig.entryHigh) {
        next = "ENTRY_ACTIVE";
        note = `Price ${p.toFixed(2)} entered the entry zone`;
      } else if (isLong ? p <= sig.stopLoss : p >= sig.stopLoss) {
        next = "EXPIRED";
        note = `Price reached stop level before entry — setup invalidated`;
      } else if (Date.now() - sig.createdAt.getTime() > SIGNAL_TTL_HOURS * 3600_000) {
        next = "EXPIRED";
        note = `Signal expired after ${SIGNAL_TTL_HOURS}h without entry`;
      }
    } else if (sig.status === "ENTRY_ACTIVE") {
      if (isLong ? p <= sig.stopLoss : p >= sig.stopLoss) {
        next = "STOPPED_OUT";
        note = `Stop level ${sig.stopLoss.toFixed(2)} traded`;
      } else if (isLong ? p >= sig.target1 : p <= sig.target1) {
        next = "TARGET1_HIT";
        note = `Target 1 (${sig.target1.toFixed(2)}, 2R) reached`;
      }
    } else if (sig.status === "TARGET1_HIT") {
      if (isLong ? p <= sig.stopLoss : p >= sig.stopLoss) {
        next = "STOPPED_OUT";
        note = `Stop traded after Target 1`;
      } else if (isLong ? p >= sig.target2 : p <= sig.target2) {
        next = "TARGET2_HIT";
        note = `Target 2 (${sig.target2.toFixed(2)}, 3R) reached`;
      }
    }

    if (!next) continue;
    const updated = await prisma.signal.update({ where: { id: sig.id }, data: { status: next } });
    await prisma.signalEvent.create({
      data: { signalId: sig.id, fromState: sig.status, toState: next, price: p, note },
    });
    io.emit("signal:update", updated);
    if (next !== "EXPIRED") await fanOutAlerts(sig.id, sig.symbol, next, note);
  }
}

async function fanOutAlerts(signalId: string, symbol: string, status: SignalStatus, note: string) {
  const kind =
    status === "ENTRY_ACTIVE" ? "ENTRY_ZONE" : status === "STOPPED_OUT" ? "STOP_THREAT" : "TARGET_HIT";
  // Alert users who have the symbol on a watchlist, honoring their prefs
  const watchers = await prisma.watchlistItem.findMany({
    where: { symbol },
    select: { watchlist: { select: { userId: true } } },
  });
  const userIds = Array.from(new Set(watchers.map((w) => w.watchlist.userId)));
  if (userIds.length === 0) return;
  const prefs = await prisma.alertPreference.findMany({ where: { userId: { in: userIds } } });
  const prefMap = new Map(prefs.map((p) => [p.userId, p]));
  const message = `${symbol}: ${note}`;
  for (const userId of userIds) {
    const p = prefMap.get(userId);
    const enabled =
      kind === "ENTRY_ZONE" ? p?.entryZone ?? true : kind === "STOP_THREAT" ? p?.stopThreatened ?? true : p?.targetHit ?? true;
    if (!enabled) continue;
    const alert = await prisma.alert.create({ data: { userId, signalId, symbol, kind, message } });
    io.to(`user:${userId}`).emit("alert", alert);
  }
}

// ---------------- scanner ----------------

async function scan() {
  const startedAt = Date.now();
  try {
    const symbols = await universeSymbols();
    const quotes = lastQuotes.size ? lastQuotes : new Map((await provider.getQuotes(symbols)).map((q) => [q.symbol, q]));
    let created = 0;

    for (const symbol of symbols) {
      const quote = quotes.get(symbol);
      if (!quote) continue;
      const bars = await provider.getBars(symbol, "5min", 400);
      if (bars.length < 60) continue;
      const candidate = evaluateSymbol(symbol, quote, bars, currentSessionBars(bars));
      if (!candidate || candidate.confidence < 55) continue;

      // Dedupe: skip if an open signal already exists for this symbol+setup
      const existing = await prisma.signal.findFirst({
        where: {
          symbol,
          setupType: candidate.setupType,
          status: { in: ["WAITING", "ENTRY_ACTIVE", "TARGET1_HIT"] },
        },
      });
      if (existing) continue;

      const signal = await prisma.signal.create({
        data: {
          symbol,
          setupType: candidate.setupType,
          direction: candidate.direction,
          confidence: candidate.confidence,
          entryLow: candidate.entryLow,
          entryHigh: candidate.entryHigh,
          stopLoss: candidate.stopLoss,
          target1: candidate.target1,
          target2: candidate.target2,
          priceAtScan: candidate.priceAtScan,
          atr: candidate.snapshot.atr14,
          rsi: isFinite(candidate.snapshot.rsi14) ? candidate.snapshot.rsi14 : null,
          relVolume: candidate.snapshot.relVolume,
          gapPercent: candidate.snapshot.gapPercent,
          vwap: isFinite(candidate.snapshot.vwap) ? candidate.snapshot.vwap : null,
          technicals: JSON.parse(JSON.stringify({ ...candidate.snapshot, reasons: candidate.reasons })) as Prisma.InputJsonValue,
          expiresAt: new Date(Date.now() + SIGNAL_TTL_HOURS * 3600_000),
        },
      });
      await prisma.signalEvent.create({
        data: { signalId: signal.id, toState: "WAITING", price: candidate.priceAtScan, note: `Scanner flagged ${candidate.setupType} (${candidate.reasons[0]})` },
      });
      created++;
      io.emit("signal:new", signal);

      // Generate the AI thesis out-of-band so scanning stays fast
      void generateThesis({
        symbol,
        setupType: candidate.setupType,
        direction: candidate.direction,
        confidence: candidate.confidence,
        entryLow: candidate.entryLow,
        entryHigh: candidate.entryHigh,
        stopLoss: candidate.stopLoss,
        target1: candidate.target1,
        target2: candidate.target2,
        snapshot: candidate.snapshot,
        reasons: candidate.reasons,
      })
        .then(async ({ thesis, risks, proNotes }) => {
          const withThesis = await prisma.signal.update({
            where: { id: signal.id },
            data: { thesis, risks, proNotes },
          });
          io.emit("signal:update", withThesis);
        })
        .catch((e) => console.error("thesis generation failed:", e));
    }
    console.log(
      `[scan] ${new Date().toISOString()} scanned ${symbols.length} symbols, ${created} new signals, ${Date.now() - startedAt}ms`
    );
  } catch (e) {
    console.error("scan failed:", e);
  }
}

// ---------------- brokerage portfolio sync ----------------

const BROKERAGE_SYNC_SECONDS = Math.max(60, parseInt(process.env.BROKERAGE_SYNC_SECONDS ?? "300"));

async function syncBrokerages() {
  try {
    const connections = await prisma.brokerageConnection.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, userId: true, provider: true },
    });
    let ok = 0;
    for (const conn of connections) {
      const result = await syncConnection(prisma, conn.id);
      if (result.ok) {
        ok++;
        io.to(`user:${conn.userId}`).emit("portfolio:synced", { connectionId: conn.id, at: new Date().toISOString() });
      }
    }
    if (connections.length > 0) {
      console.log(`[brokerage-sync] ${new Date().toISOString()} synced ${ok}/${connections.length} connections`);
    }
  } catch (e) {
    console.error("brokerage sync loop failed:", e);
  }
}

// ---------------- boot ----------------

httpServer.listen(WS_PORT, () => {
  console.log(`MarketMind engine online — ws :${WS_PORT}, provider: ${provider.name}`);
  console.log(`price tick every ${TICK_SECONDS}s, scan every ${SCAN_SECONDS}s`);
});

void priceTick();
void scan();
void syncBrokerages();
setInterval(priceTick, TICK_SECONDS * 1000);
setInterval(scan, SCAN_SECONDS * 1000);
setInterval(syncBrokerages, BROKERAGE_SYNC_SECONDS * 1000);
