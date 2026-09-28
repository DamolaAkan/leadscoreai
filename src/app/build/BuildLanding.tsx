"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { INDUSTRY_PAGES, type IndustryPage } from "@/lib/builder-industries";
import { captureFirstTouch, getFirstTouch, getVisitorId, trackClient } from "@/lib/track-client";
import MetaPixel, { trackLead } from "@/components/MetaPixel";
import { COACH_BRANCHES, COACH_HERO_DEMOS, showsLatseminary } from "@/lib/coach-pages";
import { LatseminaryProof } from "./landing-proof";
import SignupScorecard from "./SignupScorecard";
import { industryFromAnswers, scoreAnswers, starterFromAnswers, type Answers } from "@/lib/signup-scorecard";
import {
  ChatVisual,
  LeadsVisual,
  PhoneQuiz,
  ResultVisual,
  ShareVisual,
  WtpVisual,
  visualSetFor,
  type VisualSet,
} from "./landing-visuals";

const CTA = "Find my serious buyers";

// Feature rows; `set` picks industry-mixed or coaches & consultants examples.
const outcomesFor = (set: VisualSet) => [
  {
    icon: "💬",
    title: "Describe it in plain words.",
    body: "No forms, no templates, no design skills. Say what you sell and who you sell to. The builder asks a few tap-to-answer questions, then drafts the whole quiz while you watch. Want a change? Just ask.",
    caption: "Tap to answer · edit by chatting",
    visual: <ChatVisual set={set} />,
  },
  {
    icon: "📲",
    title: "Share it where your customers already are.",
    body: "One tap sends your quiz to WhatsApp with a proper preview card. Put the link in your Instagram bio or status, or add it to your website with one line of code.",
    caption: "WhatsApp · Instagram · your website",
    visual: <ShareVisual set={set} />,
  },
  {
    icon: "🎯",
    title: "Every customer gets a real answer.",
    body: "Not a “thanks, we'll be in touch”. Each person gets a detailed results page in your brand colour: their match, why it fits them and what to do next, with a button straight back to you.",
    caption: "Qualify quizzes and Match quizzes",
    visual: <ResultVisual set={set} />,
  },
  {
    icon: "🔥",
    title: "See who's ready to buy.",
    body: "Every lead lands in your dashboard with a willingness-to-pay score, a Hot, Warm or Cold rating, their answers and contact details. Call the ready ones first and stop chasing people who were only browsing.",
    caption: "Your dashboard · CSV export",
    visual: <LeadsVisual set={set} />,
  },
];

const STEPS = [
  { title: "Tell us about your business", body: "In plain words, or tap to answer a few quick questions." },
  {
    title: "We build the whole quiz",
    body: "Questions, scoring, emoji picture cards and a detailed results page in your brand colour.",
  },
  {
    title: "Share it and get leads",
    body: "One tap to WhatsApp or embed it on your website. Every answer lands in your dashboard.",
  },
];

const MORE_INDUSTRIES = [
  "Lending & finance",
  "Fashion",
  "Events",
  "Agencies",
];

const WTP_SIGNALS = [
  { icon: "💰", title: "Budget", body: "What they can spend" },
  { icon: "⏱️", title: "Timing", body: "How soon they'll buy" },
  { icon: "🤝", title: "Commitment", body: "How serious they are, and who decides" },
];

const FAQS = [
  {
    q: "What is an AI edit?",
    a: "Each time the builder creates or changes your quiz, it uses 1 AI edit. Answering its tap questions is free, and previewing, sharing and publishing never use edits. You get 30 free edits to build your quiz, Pro includes 150 a month, and Pro accounts that run out can top up in ₦10,000 steps (₦10,000 = 45 edits).",
  },
  {
    q: "What is a willingness-to-pay score?",
    a: "Every quiz includes a few questions about budget, timing and commitment, asked in your brand's voice. From those answers, each lead gets a score from 0 to 100 showing how able and ready they are to pay, right next to their quiz result. The builder suggests these questions for you, and you can change them in the chat.",
  },
  {
    q: "Do I need a website?",
    a: "No. Every quiz gets its own link you can share on WhatsApp, Instagram or anywhere else. If you do have a website, you can embed the quiz on it too.",
  },
  {
    q: "Can I build it on my phone?",
    a: "Yes. The whole builder works on your phone: chat, preview your quiz and share it, all from one screen.",
  },
  {
    q: "What kinds of quizzes can I make?",
    a: "Two kinds. Qualify quizzes score each person so you know who is ready to buy (Hot, Warm or Cold), like a solar affordability check or a study-abroad eligibility check. Match quizzes recommend the right product, package or service for each person, like a hair-style quiz or a health check-up finder.",
  },
  {
    q: "Can I change my quiz after it's live?",
    a: "Yes, just ask in the chat. If your quiz already has answers, we save the changes as a new version so no lead is lost.",
  },
  {
    q: "Do I need to pay to try it?",
    a: "No. Building and previewing your quiz is free, no card needed. You only pay when you publish it for real customers: ₦59,750 a month on Pro. Go live within 48 hours of building your first quiz and your first month is ₦49,750. Pay by bank transfer, card or USSD through Paystack. Cancel anytime.",
  },
  {
    q: "What if I need something the builder can't do?",
    a: "Ask anyway. The builder will tell you straight away and pass your request to our team. For anything else, talk to support.",
  },
];

const SUPPORT_URL = "mailto:stella@leadscoreai.com";

const PLAN = {
  name: "Pro",
  blurb: "Everything you need to find your buyers.",
  price: 59750,
  earlyDiscount: 10000,
  features: [
    "2,000 leads a month",
    "10 live quizzes",
    "150 AI edits a month, top up any time you run out (₦10,000 = 45 edits)",
    "Willingness-to-pay score on every lead",
    "Every lead scored Hot, Warm or Cold",
    "WhatsApp sharing and website embed",
    "CSV export of your leads",
    "No “Powered by LeadScoreAI” on your quizzes",
  ],
};

// Shared by /build and every /build/<industry> page; only the hero copy and
// the starting industry tab differ.
export default function BuildLanding({ page }: { page: IndustryPage }) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [starter, setStarter] = useState(page.starter);
  // Coaches & consultants: one page with specialty tabs instead of industry tabs.
  const isCoach = page.slug === "coaches";
  // Each industry page shows its own examples; the home page mixes them.
  const set: VisualSet = visualSetFor(page.slug);
  // Coaches talk about "clients", not "customers".
  const OUTCOMES = outcomesFor(set).map((o) =>
    isCoach
      ? {
          ...o,
          title: o.title.replace("See who's ready to buy.", "See who's ready to pay.").replace(/customer/g, "client"),
          body: o.body.replace(/customers/g, "clients").replace(/customer/g, "client"),
        }
      : o
  );
  const [industry, setIndustry] = useState(page.slug || INDUSTRY_PAGES[0].slug);
  const [branch, setBranch] = useState(COACH_BRANCHES[0].key);
  const activeBranch = COACH_BRANCHES.find((b) => b.key === branch) || COACH_BRANCHES[0];
  const [showBar, setShowBar] = useState(false);

  // Signed-in owners skip the sign-up sheet and go straight to building.
  useEffect(() => {
    const sid = localStorage.getItem("lsai-session");
    if (!sid) return;
    fetch("/api/builder/state", { headers: { Authorization: `Bearer ${sid}` } })
      .then((r) => {
        setSignedIn(r.ok);
        if (r.status === 401) localStorage.removeItem("lsai-session"); // expired or deleted session
      })
      .catch(() => {});
  }, []);

  // Activity log: every landing visit, with where it came from (ads / UTM).
  useEffect(() => {
    captureFirstTouch();
    // Remember their industry so the builder's examples match it.
    try {
      if (page.slug) localStorage.setItem("lsai-industry", page.slug);
    } catch {
      /* ignore */
    }
    const q = new URLSearchParams(window.location.search);
    trackClient("landing_view", {
      page: page.slug || "home",
      utm_source: q.get("utm_source") || "",
      utm_campaign: q.get("utm_campaign") || "",
      fbclid: !!q.get("fbclid"),
      referrer: document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : "",
    });
  }, [page.slug]);

  // Phone: a sticky call-to-action once the hero button scrolls away.
  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goToStudio = (idea: string) => {
    try {
      if (idea) localStorage.setItem("lsai-builder-starter", idea);
    } catch {
      /* ignore */
    }
    router.push("/build/studio");
  };

  const start = (idea: string = page.starter, where = "cta") => {
    trackClient("cta_click", { where, signed_in: signedIn, page: page.slug || "home" });
    if (signedIn) return goToStudio(idea);
    trackClient("signup_sheet_open", { where, page: page.slug || "home" });
    setStarter(idea);
    setSheet(true);
  };

  const active = INDUSTRY_PAGES.find((p) => p.slug === industry) || INDUSTRY_PAGES[0];

  return (
    <div className="min-h-screen bg-[#FAFAFB] text-[#0B0B12] overflow-x-hidden">
      <MetaPixel />
      {/* Nav */}
      <div className="sticky top-0 z-40 px-3 pt-3">
        <nav className="max-w-5xl mx-auto flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] pl-3 pr-1.5 py-1.5">
          <a href="/" className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/favicon-64.png" alt="" className="w-8 h-8 rounded-lg" />
            <span className="font-bold tracking-tight max-[359px]:hidden">LeadScoreAI</span>
          </a>
          <div className="hidden md:flex items-center gap-1 mx-auto text-[15px] text-slate-600">
            {[
              ["Who it's for", "/who-its-for"],
              ["How it works", "#how"],
              ["Industries", "#industries"],
              ["Pricing", "#pricing"],
              ["FAQ", "#faq"],
              ["Log in", "/login"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="px-3.5 py-2 rounded-full hover:bg-slate-100 hover:text-slate-900">
                {label}
              </a>
            ))}
          </div>
          <div className="ml-auto md:ml-0 flex items-center gap-1">
            <button
              onClick={() => start(undefined, "nav")}
              className="rounded-full bg-violet-600 hover:bg-violet-700 text-white text-[13px] sm:text-[14px] font-semibold px-3.5 sm:px-4 py-2.5 whitespace-nowrap"
            >
              {signedIn ? "Open my studio" : CTA}
            </button>
          </div>
        </nav>
      </div>

      {/* Hero */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 grid lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-8 items-center [&>*]:min-w-0">
        <div>
          {page.eyebrow && (
            <p className="mb-4 text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.18em] text-violet-600">
              {page.eyebrow}
            </p>
          )}
          <h1
            className="font-extrabold tracking-[-0.035em] leading-[1.02]"
            // Long headlines (coaches & consultants) step down so they don't swamp the hero.
            style={{
              fontSize:
                page.headline.length + page.highlight.length > 90
                  ? "clamp(34px, 5.2vw, 58px)"
                  : page.headline.length + page.highlight.length > 70
                    ? "clamp(36px, 6vw, 66px)"
                    : "clamp(40px, 7vw, 76px)",
            }}
          >
            {page.headline}{" "}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
              {page.highlight}
            </span>
          </h1>
          <p className="mt-6 text-[17px] sm:text-[19px] leading-relaxed text-slate-600 max-w-xl">{page.sub}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => start(undefined, "hero")}
              className="rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-[16px] px-7 py-4 shadow-[0_12px_30px_-10px_rgba(109,40,217,0.7)]"
            >
              {signedIn ? "Open my studio" : CTA}
            </button>
            <a
              href="#how"
              className="rounded-full bg-white border border-slate-200 text-slate-800 font-semibold text-[16px] px-7 py-4 text-center hover:bg-slate-50"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-[13px] text-slate-500">30 free AI edits to build · Pay only when you go live · Works on your phone</p>
        </div>
        <PhoneQuiz
          demos={
            !page.slug
              ? INDUSTRY_PAGES.map((p) => p.demo)
              : isCoach
                ? COACH_HERO_DEMOS
                : [page.demo]
          }
        />
      </header>

      {/* Willingness to pay: the LeadScoreAI difference */}
      <section className="bg-[#0B0B12] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center [&>*]:min-w-0">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-violet-300">The LeadScoreAI difference</p>
            <h2 className="mt-3 text-[32px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.08]">
              Not just a quiz.{" "}
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
                A quiz that finds your buyer.
              </span>
            </h2>
            <p className="mt-5 text-[17px] sm:text-[18px] leading-relaxed text-slate-300">
              Anyone can make a quiz. LeadScoreAI builds <b className="text-white">willingness-to-pay</b> questions into
              every one, asked in your brand&apos;s voice so they feel natural, even in fun personality quizzes. Every lead
              then gets a willingness-to-pay score from 0 to 100, so you know who can actually buy before you reply.
            </p>
            <div className="mt-8 grid sm:grid-cols-3 gap-3 [&>*]:min-w-0">
              {WTP_SIGNALS.map((w) => (
                <div key={w.title} className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                  <div className="text-2xl">{w.icon}</div>
                  <div className="mt-2 font-bold">{w.title}</div>
                  <div className="text-[14px] text-slate-400">{w.body}</div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Built into Qualify and Match quizzes · suggested for you in the chat
            </p>
          </div>
          <div className="w-full max-w-md mx-auto">
            <WtpVisual set={set} />
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section id="how" className="scroll-mt-24 bg-white border-y border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-violet-600">Outcomes, not features</p>
            <h2 className="mt-3 text-[32px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.08]">
              Know what they want before you reply.
            </h2>
            <p className="mt-4 text-[17px] text-slate-600">
              Four ways a quiz does the selling for you, while you get on with running the business.
            </p>
          </div>

          <div className="mt-16 sm:mt-24 space-y-20 sm:space-y-28">
            {OUTCOMES.map((o, i) => (
              <div key={o.title} className="grid md:grid-cols-2 gap-10 md:gap-16 items-center [&>*]:min-w-0">
                <div className={i % 2 ? "md:order-2" : ""}>
                  <span className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-violet-50 text-2xl">{o.icon}</span>
                  <h3 className="mt-5 text-[26px] sm:text-[32px] font-bold tracking-[-0.02em] leading-tight">{o.title}</h3>
                  <p className="mt-4 text-[17px] leading-relaxed text-slate-600">{o.body}</p>
                  <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">{o.caption}</p>
                </div>
                <div className={`w-full max-w-md mx-auto ${i % 2 ? "md:order-1" : ""}`}>{o.visual}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coaches & consultants: one tab per specialty */}
      {isCoach ? (
        <section id="industries" className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-[32px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.08]">
              Built for every kind of coach and consultant.
            </h2>
            <p className="mt-4 text-[17px] text-slate-600">Pick your specialty and see the quizzes your clients would take.</p>
          </div>
          {(["coach", "consultant"] as const).map((group) => (
            <div key={group} className="mt-8">
              <p className="text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {group === "coach" ? "Coaches" : "Consultants"}
              </p>
              <div className="mt-3 -mx-4 px-4 flex sm:flex-wrap sm:justify-center gap-2 overflow-x-auto pb-2">
                {COACH_BRANCHES.filter((b) => b.group === group).map((b) => (
                  <button
                    key={b.key}
                    onClick={() => {
                      setBranch(b.key);
                      trackClient("industry_tab", { industry: `coaches:${b.key}` });
                    }}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[15px] font-semibold transition ${
                      b.key === branch ? "bg-[#0B0B12] text-white" : "bg-slate-100 text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <span>{b.emoji}</span>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-8 grid sm:grid-cols-2 gap-3 sm:gap-4 max-w-4xl mx-auto [&>*]:min-w-0">
            {activeBranch.examples.map((ex) => (
              <button
                key={ex.text}
                onClick={() => start(activeBranch.starter, `coaches_${activeBranch.key}`)}
                className="group text-left flex items-center gap-4 rounded-2xl bg-white border border-slate-200 p-5 hover:border-violet-300 hover:shadow-lg transition"
              >
                <span className="w-14 h-14 shrink-0 rounded-2xl bg-violet-50 flex items-center justify-center text-3xl">{ex.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold leading-snug">{ex.text}</span>
                  <span className="mt-1 block text-[13px] text-violet-600 font-semibold opacity-80 group-hover:opacity-100">
                    Build this quiz →
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-[15px] text-slate-500 max-w-2xl mx-auto">{activeBranch.sub}</p>
        </section>
      ) : (
      <section id="industries" className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-[32px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.08]">
            Built for the way you actually sell.
          </h2>
          <p className="mt-4 text-[17px] text-slate-600">Pick your industry and see the quizzes owners like you build.</p>
        </div>
        <div className="mt-10 -mx-4 px-4 flex sm:justify-center gap-2 overflow-x-auto pb-2">
          {INDUSTRY_PAGES.map((p) => (
            <button
              key={p.slug}
              onClick={() => {
                setIndustry(p.slug);
                trackClient("industry_tab", { industry: p.slug });
              }}
              className={`shrink-0 rounded-full px-5 py-3 text-[15px] font-semibold transition ${
                p.slug === industry ? "bg-[#0B0B12] text-white" : "bg-slate-100 text-slate-500 hover:text-slate-900"
              }`}
            >
              {industryLabel(p)}
            </button>
          ))}
        </div>
        <div className="mt-8 grid sm:grid-cols-2 gap-3 sm:gap-4 max-w-4xl mx-auto [&>*]:min-w-0">
          {active.examples.map((ex) => (
            <button
              key={ex.text}
              onClick={() => start(active.starter, `industry_${active.slug}`)}
              className="group text-left flex items-center gap-4 rounded-2xl bg-white border border-slate-200 p-5 hover:border-violet-300 hover:shadow-lg transition"
            >
              <span className="w-14 h-14 shrink-0 rounded-2xl bg-violet-50 flex items-center justify-center text-3xl">{ex.emoji}</span>
              <span className="min-w-0">
                <span className="block text-[17px] font-semibold leading-snug">{ex.text}</span>
                <span className="mt-1 block text-[13px] text-violet-600 font-semibold opacity-80 group-hover:opacity-100">
                  Build this quiz →
                </span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-6 text-center text-[15px] text-slate-500">
          {active.sub.split(". ")[0]}.{" "}
          <a href={`/build/${active.slug}`} className="font-semibold text-slate-900 underline underline-offset-4">
            See the {industryLabel(active).toLowerCase()} page
          </a>
        </p>
      </section>
      )}

      {/* How it works */}
      <section className="bg-white border-y border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 grid lg:grid-cols-2 gap-14 [&>*]:min-w-0">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-violet-600">● How it works</p>
            <h2 className="mt-3 text-[32px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.08]">
              From idea to live quiz in one chat.
            </h2>
            <ol className="mt-10 border-l-2 border-slate-200 pl-6 space-y-8">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <p className="text-[13px] font-semibold tracking-widest text-slate-400">0{i + 1}</p>
                  <p className="mt-1 text-[20px] font-bold">{s.title}</p>
                  <p className="mt-1 text-[16px] text-slate-600">{s.body}</p>
                </li>
              ))}
            </ol>
            <button
              onClick={() => start(undefined, "how_it_works")}
              className="mt-10 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-[16px] px-7 py-4"
            >
              {signedIn ? "Open my studio" : CTA} ↗
            </button>
          </div>
          <div className="lg:pt-16">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 [&>*]:min-w-0">
              {INDUSTRY_PAGES.map((p) => (
                <a
                  key={p.slug}
                  href={`/build/${p.slug}`}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[14px] font-medium hover:border-violet-300"
                >
                  <span>{p.examples[0].emoji}</span>
                  <span className="truncate">{industryLabel(p)}</span>
                </a>
              ))}
              {MORE_INDUSTRIES.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[14px] text-slate-500"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <span className="truncate">{name}</span>
                </span>
              ))}
            </div>
            <p className="mt-4 text-[14px] text-slate-500">
              Any business that answers the same customer questions every day. If you can describe it, you can quiz it.
            </p>
          </div>
        </div>
      </section>

      {/* Proof */}
      {showsLatseminary(page.slug) && <LatseminaryProof />}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center [&>*]:min-w-0">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-violet-600">Proof · results</p>
          <h2 className="mt-3 text-[32px] sm:text-[44px] font-extrabold tracking-[-0.03em] leading-[1.08]">
            Oríkì Energy won a grant on the strength of their customer data.
          </h2>
          <p className="mt-6 text-[17px] leading-relaxed text-slate-600">
            Oríkì Energy applied for the <b className="text-slate-900">Pillar of Innovation</b> grant, part of ZE-Gen, an
            initiative backed by Innovate UK and the UK Government. What set them apart was something most companies in their
            market can&apos;t show: they knew their customers. Who was applying, who was qualified, and who actually paid.
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
            That data comes from their LeadScoreAI scorecard. Every applicant scored, every conversion recorded.
          </p>
        </div>
        <figure className="relative rounded-3xl bg-[#0B0B12] text-white p-7 sm:p-10 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1.5 flex">
            <span className="flex-1 bg-[#16a34a]" />
            <span className="flex-1 bg-[#d99409]" />
            <span className="flex-1 bg-[#2563eb]" />
            <span className="flex-1 bg-[#dc2626]" />
            <span className="flex-[2] bg-violet-600" />
          </div>
          <span className="text-5xl font-serif leading-none text-violet-400">“</span>
          <blockquote className="mt-2 text-[21px] sm:text-[26px] font-bold leading-snug tracking-[-0.01em]">
            With LeadScoreAI we were able to determine our prospects&apos;{" "}
            <span className="text-violet-300">willingness to pay</span>. We were able to build our own data. We no longer
            need credit reports. We&apos;ve built our own credit report, based on our scorecard data.
          </blockquote>
          <figcaption className="mt-8 pt-6 border-t border-white/10 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/proof/seni-olayemi.jpg" alt="Seni Olayemi" className="w-12 h-12 rounded-full object-cover" />
            <div>
              <div className="font-bold">Seni Olayemi</div>
              <div className="text-[13px] text-slate-400">CEO, Oríkì Energy</div>
            </div>
          </figcaption>
        </figure>
      </section>

      {/* Who it's for: what people enrol in (also a nav tab; this one shows on phones) */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-violet-600">Before you sign up</p>
        <h2 className="mt-3 text-[26px] sm:text-[34px] font-extrabold tracking-[-0.03em] leading-[1.1]">
          LeadScoreAI is not for every business.
        </h2>
        <p className="mt-3 text-[17px] text-slate-600">
          It is for owners who value their time, their team&apos;s time and qualified leads. Read who it&apos;s for, and who it
          isn&apos;t.
        </p>
        <a
          href="/who-its-for"
          className="mt-6 inline-block rounded-full bg-white border border-slate-200 text-slate-800 font-semibold text-[16px] px-7 py-4 hover:bg-slate-50"
        >
          Who it&apos;s for →
        </a>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 bg-white border-y border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-violet-600">Pricing</p>
            <h2 className="mt-3 text-[32px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.08]">
              One plan. Everything included.
            </h2>
            <p className="mt-4 text-[17px] text-slate-600">
              Build and preview free. Pay only when you publish, and save ₦{PLAN.earlyDiscount.toLocaleString()} when
              you go live within 48 hours.
            </p>
          </div>
          <div className="mt-14 max-w-lg mx-auto rounded-[2rem] bg-slate-50 p-3 sm:p-4">
            <div className="rounded-3xl bg-white p-7 sm:p-9 shadow-[0_20px_50px_-20px_rgba(76,29,149,0.35)] ring-1 ring-violet-200">
              <p className="text-[22px] font-bold">{PLAN.name}</p>
              <p className="text-[15px] text-slate-500">{PLAN.blurb}</p>
              <p className="mt-6">
                <span className="text-[48px] font-extrabold tracking-[-0.03em]">₦{PLAN.price.toLocaleString()}</span>
                <span className="text-slate-500">/month</span>
              </p>
              <div className="mt-4 rounded-2xl bg-violet-50 border border-violet-200 px-4 py-3 text-[15px] text-violet-900">
                🎁 Go live within 48 hours of building your first quiz and your first month is{" "}
                <b>₦{(PLAN.price - PLAN.earlyDiscount).toLocaleString()}</b>. Save ₦{PLAN.earlyDiscount.toLocaleString()}.
              </div>
              <ul className="mt-6 pt-6 border-t border-slate-200 space-y-3 text-[15px]">
                {PLAN.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span className="text-violet-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => start(undefined, "pricing")}
                className="mt-8 w-full rounded-full py-4 font-semibold text-[16px] bg-violet-600 hover:bg-violet-700 text-white"
              >
                {signedIn ? "Open my studio" : CTA}
              </button>
              <p className="mt-3 text-center text-[13px] text-slate-500">
                No card needed to start · Bank transfer, card or USSD · Cancel anytime
              </p>
            </div>
          </div>
          <p className="mt-6 text-center text-[15px] text-slate-500">
            Questions before you start?{" "}
            <a href={SUPPORT_URL} className="font-semibold text-slate-900 underline underline-offset-4">
              Talk to support
            </a>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-violet-600">Common questions</p>
          <h2 className="mt-3 text-[32px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.08]">
            Things people ask before starting.
          </h2>
        </div>
        <div className="mt-12 rounded-3xl bg-white border border-slate-200 px-5 sm:px-8 divide-y divide-slate-200">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
                {f.q}
                <span className="shrink-0 text-slate-400 transition group-open:rotate-180">⌄</span>
              </summary>
              <p className="mt-3 text-[16px] leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 sm:px-6 pb-20 sm:pb-28 text-center">
        <h2
          className="font-extrabold tracking-[-0.04em] leading-[1.02] max-w-4xl mx-auto"
          style={{ fontSize: "clamp(40px, 8vw, 88px)" }}
        >
          Your next customer is one quiz away.
        </h2>
        <p className="mt-5 text-[18px] text-slate-600">Build it in one chat. Share it on WhatsApp today.</p>
        <button
          onClick={() => start(undefined, "final_cta")}
          className="mt-8 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-[16px] px-8 py-4 shadow-[0_12px_30px_-10px_rgba(109,40,217,0.7)]"
        >
          {signedIn ? "Open my studio" : CTA}
        </button>
        <p className="mt-4 text-[13px] text-slate-500">Free to build · ₦10,000 off when you go live within 48 hours</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 pb-28 md:pb-12 grid sm:grid-cols-3 gap-8 [&>*]:min-w-0">
          <div>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo/favicon-64.png" alt="" className="w-8 h-8 rounded-lg" />
              <span className="font-bold text-lg">LeadScoreAI</span>
            </div>
            <p className="mt-2 text-[14px] text-slate-500">Interactive quizzes that find your buyers.</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">For your industry</p>
            <ul className="mt-3 space-y-2 text-[14px]">
              {INDUSTRY_PAGES.map((p) => (
                <li key={p.slug}>
                  <a href={`/build/${p.slug}`} className="text-slate-600 hover:text-slate-900">
                    {industryLabel(p)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">Talk to us</p>
            <ul className="mt-3 space-y-2 text-[14px]">
              <li>
                <a href={SUPPORT_URL} className="text-slate-600 hover:text-slate-900">
                  Talk to support
                </a>
              </li>
              <li>
                <a href="/login" className="text-slate-600 hover:text-slate-900">
                  Client login
                </a>
              </li>
              <li>
                <a href="https://leadscoreai.com" className="text-slate-600 hover:text-slate-900">
                  leadscoreai.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      {/* Phone: sticky call-to-action */}
      <div
        className={`md:hidden fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 transition-all duration-300 ${
          showBar && !sheet ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={() => start(undefined, "sticky_bar")}
          className="w-full rounded-full bg-violet-600 text-white font-semibold text-[16px] py-4 shadow-[0_16px_40px_-12px_rgba(109,40,217,0.8)]"
        >
          {signedIn ? "Open my studio" : CTA}
        </button>
      </div>

      {sheet && (
        <SignUpSheet
          page={page}
          onClose={() => setSheet(false)}
          // A specific example they tapped wins; otherwise the scorecard's own first message.
          onDone={(personal) => goToStudio(starter && starter !== page.starter ? starter : personal || starter)}
        />
      )}
    </div>
  );
}

function industryLabel(p: IndustryPage): string {
  const labels: Record<string, string> = {
    "study-abroad": "Study abroad",
    skincare: "Skincare & beauty",
    travel: "Travel",
    solar: "Solar",
    "real-estate": "Real estate",
    hair: "Hair & wigs",
    clinics: "Clinics & health",
    coaches: "Coaches & consultants",
  };
  return labels[p.slug] || p.slug;
}

// Email → 6-digit code sign-up, as a bottom sheet on phones and a dialog on desktop.
// New owners first tap through the sign-up scorecard ("I already have an account" skips it).
function SignUpSheet({
  page,
  onClose,
  onDone,
}: {
  page: IndustryPage;
  onClose: () => void;
  onDone: (starter?: string) => void;
}) {
  const [step, setStep] = useState<"quiz" | "email" | "code">("quiz");
  const [answers, setAnswers] = useState<Answers | null>(null);
  const result = answers ? scoreAnswers(answers) : null;
  // WhatsApp is required in Nigeria (a Lagos device clock, which a VPN doesn't
  // change) and optional elsewhere, for people wary of sharing a number.
  const [waRequired] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone === "Africa/Lagos";
    } catch {
      return true;
    }
  });
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const digits = whatsapp.replace(/\D/g, "");
    if ((waRequired || digits) && (digits.length < 10 || digits.length > 15)) {
      setError(
        waRequired
          ? "Enter your WhatsApp number, e.g. 0811 000 0000."
          : "Enter your WhatsApp number with its country code, or leave it blank."
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/builder/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, visitorId: getVisitorId() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send a code.");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/builder/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          businessName,
          whatsapp,
          visitorId: getVisitorId(),
          firstTouch: getFirstTouch(),
          onboarding: answers,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Invalid code");
      localStorage.setItem("lsai-session", data.session_id);
      // New account = the ad "Lead" on the Siteflipmarket dataset (same id as the server event).
      if (data.isNew && data.metaEventId) trackLead({ email, externalId: data.metaEventId });
      // The scorecard answers pick the builder's sample quizzes and its first message.
      const industry = answers ? industryFromAnswers(answers) : null;
      try {
        if (industry) localStorage.setItem("lsai-industry", industry);
      } catch {
        /* ignore */
      }
      onDone(answers ? starterFromAnswers(answers) : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Try again.");
      setBusy(false);
    }
  };

  const input =
    "w-full px-4 py-3.5 rounded-xl border border-slate-300 text-[16px] text-slate-900 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl">
        <span className="sm:hidden absolute left-1/2 top-2.5 -translate-x-1/2 h-1.5 w-10 rounded-full bg-slate-200" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 w-9 h-9 rounded-full hover:bg-slate-100 text-slate-400 text-xl leading-none"
        >
          ×
        </button>
        {step === "quiz" ? (
          <SignupScorecard
            initial={answers ?? undefined}
            onHaveAccount={() => setStep("email")}
            onDone={(a) => {
              setAnswers(a);
              const r = scoreAnswers(a);
              trackClient("scorecard_done", { page: page.slug || "home", score: r.score, band: r.band, ...a });
              setStep("email");
            }}
          />
        ) : step === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
            {result ? (
              <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                <p className="text-[17px] font-bold leading-snug text-slate-900">{result.headline}</p>
                {result.reasons.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[14px] leading-snug text-slate-600 list-disc pl-5">
                    {result.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => setStep("quiz")}
                  className="mt-2 text-[13px] text-violet-700 hover:underline"
                >
                  Change my answers
                </button>
              </div>
            ) : null}
            <div>
              <h2 className="text-2xl font-bold">{result ? "Start building free" : "Find your serious buyers"}</h2>
              <p className="text-[15px] text-slate-500 mt-1">
                {result
                  ? "Your builder is set up from your answers. We'll email you a 6-digit code. No password needed."
                  : "We'll email you a 6-digit code. No password needed."}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Business name</label>
              <input
                className={input}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={page.namePlaceholder}
                maxLength={80}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Work email</label>
              <input
                className={input}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                WhatsApp number{!waRequired && <span className="font-normal text-slate-400"> (optional)</span>}
              </label>
              <input
                className={input}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required={waRequired}
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder={waRequired ? "0811 000 0000" : "+1 555 000 0000"}
                maxLength={20}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-4 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-60"
            >
              {busy ? "Sending…" : "Get my code →"}
            </button>
            <p className="text-xs text-slate-400 text-center">
              Already have an account? Use the same email and you&apos;ll go straight in.
            </p>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Check your email</h2>
              <p className="text-[15px] text-slate-500 mt-1">
                We sent a 6-digit code to <b>{email}</b>.
              </p>
            </div>
            <input
              className={`${input} text-center text-2xl tracking-[0.4em] font-semibold`}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full py-4 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Start building →"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError("");
              }}
              className="w-full text-sm text-slate-500 hover:text-slate-700"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
