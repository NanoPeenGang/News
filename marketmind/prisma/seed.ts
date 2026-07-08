import { PrismaClient, LessonLevel, SetupType, SignalStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const LESSONS: {
  slug: string; title: string; level: LessonLevel; order: number; summary: string; minutes: number; premiumOnly: boolean; content: string;
}[] = [
  {
    slug: "reading-candlesticks",
    title: "Reading Candlesticks",
    level: "BEGINNER", order: 1, minutes: 8, premiumOnly: false,
    summary: "What a candle actually tells you about the fight between buyers and sellers.",
    content: `## What a candle is

Every candlestick compresses four facts about a time period: the **open**, **high**, **low**, and **close**. The body shows where the period started and finished; the wicks show how far price traveled before being rejected.

## The story in the shapes

- **Long green body, small wicks** — buyers controlled the whole period. Conviction.
- **Long upper wick** — buyers pushed price up but sellers slammed it back. Supply overhead.
- **Long lower wick (hammer)** — sellers flushed price down and buyers absorbed it. Demand below.
- **Tiny body, long wicks (doji)** — a stalemate. Meaningful mostly at the end of a strong move.

## The mistake beginners make

A single candle means almost nothing by itself. A hammer at a support level after a downtrend is information; a hammer in the middle of chop is noise. **Context — trend, level, volume — is what gives a candle meaning.**

## Practice

Open any chart in MarketMind, pick five candles, and narrate the fight: who was winning at the open, what happened mid-period, who won the close. This narration habit is the foundation of tape reading.`,
  },
  {
    slug: "support-resistance",
    title: "Support & Resistance",
    level: "BEGINNER", order: 2, minutes: 10, premiumOnly: false,
    summary: "Why price remembers certain levels, and how to find the ones that matter.",
    content: `## Why levels exist

Support and resistance aren't magic lines — they're **memory**. Traders remember where they bought and regret not selling; unfilled orders cluster at round numbers and prior extremes. When price returns, those decisions activate.

## Finding real levels

1. **Swing pivots** — points where price reversed with multiple bars on each side (MarketMind's scanner detects these automatically).
2. **High-volume areas** — levels where lots of shares changed hands are harder to move through.
3. **Round numbers** — $100, $50, $500 attract orders simply because humans think in round numbers.

## How pros use them

- Levels are **zones, not lines**. Expect a few cents (or dollars, for expensive stocks) of slop.
- The **more times a level is tested, the weaker it usually gets** — each test consumes the orders sitting there.
- A broken resistance often becomes support (and vice versa). This "role reversal" is the basis of breakout-retest entries.

## Connect it to the scanner

The **Momentum Breakout** setup fires exactly when price clears a detected resistance with volume — you now know why that matters.`,
  },
  {
    slug: "volume-basics",
    title: "Volume: The Lie Detector",
    level: "BEGINNER", order: 3, minutes: 7, premiumOnly: false,
    summary: "Price says what happened; volume says how much to believe it.",
    content: `## Why volume matters

Price can drift on a handful of shares. Volume tells you **how many participants agreed** with a move. A breakout on 3x average volume has institutions behind it; the same breakout on dead volume is a trap waiting to spring.

## Relative volume (RelVol)

Raw volume is meaningless without a baseline — 5 million shares is huge for one stock and nothing for another. **Relative volume** divides today's volume by the average. In MarketMind's scanner:

- **RelVol > 1.5** — elevated interest
- **RelVol > 2.0** — unusual; something is happening (news, catalyst, big player)

## Three volume rules

1. **Trends need fuel.** Healthy uptrends show rising volume on up-moves, fading volume on pullbacks.
2. **Climax volume marks turning points.** A massive volume spike after an extended move often ends it — everyone who wanted in is in.
3. **Low-volume breakouts fail more often.** No fuel, no follow-through.

The **Unusual Volume** setup type exists because volume anomalies often precede price discovery.`,
  },
  {
    slug: "risk-management-101",
    title: "Risk Management 101",
    level: "BEGINNER", order: 4, minutes: 12, premiumOnly: false,
    summary: "The math that keeps you alive: position sizing, stops, and the 1% rule.",
    content: `## The only edge that's guaranteed

You cannot control whether the next trade wins. You **can** control how much it costs you when it loses. That asymmetry is why risk management is the only guaranteed edge in trading.

## The 1% rule

Risk no more than 1% of your account on a single trade. On a $25,000 account, that's $250. Ten consecutive losses — which *will* happen eventually — costs you under 10% of the account. An amateur risking 10% per trade is broke after those same ten trades.

## Position sizing formula

**Shares = Risk budget ÷ Stop distance**

If your budget is $250 and your stop is $2.50 below entry: 100 shares. Notice what's *not* in the formula: how confident you feel. Confidence is not a sizing input — that's the point.

## Stops are pre-decisions

A stop-loss placed *before* entry is a decision made by calm-you. Moving it mid-trade replaces that decision with panic-you's judgment. MarketMind sets stops at 1.5× ATR — outside normal noise, inside catastrophe.

## R multiples

Measure every outcome in units of initial risk (R). Risk $250, make $500 → **+2R**. Thinking in R makes a $50 account and a $5M account run the same process, and it's how the coaching engine grades your journal.`,
  },
  {
    slug: "moving-averages-emas",
    title: "Moving Averages & the EMA Stack",
    level: "INTERMEDIATE", order: 1, minutes: 9, premiumOnly: false,
    summary: "How the 9/21/50/200 EMAs describe trend — and when crossovers matter.",
    content: `## What an EMA is

An exponential moving average smooths price with extra weight on recent bars. It answers one question: **"what's the trend at this timescale?"**

## The stack MarketMind uses

- **EMA 9** — the sprint. Momentum traders' trailing reference.
- **EMA 21** — the swing. Pullbacks in strong trends often hold here.
- **EMA 50** — the campaign. Institutions defend positions around it.
- **EMA 200** — the regime. Above = bull market rules; below = bear market rules.

## Reading the stack

When EMAs are **stacked in order** (9 > 21 > 50 > 200), trend is aligned across timescales — the highest-probability environment for longs. When they're braided together, there is no trend; most setups degrade in chop.

## Crossovers: signal or noise?

The 9/21 crossover the scanner flags is a **trend-transition cue**, not a standalone system. It works when it agrees with the larger trend (price above EMA 50) and fails often against it — which is exactly how the scanner scores it. Never trade a crossover without asking what the bigger timeframe is doing.`,
  },
  {
    slug: "vwap-trading",
    title: "VWAP: The Institutional Benchmark",
    level: "INTERMEDIATE", order: 2, minutes: 9, premiumOnly: false,
    summary: "Why funds care about VWAP and how reclaims create intraday setups.",
    content: `## What VWAP is

The Volume-Weighted Average Price is the session's true average cost — every trade, weighted by size. Execution desks are literally graded on beating it, which makes VWAP the rare indicator that moves money *because* people watch it.

## The psychology of the line

- **Price above VWAP**: the average participant today is profitable. Dips get bought.
- **Price below VWAP**: the average participant is trapped at a loss. Rallies get sold by people "getting back to even."

## The VWAP reclaim

The scanner's **VWAP Reclaim** setup fires when price has spent meaningful time below VWAP and then closes back above it with confirmation. Why it works: every trapped long who "wanted out at even" has now been made whole — and didn't sell. Supply that was hanging over the market is gone.

## Execution notes

- Reclaims work best on liquid names with elevated relative volume.
- First test of VWAP from below usually rejects; the *reclaim and hold* is the signal.
- Invalidation is clean: back below VWAP with momentum, and the premise is dead.`,
  },
  {
    slug: "scanner-setups",
    title: "The Six Setups the Scanner Hunts",
    level: "INTERMEDIATE", order: 3, minutes: 14, premiumOnly: false,
    summary: "Momentum breakouts, gap-and-go, oversold bounces — the playbook behind every signal.",
    content: `## The playbook

Every MarketMind signal is one of six patterns. Knowing *why* each works turns signals from black-box tips into teachable moments.

### 1. Momentum Breakout
Price clears a resistance pivot on elevated volume with positive MACD momentum. Works because breakouts force short covering and trigger systematic buying.

### 2. VWAP Reclaim
Price recovers the session VWAP after holding below it. Trapped supply is released; intraday control shifts.

### 3. Oversold Bounce
RSI washes out below 35 and turns up near support or the lower Bollinger band. Mean reversion: sellers exhaust, spring snaps back.

### 4. Gap & Go
Stock gaps 1.5%+ at the open and holds the gap direction above/below VWAP. The overnight imbalance (news, earnings) persists instead of filling.

### 5. Unusual Volume
Volume runs 2x+ average with a directional move. Someone big is participating; price discovery often continues.

### 6. EMA Crossover
The 9 EMA crosses the 21 with trend alignment. A momentum-transition cue that systematic strategies amplify.

## The honest truth

Every one of these fails 40–60% of the time. The business model of trading them is **asymmetric payoff** (2R/3R targets vs 1R stops), not high win rates. That's why every signal ships with a stop — and why the confidence score describes conditions, never outcomes.`,
  },
  {
    slug: "trading-psychology",
    title: "Trading Psychology: Your Real Opponent",
    level: "ADVANCED", order: 1, minutes: 12, premiumOnly: true,
    summary: "Revenge trades, FOMO, and the discipline systems that beat them.",
    content: `## The uncomfortable premise

After a year, most traders know enough technical analysis to be profitable. They lose anyway — because the bottleneck isn't knowledge, it's **behavior under stress**.

## The four horsemen

1. **FOMO entries** — chasing a move you missed, at the worst possible price. Antidote: the entry zone. If price left the zone, the trade left without you. There will be another.
2. **Revenge trading** — trying to win back a loss immediately, with double size. Antidote: a hard rule — after 2 consecutive losses, you're done for the day.
3. **Moving stops** — renegotiating with reality mid-trade. Antidote: treat the stop as an order from your past self, who was smarter because they weren't in the trade.
4. **Oversizing winners** — "this one's a lock." Antidote: the position sizing formula, which has no confidence input on purpose.

## Systems beat willpower

You will not out-discipline your amygdala in the moment. Pros don't try — they build **pre-commitment systems**: written plans, fixed risk, journals reviewed weekly. MarketMind's journal tags (moved-stop, revenge-trade, chased) exist to make your patterns visible, because you can't fix what you can't see.

## The weekly review

Every week, read your own journal like a coach reading game film. The AI coaching report automates the pattern-finding — but *you* have to do the honest tagging.`,
  },
  {
    slug: "journaling-like-a-pro",
    title: "Journaling Like a Professional",
    level: "ADVANCED", order: 2, minutes: 10, premiumOnly: true,
    summary: "The exact fields that matter, and how to review your own game film.",
    content: `## Why journals work

Every prop firm requires journaling, and it isn't bureaucracy: memory is a terrible historian. It edits losses into bad luck and wins into skill. A journal is the tape that can't lie.

## What to record (the minimum that works)

- **The plan**: setup, entry zone, stop, target — *written before entry*.
- **The execution**: actual fill, actual exit, and any deviation from plan.
- **The R result**: profit/loss in units of risk, not dollars.
- **The tag**: if you broke a rule, name it (moved-stop, oversized, chased, no-plan).
- **The feeling**: one sentence. "Anxious after two losses" predicts more than any indicator.

## The review protocol

Weekly, sort trades two ways:

1. **By R** — are losers contained to ~1R? A single -4R trade usually explains a losing month.
2. **By tag** — which rule violation is most frequent AND most expensive? That's your one thing to fix. Not five things. One.

## The meta-skill

The point of journaling isn't record-keeping — it's **turning trading from outcomes into process**. A losing trade executed to plan is a good trade. A winning trade that broke rules is a loss you haven't paid for yet.`,
  },
  {
    slug: "building-your-process",
    title: "Building a Repeatable Process",
    level: "ADVANCED", order: 3, minutes: 11, premiumOnly: true,
    summary: "From random trades to a business: routines, playbooks, and review cadence.",
    content: `## Trading is a business

Profitable traders don't take trades; they **run a process** that produces trades. The difference sounds semantic until you watch it: the professional knows before the open what they'll trade, how much, and when they'll stop.

## The daily loop

1. **Pre-market (15 min)**: read the briefing, check the calendar, mark 2–3 setups from the scanner you'd actually take — and write down why.
2. **Session**: trade only what's on the sheet. Alerts do the watching; you do the executing.
3. **Post-market (10 min)**: journal every trade within minutes, tag honestly, log tomorrow's watchlist.

## The playbook concept

A playbook is a small set of setups you've earned confidence in **through your own data** — not because a guru likes them. Start with the scanner's six. After 30+ journaled trades, your stats will show which 2–3 fit your psychology. Trade those. Drop the rest.

## Review cadence

- **Weekly**: coaching report + tag review. One habit to fix.
- **Monthly**: equity curve and R-distribution. Is risk still 1%? Are losers still ~1R?
- **Quarterly**: playbook pruning. Setups that don't pay after 20 attempts get benched.

## The finish line

You know the process is working when a red day doesn't shake you — because you executed the plan, and the plan has an edge. That's the whole game.`,
  },
];

const DEMO_SIGNALS: {
  symbol: string; setupType: SetupType; direction: "LONG" | "SHORT"; status: SignalStatus; confidence: number; ageMin: number; price: number; atr: number;
}[] = [
  { symbol: "NVDA", setupType: "MOMENTUM_BREAKOUT", direction: "LONG", status: "TARGET2_HIT", confidence: 82, ageMin: 2880, price: 128.4, atr: 1.9 },
  { symbol: "AAPL", setupType: "VWAP_RECLAIM", direction: "LONG", status: "TARGET1_HIT", confidence: 71, ageMin: 1500, price: 226.1, atr: 1.4 },
  { symbol: "TSLA", setupType: "GAP_AND_GO", direction: "LONG", status: "STOPPED_OUT", confidence: 66, ageMin: 2100, price: 244.7, atr: 4.2 },
  { symbol: "META", setupType: "EMA_CROSSOVER", direction: "LONG", status: "TARGET1_HIT", confidence: 64, ageMin: 950, price: 512.3, atr: 5.1 },
  { symbol: "AMD", setupType: "OVERSOLD_BOUNCE", direction: "LONG", status: "STOPPED_OUT", confidence: 61, ageMin: 2400, price: 142.8, atr: 2.6 },
  { symbol: "MSFT", setupType: "UNUSUAL_VOLUME", direction: "LONG", status: "TARGET2_HIT", confidence: 74, ageMin: 3300, price: 415.2, atr: 3.3 },
  { symbol: "COIN", setupType: "MOMENTUM_BREAKOUT", direction: "LONG", status: "STOPPED_OUT", confidence: 68, ageMin: 4100, price: 187.5, atr: 6.0 },
  { symbol: "JPM", setupType: "EMA_CROSSOVER", direction: "SHORT", status: "TARGET1_HIT", confidence: 59, ageMin: 1800, price: 208.9, atr: 1.8 },
];

async function main() {
  console.log("Seeding MarketMind…");
  const password = await bcrypt.hash("demo1234", 10);

  // --- Demo users ---
  const [freeUser, premiumUser, adminUser] = await Promise.all(
    (
      [
        { email: "free@marketmind.demo", name: "Fiona Free", role: "FREE" },
        { email: "premium@marketmind.demo", name: "Priya Premium", role: "PREMIUM" },
        { email: "admin@marketmind.demo", name: "Alex Admin", role: "ADMIN" },
      ] as const
    ).map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: { role: u.role },
        create: {
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash: password,
          emailVerified: new Date(),
          alertPrefs: { create: {} },
          paperAccount: { create: {} },
        },
      })
    )
  );

  // --- Watchlists ---
  for (const [user, lists] of [
    [freeUser, [{ name: "My Watchlist", symbols: ["AAPL", "NVDA", "TSLA"] }]],
    [
      premiumUser,
      [
        { name: "AI & Semis", symbols: ["NVDA", "AMD", "AVGO", "MSFT", "PLTR"] },
        { name: "Momentum", symbols: ["TSLA", "COIN", "META", "NFLX"] },
      ],
    ],
    [adminUser, [{ name: "Index Watch", symbols: ["SPY", "QQQ"] }]],
  ] as const) {
    for (const list of lists) {
      const existing = await prisma.watchlist.findFirst({ where: { userId: user.id, name: list.name } });
      if (existing) continue;
      await prisma.watchlist.create({
        data: { userId: user.id, name: list.name, items: { create: list.symbols.map((symbol) => ({ symbol })) } },
      });
    }
  }

  // --- Lessons ---
  for (const l of LESSONS) {
    await prisma.lesson.upsert({ where: { slug: l.slug }, update: l, create: l });
  }
  // Give the premium demo user some progress
  const lessonRows = await prisma.lesson.findMany({ orderBy: [{ level: "asc" }, { order: "asc" }], take: 4 });
  for (const lesson of lessonRows) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: premiumUser.id, lessonId: lesson.id } },
      update: { completedAt: new Date() },
      create: { userId: premiumUser.id, lessonId: lesson.id, completedAt: new Date() },
    });
  }

  // --- Historical signals (resolved, for stats + demo) ---
  const signalCount = await prisma.signal.count();
  if (signalCount === 0) {
    for (const d of DEMO_SIGNALS) {
      const stopDist = d.atr * 1.5;
      const dir = d.direction === "LONG" ? 1 : -1;
      const createdAt = new Date(Date.now() - d.ageMin * 60_000);
      const signal = await prisma.signal.create({
        data: {
          symbol: d.symbol,
          setupType: d.setupType,
          direction: d.direction,
          status: d.status,
          confidence: d.confidence,
          priceAtScan: d.price,
          entryLow: d.price - d.atr * 0.35,
          entryHigh: d.price + d.atr * 0.35,
          stopLoss: d.price - dir * stopDist,
          target1: d.price + dir * stopDist * 2,
          target2: d.price + dir * stopDist * 3,
          atr: d.atr,
          rsi: 40 + Math.random() * 30,
          relVolume: 1 + Math.random() * 2,
          createdAt,
          technicals: { seeded: true, reasons: ["Seeded demo signal for immediate walkthrough"] },
          thesis: `**Setup conditions met** for a potential ${d.direction === "LONG" ? "upside" : "downside"} move in ${d.symbol}. This is a seeded demo signal — live signals stream in from the scanner with full AI analysis. What confirms it: continued pressure holding the entry zone. What invalidates it: a decisive move through the stop level.\n\nEducational analysis of setup conditions — never a guarantee.`,
          risks: `- **Market context risk:** index moves can overwhelm single-stock setups.\n- **News risk:** catalysts can invalidate technicals instantly.\n- **Failed-pattern risk:** a large share of valid setups fail; the stop defines the cost.`,
          proNotes: `1. **Risk budget first** — typically 0.5–1% of the account.\n2. **Size from the stop distance**, never from conviction.\n3. **Scale at Target 1 (2R)**, move stop to break-even, let the rest work to 3R.\n\nUse the Risk Calculator to size for your own account.`,
        },
      });
      // Audit trail
      const chain: { to: SignalStatus; note: string; offset: number }[] = [
        { to: "WAITING", note: "Scanner flagged setup", offset: 0 },
        { to: "ENTRY_ACTIVE", note: "Price entered the entry zone", offset: 20 },
      ];
      if (d.status === "TARGET1_HIT" || d.status === "TARGET2_HIT") chain.push({ to: "TARGET1_HIT", note: "Target 1 (2R) reached", offset: 90 });
      if (d.status === "TARGET2_HIT") chain.push({ to: "TARGET2_HIT", note: "Target 2 (3R) reached", offset: 220 });
      if (d.status === "STOPPED_OUT") chain.push({ to: "STOPPED_OUT", note: "Stop level traded", offset: 75 });
      let prev: SignalStatus | null = null;
      for (const step of chain) {
        await prisma.signalEvent.create({
          data: {
            signalId: signal.id,
            fromState: prev,
            toState: step.to,
            note: step.note,
            price: d.price,
            createdAt: new Date(createdAt.getTime() + step.offset * 60_000),
          },
        });
        prev = step.to;
      }
    }
  }

  // --- Journal history for the premium user (fuel for coaching) ---
  const journalCount = await prisma.journalEntry.count({ where: { userId: premiumUser.id } });
  if (journalCount === 0) {
    const trades = [
      { symbol: "NVDA", side: "BUY", entry: 125.2, exit: 130.9, qty: 80, stop: 123.3, mistakes: null, note: "Breakout with plan, scaled at 2R." },
      { symbol: "TSLA", side: "BUY", entry: 248.0, exit: 241.5, qty: 40, stop: 244.0, mistakes: "moved-stop", note: "Moved stop down twice. Paid for it." },
      { symbol: "AAPL", side: "BUY", entry: 224.5, exit: 227.9, qty: 100, stop: 222.8, mistakes: null, note: "VWAP reclaim, textbook." },
      { symbol: "AMD", side: "BUY", entry: 146.0, exit: 143.8, qty: 150, stop: 144.5, mistakes: "oversized", note: "Doubled normal size on a 'sure thing'." },
      { symbol: "META", side: "BUY", entry: 505.0, exit: 519.0, qty: 20, stop: 498.0, mistakes: null, note: "EMA cross with trend. Held to target." },
      { symbol: "COIN", side: "BUY", entry: 192.4, exit: 186.9, qty: 50, stop: 188.0, mistakes: "chased", note: "Entered above the zone after it ran." },
    ] as const;
    let day = 12;
    for (const t of trades) {
      const dir = 1;
      const pnl = (t.exit - t.entry) * t.qty * dir;
      const r = t.stop ? ((t.exit - t.entry) * dir) / Math.abs(t.entry - t.stop) : null;
      await prisma.journalEntry.create({
        data: {
          userId: premiumUser.id,
          symbol: t.symbol,
          side: t.side,
          entryPrice: t.entry,
          exitPrice: t.exit,
          quantity: t.qty,
          stopLoss: t.stop,
          pnl,
          rMultiple: r,
          notes: t.note,
          mistakes: t.mistakes,
          openedAt: new Date(Date.now() - day * 86400_000),
          closedAt: new Date(Date.now() - day * 86400_000 + 4 * 3600_000),
        },
      });
      day -= 2;
    }
  }

  // --- Paper trades for the premium user ---
  const paper = await prisma.paperAccount.findUnique({ where: { userId: premiumUser.id }, include: { trades: true } });
  if (paper && paper.trades.length === 0) {
    await prisma.paperTrade.createMany({
      data: [
        { accountId: paper.id, symbol: "NVDA", side: "BUY", quantity: 50, price: 124.8, createdAt: new Date(Date.now() - 9 * 86400_000) },
        { accountId: paper.id, symbol: "NVDA", side: "SELL", quantity: 50, price: 129.6, pnl: 240, createdAt: new Date(Date.now() - 7 * 86400_000) },
        { accountId: paper.id, symbol: "AAPL", side: "BUY", quantity: 100, price: 223.4, createdAt: new Date(Date.now() - 6 * 86400_000) },
        { accountId: paper.id, symbol: "AAPL", side: "SELL", quantity: 100, price: 221.9, pnl: -150, createdAt: new Date(Date.now() - 4 * 86400_000) },
        { accountId: paper.id, symbol: "MSFT", side: "BUY", quantity: 30, price: 412.0, createdAt: new Date(Date.now() - 3 * 86400_000) },
        { accountId: paper.id, symbol: "MSFT", side: "SELL", quantity: 30, price: 419.5, pnl: 225, createdAt: new Date(Date.now() - 1 * 86400_000) },
      ],
    });
    await prisma.paperAccount.update({ where: { id: paper.id }, data: { cash: 100000 + 240 - 150 + 225 } });
  }

  console.log("Seed complete:");
  console.log("  free@marketmind.demo / demo1234    (FREE tier)");
  console.log("  premium@marketmind.demo / demo1234 (PREMIUM tier)");
  console.log("  admin@marketmind.demo / demo1234   (ADMIN)");
  console.log(`  ${LESSONS.length} lessons, ${DEMO_SIGNALS.length} historical signals, journal + paper history`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
