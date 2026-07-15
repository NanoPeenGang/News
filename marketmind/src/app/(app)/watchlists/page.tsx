"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, X } from "lucide-react";
import { useFetch } from "@/components/hooks";
import { useLiveQuote } from "@/components/Providers";
import { Badge, Button, Card, Input, NumberTicker, SectionTitle, Skeleton, cn } from "@/components/ui";
import { fmtPercent } from "@/lib/format";

interface Watchlist {
  id: string;
  name: string;
  items: { id: string; symbol: string }[];
}

export default function WatchlistsPage() {
  const { data, loading, refresh, error } = useFetch<{ watchlists: Watchlist[] }>("/api/watchlists");
  const [newName, setNewName] = useState("");
  const [msg, setMsg] = useState("");

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/watchlists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const d = await res.json();
    if (!res.ok) setMsg(d.error);
    else {
      setNewName("");
      setMsg("");
      void refresh();
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-mist-100">Watchlists</h1>
        <p className="text-sm text-mist-400">Watched tickers join the scanner universe and drive your alerts.</p>
      </div>

      <form onSubmit={createList} className="flex gap-2">
        <Input placeholder="New watchlist name…" value={newName} onChange={(e) => setNewName(e.target.value)} required className="max-w-xs" />
        <Button type="submit" className="flex items-center gap-1.5"><Plus size={14} /> Create</Button>
      </form>
      {msg && (
        <p className="text-xs text-amber-warn">
          {msg} {msg.includes("Premium") && <Link href="/pricing" className="underline">See pricing →</Link>}
        </p>
      )}

      {loading && <Skeleton className="h-48 w-full" />}
      {data?.watchlists.map((wl) => (
        <WatchlistCard key={wl.id} watchlist={wl} onChange={refresh} onError={setMsg} />
      ))}
      {data?.watchlists.length === 0 && (
        <Card className="py-10 text-center text-sm text-mist-400">No watchlists yet — create one above.</Card>
      )}
    </div>
  );
}

function WatchlistCard({ watchlist, onChange, onError }: { watchlist: Watchlist; onChange: () => void; onError: (e: string) => void }) {
  const [symbol, setSymbol] = useState("");

  async function addSymbol(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/watchlists/${watchlist.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
    const d = await res.json();
    if (!res.ok) onError(d.error);
    else {
      setSymbol("");
      onError("");
      onChange();
    }
  }

  async function removeSymbol(sym: string) {
    await fetch(`/api/watchlists/${watchlist.id}?symbol=${sym}`, { method: "DELETE" });
    onChange();
  }

  async function removeList() {
    if (!confirm(`Delete watchlist "${watchlist.name}"?`)) return;
    await fetch(`/api/watchlists/${watchlist.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <Card>
      <SectionTitle
        right={
          <button onClick={removeList} className="focus-ring text-mist-500 transition-colors hover:text-loss" aria-label="Delete watchlist">
            <Trash2 size={14} />
          </button>
        }
      >
        {watchlist.name} <Badge className="ml-2">{watchlist.items.length}</Badge>
      </SectionTitle>

      <div className="divide-y divide-white/[0.04]">
        {watchlist.items.map((item) => (
          <WatchRow key={item.id} symbol={item.symbol} onRemove={() => removeSymbol(item.symbol)} />
        ))}
        {watchlist.items.length === 0 && <p className="py-3 text-xs text-mist-500">Empty — add a ticker below.</p>}
      </div>

      <form onSubmit={addSymbol} className="mt-3 flex gap-2">
        <Input
          placeholder="Add symbol (e.g. NVDA)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          pattern="[A-Za-z.]{1,10}"
          required
          className="max-w-[180px] font-mono uppercase"
        />
        <Button type="submit" variant="ghost" className="flex items-center gap-1"><Plus size={13} /> Add</Button>
      </form>
    </Card>
  );
}

function WatchRow({ symbol, onRemove }: { symbol: string; onRemove: () => void }) {
  const q = useLiveQuote(symbol);
  return (
    <div className="group flex items-center gap-3 py-2">
      <Link href={`/ticker/${symbol}`} className="w-16 font-mono text-sm font-semibold text-mist-100 hover:text-teal-glow">
        {symbol}
      </Link>
      {q ? (
        <>
          <NumberTicker value={q.price} className="text-sm text-mist-200" />
          <span className={cn("tnum font-mono text-xs", q.changePercent >= 0 ? "text-profit" : "text-loss")}>
            {fmtPercent(q.changePercent)}
          </span>
        </>
      ) : (
        <Skeleton className="h-4 w-24" />
      )}
      <button onClick={onRemove} className="ml-auto text-mist-600 opacity-0 transition-opacity hover:text-loss group-hover:opacity-100" aria-label={`Remove ${symbol}`}>
        <X size={14} />
      </button>
    </div>
  );
}
