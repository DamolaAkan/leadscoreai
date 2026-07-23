import { SlCurrency } from "./sl-types";

// Naira with the proper symbol and thousands separators, e.g. 2000000 -> "₦2,000,000".
export function formatNaira(amount: number, opts?: { decimals?: boolean }): string {
  const n = Number(amount) || 0;
  const decimals = opts?.decimals ?? false;
  return (
    "₦" +
    n.toLocaleString("en-NG", {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    })
  );
}

// A money amount in its own currency (setup fee as paid by the client).
export function formatMoney(amount: number, currency: SlCurrency): string {
  const n = Number(amount) || 0;
  if (currency === "NGN") return formatNaira(n);
  return (
    "$" +
    n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  );
}

// Percentage from a stored rate, e.g. 0.0250 -> "2.5%".
export function formatRate(rate: number): string {
  return `${(Number(rate) * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 1)}%`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
