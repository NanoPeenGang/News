"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// ---------------- Socket + live data context ----------------

export interface LiveQuote {
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

export interface LiveSignal {
  id: string;
  symbol: string;
  setupType: string;
  direction: string;
  status: string;
  confidence: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  target1: number;
  target2: number;
  priceAtScan: number;
  thesis?: string | null;
  risks?: string | null;
  proNotes?: string | null;
  createdAt: string;
}

export interface LiveAlert {
  id: string;
  symbol: string;
  kind: string;
  message: string;
  signalId?: string | null;
  createdAt: string;
  read: boolean;
}

interface LiveContextValue {
  connected: boolean;
  quotes: Map<string, LiveQuote>;
  lastSignal: LiveSignal | null;
  lastSignalUpdate: LiveSignal | null;
  alerts: LiveAlert[];
  clearAlert: (id: string) => void;
  socket: Socket | null;
}

const LiveContext = createContext<LiveContextValue>({
  connected: false,
  quotes: new Map(),
  lastSignal: null,
  lastSignalUpdate: null,
  alerts: [],
  clearAlert: () => {},
  socket: null,
});

export function useLive() {
  return useContext(LiveContext);
}

/** Convenience: subscribe to a single symbol's live quote. */
export function useLiveQuote(symbol: string | undefined): LiveQuote | undefined {
  const { quotes } = useLive();
  return symbol ? quotes.get(symbol) : undefined;
}

function LiveProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [connected, setConnected] = useState(false);
  const [quotes, setQuotes] = useState<Map<string, LiveQuote>>(new Map());
  const [lastSignal, setLastSignal] = useState<LiveSignal | null>(null);
  const [lastSignalUpdate, setLastSignalUpdate] = useState<LiveSignal | null>(null);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";
    const socket = io(url, { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("prices", (qs: LiveQuote[]) => {
      setQuotes((prev) => {
        const next = new Map(prev);
        for (const q of qs) next.set(q.symbol, q);
        return next;
      });
    });
    socket.on("signal:new", (s: LiveSignal) => setLastSignal(s));
    socket.on("signal:update", (s: LiveSignal) => setLastSignalUpdate(s));
    socket.on("alert", (a: LiveAlert) => {
      setAlerts((prev) => [a, ...prev].slice(0, 20));
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(`MarketMind — ${a.symbol}`, { body: a.message });
      }
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (userId && socketRef.current) socketRef.current.emit("identify", userId);
  }, [userId, connected]);

  const value = useMemo(
    () => ({
      connected,
      quotes,
      lastSignal,
      lastSignalUpdate,
      alerts,
      clearAlert: (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id)),
      socket: socketRef.current,
    }),
    [connected, quotes, lastSignal, lastSignalUpdate, alerts]
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LiveProvider>{children}</LiveProvider>
    </SessionProvider>
  );
}
