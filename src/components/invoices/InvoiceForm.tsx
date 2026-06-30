"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Invoice, InvoiceClient, InvoiceLineItem, BankDetails } from "@/lib/invoice-types";
import { calculateBalanceDue } from "@/lib/invoice-utils";

interface InvoiceFormProps {
  getAuthHeaders: () => Record<string, string>;
  invoice?: Invoice;
}

export default function InvoiceForm({ getAuthHeaders, invoice: editInvoice }: InvoiceFormProps) {
  const router = useRouter();
  const [clients, setClients] = useState<InvoiceClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!editInvoice;

  const [clientId, setClientId] = useState(editInvoice?.client_id || "");
  const [issueDate, setIssueDate] = useState(
    editInvoice?.issue_date || new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(editInvoice?.due_date || "");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    editInvoice?.line_items || [{ description: "", quantity: 1, unit_price: 0, amount: 0, type: "charge" }]
  );
  const [bankDetails, setBankDetails] = useState<BankDetails>(editInvoice?.bank_details || {});
  const [notes, setNotes] = useState(editInvoice?.notes || "");
  const [currency, setCurrency] = useState(editInvoice?.currency || "USD");

  useEffect(() => {
    fetch("/api/invoices/clients", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setClients(d.clients || []);
      });
  }, []);

  useEffect(() => {
    // Auto-set currency from client (only when not editing)
    if (isEdit) return;
    const client = clients.find((c) => c.id === clientId);
    if (client) setCurrency(client.currency);
  }, [clientId, clients]);

  function updateLineItem(index: number, field: keyof InvoiceLineItem, value: string | number) {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };
    item.amount = item.quantity * item.unit_price;
    updated[index] = item;
    setLineItems(updated);
  }

  function addLineItem(type: "charge" | "payment" = "charge") {
    setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0, amount: 0, type }]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  const charges = lineItems.filter((item) => !item.type || item.type === "charge");
  const payments = lineItems.filter((item) => item.type === "payment");
  const balanceDue = calculateBalanceDue(lineItems);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const itemsWithAmount = lineItems.map((item) => ({
      ...item,
      type: item.type || "charge",
      amount: item.quantity * item.unit_price,
    }));

    const subtotal = balanceDue;

    if (isEdit) {
      // PATCH existing invoice
      const res = await fetch(`/api/invoices/${editInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          client_id: clientId,
          issue_date: issueDate,
          due_date: dueDate,
          line_items: itemsWithAmount,
          subtotal,
          currency,
          bank_details: bankDetails,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to update invoice");
        return;
      }

      router.push(`/invoices/${editInvoice.id}`);
    } else {
      // POST new invoice
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          client_id: clientId,
          issue_date: issueDate,
          due_date: dueDate,
          line_items: itemsWithAmount,
          subtotal,
          currency,
          bank_details: bankDetails,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to create invoice");
        return;
      }

      router.push(`/invoices/${data.invoice.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Client */}
      <div>
        <label className="block text-sm font-medium text-[#111827] mb-1">Client</label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
          className="w-full bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#7C3AED]"
        >
          <option value="">Select a client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.company ? `(${c.company})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#111827] mb-1">Issue Date</label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
            className="w-full bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#111827] mb-1">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="w-full bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <label className="block text-sm font-medium text-[#111827] mb-2">Line Items</label>
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <select
                value={item.type || "charge"}
                onChange={(e) => updateLineItem(index, "type", e.target.value)}
                className="col-span-2 bg-[#f9fafb] border border-black/[0.08] rounded-xl px-2 py-2 text-[#111827] text-sm focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="charge">Charge</option>
                <option value="payment">Payment</option>
              </select>
              <input
                type="text"
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateLineItem(index, "description", e.target.value)}
                required
                className="col-span-4 bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] text-sm focus:outline-none focus:border-[#7C3AED]"
              />
              <input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateLineItem(index, "quantity", Number(e.target.value))}
                min={1}
                required
                className="col-span-2 bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] text-sm focus:outline-none focus:border-[#7C3AED]"
              />
              <input
                type="number"
                placeholder="Price"
                value={item.unit_price || ""}
                onChange={(e) => updateLineItem(index, "unit_price", Number(e.target.value))}
                min={0}
                step={0.01}
                required
                className="col-span-2 bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] text-sm focus:outline-none focus:border-[#7C3AED]"
              />
              <button
                type="button"
                onClick={() => removeLineItem(index)}
                className="col-span-2 text-red-500 hover:text-red-600 text-sm px-2 py-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => addLineItem("charge")}
            className="text-[#7C3AED] hover:text-[#6D28D9] text-sm font-medium"
          >
            + Add Charge
          </button>
          <button
            type="button"
            onClick={() => addLineItem("payment")}
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            + Add Payment
          </button>
        </div>

        {/* Summary */}
        {payments.length > 0 && (
          <div className="mt-4 p-3 bg-white rounded-xl border border-black/[0.08] text-sm space-y-1">
            <div className="flex justify-between text-gray-500">
              <span>Charges ({charges.length} items)</span>
              <span>{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
                charges.reduce((s, i) => s + i.quantity * i.unit_price, 0)
              )}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Payments ({payments.length} items)</span>
              <span>-{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
                payments.reduce((s, i) => s + i.quantity * i.unit_price, 0)
              )}</span>
            </div>
            <div className="flex justify-between font-semibold text-[#111827] border-t border-black/[0.08] pt-1">
              <span>Balance Due</span>
              <span>{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(balanceDue)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bank Details */}
      <div>
        <label className="block text-sm font-medium text-[#111827] mb-2">Bank Details</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Bank Name"
            value={bankDetails.bank_name || ""}
            onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
            className="bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] text-sm focus:outline-none focus:border-[#7C3AED]"
          />
          <input
            type="text"
            placeholder="Account Name"
            value={bankDetails.account_name || ""}
            onChange={(e) => setBankDetails({ ...bankDetails, account_name: e.target.value })}
            className="bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] text-sm focus:outline-none focus:border-[#7C3AED]"
          />
          <input
            type="text"
            placeholder="Account Number"
            value={bankDetails.account_number || ""}
            onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
            className="bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] text-sm focus:outline-none focus:border-[#7C3AED]"
          />
          <input
            type="text"
            placeholder="Sort Code"
            value={bankDetails.sort_code || ""}
            onChange={(e) => setBankDetails({ ...bankDetails, sort_code: e.target.value })}
            className="bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] text-sm focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-[#111827] mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Payment terms, additional info..."
          className="w-full bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] text-sm focus:outline-none focus:border-[#7C3AED] resize-none"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#7C3AED] text-white font-medium rounded-full hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
        >
          {loading
            ? isEdit ? "Saving..." : "Creating..."
            : isEdit ? "Save Changes" : "Create Invoice"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 text-gray-500 hover:text-[#111827] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
