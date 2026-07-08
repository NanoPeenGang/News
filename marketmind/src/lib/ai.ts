import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";
import { TechnicalSnapshot } from "./indicators";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

/**
 * Compliance guardrails baked into every AI call. The assistant educates and
 * explains — it never instructs anyone to buy or sell, never guarantees
 * outcomes, and always reinforces risk management.
 */
const GUARDRAIL_PROMPT = `You are MarketMind's AI analyst, an educational trading assistant.
Hard rules you must always follow:
- You are an analysis and education tool, NOT a financial advisor. Never tell the user to buy, sell, or take any specific action. Use language like "traders watching this setup might consider..." or "the chart shows...".
- Never guarantee outcomes. Describe probabilities and conditions ("setup conditions are met", "historically this pattern..."), never certainties.
- Always reinforce risk management: position sizing, stop-loss discipline, and never risking more than a small percentage of an account on one trade.
- If asked "should I buy X?", explain what the data shows and how a trader would evaluate it themselves, and remind them this is not financial advice.
- Be concise, plain-English, and educational. Explain jargon when you use it.`;

function client(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

async function audit(kind: string, prompt: string, output: string, userId?: string, model = MODEL) {
  try {
    await prisma.aiAuditLog.create({ data: { kind, prompt, output, userId, model } });
  } catch (e) {
    console.error("AI audit log failed:", e);
  }
}

async function callClaude(
  kind: string,
  system: string,
  userPrompt: string,
  userId?: string,
  maxTokens = 1200
): Promise<string | null> {
  const c = client();
  if (!c) return null;
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: `${GUARDRAIL_PROMPT}\n\n${system}`,
      messages: [{ role: "user", content: userPrompt }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    await audit(kind, userPrompt, text, userId);
    return text;
  } catch (e) {
    console.error(`Claude call failed (${kind}):`, e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Deterministic fallback engine — used when no ANTHROPIC_API_KEY is set so
// the platform runs fully offline. Output is templated from real technicals.
// ---------------------------------------------------------------------------

const SETUP_DESCRIPTIONS: Record<string, string> = {
  MOMENTUM_BREAKOUT:
    "price pushing through a recent resistance area on elevated volume, which momentum traders read as buyers absorbing supply",
  VWAP_RECLAIM:
    "price reclaiming the session VWAP after trading below it, a shift that often marks intraday control passing back to buyers",
  OVERSOLD_BOUNCE:
    "a washed-out RSI turning upward near a support area, the classic footprint of sellers exhausting into demand",
  GAP_AND_GO:
    "an opening gap that is holding its direction instead of filling, suggesting the imbalance that caused the gap is persisting",
  UNUSUAL_VOLUME:
    "volume running far above its normal pace with a directional move, which often precedes continued institutional participation",
  EMA_CROSSOVER:
    "the 9-period EMA crossing the 21-period EMA, a trend-transition cue that many systematic strategies key off",
};

interface ThesisInput {
  symbol: string;
  setupType: string;
  direction: string;
  confidence: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  target1: number;
  target2: number;
  snapshot: Partial<TechnicalSnapshot>;
  reasons: string[];
}

function fallbackThesis(s: ThesisInput): { thesis: string; risks: string; proNotes: string } {
  const dirWord = s.direction === "LONG" ? "upside" : "downside";
  const desc = SETUP_DESCRIPTIONS[s.setupType] ?? "a technical setup";
  const rsiTxt = s.snapshot.rsi14 ? `RSI sits at ${s.snapshot.rsi14.toFixed(1)}` : "";
  const volTxt = s.snapshot.relVolume ? `relative volume is ${s.snapshot.relVolume.toFixed(2)}x normal` : "";
  const trendTxt =
    s.snapshot.ema9 && s.snapshot.ema21
      ? s.snapshot.ema9 > s.snapshot.ema21
        ? "short-term EMAs are stacked bullishly (9 over 21)"
        : "short-term EMAs are stacked bearishly (9 under 21)"
      : "";

  const thesis = `**Setup conditions met** for a potential ${dirWord} move in ${s.symbol}. The scanner flagged ${desc}. ${[rsiTxt, volTxt, trendTxt].filter(Boolean).join(", ")}.

What the chart shows: ${s.reasons.join("; ")}.

**What confirms it:** continued ${s.direction === "LONG" ? "buying" : "selling"} pressure holding price ${s.direction === "LONG" ? "above" : "below"} the entry zone (${s.entryLow.toFixed(2)}–${s.entryHigh.toFixed(2)}) with volume staying elevated.

**What invalidates it:** a decisive move ${s.direction === "LONG" ? "below" : "above"} the stop level at ${s.stopLoss.toFixed(2)}. If price gets there, the setup's premise is broken — the disciplined response is exiting, not hoping.

This is an educational read of setup conditions, not a prediction or advice. No pattern works every time.`;

  const risks = `- **Market context risk:** a strong index move against the setup direction can overwhelm any single-stock pattern. Check how SPY/QQQ are trading.
- **News risk:** earnings, guidance, analyst actions, or sector headlines can invalidate a technical setup instantly. Check the calendar before the market does it for you.
- **Liquidity/slippage risk:** fast moves through the entry zone can fill worse than the zone midpoint, changing the real risk/reward.
- **Failed-pattern risk:** roughly a third to half of technically valid setups fail even in favorable conditions — this is why the stop exists.`;

  const stopDist = Math.abs(((s.entryLow + s.entryHigh) / 2) - s.stopLoss);
  const proNotes = `A professional approaches this by deciding risk **before** entry:

1. **Risk budget first.** Pros typically risk 0.5–1% of the account per trade. On a $50,000 account at 1%, that is $500 of maximum loss.
2. **Position size from the stop, not from conviction.** Stop distance here is ~$${stopDist.toFixed(2)} per share, so a $500 budget sizes the position at about ${Math.max(1, Math.floor(500 / Math.max(stopDist, 0.01)))} shares — regardless of how strong the setup looks.
3. **Pre-commit to targets.** Target 1 (${s.target1.toFixed(2)}) banks 2R; many pros scale out half there and move the stop to break-even, letting the rest work toward Target 2 (${s.target2.toFixed(2)}) at 3R.
4. **No moving the stop away.** The single most common account-killer. If ${s.stopLoss.toFixed(2)} trades, the trade is over.

Use the Risk Calculator on this page to size for your own account. Education, not instruction.`;

  return { thesis, risks, proNotes };
}

export async function generateThesis(
  input: ThesisInput,
  userId?: string
): Promise<{ thesis: string; risks: string; proNotes: string; source: "claude" | "builtin" }> {
  const system = `Generate a trade-setup analysis with three sections. Respond in exactly this format:
===THESIS===
(plain-English trade thesis: why this setup, what the chart shows, what confirms/invalidates it)
===RISKS===
(key risks and what news/catalysts to watch, as markdown bullets)
===PRO===
(a "what would a pro do" section on position sizing and risk management for this specific trade)`;
  const prompt = `Analyze this scanner signal:\n${JSON.stringify(input, null, 2)}`;
  const out = await callClaude("thesis", system, prompt, userId, 1600);
  if (out) {
    const thesis = out.split("===THESIS===")[1]?.split("===RISKS===")[0]?.trim();
    const risks = out.split("===RISKS===")[1]?.split("===PRO===")[0]?.trim();
    const proNotes = out.split("===PRO===")[1]?.trim();
    if (thesis && risks && proNotes) return { thesis, risks, proNotes, source: "claude" };
  }
  const fb = fallbackThesis(input);
  await audit("thesis", `[builtin] ${input.symbol} ${input.setupType}`, fb.thesis, userId, "builtin-fallback");
  return { ...fb, source: "builtin" };
}

export async function analystChat(
  question: string,
  context: string,
  history: { role: "user" | "assistant"; content: string }[],
  userId?: string
): Promise<string> {
  const c = client();
  if (c) {
    try {
      const res = await c.messages.create({
        model: MODEL,
        max_tokens: 1000,
        system: `${GUARDRAIL_PROMPT}\n\nLive technical context for this conversation:\n${context}`,
        messages: [...history.slice(-10), { role: "user" as const, content: question }],
      });
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      await audit("chat", question, text, userId);
      return text;
    } catch (e) {
      console.error("Claude chat failed:", e);
    }
  }
  const answer = builtinChatAnswer(question, context);
  await audit("chat", question, answer, userId, "builtin-fallback");
  return answer;
}

function builtinChatAnswer(question: string, context: string): string {
  const q = question.toLowerCase();
  const lines: string[] = [];
  if (/rsi/.test(q)) {
    lines.push(
      "**RSI (Relative Strength Index)** measures the speed of recent price changes on a 0–100 scale. Readings above 70 are traditionally called overbought and below 30 oversold — but in strong trends RSI can stay pinned at extremes, so traders use it for divergence and washout signals rather than as an automatic trigger."
    );
  }
  if (/vwap/.test(q)) {
    lines.push(
      "**VWAP (Volume-Weighted Average Price)** is the average price paid across the session, weighted by volume. Institutions benchmark fills against it, so price reclaiming or losing VWAP often marks a shift in intraday control."
    );
  }
  if (/macd/.test(q)) {
    lines.push(
      "**MACD** compares a fast EMA to a slow EMA. The histogram shows momentum building or fading; crossovers of the signal line are commonly watched trend-transition cues."
    );
  }
  if (/stop|risk|size|position/.test(q)) {
    lines.push(
      "**On risk:** professional practice is deciding the maximum loss *before* entering (commonly 0.5–1% of the account), then sizing the position from the stop distance. The Risk Calculator on any signal page does this math for you."
    );
  }
  if (/buy|sell|should i/.test(q)) {
    lines.push(
      "I can't tell you to buy or sell — MarketMind is an analysis and education tool, not financial advice. What I can do is walk you through what the technicals show so you can build your own process: check the trend (EMAs), the setup trigger, where risk is defined (the stop), and whether the reward-to-risk justifies the trade."
    );
  }
  if (lines.length === 0) {
    lines.push(
      "Here's how to read the current technical context:\n\n" +
        context.slice(0, 900) +
        "\n\nAsk me about any specific indicator (RSI, VWAP, MACD, EMAs, ATR), the setup type, or how to think about risk on this trade. Note: the full conversational analyst uses the Anthropic API — add an `ANTHROPIC_API_KEY` to unlock richer answers."
    );
  }
  lines.push("\n*Educational analysis only — not financial advice. Trading involves substantial risk of loss.*");
  return lines.join("\n\n");
}

export async function generateBriefing(
  session: "premarket" | "postmarket",
  marketSummary: string,
  userId?: string
): Promise<string> {
  const system = `Write a ${session === "premarket" ? "pre-market briefing" : "post-market recap"} for traders. Structure: overall market tone, sector notes, top setups on watch (from the data provided), and one educational takeaway. Markdown, ~300 words.`;
  const out = await callClaude("briefing", system, marketSummary, userId, 1200);
  if (out) return out;
  const built = builtinBriefing(session, marketSummary);
  await audit("briefing", marketSummary, built, userId, "builtin-fallback");
  return built;
}

function builtinBriefing(session: "premarket" | "postmarket", marketSummary: string): string {
  const header = session === "premarket" ? "## Pre-Market Briefing" : "## Post-Market Recap";
  return `${header}

${marketSummary}

**Educational takeaway:** the best traders prepare a plan before the open — which setups they'll take, what size, and where they're wrong — so the session becomes execution instead of improvisation.

*Generated by MarketMind's built-in engine. Add an ANTHROPIC_API_KEY for full AI-written briefings. Educational content, not financial advice.*`;
}

export async function generateCoachingReport(
  journalSummary: string,
  userId: string
): Promise<string> {
  const system = `You are reviewing a trader's journal. Produce a coaching report in markdown with sections: "What's working", "Patterns in losses", "Rule violations" (e.g. moving stops, oversizing), and "2–3 habits to work on this week" with concrete practice steps. Be supportive but direct.`;
  const out = await callClaude("coaching", system, journalSummary, userId, 1400);
  if (out) return out;
  const built = builtinCoaching(journalSummary);
  await audit("coaching", journalSummary, built, userId, "builtin-fallback");
  return built;
}

function builtinCoaching(journalSummary: string): string {
  // journalSummary is structured stats text; reflect it back with rules-based advice
  const movedStop = /moved-stop/.test(journalSummary);
  const oversized = /oversized/.test(journalSummary);
  const chased = /chased/.test(journalSummary);
  const habits: string[] = [];
  if (movedStop)
    habits.push(
      "**Stop discipline:** you moved stops on losing trades. This week, write the stop price on paper before entry and treat it as an order to your future self — if it trades, you're out, no renegotiation."
    );
  if (oversized)
    habits.push(
      "**Sizing consistency:** some positions were oversized relative to your plan. Use the Risk Calculator on every trade so share count comes from stop distance, never from conviction."
    );
  if (chased)
    habits.push(
      "**Entry patience:** you chased entries outside the zone. Set alerts at the entry zone and let price come to you — missing a trade costs nothing; a bad entry costs real R."
    );
  while (habits.length < 2)
    habits.push(
      "**Journal every trade within 10 minutes of closing it** — accuracy of self-observation is the foundation every other improvement builds on."
    );

  return `## Weekly Coaching Report

### Your numbers
${journalSummary}

### Patterns
${movedStop || oversized || chased ? "The tags in your journal point to specific, fixable process leaks — see the habits below." : "No recurring rule violations tagged this period. The next edge is consistency: same risk, same process, every trade."}

### Habits to work on
${habits.slice(0, 3).map((h, i) => `${i + 1}. ${h}`).join("\n")}

*Built-in coaching engine. Add an ANTHROPIC_API_KEY for deeper AI-personalized reports. Educational content, not financial advice.*`;
}
