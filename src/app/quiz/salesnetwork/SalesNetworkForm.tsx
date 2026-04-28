"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Quiz, QuizQuestion } from "@/lib/types";

const QUIZ_ID = "737c9d0b-bac4-4b8c-ba49-ad2342d20f27";
const ORG_ID = "7bdff093-478d-4ace-b282-123944232b2e";

interface Props {
  quiz: Quiz;
  questions: QuizQuestion[];
}

interface FormErrors {
  [key: string]: string;
}

export default function SalesNetworkForm({ quiz, questions }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactLinkedin, setContactLinkedin] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const textQuestions = questions.filter((q) => q.question_type === "text");
  const radioQuestion = questions.find((q) => q.question_type === "radio");

  function validate(): FormErrors {
    const errs: FormErrors = {};

    // Validate text questions (all required)
    for (const q of textQuestions) {
      if (!answers[q.id]?.trim()) {
        errs[q.id] = "This field is required";
      }
    }

    // Validate radio question (required)
    if (radioQuestion && !answers[radioQuestion.id]) {
      errs[radioQuestion.id] = "Please select an option";
    }

    // Validate contact fields
    if (!contactName.trim()) {
      errs.contactName = "Full name is required";
    }
    if (!contactEmail.trim()) {
      errs.contactEmail = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      errs.contactEmail = "Please enter a valid email address";
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      // Scroll to first error
      const firstErrorKey = Object.keys(validationErrors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);

    try {
      const sessionId = `lsai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 1. Create quiz_response (store LinkedIn in agent_code field)
      const { data: response, error: responseError } = await supabase
        .from("quiz_responses")
        .insert({
          quiz_id: QUIZ_ID,
          organization_id: ORG_ID,
          session_id: sessionId,
          contact_name: contactName.trim(),
          contact_email: contactEmail.trim(),
          contact_phone: null,
          agent_code: contactLinkedin.trim() || null,
          score: 0,
          qualification: null,
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (responseError || !response) {
        console.error("Failed to create response:", responseError);
        setIsSubmitting(false);
        return;
      }

      // 2. Create response_answer rows
      const answerRows = questions.map((q) => ({
        response_id: response.id,
        question_id: q.id,
        question_order: q.question_order,
        answer_value: { value: answers[q.id] || "" },
        points_awarded: 0,
      }));

      const { error: answersError } = await supabase
        .from("response_answers")
        .insert(answerRows);

      if (answersError) {
        console.error("Failed to save answers:", answersError);
      }

      // 3. Create email_sequence row
      const { error: seqError } = await supabase
        .from("email_sequences")
        .insert({
          response_id: response.id,
          organization_id: ORG_ID,
          email_address: contactEmail.trim(),
          sequence_track: "warm",
          current_step: 0,
          next_send_at: new Date().toISOString(),
          completed: false,
        });

      if (seqError) {
        console.error("Failed to create email sequence:", seqError);
      }

      // 4. Send thank-you email + notification to Akanbi (fire-and-forget)
      fetch("/api/email/salesnetwork-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId: response.id }),
      }).catch(() => {});

      // 5. Redirect to thank you page
      router.push("/quiz/salesnetwork/thankyou");
    } catch (err) {
      console.error("Submission error:", err);
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#0A1628", color: "#FFFFFF" }}
    >
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-10">
          <h1
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            THE SALES NETWORK
          </h1>
          <div
            className="w-24 h-px mx-auto mb-8"
            style={{ backgroundColor: "#C9933A" }}
          />
          <h2 className="text-2xl font-bold mb-3">{quiz.start_headline}</h2>
          <p className="text-base" style={{ color: "#9CA3AF" }}>
            {quiz.start_subheadline}
          </p>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Text questions (Q1-Q7) */}
          {textQuestions.map((q) => (
            <div key={q.id} id={`field-${q.id}`}>
              <label className="block text-[15px] font-bold mb-2">
                {q.question_text}
              </label>
              <textarea
                value={answers[q.id] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                placeholder="Share your thoughts..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 outline-none transition-colors"
                style={{
                  backgroundColor: "#141C2B",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: errors[q.id]
                    ? "#ef4444"
                    : "rgba(201, 147, 58, 0.25)",
                  minHeight: "100px",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#C9933A";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors[q.id]
                    ? "#ef4444"
                    : "rgba(201, 147, 58, 0.25)";
                }}
              />
              {errors[q.id] && (
                <p className="text-red-400 text-sm mt-1">{errors[q.id]}</p>
              )}
            </div>
          ))}

          {/* Radio question (Q8) */}
          {radioQuestion && (
            <div id={`field-${radioQuestion.id}`}>
              <label className="block text-[15px] font-bold mb-3">
                {radioQuestion.question_text}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {radioQuestion.options.map((option) => {
                  // Options may be plain strings or {text, value} objects
                  const label = typeof option === "string" ? option : option.text;
                  const val = typeof option === "string" ? option : option.value;
                  const isSelected = answers[radioQuestion.id] === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [radioQuestion.id]: val,
                        }))
                      }
                      className="w-full text-left px-5 py-4 rounded-lg transition-all flex items-center gap-4"
                      style={{
                        backgroundColor: isSelected
                          ? "rgba(201, 147, 58, 0.08)"
                          : "#141C2B",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        borderColor: isSelected
                          ? "#C9933A"
                          : errors[radioQuestion.id]
                          ? "#ef4444"
                          : "rgba(201, 147, 58, 0.25)",
                        ...(isSelected && {
                          boxShadow: "0 0 0 1px #C9933A",
                        }),
                      }}
                    >
                      {/* Radio indicator */}
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor: isSelected
                            ? "#C9933A"
                            : "rgba(201, 147, 58, 0.4)",
                        }}
                      >
                        {isSelected && (
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: "#C9933A" }}
                          />
                        )}
                      </span>
                      <span className="font-medium text-white">
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors[radioQuestion.id] && (
                <p className="text-red-400 text-sm mt-1">
                  {errors[radioQuestion.id]}
                </p>
              )}
            </div>
          )}

          {/* Contact fields */}
          <div className="space-y-5 pt-4">
            <div
              className="w-full h-px"
              style={{ backgroundColor: "rgba(201, 147, 58, 0.25)" }}
            />

            {/* Full Name */}
            <div id="field-contactName">
              <label className="block text-[15px] font-bold mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 outline-none transition-colors"
                style={{
                  backgroundColor: "#141C2B",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: errors.contactName
                    ? "#ef4444"
                    : "rgba(201, 147, 58, 0.25)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#C9933A";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.contactName
                    ? "#ef4444"
                    : "rgba(201, 147, 58, 0.25)";
                }}
              />
              {errors.contactName && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.contactName}
                </p>
              )}
            </div>

            {/* Email */}
            <div id="field-contactEmail">
              <label className="block text-[15px] font-bold mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 outline-none transition-colors"
                style={{
                  backgroundColor: "#141C2B",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: errors.contactEmail
                    ? "#ef4444"
                    : "rgba(201, 147, 58, 0.25)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#C9933A";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.contactEmail
                    ? "#ef4444"
                    : "rgba(201, 147, 58, 0.25)";
                }}
              />
              {errors.contactEmail && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.contactEmail}
                </p>
              )}
            </div>

            {/* Company and Title */}
            <div>
              <label className="block text-[15px] font-bold mb-2">
                Company and Title
              </label>
              <input
                type="text"
                value={contactCompany}
                onChange={(e) => setContactCompany(e.target.value)}
                placeholder="e.g. VP Sales at Acme Corp"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 outline-none transition-colors"
                style={{
                  backgroundColor: "#141C2B",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "rgba(201, 147, 58, 0.25)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#C9933A";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(201, 147, 58, 0.25)";
                }}
              />
            </div>

            {/* LinkedIn */}
            <div>
              <label className="block text-[15px] font-bold mb-1">
                LinkedIn Profile URL
              </label>
              <p className="text-sm mb-2" style={{ color: "#9CA3AF" }}>
                Your LinkedIn URL so we can tag you when we publish
              </p>
              <input
                type="text"
                value={contactLinkedin}
                onChange={(e) => setContactLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 outline-none transition-colors"
                style={{
                  backgroundColor: "#141C2B",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "rgba(201, 147, 58, 0.25)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#C9933A";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(201, 147, 58, 0.25)";
                }}
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-lg font-semibold text-lg transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: "#C9933A",
              color: "#0A1628",
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit My Story"}
          </button>
        </form>

        {/* Footer note */}
        <p
          className="text-center text-sm mt-8"
          style={{ color: "#9CA3AF" }}
        >
          The Sales Network is powered by Practice Interactions — AI roleplay
          training for sales teams.{" "}
          <a
            href="https://practiceinteractions.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#C9933A" }}
          >
            practiceinteractions.com
          </a>
        </p>
      </div>
    </div>
  );
}
