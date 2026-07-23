"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { slGet, slSend } from "@/lib/sl-client";
import { SlDeal, SlProduct } from "@/lib/sl-types";

interface Meta {
  products: SlProduct[];
  reps: { id: string; full_name: string; role: string }[];
  me: { id: string; full_name: string; role: string; canManage: boolean };
}

const inputCls =
  "w-full border border-[#cbd5e1] rounded-md px-3 py-2 text-sm text-[#1e293b] bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30";
const labelCls = "block text-xs font-medium text-[#64748b] mb-1";

export default function DealForm({ deal }: { deal?: SlDeal }) {
  const router = useRouter();
  const editing = !!deal;
  const [meta, setMeta] = useState<Meta | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    contact_name: deal?.contact_name || "",
    contact_email: deal?.contact_email || "",
    contact_phone: deal?.contact_phone || "",
    company_name: deal?.company_name || "",
    product_id: deal?.product_id || "",
    currency: deal?.currency || "NGN",
    setup_fee: deal?.setup_fee != null ? String(deal.setup_fee) : "",
    monthly_amount: deal?.monthly_amount != null ? String(deal.monthly_amount) : "",
    owner_id: deal?.owner_id || "",
    notes: deal?.notes || "",
  });

  useEffect(() => {
    slGet<Meta>("/api/deals/meta")
      .then((m) => {
        setMeta(m);
        setForm((f) => ({
          ...f,
          product_id: f.product_id || m.products[0]?.id || "",
          owner_id: f.owner_id || m.me.id,
        }));
      })
      .catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.contact_name.trim()) return setError("Contact name is required");
    setSaving(true);
    const payload = {
      ...form,
      setup_fee: Number(form.setup_fee) || 0,
      monthly_amount: Number(form.monthly_amount) || 0,
    };
    try {
      if (editing) {
        await slSend(`/api/deals/${deal!.id}`, "PATCH", payload);
        router.push(`/deals/${deal!.id}`);
      } else {
        const r = await slSend<{ deal: SlDeal }>("/api/deals", "POST", payload);
        router.push(`/deals/${r.deal.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-4">
        <div>
          <label className={labelCls}>Contact name *</label>
          <input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Email</label>
            <input value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Company</label>
          <input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Product</label>
            <select value={form.product_id} onChange={(e) => set("product_id", e.target.value)} className={inputCls}>
              {meta?.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.is_commission_eligible ? ` (${(p.commission_rate * 100).toFixed(1)}%)` : " (no commission)"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputCls}>
              <option value="NGN">NGN (₦)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Setup fee (commission base)</label>
            <input type="number" min="0" step="0.01" value={form.setup_fee} onChange={(e) => set("setup_fee", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Monthly amount (tracked, not commissioned)</label>
            <input type="number" min="0" step="0.01" value={form.monthly_amount} onChange={(e) => set("monthly_amount", e.target.value)} className={inputCls} />
          </div>
        </div>
        {meta?.me.canManage && (
          <div>
            <label className={labelCls}>Owner (rep)</label>
            <select value={form.owner_id} onChange={(e) => set("owner_id", e.target.value)} className={inputCls}>
              {meta.reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={inputCls} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="text-sm font-medium px-5 py-2.5 rounded-md text-white bg-[#7C3AED] hover:bg-[#6d28d9] disabled:opacity-50"
        >
          {saving ? "Saving..." : editing ? "Save changes" : "Create deal"}
        </button>
        <button type="button" onClick={() => router.back()} className="text-sm font-medium px-4 py-2.5 text-[#64748b] hover:text-[#1e293b]">
          Cancel
        </button>
      </div>
    </form>
  );
}
