"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bot, Send, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { Badge, Button, Card, Input, Markdown, cn } from "@/components/ui";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

function AnalystInner() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "FREE";
  const [symbol, setSymbol] = useState(searchParams.get("symbol") ?? "");
  const signalId = searchParams.get("signalId") ?? undefined;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/analyst")
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d) => setMessages(d.messages?.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })) ?? []));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const question = input.trim();
    setInput("");
    setError("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setBusy(true);
    const res = await fetch("/api/analyst", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, symbol: symbol || undefined, signalId }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(d.error ?? "Request failed");
      setMessages((m) => m.slice(0, -1));
      return;
    }
    setMessages((m) => [...m, { role: "assistant", content: d.answer }]);
  }

  const suggestions = [
    symbol ? `What do the technicals say about ${symbol} right now?` : "What does relative volume tell me?",
    "How should I size a position with a $10,000 account?",
    "Explain VWAP reclaims like I'm new to trading",
  ];

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] max-w-3xl flex-col lg:h-[calc(100vh-10rem)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-mist-100">
            <Bot size={20} className="text-teal-glow" /> AI Analyst
          </h1>
          <p className="text-sm text-mist-400">Ask about any ticker, signal, or concept. Educational — never buy/sell instructions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Context symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-32 font-mono uppercase"
          />
          {signalId && <Badge tone="teal">Signal context</Badge>}
        </div>
      </div>

      {role === "FREE" && (
        <Card className="mb-3 border-amber-warn/20 bg-amber-warn/5">
          <p className="text-sm text-amber-warn">
            The AI Analyst is a Premium feature.{" "}
            <Link href="/pricing" className="underline">Upgrade</Link> to chat with live technical context injected.
          </p>
        </Card>
      )}

      <Card className="flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Sparkles size={28} className="text-teal-glow/60" />
            <p className="max-w-sm text-sm text-mist-400">
              I&apos;m your research analyst. I can read the live technicals and explain any setup, indicator, or risk concept.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="focus-ring rounded-full border border-white/10 px-3 py-1.5 text-xs text-mist-300 transition-colors hover:border-teal-glow/40 hover:text-teal-glow"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5",
                m.role === "user" ? "bg-teal-dim/20 text-mist-100" : "border border-white/[0.06] bg-ink-800/70"
              )}
            >
              {m.role === "assistant" ? <Markdown text={m.content} /> : <p className="text-sm">{m.content}</p>}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-ink-800/70 px-4 py-3">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-teal-glow" />
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-teal-glow [animation-delay:200ms]" />
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-teal-glow [animation-delay:400ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </Card>

      {error && (
        <p className="mt-2 text-xs text-amber-warn">
          {error} {error.includes("Premium") && <Link href="/pricing" className="underline">See pricing →</Link>}
        </p>
      )}
      <form onSubmit={send} className="mt-3 flex gap-2">
        <Input
          placeholder={symbol ? `Ask about ${symbol}…` : "Ask the analyst…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !input.trim()} className="flex items-center gap-1.5">
          <Send size={14} />
        </Button>
      </form>
      <p className="mt-2 text-center text-[10px] text-mist-500">
        Educational analysis only — not financial advice. All AI output is audit-logged.
      </p>
    </div>
  );
}

export default function AnalystPage() {
  return (
    <Suspense>
      <AnalystInner />
    </Suspense>
  );
}
