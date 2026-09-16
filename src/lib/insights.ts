import { Qualification } from "./types";

interface AnswerRecord {
  questionId: string;
  questionOrder: number;
  answerValue: string;
  points: number;
}

interface QuestionMeta {
  maxPoints: number;
}

interface Insight {
  icon: string;
  title: string;
  body: string;
}

/**
 * Generates 3 personalised insights based on the user's actual answers.
 *
 * Question map (Mental Performance Scorecard):
 *  1 — Sleep quality
 *  2 — Deep focus hours
 *  3 — Pressure response
 *  4 — Recovery / downtime
 *  5 — Decision quality
 *  6 — Exercise frequency
 *  7 — Emotional regulation
 *  8 — Goal clarity
 *  9 — Commitment level
 * 10 — Affordability / investment readiness
 */
export function generateInsights(
  answers: AnswerRecord[],
  questions: QuestionMeta[],
  qualification: Qualification
): Insight[] {
  const pool: (Insight & { priority: number })[] = [];
  const byOrder = new Map<number, AnswerRecord>();
  answers.forEach((a) => byOrder.set(a.questionOrder, a));

  const maxForQ = (order: number) => questions[order - 1]?.maxPoints ?? 10;
  const ptsFor = (order: number) => byOrder.get(order)?.points ?? 0;
  const isLow = (order: number) => ptsFor(order) <= maxForQ(order) * 0.4;
  const isMid = (order: number) => {
    const p = ptsFor(order);
    const m = maxForQ(order);
    return p > m * 0.4 && p <= m * 0.7;
  };
  const isHigh = (order: number) => ptsFor(order) >= maxForQ(order) * 0.8;

  // Q1 — Sleep
  if (isLow(1)) {
    pool.push({
      priority: 10,
      icon: "🛌",
      title: "Sleep Is Your Bottleneck",
      body: "Your sleep patterns are undermining your cognitive performance — this is your highest leverage point. Improving sleep alone could lift your focus, decision-making, and emotional resilience.",
    });
  } else if (isMid(1)) {
    pool.push({
      priority: 5,
      icon: "🛌",
      title: "Sleep Could Be Sharper",
      body: "You're getting by on sleep, but 'manageable' isn't the same as optimal. Even an extra hour of quality rest could noticeably improve your afternoon focus and decision speed.",
    });
  }

  // Q2 — Deep focus
  if (isLow(2)) {
    pool.push({
      priority: 9,
      icon: "🎯",
      title: "Your Focus Time Is Under Siege",
      body: "Less than 2 hours of genuine deep work means most of your day is reactive. Protecting even one 90-minute focus block each morning would transform your output.",
    });
  } else if (isMid(2)) {
    pool.push({
      priority: 4,
      icon: "🎯",
      title: "Good Focus, Room to Grow",
      body: "You're getting some deep work done, but there's capacity being left on the table. A structured time-blocking system could add an extra hour of high-output work daily.",
    });
  }

  // Q3 — Pressure
  if (isLow(3)) {
    pool.push({
      priority: 9,
      icon: "⚡",
      title: "Pressure Is Costing You",
      body: "You're absorbing pressure rather than channelling it — this is costing you output and energy. Learning to reframe pressure as fuel is a trainable skill that changes everything.",
    });
  } else if (isMid(3)) {
    pool.push({
      priority: 4,
      icon: "⚡",
      title: "Pressure Management Is Draining You",
      body: "You handle pressure in the moment but it's taking a toll afterwards. Building a pre-performance routine would help you recover faster and stay sharp longer.",
    });
  }

  // Q4 — Recovery
  if (isLow(4)) {
    pool.push({
      priority: 8,
      icon: "🔋",
      title: "You're Running on Empty",
      body: "Without intentional recovery, you're depleting yourself faster than you're recharging. High performers don't just work hard — they recover strategically.",
    });
  }

  // Q5 — Decision quality
  if (isLow(5)) {
    pool.push({
      priority: 8,
      icon: "🧠",
      title: "Decision Fatigue Is Real For You",
      body: "Second-guessing and delayed decisions are signs of cognitive overload. Reducing low-value decisions and front-loading important ones to the morning could make an immediate difference.",
    });
  }

  // Q6 — Exercise
  if (isLow(6)) {
    pool.push({
      priority: 7,
      icon: "💪",
      title: "Movement Is Missing",
      body: "Exercise isn't just physical — it's the single most effective cognitive enhancer available. Even 20 minutes of daily movement would sharpen your thinking and lower your stress baseline.",
    });
  }

  // Q7 — Emotional regulation
  if (isLow(7)) {
    pool.push({
      priority: 8,
      icon: "🧘",
      title: "Emotional Reactions Are Holding You Back",
      body: "Reacting in the moment and regretting it later is a sign your nervous system is running the show. A simple pause-and-breathe protocol could save you from costly reactions.",
    });
  }

  // Q8 — Goal clarity
  if (isLow(8)) {
    pool.push({
      priority: 7,
      icon: "🧭",
      title: "You Need a Clear Direction",
      body: "Without a clear 12-month vision, every day feels like survival mode. Defining your top 3 outcomes and reviewing them weekly would bring immediate focus and motivation.",
    });
  }

  // Q9 high + Q10 low — committed but budget is the blocker
  if (isHigh(9) && isLow(10)) {
    pool.push({
      priority: 10,
      icon: "💡",
      title: "You're Ready — Let's Talk Options",
      body: "You know you need to change but budget is the blocker — ask us about flexible options. We believe the right support shouldn't be out of reach when the commitment is there.",
    });
  }

  // Q9 low — not committed
  if (isLow(9)) {
    pool.push({
      priority: 3,
      icon: "🔑",
      title: "Awareness Is the First Step",
      body: "You may not feel urgency yet, but the fact you completed this assessment shows curiosity. Small changes compound — start with one area and build from there.",
    });
  }

  // Overall tier-based insights (always added as a fallback)
  if (qualification === "HOT_LEAD") {
    pool.push({
      priority: 6,
      icon: "🏆",
      title: "You Have the Foundations",
      body: "You have the foundations of a high performer — you need a system to make it consistent. A structured coaching programme would help you turn good habits into unbreakable ones.",
    });
  } else if (qualification === "WARM_LEAD") {
    pool.push({
      priority: 6,
      icon: "📈",
      title: "You're Closer Than You Think",
      body: "A few targeted changes in your weakest areas could shift you from good to exceptional. The gap between where you are and peak performance is smaller than it feels.",
    });
  } else if (qualification === "COLD_LEAD") {
    pool.push({
      priority: 6,
      icon: "🔄",
      title: "It's Time for a Reset",
      body: "Stress has accumulated and it's showing across multiple areas. The good news — once you address the root causes, improvement can happen faster than you'd expect.",
    });
  } else {
    pool.push({
      priority: 6,
      icon: "🌱",
      title: "Build the Foundation First",
      body: "Your results show you're running on willpower alone. Before optimising performance, you need to rebuild the basics — sleep, movement, and recovery.",
    });
  }

  // Sort by priority descending, take top 3
  pool.sort((a, b) => b.priority - a.priority);
  return pool.slice(0, 3).map(({ icon, title, body }) => ({ icon, title, body }));
}

export const TIER_NAMES: Record<Qualification, string> = {
  HOT_LEAD: "Peak Performer — You're Ready",
  WARM_LEAD: "High Potential — A Few Gaps Holding You Back",
  COLD_LEAD: "Stress is Winning — Time to Reset",
  NOT_QUALIFIED: "Recovery Mode — Foundation First",
};

export const TIER_COLORS: Record<Qualification, string> = {
  HOT_LEAD: "#16a34a",
  WARM_LEAD: "#f59e0b",
  COLD_LEAD: "#f97316",
  NOT_QUALIFIED: "#ef4444",
};

// ── Solar scorecard content ──────────────────────────────────────────────
// Mapped to the Solar Savings Check questions (1 power spend, 2 grid hours,
// 3 property, 4 generator use, 5 how soon, 6 goal, 7 budget, 8 roof/land,
// 9 upfront ability, 10 2-year-payback readiness). Higher points = stronger
// solar case, so insights fire on the meaningful answers.
export function generateSolarInsights(
  answers: AnswerRecord[],
  questions: QuestionMeta[],
  qualification: Qualification
): Insight[] {
  const pool: (Insight & { priority: number })[] = [];
  const byOrder = new Map<number, AnswerRecord>();
  answers.forEach((a) => byOrder.set(a.questionOrder, a));
  const maxForQ = (order: number) => questions[order - 1]?.maxPoints ?? 10;
  const ptsFor = (order: number) => byOrder.get(order)?.points ?? 0;
  const isLow = (order: number) => ptsFor(order) <= maxForQ(order) * 0.4;
  const isHigh = (order: number) => ptsFor(order) >= maxForQ(order) * 0.8;

  if (isHigh(1))
    pool.push({ priority: 10, icon: "⚡", title: "You're spending heavily on power", body: "Between NEPA bills and fuel, your monthly power cost is high — which means solar pays for itself faster. This is where your savings are biggest." });
  if (isHigh(2))
    pool.push({ priority: 9, icon: "🔌", title: "Your grid supply is unreliable", body: "With limited NEPA hours a day, you're leaning on generators. Solar gives you steady power without the noise, fumes or fuel runs." });
  if (isHigh(4))
    pool.push({ priority: 8, icon: "⛽", title: "Generators are draining your pocket", body: "Running a generator daily is one of the most expensive ways to power a home or business. Solar cuts that cost dramatically over time." });
  if (isHigh(5))
    pool.push({ priority: 9, icon: "🚀", title: "You're ready to move", body: "You want solar soon — the best next step is a quick sizing and a quote so you can start saving without delay." });
  if (isLow(7) || isLow(9))
    pool.push({ priority: 8, icon: "💳", title: "Financing can get you started", body: "You don't need the full amount upfront. Ask about flexible payment options that spread the cost while you start saving from month one." });
  if (isHigh(10))
    pool.push({ priority: 7, icon: "✅", title: "The payback makes sense to you", body: "You'd move ahead once the numbers add up — a tailored savings estimate will show you exactly how quickly solar pays for itself." });
  if (isHigh(8))
    pool.push({ priority: 5, icon: "🏠", title: "Your property is solar-ready", body: "You have the roof space or land for panels — that makes installation straightforward and your system can be sized to match your usage." });
  if (isHigh(3))
    pool.push({ priority: 4, icon: "🔑", title: "You own your space", body: "Owning your home or premises makes solar a smart long-term investment — the value stays with you." });

  if (qualification === "HOT_LEAD")
    pool.push({ priority: 6, icon: "🌟", title: "You're an excellent fit for solar", body: "Your answers show strong need, readiness and ability — you're exactly who benefits most from switching. Let's get you a plan." });
  else if (qualification === "WARM_LEAD")
    pool.push({ priority: 6, icon: "📈", title: "Solar makes real sense for you", body: "You've got a solid case for solar with a few things to line up. A quick conversation will map out the right system and payment plan." });
  else if (qualification === "COLD_LEAD")
    pool.push({ priority: 6, icon: "🔎", title: "Worth exploring", body: "There's potential here — a short chat will help you see the savings and the options before you decide." });
  else
    pool.push({ priority: 6, icon: "🌱", title: "Let's find the right fit", body: "Solar may still help you — our team can walk you through options suited to your situation." });

  pool.sort((a, b) => b.priority - a.priority);
  return pool.slice(0, 3).map(({ icon, title, body }) => ({ icon, title, body }));
}

export const SOLAR_TIER_NAMES: Record<Qualification, string> = {
  HOT_LEAD: "Excellent Fit — You're Ready for Solar",
  WARM_LEAD: "Strong Fit — Solar Makes Sense for You",
  COLD_LEAD: "Good Potential — A Few Things to Sort",
  NOT_QUALIFIED: "Worth Exploring — Let's Find Your Fit",
};

// One next-step for solar regardless of tier: every lead is told they'll be
// contacted with a custom savings plan.
export const SOLAR_NEXT_STEP = {
  heading: "What happens next",
  body: "A member of the team will reach out shortly to walk through your custom solar plan and savings estimate — no pressure, just clarity.",
  cta: "Get my solar savings plan",
};

// Value props for the "Why {company}" pitch block on the solar result page.
export const SOLAR_WHY_US: { icon: string; text: string }[] = [
  { icon: "🔆", text: "Quality panels and inverters, sized to your usage" },
  { icon: "🛠️", text: "Professional installation, done in days" },
  { icon: "🛡️", text: "Warranty and after-sales support" },
  { icon: "💳", text: "Flexible financing options available" },
];

export const NEXT_STEPS: Record<Qualification, { heading: string; body: string; cta: string }> = {
  HOT_LEAD: {
    heading: "What Happens Next",
    body: "Book your free strategy session — our coaches have 2 spots available this week. We'll review your results, identify your highest-leverage opportunities, and map out a 90-day plan tailored to you.",
    cta: "Book My Free Strategy Session",
  },
  WARM_LEAD: {
    heading: "What Happens Next",
    body: "Download your personalised performance plan — we'll send it to your email within the next few minutes. It includes specific actions based on your answers today.",
    cta: "Send My Performance Plan",
  },
  COLD_LEAD: {
    heading: "What Happens Next",
    body: "Get our free 5-day mental reset guide — no commitment required. It's designed for exactly where you are right now and will give you quick wins to build momentum.",
    cta: "Get the Free Reset Guide",
  },
  NOT_QUALIFIED: {
    heading: "What Happens Next",
    body: "Start with our free resources — build the foundation first. We've put together a starter kit with the basics of sleep, movement, and stress management that anyone can begin today.",
    cta: "Access Free Resources",
  },
};
