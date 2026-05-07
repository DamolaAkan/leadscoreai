"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ClientFormProps {
  getAuthHeaders: () => Record<string, string>;
}

export default function ClientForm({ getAuthHeaders }: ClientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/invoices/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ name, company: company || null, email, currency, notes: notes || null }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create client");
      return;
    }

    router.push("/invoices/clients");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#111827] mb-1">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Client name"
          className="w-full bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#7C3AED]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#111827] mb-1">Company</label>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company name (optional)"
          className="w-full bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#7C3AED]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#111827] mb-1">Email *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="client@example.com"
          className="w-full bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#7C3AED]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#111827] mb-1">Currency</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#7C3AED]"
        >
          <option value="USD">USD - US Dollar</option>
          <option value="GBP">GBP - British Pound</option>
          <option value="EUR">EUR - Euro</option>
          <option value="NGN">NGN - Nigerian Naira</option>
          <option value="CAD">CAD - Canadian Dollar</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#111827] mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Additional notes..."
          className="w-full bg-[#f9fafb] border border-black/[0.08] rounded-xl px-3 py-2 text-[#111827] text-sm focus:outline-none focus:border-[#7C3AED] resize-none"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#7C3AED] text-white font-medium rounded-full hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
        >
          {loading ? "Adding..." : "Add Client"}
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
