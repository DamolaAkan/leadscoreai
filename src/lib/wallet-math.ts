// Press-play wallet arithmetic. Pure and client-safe, so the checkout screen and
// the server always agree. All amounts are in kobo.
//
// The rules: the customer prepays, and is charged Meta spend x the campaign's
// multiplier (2 by default). 7.5% VAT is added on top of every payment and never
// becomes balance. When the balance runs out, the ad goes off.

export const KOBO = 100;
export const VAT_PERCENT = 7.5;
export const DEFAULT_MULTIPLIER = 2;
export const MIN_TOPUP_KOBO = 20_000 * KOBO;
export const MAX_TOPUP_KOBO = 5_000_000 * KOBO;
// The slider stops, in naira. No plans and no monthly fee: the balance just sits
// there until the ads use it, the way Explee's billing page works.
export const TOPUP_STOPS_NAIRA = [20_000, 30_000, 50_000, 100_000, 300_000, 500_000, 1_000_000, 3_000_000, 5_000_000] as const;
// The ad stops this far above zero, because Meta's spend figures can lag.
export const BALANCE_BUFFER_KOBO = 2_000 * KOBO;

export interface Checkout {
  balanceKobo: number; // what they see first, and what lands in the wallet
  vatKobo: number; // shown beneath it
  totalKobo: number; // what Paystack charges
}

export function checkoutFor(balanceKobo: number): Checkout {
  const vatKobo = Math.round((balanceKobo * VAT_PERCENT) / 100);
  return { balanceKobo, vatKobo, totalKobo: balanceKobo + vatKobo };
}

export function topupAmountError(balanceKobo: number): string | null {
  if (!Number.isInteger(balanceKobo)) return "Enter a whole naira amount.";
  if (balanceKobo % KOBO !== 0) return "Enter a whole naira amount.";
  if (balanceKobo < MIN_TOPUP_KOBO) return "The minimum top-up is ₦20,000.";
  if (balanceKobo > MAX_TOPUP_KOBO) return "The maximum top-up is ₦5,000,000.";
  return null;
}

// What the customer owes for all spend so far, less what has already been charged.
// Never more than the balance: a customer can never owe us money.
export function chargeDueKobo(opts: {
  metaSpendTotalKobo: number;
  chargedTotalKobo: number;
  balanceKobo: number;
  multiplier: number;
}): number {
  const owed = Math.round(opts.metaSpendTotalKobo * opts.multiplier) - opts.chargedTotalKobo;
  return Math.max(0, Math.min(owed, Math.max(0, opts.balanceKobo)));
}

// Should the ad stop? True once the balance reaches the buffer.
export function shouldPause(balanceKobo: number): boolean {
  return balanceKobo <= BALANCE_BUFFER_KOBO;
}

// The ad set's lifetime budget: spend so far, plus whatever the balance above the
// buffer can still buy. Set at press play and at every top-up.
//
// This is the hard stop, not Meta's campaign spending limit. Meta rejects a limit
// under ₦19,900 (tested 2026-11-05), which would leave balances under ₦41,800
// protected only by our own sync. A ₦9,000 lifetime budget is accepted.
export function metaLifetimeBudgetKobo(opts: {
  metaSpendTotalKobo: number;
  balanceKobo: number;
  multiplier: number;
}): number {
  const spendable = Math.max(0, opts.balanceKobo - BALANCE_BUFFER_KOBO);
  return opts.metaSpendTotalKobo + Math.floor(spendable / opts.multiplier);
}

// A lifetime budget needs an end date, and Meta paces spend evenly up to it. Whole
// days at the campaign's daily pace, never under one day. Call again on resume, as
// a paused campaign's end date keeps running.
export function campaignEndTime(opts: {
  now: Date;
  budgetLeftKobo: number;
  dailyBudgetKobo: number;
}): Date {
  const days = Math.max(1, Math.ceil(opts.budgetLeftKobo / opts.dailyBudgetKobo));
  return new Date(opts.now.getTime() + days * 86_400_000);
}
