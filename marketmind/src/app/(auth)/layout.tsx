import Link from "next/link";
import { Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-dim/20 text-teal-glow shadow-glow">
          <Zap size={18} strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold tracking-tight text-mist-100">MarketMind</span>
      </Link>
      <div className="glass animate-slide-up w-full max-w-sm p-6">{children}</div>
      <p className="mt-6 max-w-sm text-center text-[11px] leading-relaxed text-mist-500">
        Analysis &amp; education tool — not financial advice. Trading involves substantial risk of loss.
      </p>
    </div>
  );
}
