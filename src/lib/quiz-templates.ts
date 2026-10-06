// Quiz design templates for builder quizzes. A template sets the fonts,
// backgrounds, cards and buttons of the whole quiz (start, questions, contact,
// results). "classic" is the original LeadScoreAI look, driven by the brand
// colour; the others are curated palettes taken from the industry Reels.
// Stored per quiz in builder_config.template (missing = classic).

export type TemplateKey =
  | "classic"
  | "soft-luxe"
  | "heritage"
  | "noir"
  | "stone"
  | "horizon"
  | "grove"
  | "citrus"
  | "midnight";

export interface QuizTheme {
  key: TemplateKey;
  name: string;
  blurb: string; // one line for the studio picker
  fonts: string | null; // Google Fonts stylesheet, or null for the app font
  headFont: string; // font-family for headlines and questions
  bodyFont: string; // font-family for everything else
  headWeight: number | null; // null = the classic Tailwind weights
  dark: boolean;
  accent: string | null; // selection + progress; null = the org's brand colour
  button: string | null; // primary buttons; null = accent
  buttonInk: string;
  pill: boolean; // rounded-full buttons
  // Start screen (null startBg = classic brand-tinted gradient)
  startBg: string | null;
  startInk: string;
  startSub: string;
  startNote: string;
  eyebrow: string; // small caps labels
  // Pages
  pageBg: string;
  headerBg: string;
  headerInk: string;
  headerMuted: string;
  headerShadow: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  cardRadius: number;
  qSize: string; // question font size
  title: string; // headings
  text: string; // option and row text
  body: string;
  bodyStrong: string;
  muted: string;
  faint: string;
  line: string;
  optBg: string;
  optBorder: string;
  optRadius: number;
  optFill: boolean; // selected answer filled with the accent (vs tinted)
  track: string;
  backBg: string;
  backInk: string;
  inputBg: string;
  inputBorder: string;
  inputInk: string;
}

const INTER = "var(--font-inter)";

export const TEMPLATES: Record<TemplateKey, QuizTheme> = {
  // The original look, value for value.
  classic: {
    key: "classic",
    name: "Classic",
    blurb: "Clean and bold, in your brand colour",
    fonts: null,
    headFont: INTER,
    bodyFont: INTER,
    headWeight: null,
    dark: false,
    accent: null,
    button: null,
    buttonInk: "#ffffff",
    pill: false,
    startBg: null,
    startInk: "#ffffff",
    startSub: "#cbd5e1",
    startNote: "#94a3b8",
    eyebrow: "#64748b",
    pageBg: "linear-gradient(135deg, #f8f9fa 0%, #eef2f5 100%)",
    headerBg: "#ffffff",
    headerInk: "#1e293b",
    headerMuted: "#64748b",
    headerShadow: "0 1px 3px rgba(0,0,0,0.08)",
    cardBg: "#ffffff",
    cardBorder: "transparent",
    cardShadow: "0 4px 12px rgba(0,0,0,0.06)",
    cardRadius: 12,
    qSize: "clamp(21px, 4vw, 28px)",
    title: "#1a1a2e",
    text: "#1e293b",
    body: "#475569",
    bodyStrong: "#334155",
    muted: "#64748b",
    faint: "#94a3b8",
    line: "#f1f5f9",
    optBg: "#f8fafc",
    optBorder: "#e2e8f0",
    optRadius: 12,
    optFill: false,
    track: "#e2e8f0",
    backBg: "#e2e8f0",
    backInk: "#1e293b",
    inputBg: "#ffffff",
    inputBorder: "#cbd5e1",
    inputInk: "#1e293b",
  },
  // Skincare, beauty, spas, bridal, fashion, relationship coaching.
  "soft-luxe": {
    key: "soft-luxe",
    name: "Soft Luxe",
    blurb: "Warm nude and blush, elegant serif. Beauty, spas, bridal",
    fonts:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap",
    headFont: "'Cormorant Garamond', Georgia, serif",
    bodyFont: "'Hanken Grotesk', system-ui, sans-serif",
    headWeight: 600,
    dark: false,
    accent: "#5A3A2E",
    button: "#5A3A2E",
    buttonInk: "#ffffff",
    pill: true,
    startBg:
      "radial-gradient(circle at 85% 8%, rgba(235,200,188,.95), rgba(235,200,188,0) 55%), radial-gradient(circle at 8% 92%, rgba(184,146,90,.20), rgba(184,146,90,0) 50%), #F6ECE4",
    startInk: "#5A3A2E",
    startSub: "#8C7468",
    startNote: "#9C8578",
    eyebrow: "#B8925A",
    pageBg:
      "radial-gradient(circle at 90% 0%, rgba(235,200,188,.7), rgba(235,200,188,0) 45%), #F6ECE4",
    headerBg: "rgba(255,255,255,0.55)",
    headerInk: "#5A3A2E",
    headerMuted: "#8C7468",
    headerShadow: "0 1px 0 rgba(90,58,46,0.08)",
    cardBg: "#ffffff",
    cardBorder: "#F0E4DC",
    cardShadow: "0 30px 60px -34px rgba(90,58,46,0.45)",
    cardRadius: 28,
    qSize: "clamp(27px, 5vw, 38px)",
    title: "#5A3A2E",
    text: "#3A2A22",
    body: "#6E5A50",
    bodyStrong: "#4A3830",
    muted: "#8C7468",
    faint: "#B09A8E",
    line: "#F3E8E1",
    optBg: "#ffffff",
    optBorder: "#EADBD1",
    optRadius: 22,
    optFill: true,
    track: "#EADBD1",
    backBg: "#F1E4DA",
    backInk: "#5A3A2E",
    inputBg: "#ffffff",
    inputBorder: "#E2D2C7",
    inputInk: "#3A2A22",
  },
  // Study abroad, schools, law, finance, consulting, ministries.
  heritage: {
    key: "heritage",
    name: "Heritage",
    blurb: "Parchment and navy, classic serif. Education, finance, law",
    fonts:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,700&family=Work+Sans:wght@400;500;600;700&display=swap",
    headFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Work Sans', system-ui, sans-serif",
    headWeight: 700,
    dark: false,
    accent: "#13294B",
    button: "#9B1C31",
    buttonInk: "#ffffff",
    pill: true,
    startBg:
      "radial-gradient(circle at 88% 6%, rgba(195,154,78,.22), rgba(195,154,78,0) 50%), radial-gradient(circle at 6% 94%, rgba(39,71,122,.14), rgba(39,71,122,0) 50%), #F7F3EA",
    startInk: "#13294B",
    startSub: "#5D6B80",
    startNote: "#7A8699",
    eyebrow: "#9B1C31",
    pageBg: "radial-gradient(circle at 90% 0%, rgba(195,154,78,.16), rgba(195,154,78,0) 45%), #F7F3EA",
    headerBg: "#13294B",
    headerInk: "#ffffff",
    headerMuted: "#C9D2E3",
    headerShadow: "none",
    cardBg: "#FFFDF8",
    cardBorder: "#E6DECD",
    cardShadow: "0 24px 50px -30px rgba(19,41,75,0.35)",
    cardRadius: 16,
    qSize: "clamp(25px, 4.6vw, 34px)",
    title: "#13294B",
    text: "#13294B",
    body: "#4A5568",
    bodyStrong: "#2D3A4F",
    muted: "#5D6B80",
    faint: "#8C97A8",
    line: "#EFE8DA",
    optBg: "#ffffff",
    optBorder: "#E6DECD",
    optRadius: 14,
    optFill: true,
    track: "#E6DECD",
    backBg: "#EFE8DA",
    backInk: "#13294B",
    inputBg: "#ffffff",
    inputBorder: "#DDD3BF",
    inputInk: "#13294B",
  },
  // Hair and wigs, fashion, events, nightlife, fitness.
  noir: {
    key: "noir",
    name: "Noir Glam",
    blurb: "Black, hot pink and gold, fashion serif. Hair, fashion, events",
    fonts:
      "https://fonts.googleapis.com/css2?family=Gloock&family=Poppins:wght@400;500;600;700&display=swap",
    // Gloock: a bold fashion serif without Bodoni's hairlines, so it stays crisp on black.
    headFont: "'Gloock', Georgia, serif",
    bodyFont: "'Poppins', system-ui, sans-serif",
    headWeight: 400,
    dark: true,
    accent: "#FF4FA3",
    button: "#FF4FA3",
    buttonInk: "#ffffff",
    pill: true,
    startBg:
      "radial-gradient(circle at 88% 6%, rgba(255,79,163,.38), rgba(255,79,163,0) 52%), radial-gradient(circle at 6% 94%, rgba(232,194,122,.18), rgba(232,194,122,0) 50%), #140B10",
    startInk: "#ffffff",
    startSub: "#EADCE3",
    startNote: "#B9A2AE",
    eyebrow: "#F2CF8C",
    pageBg: "radial-gradient(circle at 90% 0%, rgba(255,79,163,.18), rgba(255,79,163,0) 45%), #120A0E",
    headerBg: "rgba(30,16,22,0.9)",
    headerInk: "#ffffff",
    headerMuted: "#C9AFBE",
    headerShadow: "0 1px 0 rgba(255,255,255,0.06)",
    cardBg: "#1E1016",
    cardBorder: "#3A2430",
    cardShadow: "0 30px 60px -30px rgba(255,79,163,0.35)",
    cardRadius: 24,
    qSize: "clamp(25px, 4.8vw, 36px)",
    title: "#ffffff",
    text: "#ffffff",
    body: "#E6D6DE",
    bodyStrong: "#F4EAEF",
    muted: "#CDB6C2",
    faint: "#A48C99",
    line: "#2E1822",
    optBg: "#221219",
    optBorder: "#3A2430",
    optRadius: 20,
    optFill: true,
    track: "#3A2430",
    backBg: "#2E1822",
    backInk: "#ffffff",
    inputBg: "#221219",
    inputBorder: "#3A2430",
    inputInk: "#ffffff",
  },
  // Real estate, interiors, solar, cars, B2B services.
  stone: {
    key: "stone",
    name: "Modern Stone",
    blurb: "Stone, charcoal and brass, architectural. Property, solar, B2B",
    fonts:
      "https://fonts.googleapis.com/css2?family=Marcellus&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap",
    headFont: "'Marcellus', Georgia, serif",
    bodyFont: "'DM Sans', system-ui, sans-serif",
    headWeight: 400,
    dark: false,
    accent: "#1C1C1E",
    button: "#A9814A",
    buttonInk: "#ffffff",
    pill: true,
    startBg:
      "radial-gradient(circle at 88% 6%, rgba(169,129,74,.26), rgba(169,129,74,0) 52%), radial-gradient(circle at 6% 94%, rgba(28,28,30,.08), rgba(28,28,30,0) 50%), #EDE8E0",
    startInk: "#1C1C1E",
    startSub: "#5A564F",
    startNote: "#8A857C",
    eyebrow: "#A9814A",
    pageBg: "radial-gradient(circle at 90% 0%, rgba(169,129,74,.16), rgba(169,129,74,0) 45%), #EDE8E0",
    headerBg: "#1C1C1E",
    headerInk: "#ffffff",
    headerMuted: "#BDB6AA",
    headerShadow: "none",
    cardBg: "#ffffff",
    cardBorder: "#E3DCD0",
    cardShadow: "0 24px 50px -30px rgba(28,28,30,0.35)",
    cardRadius: 20,
    qSize: "clamp(26px, 4.8vw, 36px)",
    title: "#1C1C1E",
    text: "#1C1C1E",
    body: "#5A564F",
    bodyStrong: "#3A3733",
    muted: "#6E6A63",
    faint: "#9A958C",
    line: "#EEE8DE",
    optBg: "#ffffff",
    optBorder: "#DDD5C8",
    optRadius: 16,
    optFill: true,
    track: "#DDD5C8",
    backBg: "#EEE8DE",
    backInk: "#1C1C1E",
    inputBg: "#ffffff",
    inputBorder: "#D8D0C2",
    inputInk: "#1C1C1E",
  },

  // Travel, tours, hotels, holidays, airlines, events abroad.
  horizon: {
    key: "horizon",
    name: "Horizon",
    blurb: "Sky blue, ocean and sunset coral. Travel, tours, hotels",
    fonts:
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Manrope:wght@400;500;600;700;800&display=swap",
    headFont: "'DM Serif Display', Georgia, serif",
    bodyFont: "'Manrope', system-ui, sans-serif",
    headWeight: 400,
    dark: false,
    accent: "#0E6E8C",
    button: "#F26B4F",
    buttonInk: "#ffffff",
    pill: true,
    startBg:
      "radial-gradient(circle at 88% 8%, rgba(247,178,138,.75), rgba(247,178,138,0) 50%), radial-gradient(circle at 6% 94%, rgba(124,198,224,.55), rgba(124,198,224,0) 52%), #EAF4F8",
    startInk: "#0B2A3A",
    startSub: "#3F5B69",
    startNote: "#5B7482",
    eyebrow: "#E0573B",
    pageBg: "radial-gradient(circle at 90% 0%, rgba(247,178,138,.45), rgba(247,178,138,0) 45%), #EAF4F8",
    headerBg: "#0B2A3A",
    headerInk: "#ffffff",
    headerMuted: "#B7D3DE",
    headerShadow: "none",
    cardBg: "#ffffff",
    cardBorder: "#D6E6EE",
    cardShadow: "0 30px 60px -34px rgba(11,42,58,0.4)",
    cardRadius: 26,
    qSize: "clamp(26px, 4.8vw, 36px)",
    title: "#0B2A3A",
    text: "#0B2A3A",
    body: "#3F5B69",
    bodyStrong: "#1F3D4C",
    muted: "#5B7482",
    faint: "#8AA2AE",
    line: "#E4EFF4",
    optBg: "#ffffff",
    optBorder: "#D6E6EE",
    optRadius: 18,
    optFill: true,
    track: "#D6E6EE",
    backBg: "#E1EEF3",
    backInk: "#0B2A3A",
    inputBg: "#ffffff",
    inputBorder: "#C9DCE5",
    inputInk: "#0B2A3A",
  },
  // Coaches, consultants, therapists, counsellors, wellness programmes.
  grove: {
    key: "grove",
    name: "Grove",
    blurb: "Cream, forest green and brass. Coaches, consultants, wellness",
    fonts:
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
    headFont: "'Fraunces', Georgia, serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    headWeight: 600,
    dark: false,
    accent: "#24473A",
    button: "#24473A",
    buttonInk: "#ffffff",
    pill: true,
    startBg:
      "radial-gradient(circle at 88% 8%, rgba(185,137,74,.28), rgba(185,137,74,0) 50%), radial-gradient(circle at 6% 94%, rgba(36,71,58,.14), rgba(36,71,58,0) 52%), #F5F1E8",
    startInk: "#1E3A2F",
    startSub: "#4D5F57",
    startNote: "#6B7A72",
    eyebrow: "#9A6F35",
    pageBg: "radial-gradient(circle at 90% 0%, rgba(185,137,74,.16), rgba(185,137,74,0) 45%), #F5F1E8",
    headerBg: "#24473A",
    headerInk: "#ffffff",
    headerMuted: "#C9D8D0",
    headerShadow: "none",
    cardBg: "#FFFDF8",
    cardBorder: "#E7E0D2",
    cardShadow: "0 24px 50px -30px rgba(36,71,58,0.35)",
    cardRadius: 20,
    qSize: "clamp(25px, 4.6vw, 34px)",
    title: "#1E3A2F",
    text: "#1E3A2F",
    body: "#4D5F57",
    bodyStrong: "#2F4A3F",
    muted: "#5F7068",
    faint: "#8E9A93",
    line: "#EEE8DB",
    optBg: "#ffffff",
    optBorder: "#E2DACB",
    optRadius: 16,
    optFill: true,
    track: "#E2DACB",
    backBg: "#EEE8DB",
    backInk: "#1E3A2F",
    inputBg: "#ffffff",
    inputBorder: "#D9D0BF",
    inputInk: "#1E3A2F",
  },
  // Food, restaurants, bakeries, retail, kids, gadgets: bright and friendly.
  citrus: {
    key: "citrus",
    name: "Citrus",
    blurb: "Bright, bold and friendly. Food, retail, shops, kids",
    fonts:
      "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
    headFont: "'Bricolage Grotesque', system-ui, sans-serif",
    bodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    headWeight: 800,
    dark: false,
    accent: "#1A1A1A",
    button: "#FF5A1F",
    buttonInk: "#ffffff",
    pill: true,
    startBg:
      "radial-gradient(circle at 88% 8%, rgba(255,196,0,.55), rgba(255,196,0,0) 48%), radial-gradient(circle at 6% 94%, rgba(255,90,31,.25), rgba(255,90,31,0) 50%), #FFF8EC",
    startInk: "#1A1A1A",
    startSub: "#4A4440",
    startNote: "#6E6660",
    eyebrow: "#E24A12",
    pageBg: "radial-gradient(circle at 90% 0%, rgba(255,196,0,.28), rgba(255,196,0,0) 45%), #FFF8EC",
    headerBg: "#1A1A1A",
    headerInk: "#ffffff",
    headerMuted: "#D6CFC6",
    headerShadow: "none",
    cardBg: "#ffffff",
    cardBorder: "#F1E6D3",
    cardShadow: "0 24px 50px -30px rgba(255,90,31,0.35)",
    cardRadius: 22,
    qSize: "clamp(24px, 4.6vw, 34px)",
    title: "#1A1A1A",
    text: "#1A1A1A",
    body: "#4A4440",
    bodyStrong: "#2C2724",
    muted: "#6E6660",
    faint: "#9A918A",
    line: "#F5ECDC",
    optBg: "#ffffff",
    optBorder: "#EFE2CC",
    optRadius: 16,
    optFill: true,
    track: "#EFE2CC",
    backBg: "#F5ECDC",
    backInk: "#1A1A1A",
    inputBg: "#ffffff",
    inputBorder: "#E6D7BE",
    inputInk: "#1A1A1A",
  },
  // Fintech, lending, tech, SaaS, crypto: crisp dark mode, high contrast.
  midnight: {
    key: "midnight",
    name: "Midnight",
    blurb: "Deep navy with electric blue, crisp and modern. Fintech, lending, tech",
    fonts:
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600;700&display=swap",
    headFont: "'Space Grotesk', system-ui, sans-serif",
    bodyFont: "'Inter', system-ui, sans-serif",
    headWeight: 700,
    dark: true,
    accent: "#5B8CFF",
    button: "#5B8CFF",
    buttonInk: "#ffffff",
    pill: false,
    startBg:
      "radial-gradient(circle at 88% 8%, rgba(91,140,255,.40), rgba(91,140,255,0) 50%), radial-gradient(circle at 6% 94%, rgba(52,211,153,.18), rgba(52,211,153,0) 50%), #0A1020",
    startInk: "#ffffff",
    startSub: "#D2DBEE",
    startNote: "#A3B0CA",
    eyebrow: "#7EE2B8",
    pageBg: "radial-gradient(circle at 90% 0%, rgba(91,140,255,.18), rgba(91,140,255,0) 45%), #0A1020",
    headerBg: "rgba(16,24,44,0.92)",
    headerInk: "#ffffff",
    headerMuted: "#B6C2DA",
    headerShadow: "0 1px 0 rgba(255,255,255,0.06)",
    cardBg: "#111A30",
    cardBorder: "#22304F",
    cardShadow: "0 30px 60px -30px rgba(91,140,255,0.35)",
    cardRadius: 18,
    qSize: "clamp(24px, 4.6vw, 34px)",
    title: "#ffffff",
    text: "#ffffff",
    body: "#D2DBEE",
    bodyStrong: "#EDF2FB",
    muted: "#B6C2DA",
    faint: "#8695B3",
    line: "#1B2742",
    optBg: "#15203A",
    optBorder: "#26365A",
    optRadius: 12,
    optFill: true,
    track: "#26365A",
    backBg: "#1B2742",
    backInk: "#ffffff",
    inputBg: "#15203A",
    inputBorder: "#2B3C63",
    inputInk: "#ffffff",
  },
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATES) as TemplateKey[];

export function isTemplateKey(v: unknown): v is TemplateKey {
  return typeof v === "string" && v in TEMPLATES;
}

export function themeFor(key: unknown): QuizTheme {
  return isTemplateKey(key) ? TEMPLATES[key] : TEMPLATES.classic;
}

// First-build default: pick the template that suits the business, from words
// in the scorecard answers, the quiz and the owner's first message.
const RULES: [TemplateKey, RegExp][] = [
  ["horizon", /\b(travel|tour|trip|holiday|vacation|hotel|resort|flight|airline|safari|getaway)/i],
  ["midnight", /\b(fintech|loan|lend|credit|microfinance|crypto|saas|software|startup|tech|app\b|payment|wallet)/i],
  ["grove", /\b(coach|consult|mentor|therap|counsel|wellness|mindset|life coach)/i],
  ["citrus", /\b(food|restaurant|catering|bakery|cake|snack|drink|juice|grocer|retail|shop|store|kids|toy|gadget|phone)/i],
  ["noir", /\b(hair|wig|weave|braid|lash|nail|fashion|boutique|cloth|event|party|club|lounge|fitness|gym|makeup|glam)/i],
  ["soft-luxe", /\b(skin|beauty|spa|salon|aesthetic|bridal|wedding|bride|perfume|fragrance|relationship|marriage|wellness|cosmetic|self[- ]care|dermat)/i],
  ["heritage", /\b(study|student|school|universit|admission|visa|scholar|education|tutor|exam|ielts|law|legal|finance|loan|invest|insurance|account|consult|church|ministry|faith|coach)/i],
  ["stone", /\b(real estate|property|propert|home|house|land|apartment|rent|interior|architect|solar|inverter|energy|car|auto|logistic|b2b|construction|furniture)/i],
];

// Texts are tried in order (most specific first), so the quiz's own words win
// over the business name: a "Glow Skincare" account building a study-abroad
// quiz gets Heritage, not Soft Luxe.
export function pickTemplate(...texts: string[]): TemplateKey {
  for (const text of texts) {
    if (!text) continue;
    for (const [key, re] of RULES) if (re.test(text)) return key;
  }
  return "classic";
}
