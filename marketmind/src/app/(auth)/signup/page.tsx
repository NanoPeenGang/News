"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Signup failed");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    router.push("/dashboard");
  }

  return (
    <>
      <h1 className="mb-1 text-lg font-bold text-mist-100">Create your account</h1>
      <p className="mb-5 text-sm text-mist-400">Free tier includes the scanner, 3 watchlist tickers, and beginner lessons.</p>
      <form onSubmit={submit} className="space-y-3">
        <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        {error && <p className="text-xs text-loss">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>
      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="focus-ring mt-3 w-full rounded-lg border border-white/10 px-4 py-2 text-sm text-mist-200 transition-colors hover:border-white/25"
      >
        Continue with Google
      </button>
      <p className="mt-5 text-center text-xs text-mist-400">
        Already registered? <Link href="/login" className="text-teal-glow hover:underline">Sign in</Link>
      </p>
    </>
  );
}
