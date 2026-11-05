"use client";

// Press play: the installer's campaign and wallet on one screen. Not linked from
// the dashboard nav yet; the API returns 404 until PRESS_PLAY_ENABLED is on.
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { WalletBilling, type WalletActivity } from "@/components/dashboard/WalletBilling";
import { money } from "@/lib/money";

interface State {
  balanceKobo: number;
  spentKobo: number;
  activity: WalletActivity[];
  ready: boolean;
  areas: { slug: string; name: string }[];
  quizzes: { id: string; name: string }[];
  campaign: { status: string; quizId: string; areas: string[]; leads: number; since: string } | null;
}

const STATUS: Record<string, { label: string; tone: string }> = {
  none: { label: "Not started", tone: "bg-gray-100 text-gray-700" },
  in_review: { label: "Meta is reviewing your ad", tone: "bg-amber-100 text-amber-800" },
  active: { label: "Running", tone: "bg-emerald-100 text-emerald-800" },
  paused: { label: "Paused", tone: "bg-gray-100 text-gray-700" },
  out_of_balance: { label: "Stopped: balance used up", tone: "bg-red-100 text-red-700" },
  rejected: { label: "Ad not approved", tone: "bg-red-100 text-red-700" },
  error: { label: "Couldn't start", tone: "bg-red-100 text-red-700" },
};

export default function CampaignPage() {
  const orgSlug = useParams()["org-slug"] as string;
  const router = useRouter();
  const { user, loading, getAuthHeaders } = useAuth(orgSlug);
  const [data, setData] = useState<State | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [quizId, setQuizId] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/press-play", { headers: getAuthHeaders() });
    if (res.status === 404) return setUnavailable(true);
    const d = await res.json();
    if (!res.ok) return setError(d.error || "Could not load your campaign.");
    setData(d);
    setQuizId((q) => q || d.campaign?.quizId || d.quizzes[0]?.id || "");
    setAreas((a) => (a.length ? a : d.campaign?.areas ?? []));
  }, [getAuthHeaders]);

  useEffect(() => {
    if (!loading && !user) router.push(`/dashboard/${orgSlug}/login`);
    if (user) load();
  }, [loading, user, router, orgSlug, load]);

  async function act(action: "play" | "pause") {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/dashboard/press-play", {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(action === "play" ? { action, quizId, areas } : { action }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setError(d.error || "Something went wrong.");
    await load();
    setBusy(false);
  }

  async function topUp(amountNaira: number) {
    const res = await fetch("/api/dashboard/wallet/topup", {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ amountNaira }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.authorization_url) throw new Error(d.error || "Could not start checkout.");
    window.location.href = d.authorization_url;
  }

  if (unavailable) {
    return <p className="p-8 text-center text-sm text-gray-500">Campaigns aren&apos;t available on this account yet.</p>;
  }
  if (!data) return <p className="p-8 text-center text-sm text-gray-500">{error ?? "Loading..."}</p>;

  const status = data.campaign?.status ?? "none";
  const running = status === "active" || status === "in_review";
  const s = STATUS[status] ?? STATUS.none;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Your campaign</h1>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${s.tone}`}>{s.label}</span>

          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Spent</dt>
              <dd className="text-2xl font-bold text-gray-900">{money(data.spentKobo / 100)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Leads</dt>
              <dd className="text-2xl font-bold text-gray-900">{data.campaign?.leads ?? 0}</dd>
              {data.campaign && <p className="text-xs text-gray-500">since {data.campaign.since}</p>}
            </div>
          </dl>

          {!running && (
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-gray-900">
                Scorecard
                <select
                  value={quizId}
                  onChange={(e) => setQuizId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {data.quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend className="text-sm font-medium text-gray-900">Where your ad shows</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.areas.map((a) => {
                    const on = areas.includes(a.slug);
                    return (
                      <button
                        key={a.slug}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setAreas(on ? areas.filter((x) => x !== a.slug) : [...areas, a.slug])}
                        className={`rounded-full border px-4 py-2 text-sm ${on ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-gray-300 text-gray-700"}`}
                      >
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {!data.ready && <p className="mt-4 text-sm text-gray-500">Campaigns open soon.</p>}

          <div className="mt-6 flex justify-end">
            {running ? (
              <button
                type="button"
                onClick={() => act("pause")}
                disabled={busy}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-900 disabled:opacity-60"
              >
                {busy ? "Pausing..." : "Pause"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => act("play")}
                disabled={busy || !data.ready || !quizId || !areas.length}
                className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Starting..." : "Press play"}
              </button>
            )}
          </div>
        </section>

        <WalletBilling balanceKobo={data.balanceKobo} activity={data.activity} onTopUp={topUp} />
      </div>
    </main>
  );
}
