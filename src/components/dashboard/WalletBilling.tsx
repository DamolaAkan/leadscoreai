"use client";

import { useState } from "react";
import { money } from "@/lib/money";
import { KOBO, TOPUP_STOPS_NAIRA, checkoutFor } from "@/lib/wallet-math";

export interface WalletActivity {
  id: string;
  label: string;
  amountKobo: number;
  date: string;
}

const short = (naira: number) =>
  naira >= 1_000_000 ? `₦${naira / 1_000_000}M` : `₦${naira / 1_000}k`;
const naira = (kobo: number) => money(kobo / KOBO);

// Billing, modelled on Explee's: a balance that stays until the ads use it, a
// slider of top-up amounts, and a plain list of what came in and went out.
export function WalletBilling({
  balanceKobo,
  activity,
  onTopUp,
}: {
  balanceKobo: number;
  activity: WalletActivity[];
  onTopUp: (amountNaira: number) => Promise<void>;
}) {
  const [stop, setStop] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountNaira = TOPUP_STOPS_NAIRA[stop];
  const { vatKobo, totalKobo } = checkoutFor(amountNaira * KOBO);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      await onTopUp(amountNaira);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Balance</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{naira(balanceKobo)}</p>
        <p className="mt-3 text-sm text-gray-500">
          No monthly fee. Your balance stays until your ads use it, and your campaign stops when it runs out.
        </p>

        <hr className="my-5 border-gray-200" />

        <label htmlFor="topup-amount" className="text-sm font-medium text-gray-900">
          Add to your balance
        </label>
        <input
          id="topup-amount"
          type="range"
          min={0}
          max={TOPUP_STOPS_NAIRA.length - 1}
          step={1}
          value={stop}
          onChange={(e) => setStop(Number(e.target.value))}
          aria-valuetext={money(amountNaira)}
          className="mt-4 w-full accent-emerald-700"
        />
        <div className="mt-1 flex justify-between text-[11px] text-gray-500">
          {TOPUP_STOPS_NAIRA.map((n, i) => (
            <button
              key={n}
              type="button"
              onClick={() => setStop(i)}
              className={i === stop ? "font-bold text-gray-900" : ""}
            >
              {short(n)}
            </button>
          ))}
        </div>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex items-baseline justify-between">
            <dt className="text-gray-900">Amount</dt>
            <dd className="text-xl font-bold text-gray-900">{naira(amountNaira * KOBO)}</dd>
          </div>
          <div className="flex justify-between text-gray-500">
            <dt>VAT (7.5%)</dt>
            <dd>{naira(vatKobo)}</dd>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
            <dt>Total to pay</dt>
            <dd>{naira(totalKobo)}</dd>
          </div>
        </dl>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={pay}
            disabled={busy}
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {busy ? "Opening checkout..." : `Pay ${naira(totalKobo)}`}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Activity</h2>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Nothing yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-200">
            {activity.map((a) => (
              <li key={a.id} className="flex items-start justify-between py-3 text-sm">
                <span className="text-gray-900">{a.label}</span>
                <span className="text-right">
                  <span className={a.amountKobo > 0 ? "font-medium text-emerald-700" : "font-medium text-gray-900"}>
                    {a.amountKobo > 0 ? "+" : "-"}
                    {naira(Math.abs(a.amountKobo))}
                  </span>
                  <span className="block text-xs text-gray-500">{a.date}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
