"use client";

import { useEffect, useState } from "react";
import { QuizResponse } from "@/lib/types";
import QualificationBadge from "./QualificationBadge";
import { wtpBand } from "@/lib/wtp";

interface AnswerWithQuestion {
  id: string;
  question_order: number;
  answer_value: Record<string, unknown>;
  points_awarded: number;
  quiz_questions: {
    question_text: string;
    question_type: string;
    options: { text: string; value: string; points: number }[];
  } | null;
}

interface ResponseDetailPanelProps {
  responseId: string | null;
  onClose: () => void;
  getAuthHeaders: () => Record<string, string>;
  accent: string;
}

export default function ResponseDetailPanel({
  responseId,
  onClose,
  getAuthHeaders,
  accent,
}: ResponseDetailPanelProps) {
  const [response, setResponse] = useState<QuizResponse | null>(null);
  const [answers, setAnswers] = useState<AnswerWithQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingConv, setSavingConv] = useState(false);

  async function toggleConverted() {
    if (!responseId || !response) return;
    const next = !response.converted_to_sale;
    setSavingConv(true);
    try {
      const res = await fetch(`/api/dashboard/responses/${responseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ converted_to_sale: next }),
      });
      if (res.ok) setResponse((r) => (r ? { ...r, converted_to_sale: next } : r));
    } catch {
      /* ignore */
    }
    setSavingConv(false);
  }

  useEffect(() => {
    if (!responseId) return;
    setLoading(true);

    fetch(`/api/dashboard/responses/${responseId}`, {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        setResponse(data.response);
        setAnswers(data.answers || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [responseId, getAuthHeaders]);

  if (!responseId) return null;

  const formatAnswer = (answer: AnswerWithQuestion) => {
    const val = answer.answer_value;
    if (typeof val === "object" && val !== null) {
      // Prefer the human-readable option text; fall back to the raw value.
      if ("text" in val && val.text != null && val.text !== "") return String(val.text);
      if ("selected" in val) return String(val.selected);
      // Matrix answers
      const entries = Object.entries(val);
      if (entries.length > 0) {
        return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
      }
    }
    return JSON.stringify(val);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              Response Details
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : response ? (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="text-gray-900 font-medium">
                      {response.contact_name || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="text-gray-900 font-medium">
                      {response.contact_email || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <p className="text-gray-900 font-medium">
                      {response.contact_phone || "—"}
                    </p>
                  </div>
                  {response.contact_company && (
                    <div>
                      <span className="text-gray-500">Company:</span>
                      <p className="text-gray-900 font-medium">
                        {response.contact_company}
                      </p>
                    </div>
                  )}
                  {response.contact_website && (
                    <div>
                      <span className="text-gray-500">Website:</span>
                      <p className="text-gray-900 font-medium break-all">
                        {response.contact_website}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Agent Code:</span>
                    <p className="text-gray-900 font-medium">
                      {response.agent_code || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Score & Qualification */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Score & Qualification
                </h3>
                <div className="flex items-center gap-4">
                  <div
                    className="text-3xl font-bold"
                    style={{ color: accent }}
                  >
                    {response.score ?? "—"}/{response.max_score ?? "—"}
                  </div>
                  <div className="text-lg text-gray-500">
                    ({response.percentage ?? 0}%)
                  </div>
                  <QualificationBadge
                    qualification={response.qualification}
                  />
                </div>
                <div className="flex gap-4 text-sm text-gray-500 mt-2">
                  {response.gender && <span>Gender: {response.gender}</span>}
                  {response.age && <span>Age: {response.age}</span>}
                  {response.location && (
                    <span>Location: {response.location}</span>
                  )}
                </div>
              </div>

              {/* WTP score */}
              {response.wtp_score !== null && (() => {
                const band = wtpBand(response.wtp_score);
                const calibrated = response.wtp_mode === "calibrated";
                return (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        Willingness-to-Pay score
                      </h3>
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border"
                        style={{
                          color: calibrated ? "#115e59" : "#92400e",
                          borderColor: calibrated ? "#99f6e4" : "#fde68a",
                          backgroundColor: calibrated ? "#f0fdfa" : "#fffbeb",
                        }}
                        title={
                          calibrated
                            ? "Calibrated against real conversion outcomes."
                            : "Directional index from the scorecard's WTP signals. Calibrates once enough outcomes are collected."
                        }
                      >
                        {calibrated ? "Calibrated" : "Index · directional"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <div className="text-4xl font-extrabold leading-none" style={{ color: band.color }}>
                        {response.wtp_score}
                        <span className="text-lg text-gray-400 font-bold">/100</span>
                      </div>
                      <span
                        className="text-sm font-semibold px-2.5 py-1 rounded-md"
                        style={{ backgroundColor: band.color + "1a", color: band.color }}
                      >
                        {band.label}
                      </span>
                      {response.wtp_confidence && (
                        <span className="text-xs text-gray-400 ml-auto">
                          {response.wtp_confidence} confidence
                        </span>
                      )}
                    </div>

                    {response.wtp_factors && response.wtp_factors.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-xs font-medium text-gray-500">What&apos;s driving it</p>
                        {response.wtp_factors.slice(0, 4).map((f, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                              <span className="truncate pr-2">{f.question}</span>
                              <span className="tabular-nums text-gray-400">{f.pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${f.pct}%`, backgroundColor: wtpBand(f.pct).color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Conversion — the single outcome that calibrates WTP */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Converted?</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Mark leads who converted. Conversions are what calibrate the WTP score.
                  </p>
                </div>
                <button
                  onClick={toggleConverted}
                  disabled={savingConv}
                  className="text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 shrink-0"
                  style={
                    response.converted_to_sale
                      ? { backgroundColor: "#16a34a1a", color: "#16a34a" }
                      : { backgroundColor: accent, color: "#fff" }
                  }
                >
                  {savingConv ? "Saving…" : response.converted_to_sale ? "✓ Converted" : "Mark converted"}
                </button>
              </div>

              {/* Answers */}
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-3">
                  Answers
                </h3>
                <div className="space-y-3">
                  {answers.map((a, i) => (
                    <div key={a.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">
                        Q{i + 1}.{" "}
                        {a.quiz_questions?.question_text || "Unknown question"}
                      </p>
                      <p className="text-sm text-gray-900 font-medium">
                        {formatAnswer(a)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Points: {a.points_awarded}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Response not found.</p>
          )}
        </div>
      </div>
    </>
  );
}
