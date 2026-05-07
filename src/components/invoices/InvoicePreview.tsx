"use client";

import { Invoice } from "@/lib/invoice-types";
import { formatCurrency, formatDate } from "@/lib/invoice-utils";
import StatusBadge from "./StatusBadge";

interface InvoicePreviewProps {
  invoice: Invoice;
}

export default function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const client = invoice.client;
  const bank = invoice.bank_details;

  return (
    <div className="bg-[#f9fafb] border border-black/[0.08] rounded-2xl p-8 max-w-2xl shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#7C3AED]">LeadscoreAI</h2>
          <p className="text-xs text-black/50 mt-1">Invoice</p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      {/* Meta */}
      <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-white rounded-xl border border-black/[0.08]">
        <div>
          <p className="text-xs text-black/50">Invoice #</p>
          <p className="text-sm text-[#111827] font-medium">{invoice.invoice_number}</p>
        </div>
        <div>
          <p className="text-xs text-black/50">Issue Date</p>
          <p className="text-sm text-[#111827] font-medium">{formatDate(invoice.issue_date)}</p>
        </div>
        <div>
          <p className="text-xs text-black/50">Due Date</p>
          <p className="text-sm text-[#111827] font-medium">{formatDate(invoice.due_date)}</p>
        </div>
      </div>

      {/* Client */}
      {client && (
        <div className="mb-8">
          <p className="text-xs text-black/50 mb-1">Bill To</p>
          <p className="text-[#111827] font-medium">{client.name}</p>
          {client.company && <p className="text-sm text-gray-500">{client.company}</p>}
          <p className="text-sm text-gray-500">{client.email}</p>
        </div>
      )}

      {/* Line Items */}
      <table className="w-full mb-6">
        <thead>
          <tr className="border-b-2 border-[#7C3AED]/30">
            <th className="text-left py-2 text-xs text-black/50 uppercase">Description</th>
            <th className="text-center py-2 text-xs text-black/50 uppercase">Qty</th>
            <th className="text-right py-2 text-xs text-black/50 uppercase">Rate</th>
            <th className="text-right py-2 text-xs text-black/50 uppercase">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.line_items.map((item, i) => (
            <tr key={i} className="border-b border-black/[0.08]">
              <td className="py-3 text-sm text-gray-700">{item.description}</td>
              <td className="py-3 text-sm text-gray-500 text-center">{item.quantity}</td>
              <td className="py-3 text-sm text-gray-500 text-right">{formatCurrency(item.unit_price, invoice.currency)}</td>
              <td className="py-3 text-sm text-[#111827] text-right font-medium">{formatCurrency(item.amount, invoice.currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-4 text-right text-sm text-gray-500 font-medium">Total</td>
            <td className="py-4 text-right text-lg text-[#7C3AED] font-bold">
              {formatCurrency(invoice.subtotal, invoice.currency)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Bank Details */}
      {bank && Object.keys(bank).length > 0 && (
        <div className="p-4 bg-white rounded-xl border border-black/[0.08] mb-6">
          <h4 className="text-xs text-black/50 uppercase font-medium mb-2">Payment Details</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {bank.bank_name && <p className="text-gray-500">Bank: <span className="text-[#111827]">{bank.bank_name}</span></p>}
            {bank.account_name && <p className="text-gray-500">Name: <span className="text-[#111827]">{bank.account_name}</span></p>}
            {bank.account_number && <p className="text-gray-500">Acc #: <span className="text-[#111827]">{bank.account_number}</span></p>}
            {bank.sort_code && <p className="text-gray-500">Sort: <span className="text-[#111827]">{bank.sort_code}</span></p>}
            {bank.iban && <p className="text-gray-500">IBAN: <span className="text-[#111827]">{bank.iban}</span></p>}
            {bank.swift && <p className="text-gray-500">SWIFT: <span className="text-[#111827]">{bank.swift}</span></p>}
          </div>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="border-t border-black/[0.08] pt-4">
          <p className="text-xs text-black/50 mb-1">Notes</p>
          <p className="text-sm text-gray-500 italic">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
