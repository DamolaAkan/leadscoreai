"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import PhoneInput, { type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { trackLead } from "@/components/MetaPixel";
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
  generateSolarInsights,
  TIER_NAMES,
  SOLAR_TIER_NAMES,
  TIER_COLORS,
  NEXT_STEPS,
  SOLAR_NEXT_STEP,
  SOLAR_WHY_US,
} from "@/lib/insights";
import { computeMatchOutcome, type BuilderOutcome } from "@/lib/builder";
import { calcPoints, computeCalc, defaultInputs, describeCalc, formatMoney, type CalcInputs } from "@/lib/calculator";
import CalculatorStep from "./CalculatorStep";
import { themeFor } from "@/lib/quiz-templates";
import { styleV2For } from "@/lib/quiz-styles-v2";
import { Screen, StyledStart, StyledProgress, StyledAnswers, StyledNav, QuestionEyebrow, StyledResultHero, type V2Ctx } from "./StyledFlow";

const SUPPORTED_COUNTRIES: Country[] = [
  "US", "GB", "CA", "NG", "AE", "SA", "QA", "ZA", "GH", "AU",
];

interface Props {
  org: Organization;
  quiz: Quiz;
  questions: QuizQuestion[];
  // Builder preview: runs the whole quiz locally, nothing is saved.
  preview?: boolean;
  // Embedded in another website via iframe: reports its height to the parent.
  embed?: boolean;
}

type Step = "start" | "questions" | "contact" | "results";

interface AnswerRecord {
  questionId: string;
  questionOrder: number;
  answerValue: string;
  points: number;
  outcome?: string;
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

export default function QuizFlow({ org, quiz, questions, preview = false, embed = false }: Props) {
  const builder = quiz.builder_config || null;
  const rootRef = useRef<HTMLDivElement>(null);
  const [matchOutcome, setMatchOutcome] = useState<BuilderOutcome | null>(null);
  const [step, setStep] = useState<Step>("start");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [sessionId] = useState(() => generateSessionId());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Calculator step (builder quizzes that open with one).
  const calc = builder?.calculator ?? null;
  const [calcInputs, setCalcInputs] = useState<CalcInputs | null>(() => (calc ? defaultInputs(calc) : null));

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

  // Design template (builder quizzes only; everything else stays Classic).
  // Classic is driven by the brand colour; other templates use curated palettes.
  const theme = themeFor(builder?.template);
  const themed = theme.key !== "classic";
  const tx = <T extends object>(style: T): T | Record<string, never> => (themed ? style : {});
  // Client brand color drives the scorecard (design system default, per-client override).
  // The owner's brand colour drives buttons, selections and highlights in every
  // template; a template's own colours apply only while the brand colour is
  // still the LeadScoreAI default purple.
  const brand = org.primary_color || "";
  // A real brand colour overrides a template's accent. LeadScoreAI violet is the
  // default, and #0F766E is the teal the builder used to suggest to everyone,
  // so neither counts as the owner's choice.
  const customBrand = /^#[0-9a-f]{6}$/i.test(brand) && !["#7C3AED", "#0F766E"].includes(brand.toUpperCase());
  const accent = themed && customBrand ? brand : theme.accent ?? org.primary_color;
  const btn = themed && customBrand ? brand : theme.button ?? accent;
  const btnInk = themed ? inkOn(btn) : theme.buttonInk;
  const selInk = themed ? inkOn(accent) : "#ffffff";
  const btnStyle = tx({ color: btnInk, borderRadius: theme.pill ? 999 : 8 });
  const heroGradient = heroGradientFor(org);
  const fontLink = themed ? (
    <>
      {theme.fonts && <link rel="stylesheet" href={theme.fonts} />}
      {/* The phone field's inner input follows the template (dark templates too). */}
      <style>{`.phone-input-wrapper input{background:transparent;color:inherit;outline:none;border:0}`}</style>
    </>
  ) : null;

  // Styles v2: every builder scorecard gets its style's own layout (StyledFlow).
  // The owner's real brand colour still drives buttons and selections.
  const v2 = !!builder;
  const sv = styleV2For(theme.key);
  const v2Sel = customBrand ? brand : sv.sel;
  const v2Btn = customBrand ? brand : sv.btn;
  const v2Ctx: V2Ctx = {
    v: sv,
    btn: v2Btn,
    btnInk: customBrand ? inkOn(brand) : sv.btnInk,
    sel: v2Sel,
    selInk: inkOn(v2Sel),
    emph: customBrand ? brand : sv.emph,
  };
  const v2Fonts = v2 ? (
    <>
      {sv.fonts && <link rel="stylesheet" href={sv.fonts} />}
      <style>{`.phone-input-wrapper input{background:transparent;color:inherit;outline:none;border:0}`}</style>
    </>
  ) : null;
  const v2Logo = (size: number, radius: number) =>
    org.logo_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={org.logo_url} alt={org.name} style={{ width: size, height: size, borderRadius: radius, objectFit: "cover" }} />
    ) : (
      <div
        className="flex items-center justify-center font-bold flex-shrink-0"
        style={{ width: size, height: size, borderRadius: radius, background: v2Btn, color: v2Ctx.btnInk, fontSize: size / 2.3 }}
      >
        {org.name[0]}
      </div>
    );

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
      preview ||
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
  }, [preview, step, responseId, qualification, contactPhone, org.id]);

  // Embedded on another site: tell the parent page how tall we are, so the
  // iframe can grow with the quiz instead of showing a scrollbar.
  useEffect(() => {
    if (!embed || typeof window === "undefined" || window.parent === window) return;
    const el = rootRef.current;
    if (!el) return;
    const post = () =>
      window.parent.postMessage(
        { type: "lsai-quiz-height", quiz: quiz.id, height: Math.ceil(el.getBoundingClientRect().height) },
        "*"
      );
    post();
    const ro = new ResizeObserver(post);
    ro.observe(el);
    return () => ro.disconnect();
  }, [embed, quiz.id, step]);

  // Start quiz — create response row
  const handleStart = useCallback(async () => {
    if (preview) {
      setResponseId("preview");
      setStep("questions");
      return;
    }
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
  }, [preview, quiz.id, org.id, sessionId]);

  // Submit answer for current question
  const handleAnswer = useCallback(async () => {
    if (!responseId) return;
    const question = questions[currentQ];

    // Calculator step: save their numbers and the computed figures as the answer.
    if (question.question_type === "calculator") {
      if (!calc || !calcInputs) return;
      const result = computeCalc(calc, calcInputs);
      const points = calcPoints(calc, calcInputs, result);
      const text = describeCalc(calc, calcInputs, result);
      setIsSubmitting(true);
      if (!preview) {
        const res = await fetch("/api/scorecard/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responseId,
            questionId: question.id,
            questionOrder: question.question_order,
            answerValue: { selected: "calculator", text, inputs: calcInputs, result },
            pointsAwarded: points,
          }),
        });
        if (!res.ok) {
          console.error("Failed to save answer");
          setIsSubmitting(false);
          return;
        }
      }
      setAnswers([
        ...answers,
        { questionId: question.id, questionOrder: question.question_order, answerValue: "calculator", points },
      ]);
      if (currentQ < questions.length - 1) setCurrentQ(currentQ + 1);
      else setStep("contact");
      setIsSubmitting(false);
      return;
    }

    if (!selectedOption) return;
    const option = question.options.find((o) => o.value === selectedOption);
    if (!option) return;

    setIsSubmitting(true);

    // Save to response_answers server-side (service role). Preview saves nothing.
    if (!preview) {
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
    }

    const newAnswer: AnswerRecord = {
      questionId: question.id,
      questionOrder: question.question_order,
      answerValue: option.value,
      points: option.points,
      outcome: option.outcome,
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
  }, [preview, selectedOption, responseId, questions, currentQ, answers, calc, calcInputs]);

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
      const pct = quiz.max_score > 0 ? Math.round((totalScore / quiz.max_score) * 100) : 0;
      const qual = getQualification(pct);
      const outcome = builder ? computeMatchOutcome(builder, answers.map((a) => a.outcome)) : null;

      // Builder preview: show the result without saving a lead or sending anything.
      if (preview) {
        setScore(totalScore);
        setPercentage(pct);
        setQualification(qual);
        setMatchOutcome(outcome);
        setStep("results");
        setIsSubmitting(false);
        return;
      }

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
          result_outcome: outcome?.title ?? null,
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
      setMatchOutcome(outcome);
      setStep("results");
      setIsSubmitting(false);

      // Meta pixel conversion with Advanced Matching (loandoctor MFB campaign
      // only; no-op elsewhere). Passes the contact info we just collected so
      // Meta can match the lead — big lift to Event Match Quality.
      if (org.slug === "loandoctor") {
        trackLead({
          email: contactEmail,
          phone: contactPhone || undefined,
          fullName: contactName,
          externalId: responseId || undefined,
        });
      }

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
    [preview, builder, responseId, answers, quiz.max_score, contactName, contactEmail, contactPhone, contactCompany, contactWebsite, org.slug, org.id]
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
    e.target.style.borderColor = theme.inputBorder;
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
        style={{ width: size, height: size, backgroundColor: themed ? btn : accent, fontSize: size / 2.4 }}
      >
        {org.name[0]}
      </div>
    );

  // Builder preview: owners restart from the preview bar while editing. The
  // results page itself matches what customers see (no retake button).
  const restart = () => {
    setStep("start");
    setCurrentQ(0);
    setAnswers([]);
    setSelectedOption(null);
    setResponseId(null);
    setScore(0);
    setPercentage(0);
    setQualification(null);
    setMatchOutcome(null);
  };

  const previewBanner = preview ? (
    <div
      className="w-full flex items-center justify-center gap-3 text-xs font-semibold py-2 px-3"
      style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
    >
      <span>Preview · answers here are not saved and nobody is notified</span>
      {step !== "start" && (
        <button
          onClick={restart}
          className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ backgroundColor: "#92400e", color: "#fef3c7" }}
        >
          ↺ Restart
        </button>
      )}
    </div>
  ) : null;


  // Contact details step (shared by every layout).
  const contactCard = (
            <div className="bg-white rounded-xl p-7 md:p-10 shadow-[0_4px_12px_rgba(0,0,0,0.06)]" style={tx({ background: theme.cardBg, boxShadow: theme.cardShadow, borderRadius: theme.cardRadius, border: `1px solid ${theme.cardBorder}` })}>
              <h2
                className="text-2xl font-bold text-center mb-2"
                style={{ color: theme.title, ...tx({ fontFamily: theme.headFont, fontWeight: theme.headWeight ?? 700, fontSize: 34 }) }}
              >
                Almost there!
              </h2>
              <p className="text-center mb-7 text-sm" style={{ color: theme.muted }}>
                Enter your details to see your personalised results.
              </p>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: theme.body }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border text-[15px] outline-none"
                    style={{ borderColor: theme.inputBorder, color: theme.inputInk, backgroundColor: theme.inputBg, ...tx({ borderRadius: 14 }) }}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: theme.body }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border text-[15px] outline-none"
                    style={{ borderColor: theme.inputBorder, color: theme.inputInk, backgroundColor: theme.inputBg, ...tx({ borderRadius: 14 }) }}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    placeholder="john@example.com"
                  />
                </div>

                {quiz.collect_company && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: theme.body }}>
                        Company Name
                      </label>
                      <input
                        type="text"
                        required
                        value={contactCompany}
                        onChange={(e) => setContactCompany(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border text-[15px] outline-none"
                        style={{ borderColor: theme.inputBorder, color: theme.inputInk, backgroundColor: theme.inputBg, ...tx({ borderRadius: 14 }) }}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                        placeholder="Your microfinance bank or company"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: theme.body }}>
                        Website <span style={{ color: "#94a3b8" }}>(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={contactWebsite}
                        onChange={(e) => setContactWebsite(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border text-[15px] outline-none"
                        style={{ borderColor: theme.inputBorder, color: theme.inputInk, backgroundColor: theme.inputBg, ...tx({ borderRadius: 14 }) }}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                        placeholder="www.yourcompany.com"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: theme.body }}>
                    Phone Number
                  </label>
                  <PhoneInput
                    international
                    defaultCountry={detectedCountry}
                    countries={SUPPORTED_COUNTRIES}
                    value={contactPhone}
                    onChange={(val) => setContactPhone(val || "")}
                    className="phone-input-wrapper w-full px-4 py-2.5 rounded-lg border text-[15px]"
                    style={{ borderColor: theme.inputBorder, color: theme.inputInk, backgroundColor: theme.inputBg, ...tx({ borderRadius: 14 }), "--PhoneInputCountryFlag-height": "1em" } as unknown as React.CSSProperties}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-lg text-white font-semibold text-base disabled:opacity-60 mt-2"
                  style={{ backgroundColor: themed ? btn : accent, ...btnStyle }}
                >
                  {isSubmitting ? "Calculating…" : "See my results →"}
                </button>
              </form>
            </div>
  );

  // Results for builder scorecards (Qualify or Match).
  const builderResults =
    step === "results" && qualification && builder
      ? (() => {
            const firstName = contactName.split(" ")[0] || "there";
            const band = builder.results[qualification];

            // Each answer with the insight the AI wrote for it, for the breakdown.
            const picks = answers.flatMap((a) => {
              const q = questions.find((x) => x.id === a.questionId);
              const o = q?.options.find((x) => x.value === a.answerValue);
              if (!q || !o) return [];
              const topic = builder.topics?.[q.question_order - 1] || q.question_text;
              const level: "strong" | "ok" | "work" | "none" =
                q.max_points <= 0
                  ? "none"
                  : o.points >= q.max_points
                  ? "strong"
                  : o.points <= q.max_points * 0.4
                  ? "work"
                  : "ok";
              return [{ q, o, topic, level }];
            });
            const marker = {
              strong: { icon: "✓", color: "#16a34a", bg: "#dcfce7" },
              ok: { icon: "•", color: "#2563eb", bg: "#dbeafe" },
              work: { icon: "!", color: "#d97706", bg: "#fef3c7" },
              none: { icon: "•", color: accent, bg: accent + "1a" },
            } as const;
            // Viral loop: people who finish a quiz pass it on to friends on WhatsApp.
            const shareUrl =
              typeof window !== "undefined" ? `${window.location.origin}/${org.slug}/${quiz.slug}` : "";
            // A WhatsApp link gets a proper green WhatsApp button.
            const isWa = !!quiz.cta_url && /(wa\.me|whatsapp\.com)/i.test(quiz.cta_url);
            const waIcon = (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.2.5.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.7-.1 1.2Z" />
              </svg>
            );
            const ctaLabel = builder.cta_text || (isWa ? "Chat on WhatsApp" : "Get in touch");
            // Their calculator figures, recomputed from what they entered.
            const estimate =
              calc && calcInputs && answers.some((a) => a.answerValue === "calculator")
                ? (() => {
                    const r = computeCalc(calc, calcInputs);
                    const reverse = calc.type === "loan" && calcInputs.mode === "budget";
                    return (
                      <div
                        className="bg-white rounded-xl p-7 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center"
                        style={tx({ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: theme.cardRadius, boxShadow: theme.cardShadow })}
                      >
                        <h3 className="text-base font-semibold" style={{ color: theme.text }}>
                          Your estimate
                        </h3>
                        <p className="font-extrabold mt-2" style={{ fontSize: "clamp(24px, 5vw, 32px)", color: accent }}>
                          {reverse
                            ? `Up to ${formatMoney(r.maxPrice ?? 0, calc.currency)}`
                            : `${formatMoney(r.monthly, calc.currency)} a month`}
                        </p>
                        <p className="text-sm mt-2 leading-relaxed" style={{ color: theme.body }}>
                          {describeCalc(calc, calcInputs, r)}
                        </p>
                        <p className="text-xs mt-3" style={{ color: theme.faint }}>
                          An estimate to guide you, not a loan offer. {org.name} will confirm your exact terms.
                        </p>
                      </div>
                    );
                  })()
                : null;

            // ── Template results: an elegant hero card with the WhatsApp CTA inside ──
            {
              const cardS: React.CSSProperties = {
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: sv.radius <= 4 ? sv.radius : theme.cardRadius,
                boxShadow: theme.cardShadow,
              };
              const heading: React.CSSProperties = {
                fontFamily: theme.headFont,
                fontWeight: theme.headWeight ?? 700,
                color: theme.title,
                letterSpacing: "-0.01em",
              };
              const rowsT = (rows: typeof picks) =>
                rows
                  .filter((r) => r.o.insight)
                  .map((r) => (
                    <div key={r.q.id} className="flex gap-3 py-3.5 border-t first:border-t-0" style={{ borderColor: theme.line }}>
                      <span
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                        style={
                          r.level === "none"
                            ? { backgroundColor: btn + "22", color: theme.dark ? "#ffffff" : btn }
                            : { backgroundColor: marker[r.level].bg, color: marker[r.level].color }
                        }
                      >
                        {marker[r.level].icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold" style={{ color: theme.text }}>
                          {r.topic}
                          <span className="font-normal" style={{ color: theme.faint }}>
                            {" "}· {r.o.emoji ? `${r.o.emoji} ` : ""}
                            {r.o.text}
                          </span>
                        </p>
                        <p className="text-sm mt-1 leading-relaxed" style={{ color: theme.body }}>
                          {r.o.insight}
                        </p>
                      </div>
                    </div>
                  ));
              const section = (title: string, children: React.ReactNode) => (
                <div className="p-7 md:p-8" style={cardS}>
                  <h3 className="mb-2" style={{ ...heading, fontSize: 26 }}>
                    {title}
                  </h3>
                  {children}
                </div>
              );
              const nextT = band.next_steps?.length
                ? section(
                    "Your next steps",
                    <ol className="space-y-3 mt-3">
                      {band.next_steps.map((st, i) => (
                        <li key={i} className="flex gap-3 items-start">
                          <span
                            className="flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
                            style={{ backgroundColor: btn, color: btnInk }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-[15px] leading-relaxed" style={{ color: theme.body }}>
                            {st}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )
                : null;
              const shareT = !preview && shareUrl ? (
                <div className="text-center">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${quiz.start_headline} Take this quick 2-minute check: ${shareUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-sm border-2"
                    style={{ borderColor: "#25D366", color: sv.resultDark || theme.dark ? "#25D366" : "#128C7E", borderRadius: 999 }}
                  >
                    {waIcon}
                    Share with a friend
                  </a>
                </div>
              ) : null;
              const note = (
                <p className="text-center text-sm" style={{ color: sv.resultDark ? "rgba(255,255,255,0.72)" : sv.faint }}>
                  {org.name} will be in touch at {contactEmail || "the details you shared"}.
                </p>
              );

              // Styles v2 hero, shared by Match and Qualify results.
              const cleanDetails = (d: unknown) =>
                Array.isArray(d)
                  ? d
                      .filter((x): x is { label: string; value: string } => !!x && typeof x.label === "string" && typeof x.value === "string" && !!x.value.trim())
                      .slice(0, 6)
                  : [];
              const heroFor = (headline: string, body: string, tier: string, details: unknown, price: unknown) => (
                <StyledResultHero
                  ctx={v2Ctx}
                  percentage={percentage}
                  tierLabel={tier}
                  tierColor={TIER_COLORS[qualification]}
                  headline={headline}
                  body={body}
                  firstName={firstName}
                  orgName={org.name}
                  details={cleanDetails(details)}
                  price={typeof price === "string" ? price.trim() : ""}
                  bars={picks.filter((r) => r.q.max_points > 0).map((r) => ({ topic: r.topic, ratio: r.o.points / r.q.max_points }))}
                  insights={picks.filter((r) => r.o.insight).map((r) => ({ topic: r.topic, text: r.o.insight as string, good: r.level === "strong" || r.level === "ok" || r.level === "none" }))}
                  steps={band.next_steps ?? []}
                  cta={quiz.cta_url ? { href: quiz.cta_url, label: ctaLabel, isWa } : null}
                  resultImg={builder.images?.result ?? null}
                  isMatch={builder.kind === "match" && !!matchOutcome}
                />
              );

              if (builder.kind === "match" && matchOutcome) {
                const whyPicks = picks.filter((r) => r.o.outcome === matchOutcome.key && r.o.insight).slice(0, 4);
                const why = rowsT(whyPicks);
                // Only answers not already explained above.
                const good = rowsT(picks.filter((r) => r.q.max_points > 0 && !whyPicks.includes(r)));
                return (
                  <div className="space-y-5">
                    {heroFor(matchOutcome.title, matchOutcome.description, `${percentage}% match`, matchOutcome.details, matchOutcome.price)}
                    {estimate}
                    {why.length ? section("Why this fits you", why) : null}
                    {matchOutcome.recommendation
                      ? section(
                          "Our recommendation",
                          <p className="text-[15px] leading-relaxed" style={{ color: theme.body }}>
                            {matchOutcome.recommendation}
                          </p>
                        )
                      : null}
                    {good.length ? section("Good to know", good) : null}
                    {sv.result === "plan" ? null : nextT}
                    {shareT}
                    {note}
                  </div>
                );
              }

              const rows = rowsT(picks);
              return (
                <div className="space-y-5">
                  {heroFor(band.headline, band.body, band.label, band.details, band.price)}
                  {estimate}
                  {rows.length && sv.result !== "letter" ? section("Your answers, analysed", rows) : null}
                  {sv.result === "plan" ? null : nextT}
                  {shareT}
                  {note}
                </div>
              );
            }

          })()
      : null;

  // ── STYLES v2: builder scorecards ──
  if (v2) {
    const q = questions[currentQ];
    const topicAt = (i: number) => builder?.topics?.[(questions[i]?.question_order ?? i + 1) - 1] ?? "";
    if (step === "start") {
      return (
        <div ref={rootRef}>
          {v2Fonts}
          {previewBanner}
          <StyledStart
            ctx={v2Ctx}
            orgName={org.name}
            logo={v2Logo}
            initial={org.name[0] ?? "•"}
            headline={quiz.start_headline}
            sub={quiz.start_subheadline}
            ctaText={quiz.start_cta_text}
            count={questions.length}
            topics={(builder?.topics ?? []).filter(Boolean)}
            heroImg={builder?.images?.hero ?? null}
            onStart={handleStart}
            busy={isSubmitting}
            embed={embed}
          />
        </div>
      );
    }
    const screenBg = step === "results" ? sv.resultBg : step === "questions" ? sv.qBg ?? sv.bg : sv.bg;
    const footInk = step === "results" ? (sv.resultDark ? "rgba(255,255,255,0.55)" : sv.faint) : sv.dark ? "rgba(255,255,255,0.5)" : sv.faint;
    return (
      <div ref={rootRef}>
        {v2Fonts}
        {previewBanner}
        <Screen bg={screenBg} font={sv.bodyFont} embed={embed}>
          <div className="flex-1 flex flex-col gap-6 px-5 sm:px-6 pt-6 pb-8">
            {step === "questions" && q && (
              <>
                <StyledProgress ctx={v2Ctx} index={currentQ} total={questions.length} topic={topicAt(currentQ)} onBack={handleBack} />
                <div className="flex flex-col gap-2.5">
                  <QuestionEyebrow ctx={v2Ctx} topic={topicAt(currentQ)} index={currentQ} total={questions.length} />
                  <h2 style={{ fontFamily: sv.headFont, fontWeight: sv.headWeight, fontSize: "clamp(27px, 7vw, 32px)", lineHeight: 1.1, letterSpacing: sv.headWeight >= 700 ? "-0.02em" : "0", color: sv.dark ? "#ffffff" : sv.ink, margin: 0 }}>
                    {q.question_text}
                  </h2>
                </div>
                {q.question_type === "calculator" && calc && calcInputs ? (
                  <CalculatorStep config={calc} inputs={calcInputs} accent={v2Sel} onChange={setCalcInputs} />
                ) : (
                  <StyledAnswers ctx={v2Ctx} options={q.options} selected={selectedOption} onSelect={setSelectedOption} />
                )}
                <div className="mt-auto pt-2">
                  <StyledNav
                    ctx={v2Ctx}
                    onBack={handleBack}
                    onNext={handleAnswer}
                    label={isSubmitting ? "Saving…" : currentQ < questions.length - 1 ? "Next" : "Continue"}
                    disabled={(!selectedOption && q.question_type !== "calculator") || isSubmitting}
                  />
                </div>
              </>
            )}
            {step === "contact" && contactCard}
            {builderResults}
          </div>
          <p className="pb-6 text-center text-[12px] font-medium" style={{ color: footInk }}>
            All responses are confidential
            {!hideBranding(org) && " · Powered by LeadScoreAI"}
          </p>
        </Screen>
      </div>
    );
  }

  // ── START — dark hero ──
  if (step === "start") {
    return (
      <div ref={rootRef}>
      {fontLink}
      {previewBanner}
      <div
        className={`${embed ? "min-h-[560px]" : "min-h-screen"} flex flex-col items-center justify-center px-5 py-12 text-center`}
        style={{
          background: theme.startBg ?? heroGradient,
          fontFamily: theme.bodyFont,
        }}
      >
        <div className="w-full max-w-2xl">
          {org.slug !== "loandoctor" && (
            <div className={`mx-auto ${themed ? "mb-6" : "mb-10"} w-20 h-20`}>
              <Logo size={80} />
            </div>
          )}
          {themed && (
            <p className="mb-6 text-[12px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.eyebrow }}>
              {org.name}
            </p>
          )}
          <h1
            className="font-extrabold text-white mb-5"
            style={{
              fontSize: themed
                ? quiz.start_headline.length > 70
                  ? "clamp(30px, 5.4vw, 46px)"
                  : "clamp(40px, 7.4vw, 64px)"
                : quiz.start_headline.length > 70
                  ? "clamp(24px, 4.4vw, 38px)"
                  : "clamp(34px, 6vw, 52px)",
              lineHeight: themed ? 1.06 : 1.18,
              ...tx({ color: theme.startInk, fontFamily: theme.headFont, fontWeight: theme.headWeight ?? 800, letterSpacing: "-0.01em" }),
            }}
          >
            {quiz.start_headline}
          </h1>
          <p className="text-lg leading-relaxed mb-10 max-w-xl mx-auto" style={{ color: theme.startSub }}>
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
            style={{ backgroundColor: themed ? btn : accent, ...btnStyle }}
          >
            {isSubmitting ? "Loading…" : quiz.start_cta_text}
          </button>
          <p className="mt-6 text-sm" style={{ color: theme.startNote }}>
            ✓ {questions.length} questions &nbsp;·&nbsp; ✓ Takes about 2 minutes &nbsp;·&nbsp; ✓ Free
          </p>
        </div>
      </div>
      </div>
    );
  }

  // ── QUESTIONS / CONTACT / RESULTS — light layout ──
  return (
    <div
      ref={rootRef}
      className={`${embed ? "" : "min-h-screen"} flex flex-col`}
      style={{
        background: theme.pageBg,
        fontFamily: theme.bodyFont,
      }}
    >
      {fontLink}
      {previewBanner}
      {/* Header */}
      <header className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]" style={tx({ background: theme.headerBg, boxShadow: theme.headerShadow })}>
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Logo size={32} />
              <span className="font-bold" style={{ color: theme.headerInk }}>
                {org.name}
              </span>
            </div>
            {step === "questions" && (
              <span className="text-sm" style={{ color: theme.headerMuted }}>
                Step {currentQ + 1} of {questions.length}
              </span>
            )}
          </div>
          {(step === "questions" || step === "contact") && (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: themed ? (theme.dark || theme.headerBg.startsWith("#1") ? "rgba(255,255,255,0.18)" : theme.track) : "#e2e8f0" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: themed ? btn : accent }}
              />
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-5 py-10">
        <div className="max-w-2xl mx-auto">
          {/* QUESTIONS */}
          {step === "questions" && (
            <div className="bg-white rounded-xl p-7 md:p-10 shadow-[0_4px_12px_rgba(0,0,0,0.06)]" style={tx({ background: theme.cardBg, boxShadow: theme.cardShadow, borderRadius: theme.cardRadius, border: `1px solid ${theme.cardBorder}` })}>
              <h2
                className="font-semibold mb-8"
                style={{
                  fontSize: theme.qSize,
                  lineHeight: themed ? 1.12 : 1.3,
                  color: theme.title,
                  ...tx({ fontFamily: theme.headFont, fontWeight: theme.headWeight ?? 600 }),
                }}
              >
                {questions[currentQ].question_text}
              </h2>

              {/* Calculator step: sliders and a live estimate. */}
              {questions[currentQ].question_type === "calculator" && calc && calcInputs ? (
                <CalculatorStep config={calc} inputs={calcInputs} accent={accent} onChange={setCalcInputs} />
              ) : /* Builder quizzes with emoji on every answer: big tappable picture cards. */
              builder && questions[currentQ].options.every((o) => o.emoji) ? (
                <div className={`grid gap-3 mb-9 ${questions[currentQ].options.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"}`}>
                  {questions[currentQ].options.map((option) => {
                    const isSel = selectedOption === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setSelectedOption(option.value)}
                        className={`rounded-xl border-2 px-3 py-5 flex ${
                          questions[currentQ].options.length === 3 ? "flex-row sm:flex-col" : "flex-col"
                        } items-center gap-3 text-center transition-transform active:scale-[0.98]`}
                        style={{
                          ...(isSel
                            ? themed && theme.optFill
                              ? { borderColor: accent, backgroundColor: accent }
                              : { borderColor: accent, backgroundColor: accent + "12" }
                            : { borderColor: theme.optBorder, backgroundColor: theme.optBg }),
                          ...tx({ borderRadius: theme.optRadius }),
                        }}
                      >
                        <span className="text-4xl leading-none">{option.emoji}</span>
                        <span
                          className="text-[14.5px] font-medium leading-snug"
                          style={{ color: isSel && themed && theme.optFill ? selInk : theme.text }}
                        >
                          {option.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
              <div className="space-y-3 mb-9">
                {questions[currentQ].options.map((option) => {
                  const isSel = selectedOption === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedOption(option.value)}
                      className="w-full text-left flex items-center p-4 rounded-lg border-2 transition-colors"
                      style={{
                        ...(isSel
                          ? themed && theme.optFill
                            ? { borderColor: accent, backgroundColor: accent }
                            : { borderColor: accent, backgroundColor: accent + "12" }
                          : { borderColor: theme.optBorder, backgroundColor: theme.optBg }),
                        ...tx({ borderRadius: theme.optRadius }),
                      }}
                    >
                      <span
                        className="w-5 h-5 rounded-full border-2 mr-3 flex-shrink-0 flex items-center justify-center"
                        style={{ borderColor: isSel ? (themed && theme.optFill ? selInk : accent) : theme.inputBorder }}
                      >
                        {isSel && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themed && theme.optFill ? selInk : accent }} />
                        )}
                      </span>
                      {option.emoji && <span className="text-xl mr-2.5 leading-none">{option.emoji}</span>}
                      <span
                        className="text-[15px] font-medium"
                        style={{ color: isSel && themed && theme.optFill ? selInk : theme.text }}
                      >
                        {option.text}
                      </span>
                    </button>
                  );
                })}
              </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: theme.backBg, color: theme.backInk, ...tx({ borderRadius: theme.pill ? 999 : 8 }) }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleAnswer}
                  disabled={(!selectedOption && questions[currentQ].question_type !== "calculator") || isSubmitting}
                  className="px-7 py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: themed ? btn : accent, ...btnStyle }}
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
                        ? { backgroundColor: themed ? btn : accent, color: "white" }
                        : i < currentQ
                        ? { backgroundColor: (themed ? btn : accent) + "22", color: themed ? btn : accent }
                        : { backgroundColor: theme.track, color: theme.faint }
                    }
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CONTACT FORM */}
          {step === "contact" && contactCard}

          {/* BUILDER RESULT — quizzes made in the chat builder (Qualify or Match) */}
          {builderResults}

          {/* ASSESSMENT RESULT — diagnosis mode (e.g. Loan Doctor) */}
          {step === "results" && qualification && !builder && quiz.result_mode === "assessment" && (() => {
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

                <div className="bg-white rounded-xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                  <h3 className="text-base font-semibold mb-1 text-center" style={{ color: "#1e293b" }}>
                    Ready to fix it? Here is the investment.
                  </h3>
                  <p className="text-sm mb-6 leading-relaxed max-w-md mx-auto text-center" style={{ color: "#64748b" }}>
                    Every engagement starts with a one-time setup and a low monthly. We build it for
                    your business, and you go live in 7 days.
                  </p>

                  <div className="space-y-3 text-left">
                    {[
                      {
                        name: "STARTER",
                        desc: "Scorecard + qualification for a single offer.",
                        price: "$500",
                        monthly: "then $60/mo",
                        features: ["Custom scorecard build", "Hot / Warm / Cold scoring", "Branded results page", "Admin dashboard & CSV export"],
                        popular: false,
                      },
                      {
                        name: "SCALE",
                        desc: "Full analytics + predictive layer for teams.",
                        price: "$2,000",
                        monthly: "then $100/mo",
                        features: ["Everything in Starter", "Unlimited scorecards & responses", "Market intelligence analytics", "Predictive conversion insights", "Agent-level attribution"],
                        popular: true,
                      },
                      {
                        name: "ENTERPRISE",
                        desc: "White-label, bespoke build, dedicated team.",
                        price: "Custom",
                        monthly: "let's talk",
                        features: ["Everything in Scale", "White-label, your brand only", "Custom integrations & exports", "Dedicated account manager"],
                        popular: false,
                      },
                    ].map((tier) => (
                      <div
                        key={tier.name}
                        className="rounded-lg border p-5 relative"
                        style={{ borderColor: tier.popular ? accent : "#e2e8f0", borderWidth: tier.popular ? 2 : 1 }}
                      >
                        {tier.popular && (
                          <span
                            className="absolute -top-2.5 left-4 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide text-white"
                            style={{ backgroundColor: accent }}
                          >
                            MOST POPULAR
                          </span>
                        )}
                        <div className="flex items-baseline justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-xs font-bold tracking-widest" style={{ color: tier.popular ? accent : "#64748b" }}>
                              {tier.name}
                            </p>
                            <p className="text-sm mt-1" style={{ color: "#64748b" }}>{tier.desc}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-extrabold leading-none" style={{ color: "#1e293b" }}>
                              {tier.price}
                              {tier.price !== "Custom" && (
                                <span className="text-[10px] font-semibold align-middle ml-1.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: "#f3effc", color: accent }}>
                                  ONE-TIME
                                </span>
                              )}
                            </p>
                            <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{tier.monthly}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t space-y-1.5" style={{ borderColor: "#f1f5f9" }}>
                          {tier.features.map((f) => (
                            <p key={f} className="text-[13px]" style={{ color: "#475569" }}>
                              <span style={{ color: accent }}>+</span> {f}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-center mt-6">
                    <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: "#64748b" }}>
                      If this investment makes sense for your operation, book your setup call. One
                      call: your loan products, your scorecard design, your go-live date.
                    </p>
                    <a
                      href={quiz.cta_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-8 py-3 rounded-lg text-white font-semibold text-base"
                      style={{ backgroundColor: accent }}
                    >
                      Book my setup call
                    </a>
                  </div>

                  <div className="mt-6 pt-6 border-t text-center" style={{ borderColor: "#eef2f7" }}>
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
          {step === "results" && qualification && !builder && quiz.result_mode !== "assessment" && (() => {
            const isSolar =
              ((org as { industry?: string }).industry || "") === "solar_energy";
            const tierColor = TIER_COLORS[qualification];
            const tierName = (isSolar ? SOLAR_TIER_NAMES : TIER_NAMES)[qualification];
            const nextStep = isSolar ? SOLAR_NEXT_STEP : NEXT_STEPS[qualification];
            const insights = (isSolar ? generateSolarInsights : generateInsights)(
              answers,
              questions.map((q) => ({ maxPoints: q.max_points })),
              qualification
            );
            const firstName = contactName.split(" ")[0] || "there";

            return (
              <div className="space-y-6">
                {/* Score header — brand-coloured hero */}
                <div
                  className="rounded-2xl p-8 text-center text-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)]"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "rgba(255,255,255,0.85)" }}>
                    Your result
                  </p>
                  <div className="text-6xl font-extrabold leading-none text-white">
                    {percentage}%
                  </div>
                  <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {score} / {quiz.max_score}
                  </p>
                  <div className="mt-5">
                    <span
                      className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-white"
                      style={{ color: tierColor }}
                    >
                      {tierName}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mt-5 text-white">
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
                      <div key={i} className="flex gap-3 rounded-xl p-4" style={{ backgroundColor: accent + "0d" }}>
                        <span
                          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                          style={{ backgroundColor: accent + "1f" }}
                        >
                          {insight.icon}
                        </span>
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

                {/* Why us — pitch the client's own offering (solar) */}
                {isSolar && (
                  <div
                    className="rounded-xl p-8"
                    style={{ backgroundColor: accent + "0d", border: `1px solid ${accent}2e` }}
                  >
                    <h3 className="text-base font-semibold" style={{ color: accent }}>
                      Why {org.name}
                    </h3>
                    <p className="text-sm mt-1 mb-5" style={{ color: "#64748b" }}>
                      What you get when you go solar with us
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SOLAR_WHY_US.map((w, i) => (
                        <div key={i} className="flex gap-3 items-center">
                          <span
                            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base"
                            style={{ backgroundColor: accent + "1f" }}
                          >
                            {w.icon}
                          </span>
                          <span className="text-sm leading-relaxed" style={{ color: "#475569" }}>
                            {w.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* What happens next */}
                <div className="bg-white rounded-xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-center">
                  <h3 className="text-base font-semibold mb-1" style={{ color: accent }}>
                    {nextStep.heading}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>
                    {nextStep.body}
                  </p>
                </div>

                <p className="text-center text-sm" style={{ color: "#94a3b8" }}>
                  A member of our team will be in touch shortly at {contactEmail}
                </p>
              </div>
            );
          })()}
        </div>
      </main>

      <footer className="py-5 text-center text-xs" style={{ color: theme.faint }}>
        All responses are confidential
        {!hideBranding(org) && " · Powered by LeadScoreAI"}
      </footer>
    </div>
  );
}

// Readable text on a coloured button: dark ink on light colours, white otherwise.
function inkOn(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.68 ? "#1a1a1a" : "#ffffff";
}

// Paid self-serve Pro accounts (in date) drop the LeadScoreAI credit.
function hideBranding(org: Organization): boolean {
  const o = org as Organization & { billing_tier?: string | null; billing_status?: string | null; current_period_end?: string | null };
  return (
    o.billing_tier === "builder" &&
    o.billing_status === "active" &&
    !!o.current_period_end &&
    new Date(o.current_period_end).getTime() > Date.now()
  );
}
