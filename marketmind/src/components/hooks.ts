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
