"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError("Invalid email or password");
    else router.push("/dashboard");
  }

  return (
    <>
      <h1 className="mb-1 text-lg font-bold text-mist-100">Welcome back</h1>
      <p className="mb-5 text-sm text-mist-400">Sign in to your trading desk.</p>
      <form onSubmit={submit} className="space-y-3">
        <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-xs text-loss">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="focus-ring mt-3 w-full rounded-lg border border-white/10 px-4 py-2 text-sm text-mist-200 transition-colors hover:border-white/25"
      >
        Continue with Google
      </button>
      <div className="mt-5 flex justify-between text-xs text-mist-400">
        <Link href="/reset" className="hover:text-teal-glow">Forgot password?</Link>
        <Link href="/signup" className="hover:text-teal-glow">Create account</Link>
      </div>
      <div className="mt-5 rounded-lg border border-white/[0.06] bg-ink-800/50 p-3 text-[11px] leading-relaxed text-mist-400">
        <span className="font-semibold text-mist-300">Demo accounts</span> (password <code className="text-teal-glow">demo1234</code>):
        <br />premium@marketmind.demo · free@marketmind.demo · admin@marketmind.demo
      </div>
    </>
  );
}
