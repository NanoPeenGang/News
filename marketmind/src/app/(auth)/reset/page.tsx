"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stage, setStage] = useState<"request" | "confirm" | "done">("request");

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setMessage(data.message ?? "");
    if (data.devToken) setToken(data.devToken);
    setStage("confirm");
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "Reset failed");
    setMessage(data.message);
    setStage("done");
  }

  return (
    <>
      <h1 className="mb-1 text-lg font-bold text-mist-100">Reset password</h1>
      {stage === "request" && (
        <>
          <p className="mb-5 text-sm text-mist-400">Enter your email and we&apos;ll generate a reset token.</p>
          <form onSubmit={request} className="space-y-3">
            <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            <Button type="submit" className="w-full">Send reset token</Button>
          </form>
        </>
      )}
      {stage === "confirm" && (
        <>
          <p className="mb-4 text-sm text-mist-400">{message}</p>
          <form onSubmit={confirm} className="space-y-3">
            <Input placeholder="Reset token" value={token} onChange={(e) => setToken(e.target.value)} required />
            <Input type="password" placeholder="New password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            {error && <p className="text-xs text-loss">{error}</p>}
            <Button type="submit" className="w-full">Set new password</Button>
          </form>
        </>
      )}
      {stage === "done" && <p className="mb-4 text-sm text-profit">{message}</p>}
      <p className="mt-5 text-center text-xs text-mist-400">
        <Link href="/login" className="text-teal-glow hover:underline">Back to sign in</Link>
      </p>
    </>
  );
}
