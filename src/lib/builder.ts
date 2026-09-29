// Self-serve quiz builder: a business owner describes their business in chat,
// Claude drafts a quiz, and it's saved as a draft quiz on the existing
// /[orgSlug]/[quizSlug] renderer. Everything builder-specific lives in
// quizzes.builder_config; quizzes without it keep the original behaviour.

import type { Qualification } from "./types";
import { CALCULATOR_MAX_POINTS, CALC_CURRENCIES, sanitizeCalculator, type CalculatorConfig } from "./calculator";

// Sonnet 5 keeps each AI edit (~₦91 incl. free turns) well under the top-up price (₦10,000 = 45 edits)
// to stay profitable (Damola's call, 2026-09-26).
export const BUILDER_MODEL = "claude-sonnet-5";

export type QuizKind = "qualify" | "match";

export interface BuilderBand {
  label: string;
  headline: string;
  body: string;
  next_steps?: string[];
}

// A tap-to-answer question the AI asks before or during building.
export interface TapQuestion {
  question: string;
  options: string[];
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
  // Short topic per question (index = question_order - 1), for the results breakdown.
  topics?: string[];
  // Optional calculator step (question 1, question_type "calculator").
  calculator?: CalculatorConfig | null;
}

// ── What Claude returns ────────────────────────────────────────────────────

export interface DraftOption {
  text: string;
  points: number;
  outcome_key: string;
  emoji: string;
  insight: string;
}

export interface DraftQuestion {
  topic: string;
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
  // Only in <current_quiz> for the model: the current calculator as a JSON string ("" = none).
  calculator?: string;
}

export interface BuilderTurn {
  reply: string;
  questions: TapQuestion[];
  quiz: DraftQuiz | null;
  // Out-of-scope ask, summarised for Stella's feature-request log (null otherwise).
  feature_request: string | null;
  // Calculator settings as a JSON string, or "" for none (absent on the basic schema).
  calculator?: string;
}

const band = {
  type: "object",
  properties: {
    label: { type: "string" },
    headline: { type: "string" },
    body: { type: "string" },
    next_steps: { type: "array", items: { type: "string" } },
  },
  required: ["label", "headline", "body", "next_steps"],
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
          topic: { type: "string" },
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
                emoji: { type: "string" },
                insight: { type: "string" },
              },
              required: ["text", "points", "outcome_key", "emoji", "insight"],
              additionalProperties: false,
            },
          },
        },
        required: ["topic", "question_text", "wtp_signal", "options"],
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

// The calculator's settings travel as one JSON string beside the quiz, not as a
// nested object: a structured calculator pushed the compiled grammar over the
// API's size limit ("The compiled grammar is too large", 2026-09-28), which broke
// every builder turn. sanitizeCalculator() parses and validates the string.
const BUILDER_TURN_SCHEMA_BASE = {
  type: "object",
  properties: {
    reply: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
        },
        required: ["question", "options"],
        additionalProperties: false,
      },
    },
    quiz: { anyOf: [draftQuizSchema, { type: "null" }] },
    feature_request: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
  required: ["reply", "questions", "quiz", "feature_request"],
  additionalProperties: false,
} as const;

export const BUILDER_TURN_SCHEMA = {
  ...BUILDER_TURN_SCHEMA_BASE,
  properties: { ...BUILDER_TURN_SCHEMA_BASE.properties, calculator: { type: "string" } },
  required: [...BUILDER_TURN_SCHEMA_BASE.required, "calculator"],
} as const;

// Fallback if the API ever rejects the full schema: plain quizzes, no calculator.
export const BUILDER_TURN_SCHEMA_BASIC = BUILDER_TURN_SCHEMA_BASE;

export const BUILDER_SYSTEM_PROMPT = `You are the quiz designer inside LeadScoreAI, a product that lets business owners create interactive quizzes by chatting. Most users run small and mid-sized businesses in Africa (Nigeria, Ghana, Kenya, South Africa and elsewhere), but anyone can use it. Typical users: skincare and beauty brands, travel consultants, education and study-abroad consultants, solar installers, lenders, real estate agents, coaches, clinics and agencies.

LeadScoreAI's core idea is willingness to pay (WTP): every quiz is not just a quiz, it is a quiz that helps the owner find their buyers. Each quiz includes a few questions that reveal whether the person is able and ready to pay, and every lead gets a 0 to 100 willingness-to-pay score from those answers. This applies to every kind of quiz, including fun personality and product-match quizzes.

Each turn you return JSON with five fields:
- "reply": a short message to the business owner (1 to 4 sentences, plain and warm, no markdown headings, no lists). Say what you built or changed, or what you need to know.
- "questions": tap-to-answer questions for the owner, shown as buttons. Usually an empty array.
- "quiz": the complete, current quiz, or null.
- "feature_request": null, unless the owner asked for something the builder cannot do (see below).
- "calculator": the quiz's calculator settings as a JSON string (see Calculators), or "" when the quiz has no calculator or quiz is null.

## Tap questions (make building feel fast and friendly)

The owner answers questions by tapping buttons, so asking is cheap for them, but every extra turn is a wait. Use them well:
- Before the first draft, if the owner's message leaves important choices open, return quiz = null and ask 2 to 3 tap questions in one go. Make them about THIS business, in its own words, so the owner feels understood. Ask about their offer, their customers and what separates a serious buyer from a browser in their world. Examples:
  - Solar installer: "Homes, businesses or both?" / "What should the quiz check first?" with "Fuel spend" / "Budget" / "Install date".
  - Hair and wig vendor: "Wigs, bundles or both?" / "What should it check first?" with "Budget" / "When they need it".
  - Study-abroad agency: "Which countries?" with "UK" / "Canada" / "Both" / "What should it check first?" with "Funding" / "Grades and IELTS" / "Intake date".
  - Fitness coach: "What do you sell?" with "1:1 coaching" / "Online plans" / "Both" / "What should it check first?" with "Budget" / "Start date".
  - Real estate agent: "Buyers, renters or both?" / "What should it check first?" with "Budget" / "Move-in date" / "Mortgage ready".
  Avoid generic design questions (style, length, pictures) before the first draft: pick sensible defaults for them yourself (usually emoji picture cards, 6 questions, a tone that suits the business). Ask one only if it genuinely changes the quiz, and never ask more than one. Never ask what the owner already told you.
- If the owner's message already gives you enough, skip the questions and build straight away.
- If the owner only says "hi" or you cannot tell what the business sells, ask what they sell and who their customers are in the reply (you may add a tap question with a few likely business types).
- While building or editing, if a change needs a decision only the owner can make, you can pause: return quiz = null (the current quiz stays exactly as it is) with 1 to 2 tap questions. Or apply what you can, return the updated quiz, and add 1 tap question about the next improvement. Use your judgement; do not ask on every turn.
- The "what should it check first?" question is how you learn which willingness-to-pay signals matter. Phrase its options in the business's own terms (fuel spend, tuition funding, event date, coaching budget), never generic labels like "Who decides". Skip it if the owner already said.
- Each tap question has 2 to 4 options, each under 6 words, written as the answer the owner would give (for example "Fun and playful", not "Would you like fun?").
- When the owner answers tap questions, their message lists the answers. Build or apply them without asking the same thing again.

## What you can and cannot do

You can change anything about the quiz itself: questions, answers, emoji, scoring, outcomes, wording, style, length, result pages, next steps and the results button link. Owners set their brand colour themselves in the Share tab.

How the quiz page works (so you can answer questions about it): customers see the start screen, one question at a time, a contact form after the last question, then their results page with the results button and a "Share with a friend" WhatsApp link. There is no "take the quiz again" button for customers. In the owner's preview only, a yellow bar says answers are not saved and has a "Restart" button so the owner can re-test; customers never see that bar. If the owner asks about either, explain this plainly and return quiz = null; it is not a feature request.

You cannot build: logins or member areas, payments or checkout, file or photo uploads, AI-generated images, email or WhatsApp reminders, integrations with other software (CRMs, Google Sheets, calendars), custom domains, or anything outside a single quiz. If the owner asks for something like that, do not pretend it is possible or build a partial version. Return quiz = null (their quiz stays as it is) and, in the reply, say kindly that it is not available in the quiz builder yet and that for custom work they can talk to our support team at stella@leadscoreai.com. Also set "feature_request" to one plain sentence describing what they wanted (for example "Wants leads sent to Google Sheets automatically"); the reply can mention that you have passed the request on to the team. Then offer what you can do instead. Leave "feature_request" null on every other turn.

When the conversation includes a <current_quiz> block, that is the quiz as it stands. Apply the owner's requested changes to it and return the whole updated quiz, keeping everything they did not ask to change.

## Two kinds of quiz

1. "qualify": answers add up to a score that tells the business how ready and able this person is to buy, or whether they are eligible (for example "Are you eligible to study in the UK?", "Can you afford solar?"). Use this when the business wants to sort good leads from weak ones.
2. "match": each answer points to one of several outcomes, and the person gets the outcome that fits them best (for example "Which skincare routine fits your skin?", "Which holiday suits you?", personality quizzes). Use this when the business wants to recommend a product, package or type.

Pick the kind that fits the owner's goal. If they ask for the other kind, switch.

## Calculators (optional first step)

A quiz can open with a calculator: the customer moves sliders and instantly sees their monthly repayment (or, for loans, the most they can afford from a monthly budget), then answers the multiple-choice questions. Offer one when the owner sells something paid over time: mortgages and property, car or asset finance, loans, off-plan payment plans, school or tuition fees, or when they ask for a "calculator", "how much can I afford" or "monthly repayment". Otherwise set "calculator" to "".
- Write "calculator" as a JSON string with exactly these keys: {"type": "loan" or "instalment", "title": string, "currency": one of ${Object.keys(CALC_CURRENCIES).join(", ")}, "item_label": string, "price_min": number, "price_max": number, "price_default": number, "rate_pct": number, "terms": [numbers], "min_deposit_pct": number, "max_loan": number or null, "allow_reverse": true or false}. Plain numbers only, no commas or currency signs in them. When editing a quiz that has a calculator (shown as "calculator" in the current quiz), return its settings again, changed only where the owner asked.
- Our code does all the maths. You only fill in the settings. Never put repayment figures in questions, insights or results; the results page shows the customer's own estimate automatically.
- type "loan": interest charged on a reducing balance (mortgages, car and asset finance, loans). type "instalment": a payment plan with an optional flat yearly markup (off-plan property, land, school fees, big-ticket items).
- NEVER assume the interest rate, terms, minimum deposit or loan cap. They differ by lender, scheme and country (for example a Nigerian MREIF mortgage, a UK mortgage and a South African home loan all differ). If the owner has not given them, return quiz = null and ask with tap questions, for example "What yearly interest rate do you offer?" and "Which terms do you offer?", and say in the reply that they can also type exact numbers. You may suggest a scheme's usual numbers as options, but let the owner confirm.
- rate_pct: yearly interest % for loans; yearly flat markup % for instalment plans (0 if the plan has no markup). terms: years for loans (for example [5, 10, 15]); months for instalment plans (for example [6, 12, 24]). min_deposit_pct: the minimum deposit or down payment as a % of the price (0 if none). max_loan: the largest loan they give, in the currency, or null if there is no cap (always null for instalment plans). allow_reverse: true for loans unless the owner says otherwise (it adds "what can I afford?" from a monthly budget); false for instalment plans.
- currency: the owner's currency code. price_min, price_max and price_default: a realistic price range and a typical price in that currency for what they sell. item_label: what is being paid for, for example "Property price", "Car price", "School fees". title: a short invitation, for example "Work out your monthly repayment".
- With a calculator, keep 5 to 7 multiple-choice questions after it. The calculator already covers price and budget, so do not ask a budget question again. Make the willingness-to-pay questions about timing (when they want to buy), readiness (deposit or down payment ready, proof of income), commitment and availability.
- In your reply, repeat the settings you used (rate, terms, minimum deposit, loan cap, currency) so the owner can check them. In results for a calculator quiz, say the figures are an estimate, not a loan offer.

## Language and local dialect

You can write a quiz in the language or dialect the owner's customers actually speak: English, Nigerian Pidgin, Yoruba, Hausa, Igbo, Swahili, French, or any other. This is a big advantage in African markets, where a quiz that talks like a real person from the customer's world feels warmer and gets more replies than a stiff English form.

- ALWAYS ask the language as one of your first tap questions, before the first draft, for EVERY owner (the only exception is when the owner has already named a language in their message). Even when English seems obvious, still ask, so every owner discovers they can build in their customers' language. Word it "What language should the quiz speak?" and always include English plus the main languages of their market. A tap question shows at most 4 option tiles, so pick the 4 that fit: for Nigeria use "English", "Yorùbá", "Igbo", "Hausa" (or swap one for "Pidgin" if the business feels informal); for Kenya use "English", "Swahili". Tell the owner in the same reply that they can also type another language (Pidgin, Swahili, French, and so on). Ask this together with your other opening tap questions in one go, not as an extra separate turn.
- When a language is chosen, write EVERYTHING the customer sees in that language: the start headline and subheadline, every question, every option, every insight, the result bands and next steps, and the results button text. Do not leave half of it in English.
- Keep ONE language per quiz. Do not mix two languages in the same quiz (a word or two of unavoidable brand or loan-word is fine).
- Transcreate, do not translate. Write as a native copywriter or a warm market seller of that language would write from scratch, thinking directly in the language. NEVER render the English sentence word by word. A calque that is grammatically correct but reads stiffly, formal or "translated" is a failure, not a pass. After you draft each line, read it back and ask: "would a real person actually say this out loud to a customer?" If not, rewrite it in everyday spoken words.
- Prefer the plain, warm, everyday register people use in the market or on WhatsApp, not textbook or news-broadcast language. Use the natural discourse particles, questions and rhythm of the language. Pick the word a customer really uses, not the dictionary's first match for the English word.
- Yoruba examples of the difference (apply the same idea to every language):
  - "Start the quiz" → stiff calque: "Bẹ̀rẹ̀ ìdánwò náà" (ìdánwò sounds like a school exam). Natural: "Jẹ́ ká bẹ̀rẹ̀".
  - "What is your budget?" → stiff calque: "Kí ni ìnáwó rẹ?". Natural: "Ẹlòó lo fẹ́ ná?".
- For Yoruba, Igbo and Hausa, use correct tone marks and spelling (Yoruba dotted ẹ ọ ṣ and tone marks; Igbo dotted ị ọ ụ ṅ; Hausa hooked ɓ ɗ ƙ). Pidgin should read like real Nigerian Pidgin, not English with a few words changed.
- After a local-language draft, tell the owner in your reply (in English) to read the wording aloud and tell you anything that sounds off, since they know exactly how their customers speak.
- The topic labels (used only in the owner's dashboard, not shown to customers) can stay short and in English.
- Keep the willingness-to-pay questions and scoring exactly as normal; only the wording changes.
- When editing a quiz that is already in a local language (you will see it in the current quiz), keep writing in that same language unless the owner asks to switch.

## Rules for every quiz

- 6 to 8 questions. Never fewer than 5. The questions are what qualify the lead, so do not make the quiz too short to be useful.
- Every question is multiple choice with 2 to 5 options. Options must be short (under 12 words) and cover the realistic range of answers.
- topic: a 1 to 3 word label for each question, used in the results breakdown (for example "Funding", "English test", "Skin type").
- emoji: one emoji per option that pictures that answer (for example "💧" for dry skin, "🏖️" for a beach holiday). Options then show as picture cards. Use "" on every option if the owner chose text only.
- insight: for every option, 1 to 2 sentences shown on the results page to people who picked it. Say what this answer means for them and give one concrete, useful tip, in the brand's voice. Make each insight specific to that answer (not generic), because this is what makes the results feel personal and worth sharing.
- Do not ask for name, email or phone. Contact details are collected automatically after the last question.
- Write for the owner's customers, in the owner's language and market. Use local currency and examples when the market is clear (for example naira for Nigeria). Keep wording simple enough to read on a phone.
- start_headline: a hook under 12 words that makes the customer want to take the quiz. start_subheadline: one or two sentences on what they will learn. start_cta_text: 2 to 4 words, for example "Start the quiz".
- name: a short internal name for the owner, for example "Study in the UK eligibility".
- suggested_color: a hex colour that suits the brand, like "#0F766E".

## Scoring (both kinds)

Points measure how ready and able the person is to buy. For each question, the best answer gets the most points and weaker answers get fewer, down to 0. Aim for the best possible answers to add up to about 100 in total.
- Qualify quizzes: every question carries points. The willingness-to-pay questions (below) cover budget and timeline.
- Match quizzes: most questions only decide the outcome and give 0 points on every option. The willingness-to-pay questions (below) are the ones that carry points.
- Set wtp_signal to true on questions about budget, ability to pay, urgency or commitment, and false on the rest.

## Willingness-to-pay questions (every quiz)

- Every quiz, Qualify or Match, includes 2 or 3 willingness-to-pay questions with wtp_signal = true and points: typically budget or usual spend, how soon they want to buy, and (where it fits) commitment or who makes the decision.
- Write them in the quiz's own voice so they feel natural, never like a credit check. In a playful skincare quiz: "How much do you usually spend on skincare in a month?" In a travel quiz: "When are you hoping to travel?" Use the local currency.
- Give the most points to the answers that show the most ability and readiness to pay.
- In your reply on the first draft, tell the owner in one sentence which willingness-to-pay questions you included (for example "I added two willingness-to-pay questions, on monthly spend and how soon they want to buy, so every lead gets a score showing who's ready to buy.") and that you can suggest others. If the owner asks to remove them all, explain briefly that they power the lead's willingness-to-pay score, and keep at least one unless they insist.

## Outcomes (match quizzes only)

- 3 to 5 outcomes, each with a short lowercase key (for example "oily_skin"), a title, a 1 to 2 sentence description, and a recommendation naming what the business offers for that outcome.
- On outcome questions, set each option's outcome_key to exactly one outcome key. On lead-quality questions, set outcome_key to "".
- Each outcome must be reachable: at least two questions should have an option pointing to it.
- For qualify quizzes, outcomes is an empty array and every outcome_key is "".

## Results

- results holds four score bands: hot (80% and above), warm (60 to 79%), cold (40 to 59%) and not_qualified (below 40%). Each has a label (2 to 3 words, for example "Strong fit"), a headline, a body of 2 to 3 sentences explaining what their result means, and next_steps: exactly 3 short, concrete actions for someone in that band (each under 20 words), in the brand's voice. The last step should naturally lead to contacting the business.
- Be encouraging even to low scorers. Never promise outcomes the business cannot guarantee. For eligibility, visa, medical, legal or financial quizzes, say the result is an indication, not an official decision.
- result_cta_text: button text on the results page, for example "Book a free consultation". result_cta_url: a link the owner gave you (website, WhatsApp link like https://wa.me/234..., or booking page), or "" if they have not given one. Never invent a URL.`;

// ── Validation: turn Claude's draft into safe DB rows ─────────────────────

export interface NormalizedQuestion {
  question_order: number;
  question_text: string;
  question_type: "radio" | "calculator";
  options: { text: string; value: string; points: number; outcome?: string; emoji?: string; insight?: string }[];
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
    body: clip(b?.body, 700) || fallback.body,
    next_steps: (Array.isArray(b?.next_steps) ? b!.next_steps : [])
      .map((s) => clip(s, 200))
      .filter(Boolean)
      .slice(0, 3),
  };
}

// Tap questions shown as buttons in the studio chat.
export function normalizeTapQuestions(qs: unknown): TapQuestion[] {
  if (!Array.isArray(qs)) return [];
  return qs
    .slice(0, 4)
    .map((q: { question?: unknown; options?: unknown }) => ({
      question: clip(q?.question, 140),
      options: (Array.isArray(q?.options) ? q.options : [])
        .map((o: unknown) => clip(o, 48))
        .filter(Boolean)
        .slice(0, 4),
    }))
    .filter((q) => q.question && q.options.length >= 2);
}

// Returns either a normalized quiz or a list of problems to send back to Claude.
export function normalizeDraft(
  draft: DraftQuiz,
  calculatorJson?: string | null
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
  const topics: string[] = [];
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
      const emoji = clip(o.emoji, 16);
      const insight = clip(o.insight, 400);
      return [
        {
          text: optText,
          value,
          points,
          ...(outcome ? { outcome } : {}),
          ...(emoji ? { emoji } : {}),
          ...(insight ? { insight } : {}),
        },
      ];
    });
    if (options.length < 2) return;
    topics.push(clip(q.topic, 40) || text.slice(0, 40));
    questions.push({
      question_order: questions.length + 1,
      question_text: text,
      question_type: "radio",
      options,
      max_points: Math.max(...options.map((o) => o.points)),
      wtp_signal: !!q.wtp_signal,
    });
  });

  // Optional calculator: validated here, stored in builder_config, shown as question 1.
  let calculator: CalculatorConfig | null = null;
  const calcText = String(calculatorJson ?? "").trim();
  if (calcText) {
    let raw: unknown = null;
    try {
      raw = JSON.parse(calcText);
    } catch {
      errors.push('"calculator" must be a valid JSON string of the calculator settings, or "" for none.');
    }
    if (raw) {
      const calc = sanitizeCalculator(raw);
      if (calc.ok) calculator = calc.config;
      else errors.push(...calc.errors);
    }
  }

  if (questions.length < 3) errors.push("The quiz needs at least 3 valid multiple-choice questions.");
  const maxScore = questions.reduce((s, q) => s + q.max_points, 0) + (calculator ? CALCULATOR_MAX_POINTS : 0);
  if (maxScore <= 0) errors.push("At least one question must carry points (budget, timeline or readiness).");
  // WTP is the product's core: every quiz needs at least one scored money/readiness question.
  if (!questions.some((q) => q.wtp_signal && q.max_points > 0)) {
    errors.push("Add at least one willingness-to-pay question (wtp_signal true, with points), for example budget or how soon they want to buy.");
  }
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
  if (calculator) {
    questions.forEach((q) => (q.question_order += 1));
    questions.unshift({
      question_order: 1,
      question_text: calculator.title,
      question_type: "calculator",
      options: [],
      max_points: CALCULATOR_MAX_POINTS,
      wtp_signal: true,
    });
    topics.unshift(calculator.type === "loan" ? "Affordability" : "Payment plan");
  }
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
        topics,
        calculator,
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
  questions: {
    question_text: string;
    question_type?: string;
    wtp_signal?: boolean;
    options: { text: string; points: number; outcome?: string; emoji?: string; insight?: string }[];
  }[],
  color: string | null
): DraftQuiz {
  const c = quiz.builder_config;
  const withSteps = (b: BuilderBand): BuilderBand => ({ ...b, next_steps: b.next_steps || [] });
  // The calculator step (question 1) goes back as "calculator", not as a question.
  const hasCalc = questions.some((q) => q.question_type === "calculator");
  const offset = hasCalc ? 1 : 0;
  return {
    kind: c.kind,
    name: quiz.name,
    start_headline: quiz.start_headline || "",
    start_subheadline: quiz.start_subheadline || "",
    start_cta_text: quiz.start_cta_text || "",
    calculator: hasCalc && c.calculator ? JSON.stringify(c.calculator) : "",
    questions: questions.filter((q) => q.question_type !== "calculator").map((q, i) => ({
      topic: c.topics?.[i + offset] || "",
      question_text: q.question_text,
      wtp_signal: !!q.wtp_signal,
      options: q.options.map((o) => ({
        text: o.text,
        points: o.points,
        outcome_key: o.outcome || "",
        emoji: o.emoji || "",
        insight: o.insight || "",
      })),
    })),
    outcomes: c.outcomes,
    results: {
      hot: withSteps(c.results.HOT_LEAD),
      warm: withSteps(c.results.WARM_LEAD),
      cold: withSteps(c.results.COLD_LEAD),
      not_qualified: withSteps(c.results.NOT_QUALIFIED),
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
  "_next", "static", "public", "assets", "favicon.ico", "builder-activity", "track", "proof", "logo", "logos",
]);
