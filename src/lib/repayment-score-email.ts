// Repayment Score emails. SERVER ONLY.
// 1. planEmail: sent to the lead after they finish, with the 90-day plan PDF attached.
// 2. alertEmail: sent to the team (akanbi@leadscoreai.com) for EVERY new lead.
// Both are on by default; set REPAYMENT_SCORE_EMAIL=off or REPAYMENT_SCORE_ALERT=off to stop them.

import { BOOK_SIZES, DIAGNOSTIC_BOOKING_URL, FINANCES, ROLES, type RSResult } from "./repayment-score";
import type { DetailsIn } from "./repayment-score-server";

export const ALERT_TO = (process.env.REPAYMENT_SCORE_ALERT_TO || "akanbi@leadscoreai.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
// Lead replies go straight to Damola's inbox.
export const REPLY_TO = "akanbi@leadscoreai.com";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
const label = (list: { id: string; label: string }[], id: string) => list.find((x) => x.id === id)?.label || id;

export function planEmail(r: Pick<RSResult, "firstName" | "total" | "weakest">) {
  const hi = r.firstName ? `Hi ${esc(r.firstName)},` : "Hi,";
  const subject = `Your Repayment Score: ${r.total}/100, and your 90-day plan`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#15131c;max-width:560px">
<p>${hi}</p>
<p>Thanks for taking the seven-part repayment review. Your Repayment Score is <b>${r.total} out of 100</b>, and your number one repayment block is <b>${esc(r.weakest.name)}</b>.</p>
<p>Your 90-day plan is attached as a PDF: days 1 to 30 to track, 31 to 60 to fix, 61 to 90 to predict.</p>
<p>If you'd like us to go through your own repayment history with you, you can book a private Repayment Diagnostic here: <a href="${DIAGNOSTIC_BOOKING_URL}">${DIAGNOSTIC_BOOKING_URL}</a></p>
<p>The LeadScoreAI team</p>
</div>`;
  return { subject, html };
}

export function alertEmail(
  r: Pick<RSResult, "total" | "parts" | "weakest">,
  d: DetailsIn,
  isHot: boolean,
  hotReasons: string[]
) {
  const reasons: Record<string, string> = {
    weak_part: "weak part",
    raising: "raising money",
    book_over_1m: "book over $1M",
  };
  const tag = isHot ? "HOT " : "";
  const subject = `${tag}Repayment Score lead: ${d.company} (${r.total}/100, block: ${r.weakest.name})`;
  const row = (k: string, v: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b6577;white-space:nowrap">${k}</td><td style="padding:4px 0;color:#15131c">${v}</td></tr>`;
  const wa = d.whatsapp.replace(/[^\d]/g, "");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#15131c;max-width:600px">
<p style="font-size:16px;margin:0 0 12px"><b>${isHot ? "HOT lead" : "New lead"}</b> from the Repayment Score${
    isHot ? ` (${hotReasons.map((h) => reasons[h] || h).join(", ")}, buyer role)` : ""
  }.</p>
<table style="border-collapse:collapse">
${row("Name", esc(d.name))}
${row("Company", esc(d.company))}
${row("Role", esc(label(ROLES, d.role)))}
${row("Email", `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>`)}
${row("WhatsApp", wa ? `<a href="https://wa.me/${wa}">${esc(d.whatsapp)}</a>` : esc(d.whatsapp))}
${row("Finances", esc(label(FINANCES, d.finances)))}
${row("Country", esc(d.country))}
${row("Loan book", esc(label(BOOK_SIZES, d.bookSize)))}
${row("Raising this year", d.raising ? "Yes" : "No")}
${row("Score", `<b>${r.total}/100</b>`)}
${row("Number one block", `<b>${esc(r.weakest.name)}</b> (${r.weakest.score}/100)`)}
${row("Parts", r.parts.map((p) => `${esc(p.name)} ${p.score}`).join(" · "))}
</table>
<p style="color:#6b6577;font-size:12px;margin-top:16px">Full row in Supabase: repayment_score_leads.</p>
</div>`;
  return { subject, html };
}
