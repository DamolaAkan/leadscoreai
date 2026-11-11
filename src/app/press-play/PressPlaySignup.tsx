"use client";

// Press-play sign-up: website -> details -> scorecard -> email code -> campaign.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AREAS } from "@/lib/press-play-config";
import { MIN_JOB_OPTIONS, PRODUCT_OPTIONS, preview, type TemplateId } from "@/lib/press-play-scorecards";
import { money } from "@/lib/money";

type Step = "website" | "details" | "scorecard" | "verify";
const STEPS: Step[] = ["website", "details", "scorecard", "verify"];
const TITLES: Record<Step, string> = {
  website: "Your business",
  details: "Check your details",
  scorecard: "Pick your scorecard",
  verify: "Confirm your email",
};

function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm ${on ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-gray-300 bg-white text-gray-700"}`}
    >
      {label}
    </button>
  );
}

const field = "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-700 focus:outline-none";

export default function PressPlaySignup() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("website");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [noteOk, setNoteOk] = useState(true);

  const [website, setWebsite] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [minJobNaira, setMinJobNaira] = useState(0);
  const [templateId, setTemplateId] = useState<TemplateId>("savings");
  const [code, setCode] = useState("");

  const options = useMemo(
    () => preview({ companyName, products, cities, minJobNaira }),
    [companyName, products, cities, minJobNaira]
  );
  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function readSite() {
    setBusy(true);
    setError(null);
    setNote(null);
    const res = await fetch("/api/press-play/read-website", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: website }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setCompanyName(d.companyName || companyName);
      if (d.products?.length) setProducts(d.products);
      if (d.cities?.length) setCities(d.cities);
      setNote(d.summary ? `From your website: ${d.summary}` : "We filled in what we could from your website.");
      setNoteOk(true);
    } else {
      // Only our own friendly messages (422/429) are shown; anything else is generic.
      const friendly = (res.status === 422 || res.status === 429) && typeof d.error === "string";
      setNote(friendly ? d.error : "We couldn't read that website. Fill in your details below.");
      setNoteOk(false);
    }
    setBusy(false);
    setStep("details");
  }

  async function sendCode() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/builder/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: "signup" }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "We couldn't send a code. Try again.");
    setStep("verify");
  }

  async function finish() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/press-play/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, companyName, whatsapp, products, cities, minJobNaira, templateId }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.session_id) {
      setBusy(false);
      return setError(d.error || "Something went wrong. Try again.");
    }
    try {
      localStorage.setItem("lsai-session", d.session_id);
    } catch {
      /* the campaign page will ask them to sign in */
    }
    router.push(`/dashboard/${d.orgSlug}/campaign`);
  }

  const detailsReady = companyName.trim() && whatsapp.trim() && /\S+@\S+\.\S+/.test(email) && cities.length > 0;
  const n = STEPS.indexOf(step) + 1;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-sm font-semibold text-emerald-800">LeadScoreAI for solar installers</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">Press play on buyer leads</h1>
        <p className="mt-2 text-gray-600">
          We run the ads from our own accounts. You pick a scorecard, top up and press play. Leads land in your dashboard, scored.
        </p>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-medium text-gray-500">
            Step {n} of {STEPS.length}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">{TITLES[step]}</h2>

          {step === "website" && (
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-gray-900">
                Your website
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="yourcompany.com"
                  inputMode="url"
                  className={field}
                />
              </label>
              <p className="text-sm text-gray-500">We&apos;ll read it and fill in your products and cities for you.</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => setStep("details")} className="text-sm text-gray-600 underline">
                  No website? Fill it in yourself
                </button>
                <button
                  type="button"
                  onClick={readSite}
                  disabled={busy || website.trim().length < 4}
                  className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "Reading your website..." : "Read my website"}
                </button>
              </div>
            </div>
          )}

          {step === "details" && (
            <div className="mt-4 space-y-5">
              {note && (
                <p className={`rounded-lg px-3 py-2 text-sm ${noteOk ? "bg-emerald-50 text-emerald-900" : "bg-gray-100 text-gray-700"}`}>{note}</p>
              )}
              <label className="block text-sm font-medium text-gray-900">
                Company name
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={field} />
              </label>
              <label className="block text-sm font-medium text-gray-900">
                WhatsApp number for your leads
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="0811 000 0000" inputMode="tel" className={field} />
              </label>
              <label className="block text-sm font-medium text-gray-900">
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourcompany.com" inputMode="email" className={field} />
              </label>
              <fieldset>
                <legend className="text-sm font-medium text-gray-900">What you sell</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRODUCT_OPTIONS.map((p) => (
                    <Chip key={p} label={p} on={products.includes(p)} onClick={() => toggle(products, setProducts, p)} />
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium text-gray-900">Cities you install in</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AREAS.map((a) => (
                    <Chip key={a.slug} label={a.name} on={cities.includes(a.slug)} onClick={() => toggle(cities, setCities, a.slug)} />
                  ))}
                </div>
              </fieldset>
              <label className="block text-sm font-medium text-gray-900">
                Smallest job you take
                <select value={minJobNaira} onChange={(e) => setMinJobNaira(Number(e.target.value))} className={field}>
                  {MIN_JOB_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v ? money(v) : "No minimum"}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-between gap-3">
                <button type="button" onClick={() => setStep("website")} className="text-sm text-gray-600 underline">
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep("scorecard")}
                  disabled={!detailsReady}
                  className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === "scorecard" && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-600">Every lead answers these questions before they reach you.</p>
              {options.map((o) => (
                <label
                  key={o.id}
                  className={`block cursor-pointer rounded-xl border p-4 ${templateId === o.id ? "border-emerald-700 bg-emerald-50/40" : "border-gray-200"}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="template"
                      checked={templateId === o.id}
                      onChange={() => setTemplateId(o.id)}
                      className="mt-1 accent-emerald-700"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">
                        {o.name}
                        {o.recommended && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Recommended</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-600">{o.description}</p>
                      <p className="mt-2 text-sm font-medium text-gray-900">&ldquo;{o.headline}&rdquo;</p>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600">
                        {o.questions.map((q) => (
                          <li key={q.text}>{q.text}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </label>
              ))}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-between gap-3 pt-2">
                <button type="button" onClick={() => setStep("details")} className="text-sm text-gray-600 underline">
                  Back
                </button>
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={busy}
                  className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "Sending..." : "Use this scorecard"}
                </button>
              </div>
            </div>
          )}

          {step === "verify" && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-gray-600">We sent a 6-digit code to {email}.</p>
              <label className="block text-sm font-medium text-gray-900">
                Code
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className={`${field} tracking-widest`}
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex flex-wrap justify-between gap-3">
                <button type="button" onClick={sendCode} disabled={busy} className="text-sm text-gray-600 underline">
                  Send a new code
                </button>
                <button
                  type="button"
                  onClick={finish}
                  disabled={busy || code.length !== 6}
                  className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "Setting up..." : "Create my account"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
