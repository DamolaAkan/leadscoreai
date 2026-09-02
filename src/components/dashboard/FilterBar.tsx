"use client";

import { QUALIFICATION_LABELS } from "@/lib/dashboard-types";

interface QuizOpt {
  id: string;
  name: string;
  slug: string;
}

interface FilterBarProps {
  qualification: string;
  quizId: string;
  quizzes: QuizOpt[];
  dateFrom: string;
  dateTo: string;
  search: string;
  onQualificationChange: (v: string) => void;
  onQuizIdChange: (v: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onExport: () => void;
  accent: string;
}

const fieldClass =
  "px-3 py-2 border border-[#e9ebf0] rounded-lg text-sm text-[#16202e] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/30 focus:border-[#6d28d9] transition-colors";
const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085] mb-1.5";

export default function FilterBar({
  qualification,
  quizId,
  quizzes,
  dateFrom,
  dateTo,
  search,
  onQualificationChange,
  onQuizIdChange,
  onDateFromChange,
  onDateToChange,
  onSearchChange,
  onExport,
  accent,
}: FilterBarProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-[#eceef2] shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap gap-3 items-end">
        {quizzes.length > 1 && (
          <div>
            <label className={labelClass}>Scorecard</label>
            <select
              value={quizId}
              onChange={(e) => onQuizIdChange(e.target.value)}
              className={fieldClass}
            >
              <option value="">All scorecards</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={labelClass}>Qualification</label>
          <select
            value={qualification}
            onChange={(e) => onQualificationChange(e.target.value)}
            className={fieldClass}
          >
            <option value="">All</option>
            {Object.entries(QUALIFICATION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className={labelClass}>Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Name, email, or phone..."
            className={`w-full ${fieldClass}`}
          />
        </div>

        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-[0_1px_2px_rgba(16,24,40,0.08)] transition-colors"
          style={{ backgroundColor: accent }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#5b21b6")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = accent)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>
    </div>
  );
}
