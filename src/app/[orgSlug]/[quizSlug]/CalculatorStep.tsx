"use client";

import {
  computeCalc,
  formatMoney,
  termLabel,
  type CalcInputs,
  type CalculatorConfig,
} from "@/lib/calculator";

// A slider step that suits the range (about 100-1,000 steps across it).
function stepFor(max: number): number {
  return Math.max(1, Math.pow(10, Math.floor(Math.log10(Math.max(max, 10))) - 2));
}

const digits = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

function MoneyField({
  label,
  hint,
  value,
  min,
  max,
  currency,
  accent,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  currency: string;
  accent: string;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-semibold" style={{ color: "#1e293b" }}>
          {label}
        </label>
        <input
          inputMode="numeric"
          value={formatMoney(value, currency)}
          onChange={(e) => onChange(Math.min(max, digits(e.target.value)))}
          className="w-40 text-right text-[15px] font-semibold rounded-md border px-2 py-1"
          style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
          aria-label={label}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={stepFor(max)}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2"
        style={{ accentColor: accent }}
      />
      {hint && (
        <p className="text-xs mt-1" style={{ color: "#64748b" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// The calculator step of a builder quiz. All figures come from computeCalc.
export default function CalculatorStep({
  config: c,
  inputs,
  accent,
  onChange,
}: {
  config: CalculatorConfig;
  inputs: CalcInputs;
  accent: string;
  onChange: (next: CalcInputs) => void;
}) {
  const set = (patch: Partial<CalcInputs>) => onChange({ ...inputs, ...patch });
  const r = computeCalc(c, inputs);
  const m = (n: number) => formatMoney(n, c.currency);
  const budgetMode = c.type === "loan" && c.allow_reverse && inputs.mode === "budget";
  const longest = c.terms[c.terms.length - 1];
  // Budget slider range: roughly what the cheapest to the dearest item costs a month.
  const monthlyAt = (price: number) =>
    computeCalc(c, { mode: "price", price, deposit: price * (c.min_deposit_pct / 100), term: longest, budget: 0 }).monthly;
  const budgetMax = Math.max(1000, Math.ceil(monthlyAt(c.price_max) * 1.2));
  const minDepositAmount = inputs.price * (c.min_deposit_pct / 100);

  return (
    <div className="space-y-6 mb-9">
      {c.type === "loan" && c.allow_reverse && (
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg" style={{ backgroundColor: "#f1f5f9" }}>
          {(
            [
              ["price", "Monthly repayment"],
              ["budget", "What can I afford?"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => set({ mode })}
              className="py-2 rounded-md text-sm font-semibold transition-colors"
              style={
                inputs.mode === mode
                  ? { backgroundColor: "white", color: accent, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                  : { color: "#64748b" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {budgetMode ? (
        <MoneyField
          label="Monthly budget"
          value={inputs.budget}
          min={0}
          max={budgetMax}
          currency={c.currency}
          accent={accent}
          onChange={(budget) => set({ budget })}
        />
      ) : (
        <MoneyField
          label={c.item_label}
          value={inputs.price}
          min={c.price_min}
          max={c.price_max}
          currency={c.currency}
          accent={accent}
          onChange={(price) => set({ price, deposit: Math.min(inputs.deposit, price) })}
        />
      )}

      <MoneyField
        label={c.type === "loan" ? "Deposit you have" : "Down payment"}
        hint={
          c.min_deposit_pct > 0
            ? budgetMode
              ? `A deposit of at least ${c.min_deposit_pct}% of the price is needed.`
              : `At least ${c.min_deposit_pct}% needed (${m(minDepositAmount)}).`
            : undefined
        }
        value={inputs.deposit}
        min={0}
        max={budgetMode ? c.price_max : inputs.price}
        currency={c.currency}
        accent={accent}
        onChange={(deposit) => set({ deposit })}
      />

      <div>
        <p className="text-sm font-semibold mb-2" style={{ color: "#1e293b" }}>
          {c.type === "loan" ? "Repay over" : "Pay over"}
        </p>
        <div className="flex flex-wrap gap-2">
          {c.terms.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set({ term: t })}
              className="px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors"
              style={
                inputs.term === t
                  ? { borderColor: accent, backgroundColor: accent + "12", color: accent }
                  : { borderColor: "#e2e8f0", color: "#475569" }
              }
            >
              {termLabel(c, t)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-5 text-center" style={{ backgroundColor: accent + "10", border: `1px solid ${accent}33` }}>
        {budgetMode ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
              You could afford up to
            </p>
            <p className="font-extrabold mt-1" style={{ fontSize: "clamp(26px, 6vw, 34px)", color: "#0f172a" }}>
              {m(r.maxPrice ?? 0)}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
              Your monthly {c.type === "loan" ? "repayment" : "payment"}
            </p>
            <p className="font-extrabold mt-1" style={{ fontSize: "clamp(26px, 6vw, 34px)", color: "#0f172a" }}>
              {m(r.monthly)}
            </p>
            <p className="text-xs mt-2" style={{ color: "#64748b" }}>
              {c.type === "loan" ? "Loan" : "On the plan"} {m(r.financed)} · {termLabel(c, inputs.term)}
              {c.rate_pct > 0 ? ` · ${c.rate_pct}% a year` : ""}
            </p>
            {r.cashExtra > 0 && (
              <p className="text-xs mt-2 font-medium" style={{ color: "#b45309" }}>
                The most we lend is {m(c.max_loan ?? 0)}, so {m(r.cashExtra)} would be paid in cash on top of your deposit.
              </p>
            )}
            {!r.depositOk && c.min_deposit_pct > 0 && (
              <p className="text-xs mt-2 font-medium" style={{ color: "#b45309" }}>
                Your deposit is below the {c.min_deposit_pct}% minimum.
              </p>
            )}
          </>
        )}
        <p className="text-[11px] mt-3" style={{ color: "#94a3b8" }}>
          An estimate to guide you, not a loan offer.
        </p>
      </div>
    </div>
  );
}
