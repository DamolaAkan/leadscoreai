"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuizResponse } from "@/lib/types";
import { Icon, QualPill, api, csvCell, downloadText, fmtDate } from "../_lib";

interface Answer {
  id: string;
  question_order: number;
  points_awarded: number | null;
  answer_value: { text?: string; selected?: number | string } | null;
  quiz_questions: { question_text: string; options: { text: string; points: number }[] | null } | null;
}

function answerText(a: Answer): string {
  const v = a.answer_value;
  if (!v) return "—";
  if (typeof v.text === "string") return v.text;
  return v.selected != null ? String(v.selected) : "—";
}

export default function DetailModal({
  orgSlug,
  id,
  onClose,
  onChanged,
}: {
  orgSlug: string;
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [r, setR] = useState<QuizResponse & { converted_at?: string | null } | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const d = await api<{ response: QuizResponse; answers: Answer[] }>(orgSlug, `/api/dashboard/responses/${id}`);
    setR(d.response);
    setAnswers(d.answers);
  }, [orgSlug, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Lock the page behind so the wheel scrolls the modal, not the table.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const toggleDeposit = async () => {
    if (!r) return;
    setSaving(true);
    await api(orgSlug, `/api/dashboard/responses/${id}`, {
      method: "PUT",
      body: JSON.stringify({ converted_to_sale: !r.converted_to_sale }),
    });
    await load();
    onChanged();
    setSaving(false);
  };

  const download = () => {
    if (!r) return;
    const lines = [
      ["Field", "Value"],
      ["Name", r.contact_name],
      ["Email", r.contact_email],
      ["Phone", r.contact_phone],
      ["Gender", r.gender],
      ["Age", r.age],
      ["State", r.location],
      ["Completed", fmtDate(r.completed_at, true)],
      ["Score", `${r.percentage ?? 0}%`],
      ["Qualification", r.qualification],
      ["Deposit paid", r.converted_to_sale ? "Yes" : "No"],
      [],
      ["Question", "Answer"],
      ...answers.map((a) => [a.quiz_questions?.question_text || `Question ${a.question_order}`, answerText(a)]),
    ];
    downloadText(
      `${(r.contact_name || "response").replace(/\s+/g, "-").toLowerCase()}.csv`,
      lines.map((l) => l.map(csvCell).join(",")).join("\n")
    );
  };

  const maxTotal = r?.max_score ?? 0;
  const field = (label: string, value: React.ReactNode) => (
    <div>
      <div className="text-[14px] text-gray-500">{label}</div>
      <div className="mt-1 text-[17px] text-gray-900">{value || "Not provided"}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50" onClick={onClose}>
      {/* Padding lives here, not on the scroller, so the sticky header pins to the very top. */}
      <div className="flex min-h-full items-start justify-center px-4 py-10">
      <div className="w-full max-w-[976px] rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center gap-4 rounded-t-lg border-b border-gray-100 bg-white px-6 py-5">
          <button onClick={onClose} className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-[14px] hover:bg-gray-50">
            <Icon name="back" className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-[24px] font-bold">User Details</h2>
          <button onClick={download} className="ml-auto flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-[14px] hover:bg-gray-50">
            <Icon name="download" className="w-4 h-4" />
            Download Response
          </button>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-2 text-gray-600 hover:bg-gray-100">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {!r ? (
          <div className="p-10 text-center text-gray-500">Loading…</div>
        ) : (
          <div className="space-y-6 p-6">
            {/* Personal information */}
            <section className="rounded-lg border border-gray-100 p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-[22px] font-bold">
                <Icon name="users" className="w-5 h-5" />
                Personal Information
              </h3>
              <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
                {field("Name", r.contact_name)}
                {field("Email", r.contact_email)}
                {field("Phone", r.contact_phone)}
                {field("Gender", r.gender)}
                {field("Age", r.age)}
                {field("State", r.location)}
                {field("Completed Date", fmtDate(r.completed_at, true))}
                <div>
                  <div className="text-[14px] text-gray-500">Deposit Paid</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[17px] text-gray-900">
                    {r.converted_to_sale ? `Yes, ${fmtDate(r.converted_at)}` : "No"}
                    <button
                      onClick={toggleDeposit}
                      disabled={saving}
                      className={`rounded-md px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50 ${
                        r.converted_to_sale ? "border border-gray-200 text-gray-600 hover:bg-gray-50" : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {saving ? "Saving…" : r.converted_to_sale ? "Undo" : "Mark deposit paid"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Assessment results */}
            <section className="rounded-lg border border-gray-100 p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-[22px] font-bold">
                <Icon name="trend" className="w-5 h-5" />
                Assessment Results
              </h3>
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[30px] font-bold">{r.percentage ?? 0}%</div>
                  <div className="text-[15px] text-gray-500">Overall Score</div>
                </div>
                <div>
                  <div className="text-[30px] font-bold">
                    {r.score ?? 0}/{maxTotal}
                  </div>
                  <div className="text-[15px] text-gray-500">Points Earned</div>
                </div>
                <div className="flex flex-col items-center gap-2 pt-1">
                  <QualPill q={r.qualification} />
                  <div className="text-[15px] text-gray-500">Qualification</div>
                </div>
              </div>
              {/* Willingness to pay lives in Padaflow, where it can fuse these answers with deposit and repayment data. */}
            </section>

            {/* Scorecard answers */}
            <section className="rounded-lg border border-gray-100 p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-[22px] font-bold">
                <Icon name="chart" className="w-5 h-5" />
                Scorecard Details
              </h3>
              <div className="mt-4 divide-y divide-gray-100">
                {answers.map((a) => (
                  <div key={a.id} className="py-5">
                    <div className="text-[14px] text-blue-600">Question {a.question_order}</div>
                    <div className="mt-1 text-[17px] text-gray-900">{a.quiz_questions?.question_text}</div>
                    <div className="mt-3 grid grid-cols-2 gap-4 rounded-md bg-gray-50 px-4 py-3">
                      <div>
                        <div className="text-[14px] text-gray-600">Selected Answer</div>
                        <div className="mt-1 text-[15px] text-gray-900">{answerText(a)}</div>
                      </div>
                      <div>
                        <div className="text-[14px] text-gray-600">Points Earned</div>
                        <div className="mt-1 text-[15px] text-gray-900">{a.points_awarded ?? 0} points</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
