"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Invoice } from "@/lib/invoice-types";
import InvoiceForm from "@/components/invoices/InvoiceForm";

function getAuthHeaders(): Record<string, string> {
  const sessionId = localStorage.getItem("lsai-admin-session");
  return sessionId ? { Authorization: `Bearer ${sessionId}` } : {};
}

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/invoices/${id}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.invoice) {
          setInvoice(d.invoice);
        } else {
          setError("Invoice not found");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load invoice");
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">{error || "Invoice not found"}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#111827] mb-6">
        Edit Invoice {invoice.invoice_number}
      </h1>
      <InvoiceForm getAuthHeaders={getAuthHeaders} invoice={invoice} />
    </div>
  );
}
