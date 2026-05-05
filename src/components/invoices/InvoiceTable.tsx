"use client";

import Link from "next/link";
import { Invoice } from "@/lib/invoice-types";
import { formatCurrency, formatDate } from "@/lib/invoice-utils";
import StatusBadge from "./StatusBadge";

interface InvoiceTableProps {
  invoices: Invoice[];
}

export default function InvoiceTable({ invoices }: InvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
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
          <tr className="border-b border-[#2a2a3d]">
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">#</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Client</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-[#2a2a3d]/50 hover:bg-[#1a1a2e]/50 transition-colors">
              <td className="py-3 px-4 text-sm text-white font-medium">{invoice.invoice_number}</td>
              <td className="py-3 px-4 text-sm text-gray-300">
                {invoice.client?.name || "—"}
                {invoice.client?.company && (
                  <span className="text-gray-500 text-xs block">{invoice.client.company}</span>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-white font-medium">
                {formatCurrency(invoice.subtotal, invoice.currency)}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={invoice.status} />
              </td>
              <td className="py-3 px-4 text-sm text-gray-400">{formatDate(invoice.issue_date)}</td>
              <td className="py-3 px-4 text-right">
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="text-[#7C3AED] hover:underline text-sm"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
