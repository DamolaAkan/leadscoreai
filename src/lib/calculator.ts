// Quiz calculators: a loan/mortgage or instalment-plan calculator as the first
// step of a builder quiz. The AI only fills in the owner's settings (rate,
// terms, minimum deposit, loan cap, currency); every figure a lead sees is
// computed here by fixed formulas, never by the model.
// Config lives in quizzes.builder_config.calculator; the step itself is a
// quiz_questions row with question_type "calculator".

export type CalculatorType = "loan" | "instalment";

export interface CalculatorConfig {
  type: CalculatorType;
  title: string; // shown above the calculator, e.g. "Work out your monthly repayment"
  currency: string; // ISO code, e.g. "NGN"
  item_label: string; // e.g. "Property price", "Car price", "School fees"
  price_min: number;
  price_max: number;
  price_default: number;
  rate_pct: number; // loan: annual interest %; instalment: annual flat markup % (0 = none)
  terms: number[]; // loan: years; instalment: months
  min_deposit_pct: number; // 0-90
  max_loan: number | null; // loan cap (loans only)
  allow_reverse: boolean; // loans: also offer "what can I afford?" from a monthly budget
}

export type CalcMode = "price" | "budget";

export interface CalcInputs {
  mode: CalcMode;
  price: number;
  deposit: number;
  term: number;
  budget: number; // monthly budget, reverse mode only
}

export interface CalcResult {
  monthly: number;
  financed: number; // loan amount or amount on the plan
  total: number; // total repaid over the term (excluding deposit)
  cashExtra: number; // price above the loan cap, paid in cash
  maxPrice: number | null; // reverse mode: the most they can afford
  depositOk: boolean; // deposit meets the minimum
}

// Points the calculator step adds to the score: a deposit that meets the
// business's minimum is the strongest readiness signal it gives.
export const CALCULATOR_MAX_POINTS = 20;

export const CALC_CURRENCIES: Record<string, string> = {
  NGN: "en-NG",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "en-IE",
  ZAR: "en-ZA",
  KES: "en-KE",
  GHS: "en-GH",
  AED: "en-AE",
  CAD: "en-CA",
};

export function formatMoney(n: number, currency: string): string {
  const cur = CALC_CURRENCIES[currency] ? currency : "USD";
  try {
    return new Intl.NumberFormat(CALC_CURRENCIES[cur], { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(
      Math.round(n)
    );
  } catch {
    return `${cur} ${Math.round(n).toLocaleString("en-US")}`;
  }
}

const termLabel = (c: CalculatorConfig, t: number) =>
  c.type === "loan" ? `${t} year${t === 1 ? "" : "s"}` : `${t} month${t === 1 ? "" : "s"}`;
export { termLabel };

// Monthly repayment on an amortised loan.
function amortised(loan: number, annualPct: number, months: number): number {
  if (loan <= 0 || months <= 0) return 0;
  const r = annualPct / 100 / 12;
  return r === 0 ? loan / months : (loan * r) / (1 - Math.pow(1 + r, -months));
}

// Largest loan a monthly budget can repay.
function loanFromMonthly(monthly: number, annualPct: number, months: number): number {
  if (monthly <= 0 || months <= 0) return 0;
  const r = annualPct / 100 / 12;
  return r === 0 ? monthly * months : (monthly * (1 - Math.pow(1 + r, -months))) / r;
}

export function computeCalc(c: CalculatorConfig, i: CalcInputs): CalcResult {
  const minDep = c.min_deposit_pct / 100;
  if (c.type === "instalment") {
    const financed = Math.max(0, i.price - i.deposit);
    const total = financed * (1 + (c.rate_pct / 100) * (i.term / 12));
    return {
      monthly: i.term > 0 ? total / i.term : 0,
      financed,
      total,
      cashExtra: 0,
      maxPrice: null,
      depositOk: i.deposit >= i.price * minDep - 0.5,
    };
  }
  const months = i.term * 12;
  if (i.mode === "budget" && c.allow_reverse) {
    let loan = loanFromMonthly(i.budget, c.rate_pct, months);
    if (c.max_loan != null) loan = Math.min(loan, c.max_loan);
    // The deposit must also cover the minimum share of the price.
    const byDeposit = minDep > 0 ? i.deposit / minDep : Infinity;
    const maxPrice = Math.max(0, Math.min(loan + i.deposit, byDeposit));
    const financed = Math.max(0, maxPrice - i.deposit);
    const monthly = amortised(financed, c.rate_pct, months);
    return { monthly, financed, total: monthly * months, cashExtra: 0, maxPrice, depositOk: maxPrice > 0 };
  }
  const needed = Math.max(0, i.price - i.deposit);
  const financed = c.max_loan != null ? Math.min(needed, c.max_loan) : needed;
  const monthly = amortised(financed, c.rate_pct, months);
  return {
    monthly,
    financed,
    total: monthly * months,
    cashExtra: needed - financed,
    maxPrice: null,
    depositOk: i.deposit >= i.price * minDep - 0.5,
  };
}

export function calcPoints(c: CalculatorConfig, i: CalcInputs, r: CalcResult): number {
  if (r.depositOk) return CALCULATOR_MAX_POINTS;
  // Some deposit, short of the minimum: partial credit.
  const needed = (i.mode === "budget" ? r.maxPrice ?? 0 : i.price) * (c.min_deposit_pct / 100);
  return needed > 0 && i.deposit >= needed / 2 ? Math.round(CALCULATOR_MAX_POINTS / 2) : 0;
}

// One line for the owner's dashboard and the lead's answer record.
export function describeCalc(c: CalculatorConfig, i: CalcInputs, r: CalcResult): string {
  const m = (n: number) => formatMoney(n, c.currency);
  const term = termLabel(c, i.term);
  if (c.type === "loan" && i.mode === "budget") {
    return `${m(i.budget)}/month budget · ${m(i.deposit)} deposit · ${term} → can afford up to ${m(r.maxPrice ?? 0)}`;
  }
  const cash = r.cashExtra > 0 ? ` (+ ${m(r.cashExtra)} in cash above the loan limit)` : "";
  const rate = c.rate_pct > 0 ? ` at ${c.rate_pct}%` : "";
  return `${c.item_label} ${m(i.price)} · ${m(i.deposit)} deposit · ${term}${rate} → ${m(r.monthly)}/month${cash}`;
}

// Starting inputs for a fresh calculator.
export function defaultInputs(c: CalculatorConfig): CalcInputs {
  const price = c.price_default;
  const deposit = Math.round(price * Math.max(c.min_deposit_pct, 10) / 100);
  const term = c.terms[Math.floor((c.terms.length - 1) / 2)] ?? c.terms[0];
  const budget = Math.round(amortised(Math.max(0, price - deposit), c.rate_pct, (c.type === "loan" ? term * 12 : term)));
  return { mode: "price", price, deposit, term, budget };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v));
const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

// Validate the AI's calculator settings. Returns problems to send back to it.
export function sanitizeCalculator(raw: unknown): { ok: true; config: CalculatorConfig } | { ok: false; errors: string[] } {
  const d = (raw || {}) as Record<string, unknown>;
  const errors: string[] = [];
  const type: CalculatorType = d.type === "instalment" ? "instalment" : "loan";
  const currency = String(d.currency || "").toUpperCase();
  if (!CALC_CURRENCIES[currency]) errors.push(`calculator.currency must be one of ${Object.keys(CALC_CURRENCIES).join(", ")}.`);
  const rate = num(d.rate_pct);
  if (!(rate >= 0 && rate <= 60)) errors.push("calculator.rate_pct must be between 0 and 60 (a yearly percentage).");
  const maxTerm = type === "loan" ? 40 : 120;
  const terms = Array.from(
    new Set((Array.isArray(d.terms) ? d.terms : []).map((t) => Math.round(num(t))).filter((t) => t >= 1 && t <= maxTerm))
  )
    .sort((a, b) => a - b)
    .slice(0, 6);
  if (!terms.length) errors.push(`calculator.terms needs 1 to 6 terms (${type === "loan" ? "years" : "months"}).`);
  const minDep = num(d.min_deposit_pct);
  if (!(minDep >= 0 && minDep <= 90)) errors.push("calculator.min_deposit_pct must be between 0 and 90.");
  const pMin = num(d.price_min);
  const pMax = num(d.price_max);
  if (!(pMin > 0 && pMax > pMin)) errors.push("calculator.price_min must be above 0 and below price_max.");
  const maxLoanRaw = d.max_loan == null ? null : num(d.max_loan);
  if (maxLoanRaw != null && !(maxLoanRaw > 0)) errors.push("calculator.max_loan must be a positive amount, or null for no cap.");
  if (errors.length) return { ok: false, errors };
  const pDef = Math.min(pMax, Math.max(pMin, num(d.price_default) || (pMin + pMax) / 2));
  return {
    ok: true,
    config: {
      type,
      title: clip(d.title, 120) || (type === "loan" ? "Work out your monthly repayment" : "Work out your payment plan"),
      currency,
      item_label: clip(d.item_label, 40) || "Price",
      price_min: Math.round(pMin),
      price_max: Math.round(pMax),
      price_default: Math.round(pDef),
      rate_pct: Math.round(rate * 100) / 100,
      terms,
      min_deposit_pct: Math.round(minDep * 10) / 10,
      max_loan: type === "loan" && maxLoanRaw != null ? Math.round(maxLoanRaw) : null,
      allow_reverse: type === "loan" && d.allow_reverse !== false,
    },
  };
}
