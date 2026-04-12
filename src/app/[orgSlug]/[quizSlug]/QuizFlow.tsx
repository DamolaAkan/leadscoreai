"use client";

import { useState, useCallback, useEffect } from "react";
import PhoneInput, { type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { supabase } from "@/lib/supabase";
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
  const [detectedCountry, setDetectedCountry] = useState<Country>("US");

  // Results
  const [score, setScore] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [qualification, setQualification] = useState<Qualification | null>(null);

  const accent = org.primary_color;

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
    const { data, error } = await supabase
      .from("quiz_responses")
      .insert({
        quiz_id: quiz.id,
        organization_id: org.id,
        session_id: sessionId,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Failed to create response:", error);
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

    // Save to response_answers
    const { error } = await supabase.from("response_answers").insert({
      response_id: responseId,
      question_id: question.id,
      question_order: question.question_order,
      answer_value: { selected: option.value, text: option.text },
      points_awarded: option.points,
    });

    if (error) {
      console.error("Failed to save answer:", error);
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

  // Submit contact form and compute results
  const handleContactSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!responseId) return;

      setIsSubmitting(true);

      const totalScore = answers.reduce((sum, a) => sum + a.points, 0);
      const pct = Math.round((totalScore / quiz.max_score) * 100);
      const qual = getQualification(pct);

      const { error } = await supabase
        .from("quiz_responses")
        .update({
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone || "",
          score: totalScore,
          max_score: quiz.max_score,
          percentage: pct,
          qualification: qual,
          completed_at: new Date().toISOString(),
        })
        .eq("id", responseId);

      if (error) {
        console.error("Failed to update response:", error);
        setIsSubmitting(false);
        return;
      }

      setScore(totalScore);
      setPercentage(pct);
      setQualification(qual);
      setStep("results");
      setIsSubmitting(false);

      // Fire-and-forget: trigger email sequence server-side
      fetch("/api/email/trigger-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId,
          organizationId: org.id,
        }),
      }).catch(() => {});
    },
    [responseId, answers, quiz.max_score, contactName, contactEmail, contactPhone, org.id]
  );

  const progress =
    step === "questions"
      ? ((currentQ + 1) / questions.length) * 100
      : step === "contact"
      ? 100
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header
        className="w-full py-4 px-6 text-white text-center font-semibold text-lg"
        style={{ backgroundColor: accent }}
      >
        {org.name}
      </header>

      {/* Progress bar (visible during questions and contact) */}
      {(step === "questions" || step === "contact") && (
        <div className="w-full h-2 bg-gray-200">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: "#D4A017" }}
          />
        </div>
      )}

      <main className="flex-1 flex items-center justify-center p-4">
        <div className={`w-full ${step === "results" ? "max-w-xl" : "max-w-lg"}`}>
          {/* START PAGE */}
          {step === "start" && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {quiz.start_headline}
              </h1>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                {quiz.start_subheadline}
              </p>
              <button
                onClick={handleStart}
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                {isSubmitting ? "Loading..." : quiz.start_cta_text}
              </button>
              <p className="text-sm text-gray-400 mt-4">
                {questions.length} questions &middot; Takes 2 minutes
              </p>
            </div>
          )}

          {/* QUESTIONS */}
          {step === "questions" && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <p className="text-sm font-medium text-gray-400 mb-2">
                Question {currentQ + 1} of {questions.length}
              </p>
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {questions[currentQ].question_text}
              </h2>

              <div className="space-y-3 mb-8">
                {questions[currentQ].options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedOption(option.value)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedOption === option.value
                        ? "border-current bg-opacity-10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={
                      selectedOption === option.value
                        ? { borderColor: accent, backgroundColor: accent + "15", color: accent }
                        : {}
                    }
                  >
                    <span
                      className={`font-medium ${
                        selectedOption === option.value ? "" : "text-gray-800"
                      }`}
                    >
                      {option.text}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleAnswer}
                disabled={!selectedOption || isSubmitting}
                className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                {isSubmitting
                  ? "Saving..."
                  : currentQ < questions.length - 1
                  ? "Next"
                  : "Continue"}
              </button>
            </div>
          )}

          {/* CONTACT FORM */}
          {step === "contact" && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Almost there!
              </h2>
              <p className="text-gray-600 mb-6 text-center">
                Enter your details to see your personalised results.
              </p>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 text-gray-900"
                    style={{ focusRingColor: accent } as React.CSSProperties}
                    onFocus={(e) =>
                      (e.target.style.boxShadow = `0 0 0 2px ${accent}40`)
                    }
                    onBlur={(e) => (e.target.style.boxShadow = "none")}
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 text-gray-900"
                    onFocus={(e) =>
                      (e.target.style.boxShadow = `0 0 0 2px ${accent}40`)
                    }
                    onBlur={(e) => (e.target.style.boxShadow = "none")}
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <PhoneInput
                    international
                    defaultCountry={detectedCountry}
                    countries={SUPPORTED_COUNTRIES}
                    value={contactPhone}
                    onChange={(val) => setContactPhone(val || "")}
                    className="phone-input-wrapper w-full px-4 py-3 rounded-xl border border-gray-300 focus-within:ring-2 text-gray-900"
                    style={{ "--PhoneInputCountryFlag-height": "1em" } as React.CSSProperties}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
                  style={{ backgroundColor: accent }}
                >
                  {isSubmitting ? "Calculating..." : "See My Results"}
                </button>
              </form>
            </div>
          )}

          {/* RESULTS PAGE */}
          {step === "results" && qualification && (() => {
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
                {/* Hero score card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  {/* Coloured top band */}
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: tierColor }}
                  />

                  <div className="p-8 text-center">
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                      Your Performance Report
                    </p>

                    {/* Large score circle */}
                    <div
                      className="w-40 h-40 rounded-full mx-auto mb-6 flex flex-col items-center justify-center shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${tierColor}20, ${tierColor}40)`,
                        border: `4px solid ${tierColor}`,
                      }}
                    >
                      <span
                        className="text-5xl font-bold leading-none"
                        style={{ color: tierColor }}
                      >
                        {percentage}%
                      </span>
                      <span className="text-xs font-medium text-gray-500 mt-1">
                        {score} / {quiz.max_score}
                      </span>
                    </div>

                    {/* Greeting + tier name */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {firstName}, your result is in
                    </h2>
                    <div
                      className="inline-block px-6 py-2.5 rounded-full text-white font-semibold text-sm"
                      style={{ backgroundColor: tierColor }}
                    >
                      {tierName}
                    </div>
                  </div>
                </div>

                {/* Personalised insights */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Your Personalised Insights
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Based on your specific answers, here&apos;s what stands out:
                  </p>

                  <div className="space-y-5">
                    {insights.map((insight, i) => (
                      <div
                        key={i}
                        className="flex gap-4 p-4 rounded-xl"
                        style={{ backgroundColor: accent + "08" }}
                      >
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
                          style={{ backgroundColor: accent + "18" }}
                        >
                          {insight.icon}
                        </div>
                        <div>
                          <h4
                            className="font-semibold text-sm mb-1"
                            style={{ color: accent }}
                          >
                            {insight.title}
                          </h4>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {insight.body}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What happens next */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div
                    className="px-8 py-5"
                    style={{ backgroundColor: accent + "0a" }}
                  >
                    <h3
                      className="text-lg font-bold"
                      style={{ color: accent }}
                    >
                      {nextStep.heading}
                    </h3>
                  </div>
                  <div className="p-8">
                    <p className="text-gray-700 leading-relaxed mb-6">
                      {nextStep.body}
                    </p>

                    <button
                      className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-all hover:opacity-90 hover:shadow-lg"
                      style={{ backgroundColor: accent }}
                    >
                      {nextStep.cta}
                    </button>
                  </div>
                </div>

                {/* Footer note */}
                <p className="text-center text-sm text-gray-400">
                  A member of our team will be in touch shortly at {contactEmail}
                </p>
              </div>
            );
          })()}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400">
        Powered by LeadscoreAI
      </footer>
    </div>
  );
}
