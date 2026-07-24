"use client";

import { useEffect, useState, useCallback } from "react";
import { slGet, slSend } from "@/lib/sl-client";
import { StaffOnboarding } from "@/lib/staff-types";

type Form = Partial<StaffOnboarding>;

const input =
  "w-full border border-[#cbd5e1] rounded-md px-3 py-2 text-sm text-[#1e293b] bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30";
const lbl = "block text-xs font-medium text-[#64748b] mb-1";

// Stable, top-level components (defining these inside the page would remount
// inputs on every keystroke and drop focus).
function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={input} placeholder={placeholder} />
    </div>
  );
}

function AckRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 text-sm text-[#475569] cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-[#7C3AED] w-4 h-4" />
      <span>{children}</span>
    </label>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <h2 className="text-sm font-semibold text-[#1e293b] mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function OnboardingPage() {
  const [form, setForm] = useState<Form>({});
  const [status, setStatus] = useState<"draft" | "submitted">("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await slGet<{ onboarding: StaffOnboarding | null; me: { full_name: string; email: string } }>("/api/onboarding");
      if (d.onboarding) {
        setForm(d.onboarding);
        setStatus(d.onboarding.status);
      } else {
        setForm({ full_name: d.me.full_name, personal_email: d.me.email });
      }
    } catch {
      setError("Could not load your onboarding.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof StaffOnboarding, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const val = (k: keyof StaffOnboarding) => (form[k] as string) || "";

  async function save(submit: boolean) {
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const d = await slSend<{ onboarding: StaffOnboarding }>("/api/onboarding", "PUT", { ...form, submit });
      setStatus(d.onboarding.status);
      setMsg(submit ? "Submitted. Your details are with the team." : "Draft saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
    setSaving(false);
  }

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Onboarding</h1>
          <p className="text-sm text-gray-500 mt-1">Fill in your details so we can set you up and pay your commissions.</p>
        </div>
        <span
          className="text-xs font-medium px-3 py-1 rounded-full"
          style={status === "submitted" ? { backgroundColor: "#ccfbf1", color: "#115e59" } : { backgroundColor: "#fef9c3", color: "#854d0e" }}
        >
          {status === "submitted" ? "Submitted" : "Draft"}
        </span>
      </div>

      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
      {msg && <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{msg}</div>}

      <FormCard title="Personal details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" value={val("full_name")} onChange={(v) => set("full_name", v)} />
          <Field label="Date of birth" type="date" value={val("date_of_birth")} onChange={(v) => set("date_of_birth", v)} />
          <div>
            <label className={lbl}>Gender</label>
            <select value={val("gender")} onChange={(e) => set("gender", e.target.value)} className={input}>
              <option value="">Select</option>
              <option>Female</option>
              <option>Male</option>
              <option>Prefer not to say</option>
            </select>
          </div>
          <Field label="Phone number" value={val("phone")} onChange={(v) => set("phone", v)} placeholder="+234..." />
          <Field label="Personal email" type="email" value={val("personal_email")} onChange={(v) => set("personal_email", v)} />
          <div className="sm:col-span-2">
            <Field label="Residential address" value={val("address")} onChange={(v) => set("address", v)} />
          </div>
        </div>
      </FormCard>

      <FormCard title="Identity">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>ID type</label>
            <select value={val("id_type")} onChange={(e) => set("id_type", e.target.value)} className={input}>
              <option value="">Select</option>
              <option>International passport</option>
              <option>Driver&apos;s licence</option>
              <option>Voter&apos;s card</option>
              <option>National ID (NIN slip)</option>
            </select>
          </div>
          <Field label="ID number" value={val("id_number")} onChange={(v) => set("id_number", v)} />
        </div>
      </FormCard>

      <FormCard title="Bank details (for commission payouts)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bank name" value={val("bank_name")} onChange={(v) => set("bank_name", v)} />
          <Field label="Account number" value={val("account_number")} onChange={(v) => set("account_number", v)} />
          <div className="sm:col-span-2">
            <Field label="Account name" value={val("account_name")} onChange={(v) => set("account_name", v)} />
          </div>
        </div>
      </FormCard>

      <FormCard title="Next of kin">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" value={val("nok_name")} onChange={(v) => set("nok_name", v)} />
          <Field label="Relationship" value={val("nok_relationship")} onChange={(v) => set("nok_relationship", v)} />
          <Field label="Phone number" value={val("nok_phone")} onChange={(v) => set("nok_phone", v)} />
          <Field label="Address" value={val("nok_address")} onChange={(v) => set("nok_address", v)} />
        </div>
      </FormCard>

      <FormCard title="Guarantor">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" value={val("guarantor_name")} onChange={(v) => set("guarantor_name", v)} />
          <Field label="Occupation" value={val("guarantor_occupation")} onChange={(v) => set("guarantor_occupation", v)} />
          <Field label="Phone number" value={val("guarantor_phone")} onChange={(v) => set("guarantor_phone", v)} />
          <Field label="Address" value={val("guarantor_address")} onChange={(v) => set("guarantor_address", v)} />
        </div>
      </FormCard>

      <FormCard title="Acknowledgements">
        <div className="space-y-3">
          <AckRow checked={!!form.ack_employment} onChange={(v) => set("ack_employment", v)}>
            I confirm my employment details are correct and accept the{" "}
            <a href="/policies/employment-terms" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] font-medium underline">
              employment terms
            </a>{" "}
            of my offer.
          </AckRow>
          <AckRow checked={!!form.ack_nda} onChange={(v) => set("ack_nda", v)}>
            I agree to the{" "}
            <a href="/policies/nda" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] font-medium underline">
              confidentiality and non-disclosure agreement
            </a>
            .
          </AckRow>
          <AckRow checked={!!form.ack_conduct} onChange={(v) => set("ack_conduct", v)}>
            I have read and accept the{" "}
            <a href="/policies/code-of-conduct" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] font-medium underline">
              code of conduct
            </a>
            .
          </AckRow>
          <AckRow checked={!!form.ack_privacy} onChange={(v) => set("ack_privacy", v)}>
            I consent to LeadScoreAI storing these details for HR and payroll purposes, in line with the{" "}
            <a href="/policies/data-privacy" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] font-medium underline">
              data privacy notice
            </a>
            .
          </AckRow>
        </div>
      </FormCard>

      <div className="flex items-center gap-3">
        <button onClick={() => save(false)} disabled={saving} className="text-sm font-medium px-5 py-2.5 rounded-md border border-[#e2e8f0] text-[#475569] hover:bg-[#f8fafc] disabled:opacity-50">
          {saving ? "Saving..." : "Save draft"}
        </button>
        <button onClick={() => save(true)} disabled={saving} className="text-sm font-medium px-5 py-2.5 rounded-md text-white bg-[#7C3AED] hover:bg-[#6d28d9] disabled:opacity-50">
          {saving ? "Saving..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
