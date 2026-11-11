// Repayment Score: the seven-part repayment review (public lead magnet at /repayment-score).
//
// CLIENT-SAFE. This file ships to the browser, so it holds ONLY the words a
// visitor sees: copy, the seven parts, the questions and their options (by id).
// The points behind each option, the scoring and the plan text live in
// repayment-score-server.ts and never leave the server.
//
// Naming rule: this is the "Repayment Score" / "seven-part repayment review".
// Never call it a quiz in copy.

// ---- Copy Damola may want to change (all in one place) ----
export const RS_COPY = {
  headline: "WHAT IS THE #1 THING HOLDING BACK YOUR COLLECTIONS?",
  byline: "The seven-part repayment review, by Damola Akanbi, LeadScoreAI",
  sub:
    "See how your lending business performs across the seven parts of a complete repayment system. Get your Repayment Score, find your number one repayment block, and get a 90-day plan built from your answers.",
  button: "Get My Repayment Score",
  underButton: "Free · About 3 minutes · Score now, plan by email",
  note: "Lenders with a loan book over $1M may qualify for a private Repayment Diagnostic.",
  // Call to action at the end of the results.
  diagnosticTitle: "Book a private Repayment Diagnostic",
  diagnosticBody:
    "A paid review built on your own repayment history: which customers, channels and agents repay, where loans go bad, and what to fix first. Your results become the baseline we measure against.",
  diagnosticButton: "Book my Repayment Diagnostic",
};

// Booking link for the paid Repayment Diagnostic. Same Calendly the app already
// uses for LeadScoreAI calls; change it here when a dedicated page exists.
export const DIAGNOSTIC_BOOKING_URL = "https://calendly.com/leadscoreai/30min?back=1";

// ---- The seven parts ----
export type PartKey =
  | "acquisition"
  | "screening"
  | "handover"
  | "repayment"
  | "collections"
  | "tracking"
  | "prediction";

export const PARTS: { key: PartKey; n: number; name: string; blurb: string }[] = [
  { key: "acquisition", n: 1, name: "Acquisition", blurb: "Where your customers come from" },
  { key: "screening", n: 2, name: "Screening", blurb: "How you decide who gets credit" },
  { key: "handover", n: 3, name: "Handover", blurb: "What is checked before the asset or cash goes out" },
  { key: "repayment", n: 4, name: "Repayment", blurb: "How customers pay and get reminded" },
  { key: "collections", n: 5, name: "Collections", blurb: "What happens when a payment is missed" },
  { key: "tracking", n: 6, name: "Tracking", blurb: "Tracing repayments back to the source" },
  { key: "prediction", n: 7, name: "Prediction", blurb: "Seeing bad batches early and reporting to investors" },
];

export const PART_NAME: Record<PartKey, string> = Object.fromEntries(
  PARTS.map((p) => [p.key, p.name])
) as Record<PartKey, string>;

// ---- 21 questions, three per part. Options carry an id only. ----
export type RSQuestion = { id: string; part: PartKey; q: string; hint?: string; opts: { id: string; text: string }[] };

export const QUESTIONS: RSQuestion[] = [
  // 1 Acquisition
  { id: "a1", part: "acquisition", q: "Which channel brings you the customers who repay best?",
    opts: [
      { id: "a1a", text: "I don't know" },
      { id: "a1b", text: "I have a feeling, but no numbers" },
      { id: "a1c", text: "I know it, and I can show the numbers" },
      { id: "a1d", text: "Every channel seems about the same" },
    ] },
  { id: "a2", part: "acquisition", q: "Where do most of your new customers come from today?",
    opts: [
      { id: "a2a", text: "Mostly agents or field sales" },
      { id: "a2b", text: "A mix of ads, agents, partners and referrals, and we track each one" },
      { id: "a2c", text: "A mix, but we don't record which one brought each customer" },
      { id: "a2d", text: "Walk-ins and word of mouth" },
    ] },
  { id: "a3", part: "acquisition", q: "Before someone applies, do you ask anything that filters out people who won't repay?",
    opts: [
      { id: "a3a", text: "Yes, a few questions on the form or call" },
      { id: "a3b", text: "No, anyone can apply" },
      { id: "a3c", text: "Yes, and we have checked those answers against who actually repaid" },
    ] },

  // 2 Screening
  { id: "s1", part: "screening", q: "How do you decide who gets credit?",
    opts: [
      { id: "s1a", text: "The loan officer or agent decides" },
      { id: "s1b", text: "A written checklist everyone follows" },
      { id: "s1c", text: "A scorecard or model built from our own repayment history" },
      { id: "s1d", text: "Mostly the credit bureau report" },
    ] },
  { id: "s2", part: "screening", q: "When you approve someone, what do you check about their income?",
    opts: [
      { id: "s2a", text: "We take their word for it" },
      { id: "s2b", text: "Bank or mobile money statements, checked against what they told us" },
      { id: "s2c", text: "A payslip or a business visit, sometimes" },
    ] },
  { id: "s3", part: "screening", q: "Can you say which of your approval rules actually predict who repays?",
    opts: [
      { id: "s3a", text: "Some of them, from experience" },
      { id: "s3b", text: "No, we've never tested them" },
      { id: "s3c", text: "Yes, we review them against repayment results regularly" },
    ] },

  // 3 Handover
  { id: "h1", part: "handover", q: "Before the asset or cash goes out, what must the customer have done?",
    opts: [
      { id: "h1a", text: "Signed something, and that's it" },
      { id: "h1b", text: "Paid a deposit, signed a contract and passed ID checks, every time" },
      { id: "h1c", text: "Paid a deposit, but paperwork is sometimes finished later" },
      { id: "h1d", text: "It depends on the agent" },
    ] },
  { id: "h2", part: "handover", q: "How do you confirm the customer is who they say they are?",
    opts: [
      { id: "h2a", text: "A photo of an ID card" },
      { id: "h2b", text: "ID number checked against a government or bureau database, plus phone and address" },
      { id: "h2c", text: "We trust the agent or guarantor" },
    ] },
  { id: "h3", part: "handover", q: "Does the customer know exactly what they owe and when, before they leave with it?",
    opts: [
      { id: "h3a", text: "We explain it out loud" },
      { id: "h3b", text: "It's in the contract" },
      { id: "h3c", text: "Yes, they get a written schedule and confirm it on their phone" },
    ] },

  // 4 Repayment
  { id: "r1", part: "repayment", q: "How do customers pay you?",
    opts: [
      { id: "r1a", text: "Cash to agents, or transfers we match by hand" },
      { id: "r1b", text: "Automatic: direct debit, mobile money mandate or virtual account per customer" },
      { id: "r1c", text: "Transfers to one account, matched with a spreadsheet" },
    ] },
  { id: "r2", part: "repayment", q: "How are customers reminded before a payment is due?",
    opts: [
      { id: "r2a", text: "Automatic SMS or WhatsApp a few days before, every time" },
      { id: "r2b", text: "An agent calls when they remember" },
      { id: "r2c", text: "We don't remind them" },
    ] },
  { id: "r3", part: "repayment", q: "When a payment comes in, how fast does it show against the right customer?",
    opts: [
      { id: "r3a", text: "Days later, after someone reconciles it" },
      { id: "r3b", text: "Same day, by hand" },
      { id: "r3c", text: "Instantly, without anyone touching it" },
      { id: "r3d", text: "We sometimes can't tell who paid" },
    ] },

  // 5 Collections
  { id: "c1", part: "collections", q: "What happens on day 1 after a missed payment?",
    opts: [
      { id: "c1a", text: "Nothing until it's a week or more late" },
      { id: "c1b", text: "A set message goes out the same day, and someone follows up within 48 hours" },
      { id: "c1c", text: "Someone calls when they get round to it" },
    ] },
  { id: "c2", part: "collections", q: "Who chases late payments, and how do you measure them?",
    opts: [
      { id: "c2a", text: "The same agent who made the sale, not measured" },
      { id: "c2b", text: "A collections person, measured on amounts recovered" },
      { id: "c2c", text: "A collections team with steps by days late, measured weekly" },
      { id: "c2d", text: "Whoever is free" },
    ] },
  { id: "c3", part: "collections", q: "When a customer stops paying for good, what do you do?",
    opts: [
      { id: "c3a", text: "Lock or recover the asset, or restructure, by clear written rules" },
      { id: "c3b", text: "Write it off eventually" },
      { id: "c3c", text: "Decide case by case" },
    ] },

  // 6 Tracking
  { id: "t1", part: "tracking", q: "Can you trace one customer's repayments back to the ad, agent or partner that brought them?",
    opts: [
      { id: "t1a", text: "No" },
      { id: "t1b", text: "With a lot of digging through spreadsheets" },
      { id: "t1c", text: "Yes, in a few clicks" },
    ] },
  { id: "t2", part: "tracking", q: "Do you know which agents bring customers who repay, and which bring defaulters?",
    opts: [
      { id: "t2a", text: "We know our best and worst by name, roughly" },
      { id: "t2b", text: "Yes, with repayment numbers per agent" },
      { id: "t2c", text: "No" },
    ] },
  { id: "t3", part: "tracking", q: "Where does your repayment data live?",
    opts: [
      { id: "t3a", text: "Spread across WhatsApp, notebooks and several spreadsheets" },
      { id: "t3b", text: "One spreadsheet that someone updates" },
      { id: "t3c", text: "A loan system, linked to how each customer was acquired" },
      { id: "t3d", text: "A loan system, but not linked to where customers came from" },
    ] },

  // 7 Prediction
  { id: "p1", part: "prediction", q: "How early do you know a batch of loans is going bad?",
    opts: [
      { id: "p1a", text: "When the money doesn't come in at month end" },
      { id: "p1b", text: "Within the first one or two missed payments, from a weekly report" },
      { id: "p1c", text: "Before the first payment is due, from early signals we track" },
      { id: "p1d", text: "Only when we close the books" },
    ] },
  { id: "p2", part: "prediction", q: "If an investor asked for your repayment performance by month of lending, how long would it take?",
    opts: [
      { id: "p2a", text: "Weeks of pulling it together" },
      { id: "p2b", text: "We couldn't give it with confidence" },
      { id: "p2c", text: "A day or two" },
      { id: "p2d", text: "Minutes, it's always up to date" },
    ] },
  { id: "p3", part: "prediction", q: "Can you forecast how much you'll collect next month?",
    opts: [
      { id: "p3a", text: "A rough guess" },
      { id: "p3b", text: "Yes, within a small margin, and we check it each month" },
      { id: "p3c", text: "No" },
    ] },
];

// ---- Details step options ----
export const ROLES: { id: string; label: string }[] = [
  { id: "ceo", label: "CEO / Founder / MD" },
  { id: "credit_head", label: "Head of credit or risk" },
  { id: "collections", label: "Collections or operations" },
  { id: "finance", label: "Finance / CFO" },
  { id: "sales", label: "Sales or growth" },
  { id: "investor", label: "Investor or board member" },
  { id: "other", label: "Other" },
];

export const FINANCES: { id: string; label: string }[] = [
  { id: "solar", label: "Solar / PAYGo energy" },
  { id: "phones", label: "Phones and devices" },
  { id: "motorcycles", label: "Motorcycles and vehicles" },
  { id: "microfinance", label: "Microfinance / cash loans" },
  { id: "digital", label: "Digital loans (app or USSD)" },
  { id: "bnpl", label: "Buy now, pay later" },
  { id: "farm", label: "Farm inputs" },
  { id: "equipment", label: "Equipment" },
  { id: "other", label: "Something else" },
];

export const COUNTRIES = [
  "Nigeria", "Kenya", "Ghana", "Uganda", "Tanzania", "Rwanda", "South Africa", "Zambia",
  "Côte d'Ivoire", "Cameroon", "Ethiopia", "Egypt", "Senegal", "Malawi", "Other",
];

export const BOOK_SIZES: { id: string; label: string }[] = [
  { id: "under_100k", label: "Under $100k" },
  { id: "100k_500k", label: "$100k to $500k" },
  { id: "500k_1m", label: "$500k to $1M" },
  { id: "1m_5m", label: "$1M to $5M" },
  { id: "over_5m", label: "Over $5M" },
  { id: "not_sure", label: "Not sure / prefer not to say" },
];

// ---- Shape the server returns ----
export type RSResult = {
  total: number; // 0..100
  parts: { key: PartKey; name: string; score: number }[]; // 0..100 each, in part order
  weakest: { key: PartKey; name: string; score: number; explanation: string };
  nextSteps: string[]; // three
  plan: { phase: string; days: string; items: string[] }[]; // Track, Fix, Predict
  firstName: string;
  company: string;
  bookOver1m: boolean;
  emailEnabled: boolean;
  saved: boolean;
};
