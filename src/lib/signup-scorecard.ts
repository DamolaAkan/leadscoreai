// Sign-up scorecard: six tap questions a new owner answers before giving their
// details. It qualifies them (fit score for Stella's follow-up), preps them for
// how LeadScoreAI works, and tells the builder what to build first.
// Shared by the landing page (client) and verify-code (server sanitising).

export type Option = { value: string; emoji: string; label: string; points?: number };
export type Question = { key: QuestionKey; text: string; options: Option[] };
export type QuestionKey = "sells" | "channel" | "volume" | "marketing" | "time_lost" | "go_live";
export type Answers = Partial<Record<QuestionKey, string>>;

export const SCORECARD: Question[] = [
  {
    key: "sells",
    text: "What do you sell?",
    options: [
      { value: "solar", emoji: "☀️", label: "Solar" },
      { value: "real-estate", emoji: "🏠", label: "Real estate" },
      { value: "hair", emoji: "💇🏾‍♀️", label: "Hair" },
      { value: "skincare", emoji: "✨", label: "Skincare" },
      { value: "coaches", emoji: "🎯", label: "Coaching or consulting" },
      { value: "travel", emoji: "✈️", label: "Travel" },
      { value: "study-abroad", emoji: "🎓", label: "Study abroad" },
      { value: "other", emoji: "🧩", label: "Something else" },
    ],
  },
  {
    key: "channel",
    text: "Where do most of your enquiries come from?",
    options: [
      { value: "whatsapp", emoji: "💬", label: "WhatsApp" },
      { value: "instagram", emoji: "📸", label: "Instagram DMs" },
      { value: "website", emoji: "🌐", label: "My website" },
      { value: "referrals", emoji: "🤝", label: "Walk-ins or referrals" },
    ],
  },
  {
    key: "volume",
    text: "How many enquiries do you get a week?",
    options: [
      { value: "under-10", emoji: "🌱", label: "Under 10", points: 0 },
      { value: "10-50", emoji: "📈", label: "10 to 50", points: 15 },
      { value: "50-200", emoji: "🔥", label: "50 to 200", points: 25 },
      { value: "200-plus", emoji: "🚀", label: "Over 200", points: 30 },
    ],
  },
  {
    key: "marketing",
    text: "Are you running ads or marketing right now?",
    options: [
      { value: "paid-ads", emoji: "📣", label: "Yes, paid ads", points: 25 },
      { value: "organic", emoji: "📱", label: "Posting, no paid ads", points: 15 },
      { value: "not-yet", emoji: "⏳", label: "Not yet", points: 0 },
    ],
  },
  {
    key: "time_lost",
    text: "How much of your week goes to people who never buy?",
    options: [
      { value: "barely", emoji: "🙂", label: "Barely any", points: 0 },
      { value: "few-hours", emoji: "⌛", label: "A few hours", points: 10 },
      { value: "most", emoji: "😩", label: "Most of it", points: 20 },
    ],
  },
  {
    key: "go_live",
    text: "If a quiz found your serious buyers, when would you want it live?",
    options: [
      { value: "this-week", emoji: "⚡", label: "This week", points: 25 },
      { value: "this-month", emoji: "📅", label: "This month", points: 15 },
      { value: "exploring", emoji: "👀", label: "Just exploring", points: 0 },
    ],
  },
];

const option = (key: QuestionKey, value: string | undefined) =>
  SCORECARD.find((q) => q.key === key)?.options.find((o) => o.value === value);

// Keep only known questions and known answers (the body comes from the browser).
export function sanitizeAnswers(raw: unknown): Answers | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Answers = {};
  for (const q of SCORECARD) {
    const v = (raw as Record<string, unknown>)[q.key];
    if (typeof v === "string" && option(q.key, v)) out[q.key] = v;
  }
  return Object.keys(out).length ? out : null;
}

export type Band = "Hot" | "Warm" | "Cold";

export interface ScorecardResult {
  score: number; // 0-100
  band: Band;
  headline: string;
  reasons: string[];
}

// Fit score: enquiry volume, marketing, time lost and urgency (max 100).
export function scoreAnswers(a: Answers): ScorecardResult {
  const score = (["volume", "marketing", "time_lost", "go_live"] as QuestionKey[]).reduce(
    (s, k) => s + (option(k, a[k])?.points ?? 0),
    0
  );
  const band: Band = score >= 70 ? "Hot" : score >= 40 ? "Warm" : "Cold";
  const reasons: string[] = [];
  if (a.volume === "50-200" || a.volume === "200-plus")
    reasons.push(`You get ${option("volume", a.volume)!.label.toLowerCase()} enquiries a week, so knowing who is serious saves real time.`);
  if (a.marketing === "paid-ads") reasons.push("You're paying for ads, so every click deserves a quiz that shows who is ready to buy.");
  if (a.time_lost === "most") reasons.push("Most of your week goes to people who never buy. That's the time we give back.");
  if (a.marketing === "not-yet")
    reasons.push("LeadScoreAI works best once enquiries are coming in. A quiz can also give people a reason to enquire.");
  if (a.volume === "under-10") reasons.push("With under 10 enquiries a week, you can still talk to everyone. Qualifying matters more as you grow.");
  if (a.go_live === "this-week") reasons.push("You want it live this week. The builder will get you there in one chat.");
  const headline =
    band === "Hot"
      ? "You're a strong fit for LeadScoreAI."
      : band === "Warm"
        ? "You're a good fit, and it gets better as your enquiries grow."
        : "LeadScoreAI may not be for you yet.";
  return { score, band, headline, reasons: reasons.slice(0, 3) };
}

const SELLS_INTRO: Record<string, string> = {
  solar: "I sell and install solar.",
  "real-estate": "I sell real estate.",
  hair: "I sell hair.",
  skincare: "I sell skincare.",
  coaches: "I'm a coach or consultant.",
  travel: "I run a travel business.",
  "study-abroad": "I run a study-abroad agency.",
  other: "I run a business.",
};

const CHANNEL_TEXT: Record<string, string> = {
  whatsapp: "on WhatsApp",
  instagram: "in my Instagram DMs",
  website: "through my website",
  referrals: "from walk-ins and referrals",
};

// The first message waiting in the builder, written from their answers.
export function starterFromAnswers(a: Answers): string {
  const parts = [SELLS_INTRO[a.sells ?? "other"] ?? SELLS_INTRO.other];
  const vol = option("volume", a.volume)?.label.toLowerCase();
  const where = a.channel ? CHANNEL_TEXT[a.channel] : null;
  if (vol && where) parts.push(`I get ${vol} enquiries a week, mostly ${where}.`);
  else if (where) parts.push(`Most of my enquiries come ${where}.`);
  if (a.marketing === "paid-ads") parts.push("I'm running paid ads.");
  parts.push("I want a quiz that shows me who is serious and ready to pay.");
  return parts.join(" ");
}

// Industry slug for the builder's sample quizzes (null = the general mix).
export function industryFromAnswers(a: Answers): string | null {
  return a.sells && a.sells !== "other" ? a.sells : null;
}

// One line per answer, for team alerts and the builder's context.
export function describeAnswers(a: Answers): string[] {
  return SCORECARD.filter((q) => a[q.key]).map((q) => `${q.text} ${option(q.key, a[q.key])!.label}`);
}
