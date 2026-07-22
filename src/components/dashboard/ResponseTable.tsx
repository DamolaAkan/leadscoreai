"use client";

import { QuizResponse } from "@/lib/types";
import QualificationBadge from "./QualificationBadge";

interface ResponseTableProps {
  responses: QuizResponse[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onToggleConverted: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  accent: string;
}

export default function ResponseTable({
  responses,
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
      <div className="bg-white rounded-xl p-8 text-center text-gray-500">
        No responses found.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                Phone
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                Score
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                Qualification
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                Converted
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                Date
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {responses.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-[#f8fafc] transition-colors"
                style={{ borderBottom: "1px solid #e2e8f0" }}
              >
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {r.contact_name || "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {r.contact_email || "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {r.contact_phone || "—"}
                </td>
                <td className="px-4 py-3 text-gray-900">
                  {r.score !== null ? `${r.score}/${r.max_score}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <QualificationBadge qualification={r.qualification} />
                    {r.is_super_lead && (
                      <span
                        className="text-base leading-none"
                        style={{ color: "#d97706" }}
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
                    className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                      r.converted_to_sale
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {r.converted_to_sale ? "Converted" : "Not Converted"}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {r.completed_at
                    ? new Date(r.completed_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => onView(r.id)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors text-white"
                    style={{ backgroundColor: accent }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
