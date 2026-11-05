// The three master solar scorecards an installer picks from at sign-up.
// Client-safe: the picker shows the questions, and the server builds the rows.
//
// The points stay server-side in practice: the picker only ever renders
// `preview()` (question and option text), never `rows()` (the scoring recipe is
// not shown to customers).
import { AREAS } from "./press-play-config";

export interface CompanyDetails {
  companyName: string;
  products: string[];
  cities: string[]; // AREAS slugs
  minJobNaira: number; // 0 = no minimum
  whatsapp?: string | null; // digits with country code, for the results button
}

export const PRODUCT_OPTIONS = [
  "Home solar systems",
  "Inverters and batteries",
  "Solar panels",
  "Commercial and industrial solar",
  "Solar street lights",
  "Solar water pumps",
  "Maintenance and repairs",
] as const;

export const MIN_JOB_OPTIONS = [0, 500_000, 1_000_000, 2_000_000, 5_000_000] as const;

type Option = { text: string; points: number };
type Question = { text: string; options: Option[]; wtp: boolean };
type Key = "need" | "city" | "property" | "fuel" | "budget" | "timeline" | "payment" | "decision";

function questions(c: CompanyDetails): Record<Key, Question> {
  const cityNames = AREAS.filter((a) => c.cities.includes(a.slug)).map((a) => a.name);
  const budgets: { text: string; top: number; points: number }[] = [
    { text: "Over ₦5 million", top: Infinity, points: 100 },
    { text: "₦2 million to ₦5 million", top: 5_000_000, points: 80 },
    { text: "₦1 million to ₦2 million", top: 2_000_000, points: 45 },
    { text: "Under ₦1 million", top: 1_000_000, points: 15 },
  ];
  return {
    need: {
      text: "What do you need?",
      options: [...(c.products.length ? c.products : ["Home solar systems"]), "Not sure, I need advice"].map((t) => ({ text: t, points: 0 })),
      wtp: false,
    },
    city: {
      text: "Where do you need it installed?",
      options: [...cityNames.map((t) => ({ text: t, points: 100 })), { text: "Somewhere else in Nigeria", points: 0 }],
      wtp: false,
    },
    property: {
      text: "What kind of property is it?",
      options: [
        { text: "A house I own", points: 100 },
        { text: "A shop or office I own", points: 100 },
        { text: "A house I rent", points: 35 },
        { text: "A shop or office I rent", points: 35 },
      ],
      wtp: false,
    },
    fuel: {
      text: "How much do you spend on fuel for your generator each month?",
      options: [
        { text: "Over ₦150,000", points: 100 },
        { text: "₦50,000 to ₦150,000", points: 70 },
        { text: "Under ₦50,000", points: 25 },
        { text: "I don't use a generator", points: 0 },
      ],
      wtp: true,
    },
    budget: {
      text: "What budget do you have in mind?",
      options: [
        // A band entirely under the installer's minimum job scores nothing.
        ...budgets.map((b) => ({ text: b.text, points: c.minJobNaira && b.top <= c.minJobNaira ? 0 : b.points })),
        { text: "Not sure yet", points: 10 },
      ],
      wtp: true,
    },
    timeline: {
      text: "When do you want it installed?",
      options: [
        { text: "This month", points: 100 },
        { text: "In 1 to 3 months", points: 60 },
        { text: "Later this year", points: 20 },
        { text: "I'm just checking prices", points: 0 },
      ],
      wtp: true,
    },
    payment: {
      text: "How would you like to pay?",
      options: [
        { text: "Pay in full", points: 100 },
        { text: "Part now, the rest in instalments", points: 75 },
        { text: "Instalments only", points: 35 },
      ],
      wtp: true,
    },
    decision: {
      text: "Who makes the final decision?",
      options: [
        { text: "I do", points: 100 },
        { text: "Me and someone else", points: 60 },
        { text: "Someone else", points: 0 },
      ],
      wtp: false,
    },
  };
}

// Each version: the questions in order, with how much of the 100 each one is worth.
const TEMPLATES = [
  {
    id: "quick",
    name: "Quick check",
    description: "Six short questions. More people finish it.",
    headline: (n: string) => `Get a solar quote from ${n}`,
    sub: "Six quick questions so we can recommend the right setup for you.",
    weights: [["need", 0], ["city", 20], ["property", 15], ["fuel", 20], ["budget", 25], ["timeline", 20]] as [Key, number][],
  },
  {
    id: "savings",
    name: "Savings first",
    description: "Opens with their fuel spend, so buyers see what solar could save them.",
    recommended: true,
    headline: (n: string) => `How much could you save with solar? ${n} will tell you`,
    sub: "Tell us about your power costs and we'll match you to the right system.",
    weights: [["fuel", 25], ["need", 0], ["property", 15], ["city", 15], ["budget", 25], ["timeline", 20]] as [Key, number][],
  },
  {
    id: "serious",
    name: "Serious buyers",
    description: "Adds how they'll pay and who decides. Fewer leads, readier to buy.",
    headline: (n: string) => `Ready for solar? Check your fit with ${n}`,
    sub: "A few questions so our team can prepare a quote that fits your budget.",
    weights: [["need", 0], ["city", 15], ["property", 10], ["fuel", 15], ["budget", 25], ["timeline", 15], ["payment", 10], ["decision", 10]] as [Key, number][],
  },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];
export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id) as TemplateId[];

// What the installer sees in the picker: names and questions, no points.
export function preview(c: CompanyDetails) {
  const q = questions(c);
  return TEMPLATES.map((t) => ({
    id: t.id as TemplateId,
    name: t.name,
    description: t.description,
    recommended: "recommended" in t && t.recommended === true,
    headline: t.headline(c.companyName || "us"),
    questions: t.weights.map(([k]) => ({ text: q[k].text, options: q[k].options.map((o) => o.text) })),
  }));
}

// The quiz and question rows to save. Points per option are the question's weight
// times the option's share, so a perfect lead scores exactly 100.
export function build(c: CompanyDetails, id: TemplateId) {
  const t = TEMPLATES.find((x) => x.id === id) ?? TEMPLATES[1];
  const q = questions(c);
  const questionRows = t.weights.map(([k, weight], i) => {
    const options = q[k].options.map((o, j) => ({ text: o.text, value: j + 1, points: Math.round((weight * o.points) / 100) }));
    return {
      question_order: i + 1,
      question_text: q[k].text,
      question_type: "radio",
      options,
      max_points: Math.max(0, ...options.map((o) => o.points)),
      is_required: true,
      wtp_signal: q[k].wtp,
    };
  });
  return {
    quiz: {
      name: `${c.companyName} solar quote`,
      start_headline: t.headline(c.companyName),
      start_subheadline: t.sub,
      start_cta_text: "Get my solar quote",
      max_score: questionRows.reduce((s, r) => s + r.max_points, 0),
      result_mode: "lead",
      collect_company: false,
      cta_url: c.whatsapp ? `https://wa.me/${c.whatsapp}` : null,
      is_active: true,
    },
    questions: questionRows,
  };
}
