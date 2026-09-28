"use client";

import { useState } from "react";
import { SCORECARD, type Answers } from "@/lib/signup-scorecard";

// Six tap questions, one per screen, before the sign-up details. Tapping an
// answer moves on; the last tap hands the answers back.
export default function SignupScorecard({
  initial,
  onDone,
  onHaveAccount,
}: {
  initial?: Answers;
  onDone: (answers: Answers) => void;
  onHaveAccount: () => void;
}) {
  const [answers, setAnswers] = useState<Answers>(initial ?? {});
  const [i, setI] = useState(0);
  const q = SCORECARD[i];

  const pick = (value: string) => {
    const next = { ...answers, [q.key]: value };
    setAnswers(next);
    // A short beat so the tap registers before the next question.
    setTimeout(() => (i === SCORECARD.length - 1 ? onDone(next) : setI(i + 1)), 180);
  };

  return (
    <div className="space-y-4">
      <div>
        {/* pr-10 keeps "Back" clear of the sheet's close button */}
        <div className="flex items-center justify-between pr-10 text-[13px] text-slate-500">
          <span>
            Question {i + 1} of {SCORECARD.length}
          </span>
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)} className="hover:text-slate-800">
              ← Back
            </button>
          )}
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-600 transition-all"
            style={{ width: `${((i + 1) / SCORECARD.length) * 100}%` }}
          />
        </div>
      </div>
      <h2 className="text-[22px] sm:text-2xl font-bold leading-snug">{q.text}</h2>
      <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
        {q.options.map((o) => {
          const on = answers[q.key] === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              className={`rounded-2xl border px-3 py-3.5 text-center transition ${
                on ? "border-violet-500 bg-violet-50 ring-2 ring-violet-500/30" : "border-slate-200 hover:border-violet-300"
              }`}
            >
              <span className="block text-[26px] leading-none">{o.emoji}</span>
              <span className="mt-2 block text-[14px] font-semibold leading-tight text-slate-800">{o.label}</span>
            </button>
          );
        })}
      </div>
      {i === 0 && (
        <p className="text-xs text-slate-400 text-center">
          Six quick taps so we can set up your builder.{" "}
          <button type="button" onClick={onHaveAccount} className="underline hover:text-slate-600">
            I already have an account
          </button>
        </p>
      )}
    </div>
  );
}
