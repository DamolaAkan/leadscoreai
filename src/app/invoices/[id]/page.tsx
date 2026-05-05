"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Invoice } from "@/lib/invoice-types";
import InvoicePreview from "@/components/invoices/InvoicePreview";

function getAuthHeaders(): Record<string, string> {
  const sessionId = localStorage.getItem("lsai-admin-session");
  return sessionId ? { Authorization: `Bearer ${sessionId}` } : {};
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [actionLoading, setActionLoading] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/invoices/${id}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setInvoice(d.invoice));
  }, [id]);

  async function handleSend() {
    setActionLoading("send");
    const res = await fetch("/api/invoices/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ invoice_id: id }),
    });
    const data = await res.json();
    setActionLoading("");
    if (res.ok) {
      setInvoice((prev) => prev ? { ...prev, status: "sent", sent_at: new Date().toISOString() } : null);
    } else {
      alert(data.error || "Failed to send");
    }
  }

  async function handleMarkPaid() {
    setActionLoading("paid");
    const res = await fetch("/api/invoices/mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ invoice_id: id }),
    });
    const data = await res.json();
    setActionLoading("");
    if (res.ok) {
      setInvoice((prev) => prev ? { ...prev, status: "paid", paid_at: new Date().toISOString() } : null);
    } else {
      alert(data.error || "Failed to mark paid");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    setActionLoading("delete");
    await fetch(`/api/invoices/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    router.push("/invoices");
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{invoice.invoice_number}</h1>
        <div className="flex items-center gap-3">
          {invoice.status === "draft" && (
            <button
              onClick={handleSend}
              disabled={actionLoading === "send"}
              className="px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] disabled:opacity-50 text-sm"
            >
              {actionLoading === "send" ? "Sending..." : "Send Invoice"}
            </button>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <button
              onClick={handleMarkPaid}
              disabled={actionLoading === "paid"}
              className="px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] disabled:opacity-50 text-sm"
            >
              {actionLoading === "paid" ? "Processing..." : "Mark as Paid"}
            </button>
          )}
          {invoice.status === "draft" && (
            <button
              onClick={handleDelete}
              disabled={actionLoading === "delete"}
              className="px-4 py-2 bg-red-600/20 text-red-400 font-medium rounded-lg hover:bg-red-600/30 disabled:opacity-50 text-sm"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <InvoicePreview invoice={invoice} />
    </div>
  );
}
