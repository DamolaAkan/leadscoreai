"use client";

import { QuizResponse } from "@/lib/types";
import QualificationBadge from "./QualificationBadge";
import ScorecardBadge from "./ScorecardBadge";

interface ResponseTableProps {
  responses: QuizResponse[];
  /** Show the Scorecard column when the org runs more than one scorecard. */
  multiScorecard?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onToggleConverted: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  accent: string;
}

const thClass =
  "text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.05em]";
const thStyle = { color: "#667085" };

export default function ResponseTable({
  responses,
  multiScorecard = false,
  page,
  totalPages,
  onPageChange,
  onView,
  onToggleConverted,
  onDelete,
  accent,
}: ResponseTableProps) {
  if (responses.length === 0) {
    return (
      <div className="bg-white rounded-xl p-10 text-center border border-[#eceef2] shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
        <p className="text-[#16202e] font-semibold">No responses found</p>
        <p className="text-sm text-[#667085] mt-1">
          Try clearing a filter or widening the date range.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-[#eceef2] shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e9ebf0" }}>
              {multiScorecard && (
                <th className={thClass} style={thStyle}>
                  Scorecard
                </th>
              )}
              <th className={thClass} style={thStyle}>Name</th>
              <th className={thClass} style={thStyle}>Email</th>
              <th className={thClass} style={thStyle}>Phone</th>
              <th className={thClass} style={thStyle}>Score</th>
              <th className={thClass} style={thStyle}>Qualification</th>
              <th className={thClass} style={thStyle}>Converted</th>
              <th className={thClass} style={thStyle}>Date</th>
              <th className={`${thClass} text-right`} style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {responses.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-[#f9fafb] transition-colors"
                style={{ borderBottom: "1px solid #f2f4f7" }}
              >
                {multiScorecard && (
                  <td className="px-4 py-3">
                    <ScorecardBadge name={r.quiz_name} slug={r.quiz_slug} />
                  </td>
                )}
                <td className="px-4 py-3 font-medium" style={{ color: "#16202e" }}>
                  {r.contact_name || "—"}
                </td>
                <td className="px-4 py-3" style={{ color: "#475467" }}>
                  {r.contact_email || "—"}
                </td>
                <td className="px-4 py-3 tabular-nums" style={{ color: "#475467" }}>
                  {r.contact_phone || "—"}
                </td>
                <td className="px-4 py-3 tabular-nums" style={{ color: "#16202e" }}>
                  {r.score !== null ? `${r.score}/${r.max_score}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <QualificationBadge qualification={r.qualification} />
                    {r.is_super_lead && (
                      <span
                        className="text-base leading-none"
                        style={{ color: "#d99409" }}
                        aria-label="Super lead"
                        title={
                          r.wtp_score !== null
                            ? `Super lead · willingness to pay ${r.wtp_score}/100 — call first`
                            : "Super lead — high willingness to pay, call first"
                        }
                      >
                        ⚡
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleConverted(r.id, r.converted_to_sale)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      r.converted_to_sale
                        ? "hover:opacity-90"
                        : "text-[#667085] bg-[#f2f4f7] hover:bg-[#e9ebf0]"
                    }`}
                    style={
                      r.converted_to_sale
                        ? { backgroundColor: "rgba(22,163,74,0.14)", color: "#166534" }
                        : undefined
                    }
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: r.converted_to_sale ? "#166534" : "#98a2b3",
                      }}
                    />
                    {r.converted_to_sale ? "Converted" : "Not Converted"}
                  </button>
                </td>
                <td className="px-4 py-3 tabular-nums" style={{ color: "#667085" }}>
                  {r.completed_at
                    ? new Date(r.completed_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <button
                      onClick={() => onView(r.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-white shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
                      style={{ backgroundColor: accent }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#5b21b6")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = accent)}
                    >
                      View
                    </button>
                    <button
                      onClick={() => onDelete(r.id)}
                      aria-label="Delete response"
                      title="Delete"
                      className="p-1.5 rounded-lg text-[#98a2b3] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#e9ebf0] bg-[#fcfcfd]">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-[#e9ebf0] text-[#344054] hover:bg-[#f9fafb] disabled:opacity-40 disabled:hover:bg-white transition-colors"
          >
            Previous
          </button>
          <span className="text-sm tabular-nums" style={{ color: "#667085" }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-[#e9ebf0] text-[#344054] hover:bg-[#f9fafb] disabled:opacity-40 disabled:hover:bg-white transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
