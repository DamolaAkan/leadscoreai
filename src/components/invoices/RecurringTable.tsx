"use client";

import { useState } from "react";
import Link from "next/link";
import { RecurringInvoice } from "@/lib/invoice-types";
import { formatCurrency, formatDate } from "@/lib/invoice-utils";

interface RecurringTableProps {
  templates: RecurringInvoice[];
}

function getAuthHeaders(): Record<string, string> {
  const sessionId = localStorage.getItem("lsai-admin-session");
  return sessionId ? { Authorization: `Bearer ${sessionId}` } : {};
}

export default function RecurringTable({ templates: initialTemplates }: RecurringTableProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Sync when parent re-passes templates
  if (initialTemplates !== templates && initialTemplates.length !== templates.length) {
    setTemplates(initialTemplates);
  }

  async function handleToggle(templateId: string, newState: boolean) {
    setTogglingId(templateId);
    const res = await fetch("/api/invoices/recurring/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ templateId, isActive: newState }),
    });

    if (res.ok) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? { ...t, is_active: newState } : t))
      );
    }
    setTogglingId(null);
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-black/50">
        <p>No recurring templates yet.</p>
        <Link href="/invoices/recurring/new" className="text-[#7C3AED] hover:underline text-sm mt-2 inline-block">
          Create your first template
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-black/[0.08]">
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">Client</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">Amount</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">Schedule</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">Status</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">Last Sent</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr key={t.id} className="border-b border-black/[0.04] hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4 text-sm text-[#111827] font-medium">{t.client?.name || "—"}</td>
              <td className="py-3 px-4 text-sm text-[#111827]">{formatCurrency(t.subtotal, t.currency)}</td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-700">Day {t.send_day}</span>
                <span className="block text-xs text-black/50 mt-0.5">
                  Sends on Day {t.send_day} of every month at 8:00 AM WAT
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {t.is_active ? (
                    <>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: "rgba(45,198,83,0.1)", color: "#16a34a" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                        Active
                      </span>
                      <button
                        onClick={() => handleToggle(t.id, false)}
                        disabled={togglingId === t.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        Pause
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "#6b7280" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Paused
                      </span>
                      <button
                        onClick={() => handleToggle(t.id, true)}
                        disabled={togglingId === t.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-green-200 text-green-600 text-xs font-medium hover:bg-green-50 disabled:opacity-50 transition-colors"
                      >
                        Activate
                      </button>
                    </>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-gray-500">
                {t.last_sent_at ? formatDate(t.last_sent_at) : "Never"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
