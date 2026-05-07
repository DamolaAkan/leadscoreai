"use client";

import InvoiceForm from "@/components/invoices/InvoiceForm";

function getAuthHeaders(): Record<string, string> {
  const sessionId = localStorage.getItem("lsai-admin-session");
  return sessionId ? { Authorization: `Bearer ${sessionId}` } : {};
}

export default function NewInvoicePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#111827] mb-6">New Invoice</h1>
      <InvoiceForm getAuthHeaders={getAuthHeaders} />
    </div>
  );
}
