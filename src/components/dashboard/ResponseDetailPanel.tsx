"use client";

import { useEffect, useState } from "react";
import { QuizResponse } from "@/lib/types";
import QualificationBadge from "./QualificationBadge";

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
      if ("selected" in val) return String(val.selected);
      if ("text" in val) return String(val.text);
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
