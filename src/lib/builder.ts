// Self-serve quiz builder: a business owner describes their business in chat,
// Claude drafts a quiz, and it's saved as a draft quiz on the existing
// /[orgSlug]/[quizSlug] renderer. Everything builder-specific lives in
// quizzes.builder_config; quizzes without it keep the original behaviour.

import type { Qualification } from "./types";

export const BUILDER_MODEL = "claude-opus-5";
export const BUILDER_FALLBACK_MODEL = "claude-opus-4-8";

export type QuizKind = "qualify" | "match";

export interface BuilderBand {
  label: string;
  headline: string;
  body: string;
}

export interface BuilderOutcome {
  key: string;
  title: string;
  description: string;
  recommendation: string;
}

export interface BuilderConfig {
  version: 1;
  kind: QuizKind;
  results: Record<Qualification, BuilderBand>;
  outcomes: BuilderOutcome[]; // Match quizzes only; empty for Qualify
  cta_text: string | null;
}

// ── What Claude returns ────────────────────────────────────────────────────

export interface DraftOption {
  text: string;
  points: number;
  outcome_key: string;
}

export interface DraftQuestion {
  question_text: string;
  wtp_signal: boolean;
  options: DraftOption[];
}

export interface DraftQuiz {
  kind: QuizKind;
  name: string;
  start_headline: string;
  start_subheadline: string;
  start_cta_text: string;
  questions: DraftQuestion[];
  outcomes: BuilderOutcome[];
  results: {
    hot: BuilderBand;
    warm: BuilderBand;
    cold: BuilderBand;
    not_qualified: BuilderBand;
  };
  result_cta_text: string;
  result_cta_url: string;
  suggested_color: string;
}

export interface BuilderTurn {
  reply: string;
  quiz: DraftQuiz | null;
}

const band = {
  type: "object",
  properties: {
    label: { type: "string" },
    headline: { type: "string" },
    body: { type: "string" },
  },
  required: ["label", "headline", "body"],
  additionalProperties: false,
} as const;

const draftQuizSchema = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["qualify", "match"] },
    name: { type: "string" },
    start_headline: { type: "string" },
    start_subheadline: { type: "string" },
    start_cta_text: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question_text: { type: "string" },
          wtp_signal: { type: "boolean" },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                points: { type: "integer" },
                outcome_key: { type: "string" },
              },
              required: ["text", "points", "outcome_key"],
              additionalProperties: false,
            },
          },
        },
        required: ["question_text", "wtp_signal", "options"],
        additionalProperties: false,
      },
    },
    outcomes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          recommendation: { type: "string" },
        },
        required: ["key", "title", "description", "recommendation"],
        additionalProperties: false,
      },
    },
    results: {
      type: "object",
      properties: { hot: band, warm: band, cold: band, not_qualified: band },
      required: ["hot", "warm", "cold", "not_qualified"],
      additionalProperties: false,
    },
    result_cta_text: { type: "string" },
    result_cta_url: { type: "string" },
    suggested_color: { type: "string" },
  },
  required: [
    "kind",
    "name",
    "start_headline",
    "start_subheadline",
    "start_cta_text",
    "questions",
    "outcomes",
    "results",
    "result_cta_text",
    "result_cta_url",
    "suggested_color",
  ],
  additionalProperties: false,
} as const;

export const BUILDER_TURN_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    quiz: { anyOf: [draftQuizSchema, { type: "null" }] },
  },
  required: ["reply", "quiz"],
  additionalProperties: false,
} as const;

export const BUILDER_SYSTEM_PROMPT = `You are the quiz designer inside LeadScoreAI, a product that lets business owners create interactive quizzes by chatting. Most users run small and mid-sized businesses in Africa (Nigeria, Ghana, Kenya, South Africa and elsewhere), but anyone can use it. Typical users: skincare and beauty brands, travel consultants, education and study-abroad consultants, solar installers, lenders, real estate agents, coaches, clinics and agencies.

Each turn you return JSON with two fields:
- "reply": a short message to the business owner (2 to 5 sentences, plain and warm, no markdown headings). Say what you built or changed, and ask at most two questions that would make the quiz better.
- "quiz": the complete, current quiz, or null.

Return quiz = null only when you genuinely cannot tell what the business sells or who it serves (for example the user only said "hi"). In that case, use the reply to ask what they sell and who their customers are. As soon as you know roughly what the business does, draft a full quiz and state any assumptions in the reply. A draft the owner can react to beats more questions.

When the conversation includes a <current_quiz> block, that is the quiz as it stands. Apply the owner's requested changes to it and return the whole updated quiz, keeping everything they did not ask to change.

## Two kinds of quiz

1. "qualify": answers add up to a score that tells the business how ready and able this person is to buy, or whether they are eligible (for example "Are you eligible to study in the UK?", "Can you afford solar?"). Use this when the business wants to sort good leads from weak ones.
2. "match": each answer points to one of several outcomes, and the person gets the outcome that fits them best (for example "Which skincare routine fits your skin?", "Which holiday suits you?", personality quizzes). Use this when the business wants to recommend a product, package or type.

Pick the kind that fits the owner's goal. If they ask for the other kind, switch.

## Rules for every quiz

- 6 to 8 questions. Never fewer than 5. The questions are what qualify the lead, so do not make the quiz too short to be useful.
- Every question is multiple choice with 2 to 5 options. Options must be short (under 12 words) and cover the realistic range of answers.
- Do not ask for name, email or phone. Contact details are collected automatically after the last question.
- Write for the owner's customers, in the owner's language and market. Use local currency and examples when the market is clear (for example naira for Nigeria). Keep wording simple enough to read on a phone.
- start_headline: a hook under 12 words that makes the customer want to take the quiz. start_subheadline: one or two sentences on what they will learn. start_cta_text: 2 to 4 words, for example "Start the quiz".
- name: a short internal name for the owner, for example "Study in the UK eligibility".
- suggested_color: a hex colour that suits the brand, like "#0F766E".

## Scoring (both kinds)

Points measure how ready and able the person is to buy. For each question, the best answer gets the most points and weaker answers get fewer, down to 0. Aim for the best possible answers to add up to about 100 in total.
- Qualify quizzes: every question carries points. Include at least one question about budget or ability to pay, and one about timeline or urgency.
- Match quizzes: most questions only decide the outcome and give 0 points on every option. Also include 1 or 2 lead-quality questions (budget, timeline or readiness to buy) that carry points. At least one question must carry points.
- Set wtp_signal to true on questions about budget, ability to pay, urgency or commitment, and false on the rest.

## Outcomes (match quizzes only)

- 3 to 5 outcomes, each with a short lowercase key (for example "oily_skin"), a title, a 1 to 2 sentence description, and a recommendation naming what the business offers for that outcome.
- On outcome questions, set each option's outcome_key to exactly one outcome key. On lead-quality questions, set outcome_key to "".
- Each outcome must be reachable: at least two questions should have an option pointing to it.
- For qualify quizzes, outcomes is an empty array and every outcome_key is "".

## Results

- results holds four score bands: hot (80% and above), warm (60 to 79%), cold (40 to 59%) and not_qualified (below 40%). Each has a label (2 to 3 words, for example "Strong fit"), a headline, and a body of 1 to 2 sentences telling the person what their result means and what to do next.
- Be encouraging even to low scorers. Never promise outcomes the business cannot guarantee. For eligibility, visa, medical, legal or financial quizzes, say the result is an indication, not an official decision.
- result_cta_text: button text on the results page, for example "Book a free consultation". result_cta_url: a link the owner gave you (website, WhatsApp link like https://wa.me/234..., or booking page), or "" if they have not given one. Never invent a URL.`;

// ── Validation: turn Claude's draft into safe DB rows ─────────────────────

export interface NormalizedQuestion {
  question_order: number;
  question_text: string;
  question_type: "radio";
  options: { text: string; value: string; points: number; outcome?: string }[];
  max_points: number;
  wtp_signal: boolean;
}

export interface NormalizedQuiz {
  name: string;
  start_headline: string;
  start_subheadline: string;
  start_cta_text: string;
  max_score: number;
  cta_url: string | null;
  builder_config: BuilderConfig;
  questions: NormalizedQuestion[];
  suggested_color: string | null;
}

const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

function slugPart(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function slugify(s: string, fallback = "quiz"): string {
  return slugPart(s) || fallback;
}

function safeUrl(u: string): string | null {
  const s = u.trim();
  if (!s) return null;
  try {
    const url = new URL(s);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeBand(b: Partial<BuilderBand> | undefined, fallback: BuilderBand): BuilderBand {
  return {
    label: clip(b?.label, 40) || fallback.label,
    headline: clip(b?.headline, 160) || fallback.headline,
    body: clip(b?.body, 600) || fallback.body,
  };
}

// Returns either a normalized quiz or a list of problems to send back to Claude.
export function normalizeDraft(
  draft: DraftQuiz
): { ok: true; quiz: NormalizedQuiz } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const kind: QuizKind = draft.kind === "match" ? "match" : "qualify";

  const outcomes: BuilderOutcome[] = [];
  if (kind === "match") {
    const seen = new Set<string>();
    for (const o of draft.outcomes || []) {
      const key = slugPart(o.key).replace(/-/g, "_");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      outcomes.push({
        key,
        title: clip(o.title, 80),
        description: clip(o.description, 400),
        recommendation: clip(o.recommendation, 400),
      });
    }
    if (outcomes.length < 2) errors.push("A match quiz needs at least 2 distinct outcomes.");
  }
  const outcomeKeys = new Set(outcomes.map((o) => o.key));

  const questions: NormalizedQuestion[] = [];
  (draft.questions || []).slice(0, 12).forEach((q) => {
    const text = clip(q.question_text, 240);
    if (!text) return;
    const usedValues = new Set<string>();
    const options = (q.options || []).slice(0, 6).flatMap((o, i) => {
      const optText = clip(o.text, 120);
      if (!optText) return [];
      let value = slugify(optText, `option-${i + 1}`);
      while (usedValues.has(value)) value = `${value}-${i + 1}`;
      usedValues.add(value);
      const points = Math.max(0, Math.min(100, Math.round(Number(o.points) || 0)));
      const rawKey = slugPart(String(o.outcome_key || "")).replace(/-/g, "_");
      const outcome = kind === "match" && outcomeKeys.has(rawKey) ? rawKey : undefined;
      return [{ text: optText, value, points, ...(outcome ? { outcome } : {}) }];
    });
    if (options.length < 2) return;
    questions.push({
      question_order: questions.length + 1,
      question_text: text,
      question_type: "radio",
      options,
      max_points: Math.max(...options.map((o) => o.points)),
      wtp_signal: !!q.wtp_signal,
    });
  });

  if (questions.length < 3) errors.push("The quiz needs at least 3 valid multiple-choice questions.");
  const maxScore = questions.reduce((s, q) => s + q.max_points, 0);
  if (maxScore <= 0) errors.push("At least one question must carry points (budget, timeline or readiness).");
  if (kind === "match") {
    const reachable = new Set(questions.flatMap((q) => q.options.map((o) => o.outcome).filter(Boolean)));
    const unreachable = outcomes.filter((o) => !reachable.has(o.key)).map((o) => o.key);
    if (unreachable.length) errors.push(`These outcomes are not reachable from any answer: ${unreachable.join(", ")}.`);
  }
  const headline = clip(draft.start_headline, 140);
  if (!headline) errors.push("start_headline is empty.");

  if (errors.length) return { ok: false, errors };

  const fb: BuilderBand = { label: "Your result", headline: "Thanks for taking the quiz", body: "We'll be in touch with next steps." };
  const results: Record<Qualification, BuilderBand> = {
    HOT_LEAD: safeBand(draft.results?.hot, fb),
    WARM_LEAD: safeBand(draft.results?.warm, fb),
    COLD_LEAD: safeBand(draft.results?.cold, fb),
    NOT_QUALIFIED: safeBand(draft.results?.not_qualified, fb),
  };

  const color = clip(draft.suggested_color, 7);
  return {
    ok: true,
    quiz: {
      name: clip(draft.name, 80) || headline.slice(0, 80),
      start_headline: headline,
      start_subheadline: clip(draft.start_subheadline, 300),
      start_cta_text: clip(draft.start_cta_text, 30) || "Start the quiz",
      max_score: maxScore,
      cta_url: safeUrl(String(draft.result_cta_url || "")),
      builder_config: {
        version: 1,
        kind,
        results,
        outcomes,
        cta_text: clip(draft.result_cta_text, 40) || null,
      },
      questions,
      suggested_color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : null,
    },
  };
}

// Rebuild the draft shape from DB rows so Claude can edit the current quiz.
export function toDraftForPrompt(
  quiz: {
    name: string;
    start_headline: string | null;
    start_subheadline: string | null;
    start_cta_text: string | null;
    cta_url: string | null;
    builder_config: BuilderConfig;
  },
  questions: { question_text: string; wtp_signal?: boolean; options: { text: string; points: number; outcome?: string }[] }[],
  color: string | null
): DraftQuiz {
  const c = quiz.builder_config;
  return {
    kind: c.kind,
    name: quiz.name,
    start_headline: quiz.start_headline || "",
    start_subheadline: quiz.start_subheadline || "",
    start_cta_text: quiz.start_cta_text || "",
    questions: questions.map((q) => ({
      question_text: q.question_text,
      wtp_signal: !!q.wtp_signal,
      options: q.options.map((o) => ({ text: o.text, points: o.points, outcome_key: o.outcome || "" })),
    })),
    outcomes: c.outcomes,
    results: {
      hot: c.results.HOT_LEAD,
      warm: c.results.WARM_LEAD,
      cold: c.results.COLD_LEAD,
      not_qualified: c.results.NOT_QUALIFIED,
    },
    result_cta_text: c.cta_text || "",
    result_cta_url: quiz.cta_url || "",
    suggested_color: color || "",
  };
}

// Match quizzes: the outcome picked most often wins; ties go to the outcome
// listed first. Answers without an outcome (lead-quality questions) are ignored.
export function computeMatchOutcome(
  config: BuilderConfig,
  pickedOutcomes: (string | undefined)[]
): BuilderOutcome | null {
  if (config.kind !== "match" || !config.outcomes.length) return null;
  const counts = new Map<string, number>();
  for (const k of pickedOutcomes) if (k) counts.set(k, (counts.get(k) || 0) + 1);
  let best: BuilderOutcome | null = null;
  let bestCount = -1;
  for (const o of config.outcomes) {
    const c = counts.get(o.key) || 0;
    if (c > bestCount) {
      best = o;
      bestCount = c;
    }
  }
  return best;
}

// Top-level route segments an org slug must never take (they'd shadow or be
// shadowed by real pages under /[orgSlug]/[quizSlug]).
export const RESERVED_SLUGS = new Set([
  "api", "build", "dashboard", "demo-open", "demos", "invoices", "login", "logout",
  "microfinance", "mortgage", "policies", "quiz", "reset-password", "solar", "staff",
  "approvals", "client-onboarding", "deals", "earnings", "office-manager", "onboarding",
  "payouts", "profile", "team", "manifesto", "admin", "app", "www", "leadscoreai",
  "_next", "static", "public", "assets", "favicon.ico",
]);
