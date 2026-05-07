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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/invoices/${id}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setInvoice(d.invoice));
  }, [id]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

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
      showToast("Invoice sent successfully", "success");
    } else {
      showToast(data.error || "Failed to send", "error");
    }
  }

  async function handleResend() {
    setActionLoading("resend");
    const res = await fetch("/api/invoices/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ invoice_id: id }),
    });
    setActionLoading("");
    if (res.ok) {
      showToast("Invoice resent successfully", "success");
    } else {
      showToast("Failed to resend — please try again", "error");
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
      showToast("Invoice marked as paid", "success");
    } else {
      showToast(data.error || "Failed to mark paid", "error");
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

  const showResend = invoice.status === "sent" || invoice.status === "paid";

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">{invoice.invoice_number}</h1>
        <div className="flex items-center gap-3">
          {invoice.status === "draft" && (
            <button
              onClick={handleSend}
              disabled={actionLoading === "send"}
              className="px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-full hover:bg-[#6D28D9] disabled:opacity-50 text-sm"
            >
              {actionLoading === "send" ? "Sending..." : "Send Invoice"}
            </button>
          )}
          {showResend && (
            <button
              onClick={handleResend}
              disabled={actionLoading === "resend"}
              className="px-4 py-2 bg-white text-[#2dc653] font-medium rounded-full border border-[#2dc653] hover:bg-[#2dc653]/5 disabled:opacity-50 text-sm transition-colors"
            >
              {actionLoading === "resend" ? "Resending..." : "Resend Invoice"}
            </button>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <button
              onClick={handleMarkPaid}
              disabled={actionLoading === "paid"}
              className="px-4 py-2 bg-[#7C3AED] text-white font-medium rounded-full hover:bg-[#6D28D9] disabled:opacity-50 text-sm"
            >
              {actionLoading === "paid" ? "Processing..." : "Mark as Paid"}
            </button>
          )}
          {invoice.status === "draft" && (
            <button
              onClick={handleDelete}
              disabled={actionLoading === "delete"}
              className="px-4 py-2 bg-red-50 text-red-500 font-medium rounded-full hover:bg-red-100 disabled:opacity-50 text-sm border border-red-200"
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
