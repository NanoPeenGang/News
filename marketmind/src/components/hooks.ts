"use client";

import { useCallback, useEffect, useState } from "react";
import { LiveSignal, useLive } from "./Providers";

/** Fetch signals from the API and keep them fresh via WebSocket pushes. */
export function useSignals(query: string = "") {
  const [signals, setSignals] = useState<LiveSignal[] | null>(null);
  const [delayed, setDelayed] = useState(false);
  const { lastSignal, lastSignalUpdate } = useLive();

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/signals${query ? `?${query}` : ""}`);
    if (res.ok) {
      const data = await res.json();
      setSignals(data.signals);
      setDelayed(data.delayed ?? false);
    }
  }, [query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (lastSignal) {
      setSignals((prev) => {
        if (!prev || prev.some((s) => s.id === lastSignal.id)) return prev;
        return [lastSignal, ...prev];
      });
    }
  }, [lastSignal]);

  useEffect(() => {
    if (lastSignalUpdate) {
      setSignals((prev) => prev?.map((s) => (s.id === lastSignalUpdate.id ? { ...s, ...lastSignalUpdate } : s)) ?? prev);
    }
  }, [lastSignalUpdate]);

  return { signals, delayed, refresh };
}

export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) setError(json.error ?? `Request failed (${res.status})`);
      else {
        setData(json);
        setError(null);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, error, loading, refresh };
}

// ---------------- Brokerage holdings (for "You own this" badges) ----------------

export interface Holding {
  quantity: number;
  avgCost: number;
}

let holdingsCache: { data: Record<string, Holding>; at: number } | null = null;
let holdingsInflight: Promise<Record<string, Holding>> | null = null;

async function fetchHoldings(): Promise<Record<string, Holding>> {
  if (holdingsCache && Date.now() - holdingsCache.at < 60_000) return holdingsCache.data;
  if (!holdingsInflight) {
    holdingsInflight = fetch("/api/portfolio/holdings")
      .then((r) => (r.ok ? r.json() : { holdings: {} }))
      .then((d) => {
        holdingsCache = { data: d.holdings ?? {}, at: Date.now() };
        holdingsInflight = null;
        return holdingsCache.data;
      })
      .catch(() => {
        holdingsInflight = null;
        return {};
      });
  }
  return holdingsInflight;
}

/** Synced brokerage holdings, cached for a minute and shared across components. */
export function useHoldings(): Record<string, Holding> {
  const [holdings, setHoldings] = useState<Record<string, Holding>>(holdingsCache?.data ?? {});
  useEffect(() => {
    let alive = true;
    void fetchHoldings().then((h) => alive && setHoldings(h));
    return () => {
      alive = false;
    };
  }, []);
  return holdings;
}
