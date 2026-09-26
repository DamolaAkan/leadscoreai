// One landing page per industry (/build/<slug>), like techimmigrate's
// per-profession guides. Same page template; only this copy changes. Add an
// industry by adding an entry here.

export interface IndustryPage {
  slug: string;
  eyebrow: string;
  headline: string;
  highlight: string;
  sub: string;
  examples: { emoji: string; text: string }[];
  starter: string; // pre-fills the first chat message after sign-up
  namePlaceholder: string;
  // The sample quiz shown in the hero phone.
  demo: { brand: string; question: string; options: { emoji: string; text: string }[] };
}

export const DEFAULT_PAGE: IndustryPage = {
  slug: "",
  eyebrow: "",
  headline: "One chat. A quiz that finds your buyers.",
  highlight: "Skincare, travel, study abroad.",
  sub: "Describe your business in plain words. We build the questions, the results page and a WhatsApp link, so every customer tells you what they need, and whether they're ready to pay, before you reply.",
  examples: [
    { emoji: "🎓", text: "Are you eligible to study in the UK?" },
    { emoji: "✨", text: "Which skincare routine fits your skin?" },
    { emoji: "🌍", text: "Which holiday package suits you?" },
    { emoji: "☀️", text: "Can your home afford solar?" },
  ],
  starter: "",
  namePlaceholder: "Glow Skincare Lagos",
  demo: {
    brand: "Glow Skincare",
    question: "How does your skin feel by midday?",
    options: [
      { emoji: "💧", text: "Tight and dry" },
      { emoji: "✨", text: "Shiny all over" },
      { emoji: "🌗", text: "Oily T-zone only" },
      { emoji: "🌸", text: "Comfortable" },
    ],
  },
};

export const INDUSTRY_PAGES: IndustryPage[] = [
  {
    slug: "study-abroad",
    eyebrow: "For study-abroad & education consultants",
    headline: "Know which students are ready",
    highlight: "before you call them.",
    sub: "Give students a 2-minute eligibility check. They see where they stand; you get every enquiry scored Hot, Warm or Cold with their grades, English test, funding and start date. Share it on WhatsApp or embed it on your website.",
    examples: [
      { emoji: "🇬🇧", text: "Are you eligible to study in the UK?" },
      { emoji: "🇨🇦", text: "Which Canadian program fits you?" },
      { emoji: "💷", text: "Can you afford to study abroad?" },
      { emoji: "📝", text: "Is your application ready to submit?" },
    ],
    starter:
      "I run a study-abroad agency. I want a quiz that tells students if they're eligible to study in the UK, and shows me who has the grades, English test and funding to apply now.",
    namePlaceholder: "BrightPath Education Lagos",
    demo: {
      brand: "BrightPath Education",
      question: "What's your highest qualification so far?",
      options: [
        { emoji: "🎓", text: "First class / 2:1 degree" },
        { emoji: "📘", text: "2:2 degree" },
        { emoji: "📝", text: "HND or OND" },
        { emoji: "🏫", text: "WAEC / A-levels" },
      ],
    },
  },
  {
    slug: "skincare",
    eyebrow: "For skincare & beauty brands",
    headline: "Recommend the right products",
    highlight: "to every customer.",
    sub: "A fun skin quiz that matches each customer to the right routine, then sends them to you on WhatsApp ready to buy. You see every result and who's ready to spend.",
    examples: [
      { emoji: "✨", text: "Which skincare routine fits your skin?" },
      { emoji: "🧴", text: "What's your real skin type?" },
      { emoji: "💧", text: "Which serum is right for you?" },
      { emoji: "🌸", text: "Find your perfect glow kit" },
    ],
    starter:
      "I sell skincare. I want a quiz that recommends the right routine or product bundle for each customer's skin, and tells me who is ready to buy.",
    namePlaceholder: "Glow Skincare Lagos",
    demo: {
      brand: "Glow Skincare",
      question: "How does your skin feel by midday?",
      options: [
        { emoji: "💧", text: "Tight and dry" },
        { emoji: "✨", text: "Shiny all over" },
        { emoji: "🌗", text: "Oily T-zone only" },
        { emoji: "🌸", text: "Comfortable" },
      ],
    },
  },
  {
    slug: "travel",
    eyebrow: "For travel consultants & agencies",
    headline: "Match every traveller",
    highlight: "to the right package.",
    sub: "Let people discover their ideal trip in 2 minutes. They get a personal recommendation; you get their budget, dates and who's ready to book, straight to your dashboard.",
    examples: [
      { emoji: "🌍", text: "Which holiday package suits you?" },
      { emoji: "🏝️", text: "Beach, city or safari: what's your travel style?" },
      { emoji: "✈️", text: "Where should you go this December?" },
      { emoji: "💍", text: "Plan your dream honeymoon" },
    ],
    starter:
      "I'm a travel consultant. I want a fun quiz that matches people to the right holiday package and shows me who has the budget and dates to book soon.",
    namePlaceholder: "Wanderlust Travels Accra",
    demo: {
      brand: "Wanderlust Travels",
      question: "Your perfect December looks like…",
      options: [
        { emoji: "🏝️", text: "Beach and sunsets" },
        { emoji: "🏙️", text: "City lights and shopping" },
        { emoji: "🦁", text: "Safari adventure" },
        { emoji: "🏡", text: "Home with family" },
      ],
    },
  },
  {
    slug: "solar",
    eyebrow: "For solar installers",
    headline: "Stop visiting homes",
    highlight: "that can't afford solar.",
    sub: "A 2-minute check that tells you which homes and businesses can actually afford a system before you send anyone out. Every lead scored Hot, Warm or Cold with their budget and power needs.",
    examples: [
      { emoji: "☀️", text: "Can your home afford solar?" },
      { emoji: "🔋", text: "What size system do you need?" },
      { emoji: "⚡", text: "How much could you save on power?" },
      { emoji: "🏢", text: "Is your business ready for solar?" },
    ],
    starter:
      "I install solar. I want to find out which homes can actually afford a system before I visit, including their budget, power needs and how soon they want to install.",
    namePlaceholder: "SunPower Solutions Abuja",
    demo: {
      brand: "SunPower Solutions",
      question: "How much do you spend on fuel each month?",
      options: [
        { emoji: "⛽", text: "Over ₦150,000" },
        { emoji: "🔋", text: "₦50,000 to ₦150,000" },
        { emoji: "💡", text: "Under ₦50,000" },
        { emoji: "🤷", text: "Not sure" },
      ],
    },
  },
  {
    slug: "real-estate",
    eyebrow: "For real estate agents & developers",
    headline: "Find serious buyers",
    highlight: "before the viewing.",
    sub: "A quick quiz that shows which buyers and renters have the budget, timeline and documents to move now, so your team spends time on the ones who will close.",
    examples: [
      { emoji: "🏠", text: "Are you ready to buy a home?" },
      { emoji: "📍", text: "Which neighbourhood suits you?" },
      { emoji: "🔑", text: "Can you afford this property?" },
      { emoji: "🏗️", text: "Which of our developments fits you?" },
    ],
    starter:
      "I'm a real estate agent. I want a quiz that shows which buyers have the budget, financing and timeline to buy soon, before I book viewings.",
    namePlaceholder: "Prime Homes Lekki",
    demo: {
      brand: "Prime Homes",
      question: "When do you want to move in?",
      options: [
        { emoji: "🔑", text: "Within 3 months" },
        { emoji: "📅", text: "3 to 6 months" },
        { emoji: "🗓️", text: "This year" },
        { emoji: "👀", text: "Just looking" },
      ],
    },
  },
];

export function getIndustryPage(slug: string): IndustryPage | undefined {
  return INDUSTRY_PAGES.find((p) => p.slug === slug);
}
