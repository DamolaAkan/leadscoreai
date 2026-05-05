"use client";

import RecurringForm from "@/components/invoices/RecurringForm";

function getAuthHeaders(): Record<string, string> {
  const sessionId = localStorage.getItem("lsai-admin-session");
  return sessionId ? { Authorization: `Bearer ${sessionId}` } : {};
}

export default function NewRecurringPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">New Recurring Template</h1>
      <RecurringForm getAuthHeaders={getAuthHeaders} />
    </div>
  );
}
