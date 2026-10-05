"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Invoice } from "@/lib/invoice-types";
import { formatCurrency, formatDate } from "@/lib/invoice-utils";
import StatusBadge from "./StatusBadge";

interface InvoiceTableProps {
  invoices: Invoice[];
}

function authHeaders(): Record<string, string> {
  const sid = typeof window !== "undefined" ? localStorage.getItem("lsai-admin-session") : null;
  return sid ? { Authorization: `Bearer ${sid}` } : {};
}

export default function InvoiceTable({ invoices }: InvoiceTableProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Duplicate → fresh draft dated today; open it so the date can be adjusted.
  async function duplicate(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/invoices/${id}/duplicate`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.invoice?.id) {
        router.push(`/invoices/${data.invoice.id}/edit`);
      } else {
        alert(data.error || "Could not duplicate the invoice.");
        setBusyId(null);
      }
    } catch {
      alert("Could not duplicate the invoice.");
      setBusyId(null);
    }
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 text-black/50">
        <p>No invoices yet.</p>
        <Link href="/invoices/new" className="text-[#7C3AED] hover:underline text-sm mt-2 inline-block">
          Create your first invoice
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-black/[0.08]">
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">#</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">Client</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">Amount</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">Status</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-black/50 uppercase">Date</th>
            <th className="text-right py-3 px-4 text-xs font-medium text-black/50 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-black/[0.04] hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4 text-sm text-[#111827] font-medium">{invoice.invoice_number}</td>
              <td className="py-3 px-4 text-sm text-gray-700">
                {invoice.client?.name || "—"}
                {invoice.client?.company && (
                  <span className="text-black/50 text-xs block">{invoice.client.company}</span>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-[#111827] font-medium">
                {formatCurrency(invoice.subtotal, invoice.currency)}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={invoice.status} />
              </td>
              <td className="py-3 px-4 text-sm text-gray-500">{formatDate(invoice.issue_date)}</td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => duplicate(invoice.id)}
                    disabled={busyId === invoice.id}
                    className="text-gray-500 hover:text-[#7C3AED] text-sm disabled:opacity-50"
                  >
                    {busyId === invoice.id ? "Duplicating…" : "Duplicate"}
                  </button>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="text-[#7C3AED] hover:underline text-sm"
                  >
                    View
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
