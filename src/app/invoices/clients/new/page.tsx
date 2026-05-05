"use client";

import ClientForm from "@/components/invoices/ClientForm";

function getAuthHeaders(): Record<string, string> {
  const sessionId = localStorage.getItem("lsai-admin-session");
  return sessionId ? { Authorization: `Bearer ${sessionId}` } : {};
}

export default function NewClientPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Add Client</h1>
      <ClientForm getAuthHeaders={getAuthHeaders} />
    </div>
  );
}
