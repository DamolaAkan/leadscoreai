"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Invoice } from "@/lib/invoice-types";
import { formatCurrency } from "@/lib/invoice-utils";
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
  const [markingPaidIndex, setMarkingPaidIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchInvoice();
  }, [id]);

  function fetchInvoice() {
    fetch(`/api/invoices/${id}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setInvoice(d.invoice));
  }

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

  async function handleMarkLineItemPaid(lineItemIndex: number) {
    setMarkingPaidIndex(lineItemIndex);
    const res = await fetch("/api/invoices/mark-line-item-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ invoice_id: id, line_item_index: lineItemIndex }),
    });
    const data = await res.json();
    setMarkingPaidIndex(null);
    if (res.ok) {
      fetchInvoice();
      showToast(
        data.all_paid
          ? "Line item marked paid — all items paid, invoice marked as paid"
          : "Line item marked paid — receipt sent",
        "success"
      );
    } else {
      showToast(data.error || "Failed to mark line item paid", "error");
    }
  }

  async function handleDownloadPdf() {
    setActionLoading("pdf");
    try {
      const res = await fetch(`/api/invoices/${id}/pdf`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        showToast("Failed to generate PDF", "error");
        setActionLoading("");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice?.invoice_number || "invoice"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast("Failed to download PDF", "error");
    }
    setActionLoading("");
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const showResend = invoice.status === "sent" || invoice.status === "paid";
  const showEdit = invoice.status === "draft" || invoice.status === "sent";
  const showLineItemPayments = invoice.status === "sent" || invoice.status === "overdue";
  const chargeItems = invoice.line_items.filter((item) => !item.type || item.type === "charge");

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
          {showEdit && (
            <button
              onClick={() => router.push(`/invoices/${id}/edit`)}
              className="px-4 py-2 bg-white text-[#7C3AED] font-medium rounded-full border border-[#7C3AED] hover:bg-[#7C3AED]/5 text-sm transition-colors"
            >
              Edit
            </button>
          )}
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
          <button
            onClick={handleDownloadPdf}
            disabled={actionLoading === "pdf"}
            className="px-4 py-2 bg-white text-gray-700 font-medium rounded-full border border-black/[0.08] hover:bg-gray-50 disabled:opacity-50 text-sm transition-colors"
          >
            {actionLoading === "pdf" ? "Generating..." : "Download PDF"}
          </button>
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

      {/* Line Item Payments Section */}
      {showLineItemPayments && chargeItems.length > 0 && (
        <div className="mt-8 max-w-2xl">
          <h3 className="text-lg font-semibold text-[#111827] mb-4">Line Item Payments</h3>
          <div className="bg-[#f9fafb] border border-black/[0.08] rounded-2xl divide-y divide-black/[0.08]">
            {invoice.line_items.map((item, index) => {
              if (item.type === "payment") return null;
              const isPaid = item.paid;
              return (
                <div key={index} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">{item.description}</p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(item.amount, invoice.currency)}
                    </p>
                  </div>
                  {isPaid ? (
                    <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full border border-green-200">
                      Paid {item.paid_date ? `on ${new Date(item.paid_date).toLocaleDateString()}` : ""}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMarkLineItemPaid(index)}
                      disabled={markingPaidIndex === index}
                      className="px-4 py-1.5 bg-[#7C3AED] text-white text-xs font-medium rounded-full hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
                    >
                      {markingPaidIndex === index ? "Processing..." : "Mark Paid & Send Receipt"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
