"use client";

import { useState, useCallback, useEffect } from "react";
import PhoneInput, { type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { trackPixel } from "@/components/MetaPixel";
import {
  Organization,
  Quiz,
  QuizQuestion,
  Qualification,
  getQualification,
  generateSessionId,
} from "@/lib/types";
import {
  generateInsights,
  TIER_NAMES,
  TIER_COLORS,
  NEXT_STEPS,
} from "@/lib/insights";

const SUPPORTED_COUNTRIES: Country[] = [
  "US", "GB", "CA", "NG", "AE", "SA", "QA", "ZA", "GH", "AU",
];

interface Props {
  org: Organization;
  quiz: Quiz;
  questions: QuizQuestion[];
}

type Step = "start" | "questions" | "contact" | "results";

interface AnswerRecord {
  questionId: string;
  questionOrder: number;
  answerValue: string;
  points: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = (hex || "").replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = parseInt(n || "1e40af", 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

// Derive the dark start-cover gradient from the client's brand colour.
// DriveNow keeps its original hand-tuned navy (client sign-off), everyone else
// gets a deep, premium gradient tinted toward their own brand hue.
function heroGradientFor(org: { slug: string; primary_color: string }): string {
  if (org.slug === "drivenow") {
    return "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)";
  }
  const { r, g, b } = hexToRgb(org.primary_color || "#1e40af");
  const s = (f: number) => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
  return `linear-gradient(135deg, ${s(0.16)} 0%, ${s(0.32)} 50%, ${s(0.55)} 100%)`;
}

export default function QuizFlow({ org, quiz, questions }: Props) {
  const [step, setStep] = useState<Step>("start");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [sessionId] = useState(() => generateSessionId());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contact form
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState<string | undefined>("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [detectedCountry, setDetectedCountry] = useState<Country>("US");

  // Results
  const [score, setScore] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [qualification, setQualification] = useState<Qualification | null>(null);

  // Client brand color drives the scorecard (design system default, per-client override).
  const accent = org.primary_color;
  const heroGradient = heroGradientFor(org);

  // Detect user's country for phone input default
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((data) => {
        const code = (data?.country_code || "US").toUpperCase() as Country;
        if (SUPPORTED_COUNTRIES.includes(code)) {
          setDetectedCountry(code);
        }
      })
      .catch(() => {});
  }, []);

  // Voice call trigger — 60 seconds after results page for HOT/WARM leads
  useEffect(() => {
    if (
      step !== "results" ||
      !responseId ||
      !qualification ||
      !contactPhone
    )
      return;

    if (qualification !== "HOT_LEAD" && qualification !== "WARM_LEAD") return;

    const timer = setTimeout(() => {
      fetch("/api/voice/trigger-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId,
          organizationId: org.id,
        }),
      }).catch(() => {});
    }, 60_000);

    return () => clearTimeout(timer);
  }, [step, responseId, qualification, contactPhone, org.id]);

  // Start quiz — create response row
  const handleStart = useCallback(async () => {
    setIsSubmitting(true);
    // Created server-side (service role) so the public key never touches the DB.
    const res = await fetch("/api/scorecard/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: quiz.id, organizationId: org.id, sessionId }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.id) {
      console.error("Failed to create response");
      setIsSubmitting(false);
      return;
    }

    setResponseId(data.id);
    setStep("questions");
    setIsSubmitting(false);
  }, [quiz.id, org.id, sessionId]);

  // Submit answer for current question
  const handleAnswer = useCallback(async () => {
    if (!selectedOption || !responseId) return;

    const question = questions[currentQ];
    const option = question.options.find((o) => o.value === selectedOption);
    if (!option) return;

    setIsSubmitting(true);

    // Save to response_answers server-side (service role).
    const res = await fetch("/api/scorecard/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responseId,
        questionId: question.id,
        questionOrder: question.question_order,
        answerValue: { selected: option.value, text: option.text },
        pointsAwarded: option.points,
      }),
    });

    if (!res.ok) {
      console.error("Failed to save answer");
      setIsSubmitting(false);
      return;
    }

    const newAnswer: AnswerRecord = {
      questionId: question.id,
      questionOrder: question.question_order,
      answerValue: option.value,
      points: option.points,
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setSelectedOption(null);

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setStep("contact");
    }

    setIsSubmitting(false);
  }, [selectedOption, responseId, questions, currentQ, answers]);

  // Go back one question (removes the last saved answer so it can be re-picked).
  const handleBack = useCallback(async () => {
    if (currentQ === 0) {
      setStep("start");
      return;
    }
    // Drop the last answer locally; re-answering replaces it server-side.
    if (answers.length > 0) {
      setAnswers(answers.slice(0, -1));
    }
    setSelectedOption(null);
    setCurrentQ(currentQ - 1);
  }, [currentQ, answers]);

  // Submit contact form and compute results
  const handleContactSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!responseId) return;

      setIsSubmitting(true);

      const totalScore = answers.reduce((sum, a) => sum + a.points, 0);
      const pct = Math.round((totalScore / quiz.max_score) * 100);
      const qual = getQualification(pct);

      // Finalize server-side (service role) so the public key never needs
      // UPDATE/SELECT on the leads table.
      const finalizeRes = await fetch("/api/scorecard/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId,
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone || "",
          contact_company: contactCompany || null,
          contact_website: contactWebsite || null,
          score: totalScore,
          max_score: quiz.max_score,
          percentage: pct,
          qualification: qual,
        }),
      });

      if (!finalizeRes.ok) {
        console.error("Failed to finalize response");
        setIsSubmitting(false);
        return;
      }

      setScore(totalScore);
      setPercentage(pct);
      setQualification(qual);
      setStep("results");
      setIsSubmitting(false);

      // Meta pixel conversion (loandoctor MFB campaign only; no-op elsewhere)
      if (org.slug === "loandoctor") trackPixel("Lead");

      // Fire-and-forget: trigger email sequence server-side
      fetch("/api/email/trigger-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId,
          organizationId: org.id,
        }),
      }).catch(() => {});

      // Fire-and-forget: founder note (self-gates to the Loan Doctor scorecard)
      fetch("/api/email/founder-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId,
          organizationId: org.id,
        }),
      }).catch(() => {});
    },
    [responseId, answers, quiz.max_score, contactName, contactEmail, contactPhone, contactCompany, contactWebsite, org.slug, org.id]
  );

  const progress =
    step === "questions"
      ? ((currentQ + 1) / questions.length) * 100
      : step === "contact"
      ? 100
      : 0;

  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = accent;
    e.target.style.boxShadow = `0 0 0 3px ${accent}22`;
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#cbd5e1";
    e.target.style.boxShadow = "none";
  };

  const Logo = ({ size }: { size: number }) =>
    org.logo_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={org.logo_url}
        alt={org.name}
        style={{ width: size, height: size }}
        className="rounded-xl"
      />
    ) : (
      <div
        className="rounded-xl flex items-center justify-center text-white font-bold"
        style={{ width: size, height: size, backgroundColor: accent, fontSize: size / 2.4 }}
      >
        {org.name[0]}
      </div>
    );

  // ── START — dark hero ──
  if (step === "start") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-5 py-12 text-center"
        style={{
          background: heroGradient,
          fontFamily: "var(--font-inter)",
        }}
      >
        <div className="w-full max-w-2xl">
          {org.slug !== "loandoctor" && (
            <div className="mx-auto mb-10 w-20 h-20">
              <Logo size={80} />
            </div>
          )}
          <h1
            className="font-extrabold text-white mb-5"
            style={{
              fontSize:
                quiz.start_headline.length > 70
                  ? "clamp(24px, 4.4vw, 38px)"
                  : "clamp(34px, 6vw, 52px)",
              lineHeight: 1.18,
            }}
          >
            {quiz.start_headline}
          </h1>
          <p className="text-lg leading-relaxed mb-10 max-w-xl mx-auto" style={{ color: "#cbd5e1" }}>
            {quiz.start_subheadline.split(/(Loan Doctor)/g).map((part, i) =>
              part === "Loan Doctor" ? (
                <strong key={i} style={{ color: "#FBBF24", fontWeight: 700 }}>
                  {part}
                </strong>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>
          <button
            onClick={handleStart}
            disabled={isSubmitting}
            className="inline-block px-14 py-4 rounded-lg text-white font-semibold text-base transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            {isSubmitting ? "Loading…" : quiz.start_cta_text}
          </button>
          <p className="mt-6 text-sm" style={{ color: "#94a3b8" }}>
            ✓ {questions.length} questions &nbsp;·&nbsp; ✓ Takes about 2 minutes &nbsp;·&nbsp; ✓ Free
          </p>
        </div>
      </div>
    );
  }

  // ── QUESTIONS / CONTACT / RESULTS — light layout ──
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(135deg, #f8f9fa 0%, #eef2f5 100%)",
        fontFamily: "var(--font-inter)",
      }}
    >
      {/* Header */}
      <header className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Logo size={32} />
              <span className="font-bold" style={{ color: "#1e293b" }}>
                {org.name}
              </span>
            </div>
            {step === "questions" && (
              <span className="text-sm" style={{ color: "#64748b" }}>
                Step {currentQ + 1} of {questions.length}
              </span>
            )}
          </div>
          {(step === "questions" || step === "contact") && (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#e2e8f0" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: accent }}
              />
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-5 py-10">
        <div className="max-w-2xl mx-auto">
          {/* QUESTIONS */}
          {step === "questions" && (
            <div className="bg-white rounded-xl p-7 md:p-10 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
              <h2
                className="font-semibold mb-8"
                style={{ fontSize: "clamp(21px, 4vw, 28px)", lineHeight: 1.3, color: "#1a1a2e" }}
              >
                {questions[currentQ].question_text}
              </h2>

              <div className="space-y-3 mb-9">
                {questions[currentQ].options.map((option) => {
                  const isSel = selectedOption === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedOption(option.value)}
                      className="w-full text-left flex items-center p-4 rounded-lg border-2 transition-colors"
                      style={
                        isSel
                          ? { borderColor: accent, backgroundColor: accent + "12" }
                          : { borderColor: "#e2e8f0", backgroundColor: "#f8fafc" }
                      }
                    >
                      <span
                        className="w-5 h-5 rounded-full border-2 mr-3 flex-shrink-0 flex items-center justify-center"
                        style={{ borderColor: isSel ? accent : "#cbd5e1" }}
                      >
                        {isSel && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
                        )}
                      </span>
                      <span className="text-[15px] font-medium" style={{ color: "#1e293b" }}>
                        {option.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: "#e2e8f0", color: "#1e293b" }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleAnswer}
                  disabled={!selectedOption || isSubmitting}
                  className="px-7 py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: accent }}
                >
                  {isSubmitting ? "Saving…" : currentQ < questions.length - 1 ? "Next →" : "Continue →"}
                </button>
              </div>

              {/* Step dots */}
              <div className="flex flex-wrap gap-2 justify-center mt-9">
                {questions.map((_, i) => (
                  <span
                    key={i}
                    className="w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center"
                    style={
                      i === currentQ
                        ? { backgroundColor: accent, color: "white" }
                        : i < currentQ
                        ? { backgroundColor: accent + "22", color: accent }
                        : { backgroundColor: "#e2e8f0", color: "#94a3b8" }
                    }
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CONTACT FORM */}
          {step === "contact" && (
            <div className="bg-white rounded-xl p-7 md:p-10 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
              <h2 className="text-2xl font-bold text-center mb-2" style={{ color: "#1a1a2e" }}>
                Almost there!
              </h2>
              <p className="text-center mb-7 text-sm" style={{ color: "#64748b" }}>
                Enter your details to see your personalised results.
              </p>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#475569" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border text-[15px] outline-none"
                    style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#475569" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border text-[15px] outline-none"
                    style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    placeholder="john@example.com"
                  />
                </div>

                {quiz.collect_company && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "#475569" }}>
                        Company Name
                      </label>
                      <input
                        type="text"
                        required
                        value={contactCompany}
                        onChange={(e) => setContactCompany(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border text-[15px] outline-none"
                        style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                        placeholder="Your microfinance bank or company"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "#475569" }}>
                        Website <span style={{ color: "#94a3b8" }}>(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={contactWebsite}
                        onChange={(e) => setContactWebsite(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border text-[15px] outline-none"
                        style={{ borderColor: "#cbd5e1", color: "#1e293b" }}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                        placeholder="www.yourcompany.com"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#475569" }}>
                    Phone Number
                  </label>
                  <PhoneInput
                    international
                    defaultCountry={detectedCountry}
                    countries={SUPPORTED_COUNTRIES}
                    value={contactPhone}
                    onChange={(val) => setContactPhone(val || "")}
                    className="phone-input-wrapper w-full px-4 py-2.5 rounded-lg border text-[15px]"
                    style={{ borderColor: "#cbd5e1", "--PhoneInputCountryFlag-height": "1em" } as React.CSSProperties}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-lg text-white font-semibold text-base disabled:opacity-60 mt-2"
                  style={{ backgroundColor: accent }}
                >
                  {isSubmitting ? "Calculating…" : "See my results →"}
                </button>
              </form>
            </div>
          )}

          {/* ASSESSMENT RESULT — diagnosis mode (e.g. Loan Doctor) */}
          {step === "results" && qualification && quiz.result_mode === "assessment" && (() => {
            const health =
              percentage >= 80
                ? { label: "Healthy", color: "#16a34a", heading: "your loan book is in good shape.", body: "Strong screening and follow-up. The next level is using AI to pre-score every applicant for repayment and benchmark your book against other MFBs." }
                : percentage >= 60
                ? { label: "Fair", color: "#2563eb", heading: "a solid base, with room to tighten.", body: "You have some structure, but more data and pre-screening would cut defaults and free your officers from chasing applicants who never qualify." }
                : percentage >= 40
                ? { label: "Needs work", color: "#f59e0b", heading: "there are real gaps costing you money.", body: "Too many bad loans and too much officer time are slipping through. Pre-scoring applicants before approval would close most of it." }
                : { label: "At risk", color: "#dc2626", heading: "your loan book is exposed.", body: "Approvals lean on gut and officers are bleeding time into applicants who never qualify. This is exactly where defaults come from, and it is fixable." };
            const firstName = contactName.split(" ")[0] || "there";
            return (
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "#94a3b8" }}>
                    Loan book health
                  </p>
                  <div className="text-5xl font-extrabold leading-none" style={{ color: health.color }}>
                    {percentage}%
                  </div>
                  <div className="mt-5">
                    <span
                      className="inline-block px-4 py-1.5 rounded-md text-sm font-semibold"
                      style={{ backgroundColor: health.color + "1a", color: health.color }}
                    >
                      {health.label}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mt-5" style={{ color: "#1e293b" }}>
                    {firstName}, {health.heading}
                  </h2>
                  <p className="text-sm mt-2 max-w-md mx-auto leading-relaxed" style={{ color: "#64748b" }}>
                    {health.body}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                  <h3 className="text-base font-semibold" style={{ color: "#1e293b" }}>
                    What the healthiest MFBs do differently
                  </h3>
                  <div className="space-y-3 mt-4">
                    {[
                      "Pre-score every applicant for repayment before an officer touches them.",
                      "Work only the ready-and-able, and screen out the rest early.",
                      "Use their own data to predict who will actually repay, not gut feel.",
                    ].map((t, i) => (
                      <div key={i} className="flex gap-3 rounded-md p-4" style={{ backgroundColor: "#f8fafc" }}>
                        <span className="text-lg leading-none mt-0.5" style={{ color: accent }}>✓</span>
                        <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>{t}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center">
                  <h3 className="text-base font-semibold mb-1" style={{ color: "#1e293b" }}>
                    Get your free loan-book review
                  </h3>
                  <p className="text-sm mb-5 leading-relaxed max-w-md mx-auto" style={{ color: "#64748b" }}>
                    Book a 15-minute call and we will show you exactly how to pre-score your applicants for
                    repayment, live on your own pipeline.
                  </p>
                  <a
                    href={quiz.cta_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-8 py-3 rounded-lg text-white font-semibold text-base"
                    style={{ backgroundColor: accent }}
                  >
                    Book my free review
                  </a>

                  <div className="mt-6 pt-6 border-t" style={{ borderColor: "#eef2f7" }}>
                    <p className="text-sm mb-3" style={{ color: "#64748b" }}>
                      Or start with the founder&apos;s manifesto:
                    </p>
                    <a
                      href="https://leadscoreai.com/manifesto/episode1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-lg font-semibold text-base border-2 transition-colors"
                      style={{ color: accent, borderColor: accent }}
                    >
                      Watch Manifesto · Episode 1
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </a>
                  </div>
                </div>

                <p className="text-center text-sm" style={{ color: "#94a3b8" }}>
                  We will also reach out at {contactEmail}.
                </p>
              </div>
            );
          })()}

          {/* RESULTS PAGE */}
          {step === "results" && qualification && quiz.result_mode !== "assessment" && (() => {
            const tierColor = TIER_COLORS[qualification];
            const tierName = TIER_NAMES[qualification];
            const nextStep = NEXT_STEPS[qualification];
            const insights = generateInsights(
              answers,
              questions.map((q) => ({ maxPoints: q.max_points })),
              qualification
            );
            const firstName = contactName.split(" ")[0] || "there";

            return (
              <div className="space-y-6">
                {/* Score header */}
                <div className="bg-white rounded-xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "#94a3b8" }}>
                    Your result
                  </p>
                  <div className="text-5xl font-extrabold leading-none" style={{ color: tierColor }}>
                    {percentage}%
                  </div>
                  <p className="text-sm mt-2" style={{ color: "#94a3b8" }}>
                    {score} / {quiz.max_score}
                  </p>
                  <div className="mt-5">
                    <span
                      className="inline-block px-4 py-1.5 rounded-md text-sm font-semibold"
                      style={{ backgroundColor: tierColor + "1a", color: tierColor }}
                    >
                      {tierName}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mt-5" style={{ color: "#1e293b" }}>
                    {firstName}, your result is in
                  </h2>
                </div>

                {/* Personalised insights */}
                <div className="bg-white rounded-xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                  <h3 className="text-base font-semibold" style={{ color: "#1e293b" }}>
                    Your personalised insights
                  </h3>
                  <p className="text-sm mt-1 mb-5" style={{ color: "#64748b" }}>
                    Based on your specific answers, here&apos;s what stands out:
                  </p>
                  <div className="space-y-3">
                    {insights.map((insight, i) => (
                      <div key={i} className="flex gap-3 rounded-md p-4" style={{ backgroundColor: "#f8fafc" }}>
                        <span className="text-lg leading-none mt-0.5">{insight.icon}</span>
                        <div>
                          <h4 className="font-semibold text-sm" style={{ color: "#1e293b" }}>
                            {insight.title}
                          </h4>
                          <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "#64748b" }}>
                            {insight.body}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What happens next */}
                <div className="bg-white rounded-xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center">
                  <h3 className="text-base font-semibold mb-1" style={{ color: "#1e293b" }}>
                    {nextStep.heading}
                  </h3>
                  <p className="text-sm mb-5 leading-relaxed" style={{ color: "#64748b" }}>
                    {nextStep.body}
                  </p>
                  <button
                    className="px-8 py-3 rounded-lg text-white font-semibold text-base"
                    style={{ backgroundColor: accent }}
                  >
                    {nextStep.cta}
                  </button>
                </div>

                <p className="text-center text-sm" style={{ color: "#94a3b8" }}>
                  A member of our team will be in touch shortly at {contactEmail}
                </p>
              </div>
            );
          })()}
        </div>
      </main>

      <footer className="py-5 text-center text-xs" style={{ color: "#94a3b8" }}>
        All responses are confidential · Powered by LeadScoreAI
      </footer>
    </div>
  );
}
