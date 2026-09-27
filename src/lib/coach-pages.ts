// Coaches & consultants: one hub (/build/coaches) plus a page per branch
// (/build/coaches/<branch>), each speaking only to its own audience. Same
// landing template as the industry pages. Add a branch by adding an entry.
import type { IndustryPage } from "./builder-industries";

export interface CoachBranch {
  key: string; // /build/coaches/<key>
  group: "coach" | "consultant";
  label: string; // chip + tab label
  emoji: string;
  eyebrow: string;
  business: string; // "…in your <business>?"
  promise?: string; // defaults to PROMISE
  headline?: string; // full override (e.g. faith & ministry)
  sub: string;
  demo: IndustryPage["demo"];
  examples: { emoji: string; text: string }[];
  starter: string;
  namePlaceholder: string;
  latseminary?: boolean; // show the Latseminary case study
}

const PROMISE = "Let our quiz find clients ready to pay.";

export const COACH_BRANCHES: CoachBranch[] = [
  // ── Coaches ──
  {
    key: "fitness",
    group: "coach",
    label: "Fitness",
    emoji: "🏋️",
    eyebrow: "For fitness coaches & personal trainers",
    business: "fitness coaching business",
    promise: "Let our quiz find clients ready to commit.",
    sub: "A quick fitness quiz asks about their goal, budget and how soon they want to start, so you only talk to people ready to train.",
    demo: {
      brand: "Iron Body Fitness",
      question: "How soon do you want to see results?",
      options: [
        { emoji: "⚡", text: "In the next 4 weeks" },
        { emoji: "📅", text: "In 2 to 3 months" },
        { emoji: "🗓️", text: "Sometime this year" },
        { emoji: "🤔", text: "Just curious" },
      ],
    },
    examples: [
      { emoji: "🏋️", text: "Which training plan fits your goal?" },
      { emoji: "💪", text: "Are you ready for 1:1 coaching?" },
      { emoji: "🧱", text: "What's holding back your fitness?" },
      { emoji: "📆", text: "Find your perfect workout routine" },
    ],
    starter:
      "I'm a fitness coach. I want a quiz that matches people to the right programme and shows me who is ready to pay for coaching now.",
    namePlaceholder: "Iron Body Fitness Lagos",
  },
  {
    key: "sales",
    group: "coach",
    label: "Sales",
    emoji: "📈",
    eyebrow: "For sales coaches & trainers",
    business: "sales coaching business",
    sub: "A short quiz checks team size, targets and training budget before anyone books a discovery call with you.",
    demo: {
      brand: "Closers Academy",
      question: "How big is your sales team?",
      options: [
        { emoji: "👥", text: "Over 20 people" },
        { emoji: "👤", text: "5 to 20 people" },
        { emoji: "🧍", text: "Under 5 people" },
        { emoji: "🙋", text: "Just me" },
      ],
    },
    examples: [
      { emoji: "📈", text: "How strong is your sales process?" },
      { emoji: "🎯", text: "Is your team hitting target?" },
      { emoji: "🤝", text: "Rate your closing skills" },
      { emoji: "🧭", text: "Which sales training fits your team?" },
    ],
    starter:
      "I coach sales teams. I want a quiz that grades a company's sales process and shows me which ones have the team size and budget for training.",
    namePlaceholder: "Closers Academy",
  },
  {
    key: "relationship",
    group: "coach",
    label: "Relationship",
    emoji: "💞",
    eyebrow: "For relationship & marriage coaches",
    business: "relationship coaching business",
    sub: "A caring quiz helps people see where their relationship stands, then invites the ones ready for help to your session, course or webinar.",
    demo: {
      brand: "Better Together",
      question: "How would you rate communication in your relationship?",
      options: [
        { emoji: "💬", text: "We talk about everything" },
        { emoji: "🙂", text: "Mostly good" },
        { emoji: "😶", text: "We avoid hard topics" },
        { emoji: "💔", text: "It's a struggle" },
      ],
    },
    examples: [
      { emoji: "💬", text: "Rate your communication skills in your relationships" },
      { emoji: "💍", text: "Are you ready for marriage?" },
      { emoji: "❤️", text: "What's your love language?" },
      { emoji: "🌡️", text: "How healthy is your relationship?" },
    ],
    starter:
      "I'm a relationship coach. I want a quiz that rates people's communication in their relationship and invites the ones who need help to my webinar.",
    namePlaceholder: "Better Together Coaching",
    latseminary: true,
  },
  {
    key: "life",
    group: "coach",
    label: "Life",
    emoji: "🌱",
    eyebrow: "For life coaches",
    business: "life coaching business",
    sub: "A short quiz shows people what's holding them back and who is ready to invest in changing it, before your first call.",
    demo: {
      brand: "Next Chapter Coaching",
      question: "Which area of your life do you most want to change?",
      options: [
        { emoji: "💼", text: "My career" },
        { emoji: "💰", text: "My money" },
        { emoji: "❤️", text: "My relationships" },
        { emoji: "🧠", text: "My confidence" },
      ],
    },
    examples: [
      { emoji: "🧠", text: "What's holding you back?" },
      { emoji: "🌱", text: "Are you ready for a life coach?" },
      { emoji: "🧭", text: "Discover your next step" },
      { emoji: "✨", text: "What's your purpose score?" },
    ],
    starter:
      "I'm a life coach. I want a quiz that shows people what's holding them back and tells me who is ready to pay for coaching.",
    namePlaceholder: "Next Chapter Coaching",
  },
  {
    key: "business",
    group: "coach",
    label: "Business",
    emoji: "🚀",
    eyebrow: "For business coaches",
    business: "business coaching practice",
    sub: "A quick quiz checks their revenue, biggest bottleneck and budget, so your calls are with owners ready to grow.",
    demo: {
      brand: "Scale Up Coaching",
      question: "What's your business's monthly revenue?",
      options: [
        { emoji: "💎", text: "Over ₦10m" },
        { emoji: "📈", text: "₦2m to ₦10m" },
        { emoji: "🌱", text: "Under ₦2m" },
        { emoji: "🔎", text: "Not making money yet" },
      ],
    },
    examples: [
      { emoji: "🚀", text: "Is your business ready to scale?" },
      { emoji: "🧱", text: "What's your biggest growth bottleneck?" },
      { emoji: "⚙️", text: "Rate your business systems" },
      { emoji: "🧭", text: "Which coaching programme fits you?" },
    ],
    starter:
      "I coach small business owners. I want a quiz that finds their biggest growth problem and shows me who has the revenue to pay for coaching.",
    namePlaceholder: "Scale Up Coaching",
  },
  {
    key: "career",
    group: "coach",
    label: "Career",
    emoji: "🎯",
    eyebrow: "For career coaches",
    business: "career coaching business",
    sub: "A short quiz finds where each person is in their career and who is ready to invest in their next move.",
    demo: {
      brand: "CareerLift",
      question: "Where are you in your career right now?",
      options: [
        { emoji: "🚀", text: "Ready for a promotion" },
        { emoji: "🔄", text: "Switching careers" },
        { emoji: "🎓", text: "Just graduated" },
        { emoji: "😓", text: "Stuck in my job" },
      ],
    },
    examples: [
      { emoji: "📄", text: "Is your CV getting you interviews?" },
      { emoji: "🧭", text: "Which career path fits you?" },
      { emoji: "🔄", text: "Are you ready for a job switch?" },
      { emoji: "💼", text: "How strong is your LinkedIn?" },
    ],
    starter:
      "I'm a career coach. I want a quiz that shows people where they're stuck in their career and tells me who is ready to pay for coaching.",
    namePlaceholder: "CareerLift Coaching",
  },
  {
    key: "health-nutrition",
    group: "coach",
    label: "Health & nutrition",
    emoji: "🥗",
    eyebrow: "For nutrition & health coaches",
    business: "health coaching business",
    promise: "Let our quiz find clients ready to commit.",
    sub: "A friendly quiz points each person to the right plan, with a clear note that it's a guide, and shows you who is ready to start.",
    demo: {
      brand: "Nourish Well",
      question: "What's your main health goal?",
      options: [
        { emoji: "⚖️", text: "Lose weight" },
        { emoji: "💪", text: "Build strength" },
        { emoji: "🩺", text: "Manage a condition" },
        { emoji: "🍽️", text: "Eat healthier" },
      ],
    },
    examples: [
      { emoji: "🥗", text: "Which meal plan fits you?" },
      { emoji: "🍎", text: "How healthy are your eating habits?" },
      { emoji: "🔄", text: "Are you ready for a 30-day reset?" },
      { emoji: "⚡", text: "What's your energy score?" },
    ],
    starter:
      "I'm a nutrition coach. I want a quiz that points people to the right meal plan and shows me who is ready to pay for coaching.",
    namePlaceholder: "Nourish Well Coaching",
  },
  {
    key: "faith-ministry",
    group: "coach",
    label: "Faith & ministry",
    emoji: "⛪",
    eyebrow: "For pastors, churches & ministries",
    business: "ministry",
    headline: "Tired of empty seats at your programmes and webinars?",
    promise: "Let our quiz find people ready to join.",
    sub: "A thoughtful quiz on marriage, relationships or purpose gives each person a personal report, then invites them to your programme, webinar or community.",
    demo: {
      brand: "Grace Life Ministry",
      question: "How would you rate communication in your marriage?",
      options: [
        { emoji: "💬", text: "We talk about everything" },
        { emoji: "🙂", text: "Mostly good" },
        { emoji: "😶", text: "We avoid hard topics" },
        { emoji: "🙏", text: "We need help" },
      ],
    },
    examples: [
      { emoji: "💬", text: "Rate your communication skills in your relationships" },
      { emoji: "💍", text: "Are you ready for marriage?" },
      { emoji: "✨", text: "Discover your spiritual gifts" },
      { emoji: "📖", text: "Which programme is right for you?" },
    ],
    starter:
      "I run a ministry. I want a quiz that helps people rate communication in their marriage and invites them to our webinar and community.",
    namePlaceholder: "Grace Life Ministry",
    latseminary: true,
  },
  // ── Consultants ──
  {
    key: "business-strategy",
    group: "consultant",
    label: "Business & strategy",
    emoji: "🧭",
    eyebrow: "For business & strategy consultants",
    business: "consulting business",
    sub: "A short assessment checks company size, the problem they need solved and their budget, before you spend an hour on a proposal.",
    demo: {
      brand: "Summit Advisory",
      question: "What's your company's yearly revenue?",
      options: [
        { emoji: "🏢", text: "Over ₦500m" },
        { emoji: "📈", text: "₦100m to ₦500m" },
        { emoji: "🌱", text: "Under ₦100m" },
        { emoji: "🔎", text: "Just starting" },
      ],
    },
    examples: [
      { emoji: "📊", text: "How ready is your business to grow?" },
      { emoji: "⚙️", text: "Rate your operations" },
      { emoji: "💼", text: "Is your business investor ready?" },
      { emoji: "💸", text: "Where is your business losing money?" },
    ],
    starter:
      "I'm a business consultant. I want an assessment that finds a company's biggest problem and shows me which ones have the budget to hire me.",
    namePlaceholder: "Summit Advisory",
  },
  {
    key: "marketing",
    group: "consultant",
    label: "Marketing",
    emoji: "📣",
    eyebrow: "For marketing consultants & agencies",
    business: "marketing business",
    sub: "A quick marketing grader shows each business where they're losing customers and tells you who has the budget to fix it.",
    demo: {
      brand: "Brightline Marketing",
      question: "What's your monthly marketing budget?",
      options: [
        { emoji: "💰", text: "Over ₦2m" },
        { emoji: "📊", text: "₦500k to ₦2m" },
        { emoji: "🌱", text: "Under ₦500k" },
        { emoji: "🤷", text: "No budget yet" },
      ],
    },
    examples: [
      { emoji: "📣", text: "Grade your marketing" },
      { emoji: "🌐", text: "Is your website losing customers?" },
      { emoji: "📲", text: "Which marketing channel fits you?" },
      { emoji: "🎯", text: "Are you ready to run ads?" },
    ],
    starter:
      "I run a marketing agency. I want a quiz that grades a business's marketing and shows me who has the budget to hire us.",
    namePlaceholder: "Brightline Marketing",
  },
  {
    key: "hr",
    group: "consultant",
    label: "HR",
    emoji: "👥",
    eyebrow: "For HR consultants",
    business: "HR consulting business",
    sub: "A short HR check shows each company its gaps in hiring, compliance and retention, and tells you who is ready to hire help.",
    demo: {
      brand: "PeopleFirst HR",
      question: "How many staff do you have?",
      options: [
        { emoji: "🏢", text: "Over 100" },
        { emoji: "👥", text: "20 to 100" },
        { emoji: "🧍", text: "Under 20" },
        { emoji: "🙋", text: "Hiring my first" },
      ],
    },
    examples: [
      { emoji: "📋", text: "Is your HR compliant?" },
      { emoji: "🧲", text: "Rate your hiring process" },
      { emoji: "🚪", text: "Are you losing good staff?" },
      { emoji: "🧭", text: "Which HR service do you need?" },
    ],
    starter:
      "I'm an HR consultant. I want a quiz that checks a company's HR gaps and shows me which ones are ready to pay for HR support.",
    namePlaceholder: "PeopleFirst HR",
  },
  {
    key: "tax-accounting",
    group: "consultant",
    label: "Tax & accounting",
    emoji: "🧾",
    eyebrow: "For accountants & tax consultants",
    business: "accounting practice",
    sub: "A quick check shows each business how healthy their books and tax are, and tells you who needs an accountant now.",
    demo: {
      brand: "ClearBooks Accounting",
      question: "How do you keep your books today?",
      options: [
        { emoji: "📒", text: "Notebook or Excel" },
        { emoji: "💻", text: "Accounting software" },
        { emoji: "🧑‍💼", text: "I have an accountant" },
        { emoji: "😅", text: "I don't" },
      ],
    },
    examples: [
      { emoji: "🧾", text: "Is your business tax ready?" },
      { emoji: "💸", text: "Are you paying too much tax?" },
      { emoji: "📚", text: "How healthy are your books?" },
      { emoji: "🧑‍💼", text: "Do you need an accountant?" },
    ],
    starter:
      "I'm an accountant. I want a quiz that checks how healthy a small business's books and tax are and shows me who is ready to hire me.",
    namePlaceholder: "ClearBooks Accounting",
  },
  {
    key: "immigration",
    group: "consultant",
    label: "Immigration",
    emoji: "✈️",
    eyebrow: "For immigration & visa consultants",
    business: "immigration consulting business",
    sub: "A 2-minute eligibility check asks about their route, funds and timeline, so you spend consultations on people ready to apply.",
    demo: {
      brand: "Global Route Consult",
      question: "How soon do you want to relocate?",
      options: [
        { emoji: "⚡", text: "Within 6 months" },
        { emoji: "📅", text: "This year" },
        { emoji: "🗓️", text: "Next year" },
        { emoji: "🤔", text: "Just exploring" },
      ],
    },
    examples: [
      { emoji: "🇬🇧", text: "Are you eligible for a UK visa?" },
      { emoji: "🧭", text: "Which visa route fits you?" },
      { emoji: "💷", text: "Can you afford to relocate?" },
      { emoji: "📝", text: "Is your application ready?" },
    ],
    starter:
      "I'm an immigration consultant. I want an eligibility quiz that shows people which visa route fits them and tells me who has the funds to apply now.",
    namePlaceholder: "Global Route Consult",
  },
  {
    key: "it-tech",
    group: "consultant",
    label: "IT & tech",
    emoji: "💻",
    eyebrow: "For IT & tech consultants",
    business: "tech consulting business",
    sub: "A quick tech check shows each business where it's exposed or slowed down, and tells you who has the budget for a project.",
    demo: {
      brand: "Stackwise Tech",
      question: "What does your business need most?",
      options: [
        { emoji: "🌐", text: "A new website or app" },
        { emoji: "☁️", text: "Cloud and systems" },
        { emoji: "🔒", text: "Cybersecurity" },
        { emoji: "🤖", text: "Automation and AI" },
      ],
    },
    examples: [
      { emoji: "🔒", text: "How secure is your business?" },
      { emoji: "🐢", text: "Is your tech slowing you down?" },
      { emoji: "🤖", text: "Are you ready for AI?" },
      { emoji: "🧭", text: "Which tech solution fits you?" },
    ],
    starter:
      "I'm an IT consultant. I want a quiz that checks a business's tech needs and shows me who has the budget for a project.",
    namePlaceholder: "Stackwise Tech",
  },
];

export const COACH_HUB: IndustryPage = {
  slug: "coaches",
  eyebrow: "For coaches & consultants",
  headline: "Tired of unserious enquiries in your coaching or consulting business?",
  highlight: PROMISE,
  sub: "Give every enquiry a short quiz before the call. You see their goal, budget and how soon they want to start, scored so you talk to the serious ones first.",
  examples: [
    { emoji: "💬", text: "Rate your communication skills in your relationships" },
    { emoji: "🚀", text: "Is your business ready to scale?" },
    { emoji: "🏋️", text: "Which training plan fits your goal?" },
    { emoji: "🇬🇧", text: "Are you eligible for a UK visa?" },
  ],
  starter:
    "I'm a coach. I want a quiz that qualifies people before a discovery call and shows me who is ready to pay.",
  namePlaceholder: "Your coaching business",
  demo: {
    brand: "Your Coaching",
    question: "How much are you ready to invest to reach your goal?",
    options: [
      { emoji: "💎", text: "Over ₦1m" },
      { emoji: "💼", text: "₦300k to ₦1m" },
      { emoji: "🌱", text: "Under ₦300k" },
      { emoji: "🤔", text: "Not sure yet" },
    ],
  },
};

// A branch as a full landing page.
export function coachBranchPage(b: CoachBranch): IndustryPage {
  return {
    slug: `coaches/${b.key}`,
    eyebrow: b.eyebrow,
    headline: b.headline ?? `Tired of unserious enquiries in your ${b.business}?`,
    highlight: b.promise ?? PROMISE,
    sub: b.sub,
    examples: b.examples,
    starter: b.starter,
    namePlaceholder: b.namePlaceholder,
    demo: b.demo,
  };
}

export function getCoachBranch(key: string): CoachBranch | undefined {
  return COACH_BRANCHES.find((b) => b.key === key);
}

// Pages that carry the Latseminary case study.
export function showsLatseminary(slug: string): boolean {
  if (slug === "" || slug === "coaches") return true;
  const b = slug.startsWith("coaches/") ? getCoachBranch(slug.slice(8)) : undefined;
  return !!b?.latseminary;
}
