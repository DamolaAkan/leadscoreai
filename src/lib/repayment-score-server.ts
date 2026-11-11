// Repayment Score: SERVER ONLY. Never import this from a client component.
//
// Holds the points behind each answer, how parts are scored, the hot-lead rule
// and the plan text. The browser sends option ids; this file turns them into a
// score. The recipe (points, thresholds, hot rule) must never reach the client.

import { PARTS, PART_NAME, QUESTIONS, type PartKey, type RSResult } from "./repayment-score";

// Points per option id. 10 = a complete repayment system on that question.
const POINTS: Record<string, number> = {
  a1a: 0, a1b: 4, a1c: 10, a1d: 2,
  a2a: 4, a2b: 10, a2c: 5, a2d: 2,
  a3a: 6, a3b: 0, a3c: 10,
  s1a: 2, s1b: 6, s1c: 10, s1d: 5,
  s2a: 0, s2b: 10, s2c: 5,
  s3a: 4, s3b: 0, s3c: 10,
  h1a: 3, h1b: 10, h1c: 6, h1d: 1,
  h2a: 4, h2b: 10, h2c: 2,
  h3a: 2, h3b: 5, h3c: 10,
  r1a: 2, r1b: 10, r1c: 5,
  r2a: 10, r2b: 4, r2c: 0,
  r3a: 3, r3b: 6, r3c: 10, r3d: 0,
  c1a: 0, c1b: 10, c1c: 4,
  c2a: 2, c2b: 6, c2c: 10, c2d: 1,
  c3a: 10, c3b: 2, c3c: 4,
  t1a: 0, t1b: 4, t1c: 10,
  t2a: 5, t2b: 10, t2c: 0,
  t3a: 0, t3b: 3, t3c: 10, t3d: 6,
  p1a: 3, p1b: 7, p1c: 10, p1d: 0,
  p2a: 3, p2b: 0, p2c: 7, p2d: 10,
  p3a: 3, p3b: 10, p3c: 0,
};
const MAX_PER_Q = 10;

// A weakest part at or below this counts as "low" for the hot-lead rule.
const LOW_PART_SCORE = 40;
// Roles that can buy the Diagnostic.
const BUYER_ROLES = new Set(["ceo", "credit_head"]);
const OVER_1M = new Set(["1m_5m", "over_5m"]);

type PartCopy = {
  explanation: string;
  nextSteps: [string, string, string];
  track: string;
  fix: string;
  predict: string;
};

const COPY: Record<PartKey, PartCopy> = {
  acquisition: {
    explanation:
      "You are paying to bring in customers without knowing which channels bring the ones who repay. So the money keeps flowing to the channels that look busy, not the ones that pay you back, and every bad customer you acquire becomes a collections problem later.",
    nextSteps: [
      "Record the source (ad, agent, partner, referral) on every new application from today.",
      "Pull your last six months of loans and mark which channel each customer came from.",
      "Add two or three questions before people apply that screen out those who can't afford it.",
    ],
    track: "Tag every new customer with the exact channel, agent or partner that brought them.",
    fix: "Move budget away from the channel with the worst repayment and add pre-application questions.",
    predict: "Rank channels by repayment, not by volume, and plan next quarter's spend on that ranking.",
  },
  screening: {
    explanation:
      "Your approval decisions rest on judgement or a bureau report, not on what your own repayment history says. Bureaus can't see most of your customers, and rules nobody has tested let the same kind of bad loan through again and again.",
    nextSteps: [
      "Write down every rule your team uses to approve or decline, even the unofficial ones.",
      "Compare the last 200 approvals against who repaid, rule by rule.",
      "Ask for statements (bank or mobile money) on every application above your average loan size.",
    ],
    track: "Log the reason behind every approval and decline, next to the customer's record.",
    fix: "Drop or tighten the rules that don't separate payers from defaulters; add an income check.",
    predict: "Turn the rules that work into a simple scorecard and score every new applicant with it.",
  },
  handover: {
    explanation:
      "Assets or cash go out before the basics are locked in. When the deposit, contract or ID check is skipped even sometimes, you lose your strongest early signal of commitment and your best route to recovery if they stop paying.",
    nextSteps: [
      "Make deposit, signed contract and ID check a hard rule: no exceptions without a named approver.",
      "Check ID numbers against a government or bureau database, not just a photo.",
      "Send every customer their payment schedule on their phone and have them confirm it.",
    ],
    track: "Count how many handovers last month went out with a missing deposit, contract or ID check.",
    fix: "Block handover in your process until all three are done, and send the schedule for confirmation.",
    predict: "Compare repayment of customers who passed every check against those who didn't.",
  },
  repayment: {
    explanation:
      "Paying you takes effort, and nobody nudges customers before the due date. Many missed payments aren't refusals; they are forgotten or awkward payments. Manual matching also hides who has paid, so good customers get chased and late ones slip by.",
    nextSteps: [
      "Give every customer one simple way to pay that matches automatically (a mandate, debit or virtual account).",
      "Send a reminder three days and one day before each due date, by SMS or WhatsApp.",
      "Reconcile payments the same day, so your list of who is late is always right.",
    ],
    track: "Measure how many days it takes for a payment to show against the right customer.",
    fix: "Switch new customers to automatic payment and set up reminders before every due date.",
    predict: "Watch early payers versus last-minute payers; the gap shows who is about to slip.",
  },
  collections: {
    explanation:
      "When a payment is missed, nothing happens fast enough. The first few days after a miss are when a customer is easiest to bring back; after a week or two, it becomes a habit and recovery costs far more.",
    nextSteps: [
      "Send a set message on day 1 after any missed payment, every time.",
      "Write steps by days late (1, 7, 14, 30) with who does what at each step.",
      "Measure collectors weekly on how much they bring back at each stage.",
    ],
    track: "List every late account by how many days late it is, updated daily.",
    fix: "Run the day 1, 7, 14 and 30 steps, with one owner for each stage.",
    predict: "Track the share of day-1 misses that come back within a week; it's your early warning number.",
  },
  tracking: {
    explanation:
      "You can't trace a customer's repayments back to the ad, agent or partner that brought them. So you can't tell which sources and which agents are making you money and which are costing you, and every decision on growth is a guess.",
    nextSteps: [
      "Give every customer one ID that links their application, source, agent and payments.",
      "Build one list of agents with the repayment rate of the customers each one brought.",
      "Move repayment records out of chats and notebooks into one shared place.",
    ],
    track: "Link each customer's source and agent to their repayment record.",
    fix: "Review agents and partners by repayment; coach or cut the bottom ones.",
    predict: "Use source and agent repayment history to set targets and commission for next quarter.",
  },
  prediction: {
    explanation:
      "You find out a batch of loans has gone bad when the money doesn't arrive. By then it's too late to act, and you can't show investors the month-by-month repayment picture they need to back you with more capital.",
    nextSteps: [
      "Group loans by the month they went out and track repayment for each group, every week.",
      "Pick two early signals (first payment late, payment made in part) and watch them weekly.",
      "Prepare a one-page monthly repayment report you could send an investor today.",
    ],
    track: "Build a weekly view of repayment by month of lending.",
    fix: "Act on early signals within the week: pause the source, agent or product that's slipping.",
    predict: "Forecast next month's collections and check the forecast against what actually came in.",
  },
};

export type DetailsIn = {
  name: string;
  company: string;
  role: string;
  email: string;
  whatsapp: string;
  finances: string;
  country: string;
  bookSize: string;
  raising: boolean;
  consent: boolean;
};

export type Scored = {
  result: Omit<RSResult, "emailSent" | "saved">;
  answers: Record<string, string>; // question id -> option id
  partScores: Record<PartKey, number>;
  isHot: boolean;
  hotReasons: string[];
  bookOver1m: boolean;
};

// Returns null if any of the 21 answers is missing or not a real option.
export function scoreSubmission(rawAnswers: unknown, d: DetailsIn): Scored | null {
  if (!rawAnswers || typeof rawAnswers !== "object") return null;
  const input = rawAnswers as Record<string, unknown>;
  const answers: Record<string, string> = {};
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const q of QUESTIONS) {
    const pick = input[q.id];
    if (typeof pick !== "string" || !q.opts.some((o) => o.id === pick) || !(pick in POINTS)) return null;
    answers[q.id] = pick;
    sums[q.part] = (sums[q.part] || 0) + POINTS[pick];
    counts[q.part] = (counts[q.part] || 0) + 1;
  }

  const partScores = {} as Record<PartKey, number>;
  for (const p of PARTS) {
    partScores[p.key] = Math.round((sums[p.key] / (counts[p.key] * MAX_PER_Q)) * 100);
  }
  const total = Math.round(PARTS.reduce((s, p) => s + partScores[p.key], 0) / PARTS.length);

  // Weakest first; ties go to the earlier part, since early blocks feed later ones.
  const ranked = PARTS.map((p, i) => ({ key: p.key, score: partScores[p.key], i })).sort(
    (a, b) => a.score - b.score || a.i - b.i
  );
  const w1 = ranked[0].key;
  const w2 = ranked[1].key;

  const plan = [
    {
      phase: "Track",
      days: "Days 1 to 30",
      items: [COPY[w1].track, COPY[w2].track, "Set one weekly 30-minute review of these numbers with your team."],
    },
    {
      phase: "Fix",
      days: "Days 31 to 60",
      items: [COPY[w1].fix, COPY[w2].fix, "Write each change down as a rule, with one owner, so it holds when people change."],
    },
    {
      phase: "Predict",
      days: "Days 61 to 90",
      items: [
        COPY[w1].predict,
        COPY[w2].predict,
        "Re-take your Repayment Score and compare it with today's to see what moved.",
      ],
    },
  ];

  const bookOver1m = OVER_1M.has(d.bookSize);
  const weakLow = partScores[w1] <= LOW_PART_SCORE;
  const hotReasons: string[] = [];
  if (weakLow) hotReasons.push("weak_part");
  if (d.raising) hotReasons.push("raising");
  if (bookOver1m) hotReasons.push("book_over_1m");
  const isHot = hotReasons.length > 0 && BUYER_ROLES.has(d.role);

  return {
    result: {
      total,
      parts: PARTS.map((p) => ({ key: p.key, name: p.name, score: partScores[p.key] })),
      weakest: { key: w1, name: PART_NAME[w1], score: partScores[w1], explanation: COPY[w1].explanation },
      nextSteps: [...COPY[w1].nextSteps],
      plan,
      firstName: d.name.trim().split(/\s+/)[0] || "",
      company: d.company.trim(),
      bookOver1m,
    },
    answers,
    partScores,
    isHot,
    hotReasons,
    bookOver1m,
  };
}

// Email switches. Both ON by default (Damola, 2026-11-11: alert on every lead,
// and every lead gets their plan by email). Set the env var to "off" to stop one.
export function isPlanEmailEnabled(): boolean {
  return process.env.REPAYMENT_SCORE_EMAIL !== "off";
}
export function isLeadAlertEnabled(): boolean {
  return process.env.REPAYMENT_SCORE_ALERT !== "off";
}
