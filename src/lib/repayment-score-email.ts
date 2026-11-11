// DRAFT email that carries the 90-day plan PDF. NOT APPROVED.
// It only sends when REPAYMENT_SCORE_EMAIL=on (see isPlanEmailEnabled), and that
// switch stays off until Damola approves this wording.

import type { RSResult } from "./repayment-score";
import { DIAGNOSTIC_BOOKING_URL } from "./repayment-score";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export function planEmail(r: Pick<RSResult, "firstName" | "total" | "weakest">) {
  const hi = r.firstName ? `Hi ${esc(r.firstName)},` : "Hi,";
  const subject = `Your Repayment Score: ${r.total}/100, and your 90-day plan`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#15131c;max-width:560px">
<p>${hi}</p>
<p>Thanks for taking the seven-part repayment review. Your Repayment Score is <b>${r.total} out of 100</b>, and your number one repayment block is <b>${esc(r.weakest.name)}</b>.</p>
<p>Your 90-day plan is attached as a PDF: days 1 to 30 to track, 31 to 60 to fix, 61 to 90 to predict.</p>
<p>If you'd like us to go through your own repayment history with you, you can book a private Repayment Diagnostic here: <a href="${DIAGNOSTIC_BOOKING_URL}">${DIAGNOSTIC_BOOKING_URL}</a></p>
<p>Damola Akanbi<br/>LeadScoreAI</p>
</div>`;
  return { subject, html };
}
