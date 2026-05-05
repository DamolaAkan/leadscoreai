"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InvoiceClient, InvoiceLineItem, BankDetails } from "@/lib/invoice-types";
import { calculateSubtotal } from "@/lib/invoice-utils";

interface RecurringFormProps {
  getAuthHeaders: () => Record<string, string>;
}

export default function RecurringForm({ getAuthHeaders }: RecurringFormProps) {
  const router = useRouter();
  const [clients, setClients] = useState<InvoiceClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [clientId, setClientId] = useState("");
  const [sendDay, setSendDay] = useState(1);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: "", quantity: 1, unit_price: 0, amount: 0 },
  ]);
  const [bankDetails, setBankDetails] = useState<BankDetails>({});
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    fetch("/api/invoices/clients", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setClients(d.clients || []));
  }, []);

  useEffect(() => {
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

  function addLineItem() {
    setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0, amount: 0 }]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const subtotal = calculateSubtotal(lineItems);
    const itemsWithAmount = lineItems.map((item) => ({
      ...item,
      amount: item.quantity * item.unit_price,
    }));

    const res = await fetch("/api/invoices/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        client_id: clientId,
        line_items: itemsWithAmount,
        subtotal,
        currency,
        bank_details: bankDetails,
        notes: notes || null,
        send_day: sendDay,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create template");
      return;
    }

    router.push("/invoices/recurring");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Client & Send Day */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            className="w-full bg-[#0d0d1a] border border-[#2a2a3d] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#7C3AED]"
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `(${c.company})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Send Day (1-28)</label>
          <input
            type="number"
            value={sendDay}
            onChange={(e) => setSendDay(Number(e.target.value))}
            min={1}
            max={28}
            required
            className="w-full bg-[#0d0d1a] border border-[#2a2a3d] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Line Items</label>
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <input
                type="text"
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateLineItem(index, "description", e.target.value)}
                required
                className="col-span-5 bg-[#0d0d1a] border border-[#2a2a3d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7C3AED]"
              />
              <input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateLineItem(index, "quantity", Number(e.target.value))}
                min={1}
                required
                className="col-span-2 bg-[#0d0d1a] border border-[#2a2a3d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7C3AED]"
              />
              <input
                type="number"
                placeholder="Price"
                value={item.unit_price || ""}
                onChange={(e) => updateLineItem(index, "unit_price", Number(e.target.value))}
                min={0}
                step={0.01}
                required
                className="col-span-3 bg-[#0d0d1a] border border-[#2a2a3d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7C3AED]"
              />
              <button
                type="button"
                onClick={() => removeLineItem(index)}
                className="col-span-2 text-red-400 hover:text-red-300 text-sm px-2 py-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addLineItem}
          className="mt-3 text-[#7C3AED] hover:text-[#A78BFA] text-sm font-medium"
        >
          + Add Line Item
        </button>
      </div>

      {/* Bank Details */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Bank Details</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Bank Name"
            value={bankDetails.bank_name || ""}
            onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
            className="bg-[#0d0d1a] border border-[#2a2a3d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7C3AED]"
          />
          <input
            type="text"
            placeholder="Account Name"
            value={bankDetails.account_name || ""}
            onChange={(e) => setBankDetails({ ...bankDetails, account_name: e.target.value })}
            className="bg-[#0d0d1a] border border-[#2a2a3d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7C3AED]"
          />
          <input
            type="text"
            placeholder="Account Number"
            value={bankDetails.account_number || ""}
            onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
            className="bg-[#0d0d1a] border border-[#2a2a3d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7C3AED]"
          />
          <input
            type="text"
            placeholder="Sort Code"
            value={bankDetails.sort_code || ""}
            onChange={(e) => setBankDetails({ ...bankDetails, sort_code: e.target.value })}
            className="bg-[#0d0d1a] border border-[#2a2a3d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7C3AED]"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Payment terms, additional info..."
          className="w-full bg-[#0d0d1a] border border-[#2a2a3d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7C3AED] resize-none"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating..." : "Create Template"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
