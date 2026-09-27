"use client";

// Product mockups for the builder landing page, drawn in HTML so they stay
// crisp on phones and always match the real product. Examples deliberately
// span different industries.
import { useEffect, useState } from "react";
import type { IndustryPage } from "@/lib/builder-industries";

// Hero phone: one industry's sample quiz, or a rotation through several.
export function PhoneQuiz({ demos }: { demos: IndustryPage["demo"][] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (demos.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % demos.length), 3500);
    return () => clearInterval(t);
  }, [demos.length]);
  const demo = demos[idx % demos.length];
  return (
    <div className="relative mx-auto w-[280px] sm:w-[300px]">
      <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-violet-400/30 via-fuchsia-300/20 to-amber-200/30 blur-2xl" />
      <div className="relative rounded-[2.6rem] bg-[#0B0B12] p-2.5 shadow-[0_40px_80px_-30px_rgba(76,29,149,0.55)]">
        <div className="rounded-[2.1rem] overflow-hidden bg-gradient-to-b from-[#2A1356] to-[#150A2E] text-white">
          <div className="flex justify-center pt-2.5">
            <span className="h-5 w-24 rounded-full bg-black/80" />
          </div>
          <div key={idx} className="px-5 pt-4 pb-6 animate-[fadeIn_0.5s_ease]">
            <div className="flex items-center justify-between gap-3 text-[11px] text-violet-200/80">
              <span className="font-semibold truncate min-w-0">{demo.brand}</span>
              <span className="shrink-0">Question 2 of 6</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10">
              <div className="h-full w-1/3 rounded-full bg-violet-400" />
            </div>
            <p className="mt-6 text-[19px] font-bold leading-snug">{demo.question}</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
              {demo.options.map((o, i) => (
                <div
                  key={o.text}
                  className={`rounded-2xl px-3 py-4 text-center border ${
                    i === 0 ? "bg-violet-500/25 border-violet-300 ring-2 ring-violet-400/50" : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="text-[28px] leading-none">{o.emoji}</div>
                  <div className="mt-2 text-[12px] font-semibold leading-tight">{o.text}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-violet-500 py-3 text-center text-[13px] font-bold">Next →</div>
          </div>
        </div>
      </div>
      {demos.length > 1 && (
        <div className="relative mt-5 flex justify-center gap-1.5">
          {demos.map((d, i) => (
            <button
              key={d.brand}
              onClick={() => setIdx(i)}
              aria-label={d.brand}
              className={`h-1.5 rounded-full transition-all ${i === idx % demos.length ? "w-6 bg-violet-600" : "w-1.5 bg-slate-300"}`}
            />
          ))}
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

// Example content for the feature visuals: the general set (mixed
// industries) or the coaches & consultants set for /build/coaches.
type Row = { name: string; note: string; tag: "Hot" | "Warm" | "Cold"; pct: number };
const TAGS = {
  Hot: { color: "#16a34a", bg: "rgba(22,163,74,0.12)" },
  Warm: { color: "#b7791f", bg: "rgba(217,148,9,0.14)" },
  Cold: { color: "#1e40af", bg: "rgba(37,99,235,0.12)" },
};
type Chat = { msg: string; qs: { q: string; on: string; off: string }[] };
type Share = { brand: string; title: string; preview: string; previewSub: string; message: string };
type Result = { title: string; desc: string; why: [string, string][]; cta: string };
type Wtp = { q: string; opts: [string, string][]; name: string; sub: string; score: number; factors: { label: string; pct: number }[] };
type Content = { chat: Chat; share: Share; result: Result; leads: { title: string; rows: Row[] }; wtp: Wtp };

const CHECK_FIRST = "What should it check first?";

const SOLAR: Content = {
  chat: {
    msg: "I install solar in Abuja. I want to know which homes can afford a system before I send my team out.",
    qs: [
      { q: "Homes, businesses or both?", on: "Homes", off: "Both" },
      { q: CHECK_FIRST, on: "Fuel spend", off: "Install date" },
    ],
  },
  share: {
    brand: "SunPower Solutions",
    title: "Can your home afford solar? ☀️",
    preview: "Solar check | SunPower Solutions",
    previewSub: "Answer 6 quick questions and see what size system fits you.",
    message: "Tired of NEPA and fuel prices? Take our 2-minute solar check and see what system fits your home ☀️",
  },
  result: {
    title: "5kVA hybrid system ☀️",
    desc: "A good fit for a home spending over ₦150,000 a month on fuel.",
    why: [
      ["✓", "You spend over ₦150k on fuel every month"],
      ["✓", "You want to install within 30 days"],
      ["!", "Final size is confirmed at a site visit"],
    ],
    cta: "Book my free site visit →",
  },
  leads: {
    title: "New leads · SunPower Solutions",
    rows: [
      { name: "Chidi E.", note: "5kVA hybrid · ₦180k fuel/mo · this month", tag: "Hot", pct: 92 },
      { name: "Bola A.", note: "3kVA · comparing 3 quotes", tag: "Warm", pct: 71 },
      { name: "Musa K.", note: "Just checking prices", tag: "Cold", pct: 44 },
      { name: "Ngozi O.", note: "10kVA · business · budget ready", tag: "Hot", pct: 86 },
    ],
  },
  wtp: {
    q: "How much do you spend on fuel for your generator each month?",
    opts: [["⛽", "Over ₦150,000"], ["🔋", "₦50,000 to ₦150,000"], ["💡", "Under ₦50,000"], ["🤷", "Not sure"]],
    name: "Chidi E.",
    sub: "SunPower Solutions · 5kVA hybrid system",
    score: 86,
    factors: [
      { label: "Monthly fuel spend", pct: 90 },
      { label: "Install timeline", pct: 80 },
    ],
  },
};

const REAL_ESTATE: Content = {
  chat: {
    msg: "I sell homes in Lekki. I want a quiz that shows which buyers have the budget and timeline to buy before I book viewings.",
    qs: [
      { q: "Buyers, renters or both?", on: "Buyers only", off: "Both" },
      { q: CHECK_FIRST, on: "Budget", off: "Move-in date" },
    ],
  },
  share: {
    brand: "Prime Homes Lekki",
    title: "Are you ready to buy a home? 🔑",
    preview: "Home buyer check | Prime Homes Lekki",
    previewSub: "Answer 6 quick questions and see what you can afford.",
    message: "Thinking of buying in Lekki? Take our 2-minute buyer check and see what fits your budget 🏠",
  },
  result: {
    title: "3-bedroom terrace in Lekki 🏡",
    desc: "A good match for your budget, family size and move-in date.",
    why: [
      ["✓", "Your budget covers ₦150m to ₦200m"],
      ["✓", "You want to move in within 3 months"],
      ["!", "Prices and availability can change"],
    ],
    cta: "Book a viewing on WhatsApp →",
  },
  leads: {
    title: "New leads · Prime Homes Lekki",
    rows: [
      { name: "Tunde A.", note: "4-bed · ₦250m · mortgage approved", tag: "Hot", pct: 94 },
      { name: "Ifeoma K.", note: "3-bed · renting now · in 6 months", tag: "Warm", pct: 70 },
      { name: "Sam O.", note: "Just browsing listings", tag: "Cold", pct: 38 },
      { name: "Aisha B.", note: "Duplex · cash buyer · this quarter", tag: "Hot", pct: 88 },
    ],
  },
  wtp: {
    q: "What's your budget for this home?",
    opts: [["💎", "Over ₦200m"], ["🏠", "₦100m to ₦200m"], ["🔑", "Under ₦100m"], ["🤔", "Not sure yet"]],
    name: "Tunde A.",
    sub: "Prime Homes · 4-bed in Lekki",
    score: 94,
    factors: [
      { label: "Budget", pct: 95 },
      { label: "Move-in date", pct: 90 },
    ],
  },
};

const HAIR: Content = {
  chat: {
    msg: "I sell hair extensions and wigs in Lagos. I want a quiz that matches customers to the right hair and shows me who's ready to order.",
    qs: [
      { q: "Wigs, bundles or both?", on: "Both", off: "Wigs only" },
      { q: CHECK_FIRST, on: "Budget", off: "When they need it" },
    ],
  },
  share: {
    brand: "Luxe Hair Lagos",
    title: "Find your perfect hair for December 👑",
    preview: "Find your perfect hair | Luxe Hair Lagos",
    previewSub: "Answer 6 quick questions and get your perfect look.",
    message: "Hey babe! Take our 2-minute hair quiz and find the look made for you 💜",
  },
  result: {
    title: "Bone straight 24-inch wig 👑",
    desc: "A good match for a sleek, everyday look that lasts.",
    why: [
      ["✓", "You want a sleek, low-maintenance look"],
      ["✓", "You need it before your event next week"],
      ["!", "Final length and colour are confirmed on WhatsApp"],
    ],
    cta: "Order my wig on WhatsApp →",
  },
  leads: {
    title: "New leads · Luxe Hair Lagos",
    rows: [
      { name: "Amaka N.", note: "Bone straight wig · wedding next week · ₦250k", tag: "Hot", pct: 93 },
      { name: "Kemi F.", note: "Body wave bundles · this month", tag: "Warm", pct: 72 },
      { name: "Rita E.", note: "Asking prices", tag: "Cold", pct: 35 },
      { name: "Zainab M.", note: "Full glam wig · budget ready", tag: "Hot", pct: 85 },
    ],
  },
  wtp: {
    q: "How much do you usually spend on hair?",
    opts: [["💎", "Over ₦200k"], ["💁🏾‍♀️", "₦80k to ₦200k"], ["🌱", "Under ₦80k"], ["🤷", "It varies"]],
    name: "Amaka N.",
    sub: "Luxe Hair · bone straight wig for a wedding",
    score: 93,
    factors: [
      { label: "Hair budget", pct: 95 },
      { label: "Needed by", pct: 90 },
    ],
  },
};

const CLINICS: Content = {
  chat: {
    msg: "I run a private clinic in Ikeja. I want a quiz that points people to the right check-up and shows me who is ready to book.",
    qs: [
      { q: "Walk-ins or appointments?", on: "Appointments", off: "Both" },
      { q: CHECK_FIRST, on: "How they'll pay", off: "How soon" },
    ],
  },
  share: {
    brand: "CarePoint Clinic",
    title: "Are you due for a health check? 🩺",
    preview: "Health check | CarePoint Clinic",
    previewSub: "Answer 6 quick questions and see which check-up fits you.",
    message: "When did you last check your health? Take our 2-minute check and see which screening fits you 🩺",
  },
  result: {
    title: "Full health screening 🩺",
    desc: "A good next step for someone who hasn't had a check-up in over 3 years.",
    why: [
      ["✓", "Your last full check was over 3 years ago"],
      ["✓", "Blood pressure runs in your family"],
      ["!", "This is a guide, not a diagnosis"],
    ],
    cta: "Book my screening on WhatsApp →",
  },
  leads: {
    title: "New leads · CarePoint Clinic",
    rows: [
      { name: "Amaka N.", note: "Full screening · paying cash · this week", tag: "Hot", pct: 91 },
      { name: "David O.", note: "Eye test · HMO · next month", tag: "Warm", pct: 69 },
      { name: "Grace T.", note: "Asking about prices", tag: "Cold", pct: 33 },
      { name: "Musa K.", note: "Heart check · family history · ready", tag: "Hot", pct: 86 },
    ],
  },
  wtp: {
    q: "How would you pay for your check-up?",
    opts: [["💳", "Cash or card"], ["🏥", "HMO or insurance"], ["👨‍👩‍👧", "Family pays"], ["🤔", "Not sure"]],
    name: "Amaka N.",
    sub: "CarePoint Clinic · full health screening",
    score: 91,
    factors: [
      { label: "Payment ready", pct: 95 },
      { label: "Booking date", pct: 88 },
    ],
  },
};

const STUDY_ABROAD: Content = {
  chat: {
    msg: "I run a study-abroad agency. I want a quiz that shows which students have the grades, English test and funds to apply now.",
    qs: [
      { q: "UK, Canada or both?", on: "Both", off: "UK only" },
      { q: CHECK_FIRST, on: "Funding", off: "Intake date" },
    ],
  },
  share: {
    brand: "BrightPath Education",
    title: "Are you eligible to study in the UK? 🇬🇧",
    preview: "UK eligibility check | BrightPath Education",
    previewSub: "Answer 6 quick questions and see where you stand.",
    message: "Dreaming of a UK Masters? Take our free 2-minute eligibility check 🎓",
  },
  result: {
    title: "UK Masters · January intake 🎓",
    desc: "You look ready to apply for a January start.",
    why: [
      ["✓", "Your grades meet most UK entry requirements"],
      ["✓", "Your tuition funding is ready"],
      ["!", "This is a guide, not an admission decision"],
    ],
    cta: "Book my free consultation →",
  },
  leads: {
    title: "New leads · BrightPath Education",
    rows: [
      { name: "Adaeze O.", note: "UK Masters · funds ready · Jan intake", tag: "Hot", pct: 92 },
      { name: "Kwame A.", note: "Canada · IELTS booked · comparing agents", tag: "Warm", pct: 71 },
      { name: "Tolu B.", note: "Just exploring · no funding yet", tag: "Cold", pct: 44 },
      { name: "Fatima S.", note: "UK Nursing · sponsor ready · Sept intake", tag: "Hot", pct: 86 },
    ],
  },
  wtp: {
    q: "How will you fund your studies?",
    opts: [["💷", "Funds ready now"], ["👪", "Family sponsor"], ["🎓", "Need a scholarship"], ["🤔", "Not sure yet"]],
    name: "Adaeze O.",
    sub: "BrightPath · UK Masters · January intake",
    score: 92,
    factors: [
      { label: "Funding ready", pct: 95 },
      { label: "Intake timing", pct: 86 },
    ],
  },
};

const SKINCARE: Content = {
  chat: {
    msg: "I sell skincare on Instagram. I want a quiz that recommends the right routine and shows me who is ready to buy.",
    qs: [
      { q: "Full routines or single products?", on: "Full routines", off: "Both" },
      { q: CHECK_FIRST, on: "Skin type", off: "Monthly spend" },
    ],
  },
  share: {
    brand: "Glow Skincare",
    title: "Which routine fits your skin? ✨",
    preview: "Skin quiz | Glow Skincare",
    previewSub: "Answer 6 quick questions and get your perfect routine.",
    message: "Not sure what your skin needs? Take our 2-minute skin quiz and get your routine ✨",
  },
  result: {
    title: "The Oil-Balance routine 🌗",
    desc: "Made for skin that's oily in the T-zone and dry on the cheeks.",
    why: [
      ["✓", "Your T-zone gets shiny by midday"],
      ["✓", "You want a simple 3-step routine"],
      ["!", "Patch test new products first"],
    ],
    cta: "Order my routine on WhatsApp →",
  },
  leads: {
    title: "New leads · Glow Skincare",
    rows: [
      { name: "Zainab M.", note: "Oily T-zone · full routine · ₦45k", tag: "Hot", pct: 88 },
      { name: "Kemi F.", note: "Dry skin · wants one serum", tag: "Warm", pct: 67 },
      { name: "Rita E.", note: "Just curious", tag: "Cold", pct: 30 },
      { name: "Tolu B.", note: "Acne care · budget ready", tag: "Hot", pct: 84 },
    ],
  },
  wtp: {
    q: "How much do you spend on skincare each month?",
    opts: [["💎", "Over ₦50k"], ["✨", "₦20k to ₦50k"], ["🌱", "Under ₦20k"], ["🤷", "It varies"]],
    name: "Zainab M.",
    sub: "Glow Skincare · Oil-Balance routine",
    score: 88,
    factors: [
      { label: "Skincare budget", pct: 92 },
      { label: "Ready to order", pct: 85 },
    ],
  },
};

const TRAVEL: Content = {
  chat: {
    msg: "I sell holiday packages from Lagos. I want a quiz that matches travellers to the right trip and shows me who has the budget to book.",
    qs: [
      { q: "Local, international or both?", on: "Both", off: "International" },
      { q: CHECK_FIRST, on: "Budget", off: "Travel dates" },
    ],
  },
  share: {
    brand: "Wanderlust Travels",
    title: "Where should you go this December? 🌍",
    preview: "Trip finder | Wanderlust Travels",
    previewSub: "Answer 6 quick questions and get your perfect trip.",
    message: "Planning your December getaway? Take our 2-minute trip quiz and find your perfect holiday 🏝️",
  },
  result: {
    title: "Zanzibar beach escape 🏝️",
    desc: "A good match for sun, sea and a relaxed December break.",
    why: [
      ["✓", "You want beaches and sunsets"],
      ["✓", "Your budget covers 5 nights for two"],
      ["!", "Prices depend on your travel dates"],
    ],
    cta: "Get my quote on WhatsApp →",
  },
  leads: {
    title: "New leads · Wanderlust Travels",
    rows: [
      { name: "Ngozi A.", note: "Dubai · 2 adults · ₦4.5m · Dec 18", tag: "Hot", pct: 91 },
      { name: "Seun O.", note: "Zanzibar honeymoon · dates flexible", tag: "Warm", pct: 67 },
      { name: "Ife B.", note: "Just browsing deals", tag: "Cold", pct: 30 },
      { name: "Kunle D.", note: "Family of 4 · Cape Town · budget ready", tag: "Hot", pct: 87 },
    ],
  },
  wtp: {
    q: "What's your budget for this trip?",
    opts: [["💎", "Over ₦5m"], ["✈️", "₦2m to ₦5m"], ["🌱", "Under ₦2m"], ["🤔", "Not sure yet"]],
    name: "Ngozi A.",
    sub: "Wanderlust · Dubai for two in December",
    score: 91,
    factors: [
      { label: "Trip budget", pct: 92 },
      { label: "Travel dates set", pct: 85 },
    ],
  },
};

const COACHES: Content = {
  chat: {
    msg: "I'm a business consultant in Lagos. I want a quiz that shows which companies have the budget to hire me before I book a discovery call.",
    qs: [
      { q: "Discovery call or webinar?", on: "Discovery call", off: "Webinar" },
      { q: CHECK_FIRST, on: "Budget to invest", off: "Start date" },
    ],
  },
  share: {
    brand: "Better Together Coaching",
    title: "How healthy is your relationship? 💞",
    preview: "Relationship check | Better Together Coaching",
    previewSub: "Answer 6 quick questions and get your personal report.",
    message: "Hi! Take my free 2-minute relationship check and get your personal report 💜",
  },
  result: {
    title: "Debt-Free in 90 Days 💰",
    desc: "A good fit for someone ready to stop living from payday to payday.",
    why: [
      ["✓", "You run out of money before payday most months"],
      ["✓", "You're ready to start this month"],
      ["!", "This is a guide, not financial advice"],
    ],
    cta: "Book my free strategy call →",
  },
  leads: {
    title: "New leads · Iron Body Fitness",
    rows: [
      { name: "Adaeze O.", note: "12-week transformation · ready this month", tag: "Hot", pct: 92 },
      { name: "Kwame A.", note: "Online plan · comparing coaches", tag: "Warm", pct: 71 },
      { name: "Tolu B.", note: "Just curious · no budget yet", tag: "Cold", pct: 44 },
      { name: "Fatima S.", note: "1:1 coaching · budget ready", tag: "Hot", pct: 86 },
    ],
  },
  wtp: {
    q: "How much are you ready to invest in coaching this quarter?",
    opts: [["💎", "Over ₦1m"], ["💼", "₦300k to ₦1m"], ["🌱", "Under ₦300k"], ["🤔", "Not sure yet"]],
    name: "Chidi E.",
    sub: "Scale Up Coaching · 6-month programme",
    score: 88,
    factors: [
      { label: "Coaching budget", pct: 90 },
      { label: "Start date", pct: 85 },
    ],
  },
};

// Home page: a spread of industries across the feature rows.
const SETS = {
  default: { chat: REAL_ESTATE.chat, share: HAIR.share, result: CLINICS.result, leads: STUDY_ABROAD.leads, wtp: SOLAR.wtp },
  coaches: COACHES,
  solar: SOLAR,
  "real-estate": REAL_ESTATE,
  hair: HAIR,
  clinics: CLINICS,
  "study-abroad": STUDY_ABROAD,
  skincare: SKINCARE,
  travel: TRAVEL,
} satisfies Record<string, Content>;

export type VisualSet = keyof typeof SETS;
export function visualSetFor(slug: string): VisualSet {
  return slug in SETS ? (slug as VisualSet) : "default";
}

export function ChatVisual({ set = "default" }: { set?: VisualSet }) {
  const c = SETS[set].chat;
  return (
    <div className="rounded-3xl bg-[#0E1525] p-5 sm:p-6 text-[14px] text-[#F5F9FC] shadow-xl space-y-3">
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-3">
        {c.msg}
      </div>
      <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-[#1C2333] border border-[#2B3245] px-4 py-3">
        Love it. Two quick choices before I build:
        {c.qs.map((q) => (
          <div key={q.q}>
            <p className="mt-3 text-[12px] font-semibold text-[#9DA2A6]">{q.q}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-violet-500/20 ring-1 ring-violet-400 px-3 py-1.5 text-[12.5px] text-violet-100">
                {q.on}
              </span>
              <span className="rounded-full bg-white/5 ring-1 ring-white/10 px-3 py-1.5 text-[12.5px]">{q.off}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[12px] text-[#9DA2A6]">
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse [animation-delay:300ms]" />
        </span>
        Drafting your 6 questions…
      </div>
    </div>
  );
}

export function ShareVisual({ set = "default" }: { set?: VisualSet }) {
  const c = SETS[set].share;
  return (
    <div className="rounded-3xl bg-[#E7DED4] p-5 sm:p-6 shadow-xl">
      <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md bg-[#D9FDD3] p-2 shadow-sm">
        <div className="rounded-xl overflow-hidden bg-white">
          <div className="h-28 bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center text-white">
            <div className="text-center px-4">
              <div className="text-[11px] uppercase tracking-widest opacity-80">{c.brand}</div>
              <div className="mt-1 text-[17px] font-extrabold leading-tight">{c.title}</div>
            </div>
          </div>
          <div className="px-3 py-2">
            <div className="text-[13px] font-semibold text-[#111B21]">{c.preview}</div>
            <div className="text-[12px] text-[#667781]">{c.previewSub}</div>
          </div>
        </div>
        <p className="px-1.5 pt-2 text-[14px] text-[#111B21]">
          {c.message}
        </p>
        <p className="px-1.5 text-right text-[11px] text-[#667781]">09:41 ✓✓</p>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 text-[14px] font-bold text-[#07361E]">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.3c0-.1-.2-.2-.5-.3z" />
        </svg>
        Share on WhatsApp
      </div>
    </div>
  );
}

export function ResultVisual({ set = "default" }: { set?: VisualSet }) {
  const c = SETS[set].result;
  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 shadow-xl">
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-5 text-white">
        <div className="text-[11px] font-bold uppercase tracking-widest opacity-80">Your match</div>
        <div className="mt-1 text-[22px] font-extrabold leading-tight">{c.title}</div>
        <p className="mt-2 text-[13px] opacity-90">{c.desc}</p>
      </div>
      <p className="mt-5 text-[12px] font-bold uppercase tracking-wider text-slate-400">Why this fits you</p>
      <ul className="mt-2 space-y-2 text-[14px] text-slate-700">
        {c.why.map(([mark, text]) => (
          <li key={text} className="flex gap-2">
            <span className={mark === "!" ? "text-amber-500" : "text-emerald-500"}>{mark}</span> {text}
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-xl bg-violet-600 py-3 text-center text-[14px] font-bold text-white">
        {c.cta}
      </div>
    </div>
  );
}

export function LeadsVisual({ set = "default" }: { set?: VisualSet }) {
  const c = SETS[set].leads;
  const rows = c.rows.map((r) => ({ ...r, ...TAGS[r.tag] }));
  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xl">
      <div className="flex items-center justify-between px-1 pb-3">
        <span className="text-[14px] font-bold text-slate-900">{c.title}</span>
        <span className="text-[12px] text-slate-400">Today</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3 px-1 py-3">
            <span className="w-9 h-9 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-[13px] font-bold text-slate-600">
              {r.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-slate-900">{r.name}</div>
              <div className="text-[12px] text-slate-500 truncate">{r.note}</div>
            </div>
            <span className="text-right leading-none">
              <span className="block text-[14px] font-bold text-slate-800">{r.pct}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">WTP</span>
            </span>
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: r.color, backgroundColor: r.bg }}>
              {r.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WtpVisual({ set = "default" }: { set?: VisualSet }) {
  const c = SETS[set].wtp;
  const factors = c.factors;
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-b from-[#2A1356] to-[#150A2E] p-5 sm:p-6 text-white shadow-xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 ring-1 ring-amber-300/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-200">
          💰 Willingness-to-pay question
        </span>
        <p className="mt-4 text-[18px] font-bold leading-snug">{c.q}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 [&>*]:min-w-0">
          {c.opts.map(([e, t], i) => (
            <div
              key={t}
              className={`rounded-xl px-3 py-3 text-center border text-[12px] font-semibold ${
                i === 0 ? "bg-violet-500/25 border-violet-300" : "bg-white/5 border-white/10"
              }`}
            >
              <div className="text-xl leading-none">{e}</div>
              <div className="mt-1.5">{t}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-xl ring-1 ring-slate-200 text-[#0B0B12]">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">{c.name.charAt(0)}</span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{c.name}</div>
            <div className="text-[12px] text-slate-500 truncate">{c.sub}</div>
          </div>
          <div className="text-right">
            <div className="text-[26px] font-extrabold leading-none text-emerald-600">{c.score}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">WTP / 100</div>
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          {factors.map((f) => (
            <div key={f.label}>
              <div className="flex justify-between text-[12px] text-slate-500">
                <span>{f.label}</span>
                <span>{f.pct}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${f.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
