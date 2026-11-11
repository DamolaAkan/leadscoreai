# Repayment Score (/repayment-score)

Public lead magnet for lenders and asset financiers. It leads into the paid Repayment Diagnostic.
Call it the "Repayment Score" or the "seven-part repayment review". Never a quiz.

## Flow
Landing (headline, one button, takeaway preview) → 21 tap-to-answer questions (7 parts × 3) →
details (name, company, role, email, WhatsApp, what they finance, country, loan book band,
raising money this year, consent) → results (score out of 100, a bar per part, number one
repayment block, three next steps, 90-day plan Track/Fix/Predict, PDF download, Diagnostic CTA).

## Files
- `src/lib/repayment-score.ts`: everything the visitor sees. Copy (headline, byline, note,
  Diagnostic text) is in `RS_COPY`; the booking link is `DIAGNOSTIC_BOOKING_URL`. Client-safe.
- `src/lib/repayment-score-server.ts`: points per answer, part scoring, weakest part, hot rule,
  plan text. Server only; the browser sends option ids and never sees points.
- `src/lib/repayment-score-pdf.ts`: the plan PDF (browser download, and the email attachment).
- `src/lib/repayment-score-email.ts`: DRAFT email wording, not approved.
- `src/app/api/repayment-score/submit/route.ts`: validates, scores, saves, returns the result.
- `supabase/migrations/20261111120000_repayment_score_leads.sql`: the leads table. NOT APPLIED.

## Switches and safety
- Saving fails open: until the migration is applied, visitors still get results and the
  insert error is logged.
- Emailing the plan only happens when `REPAYMENT_SCORE_EMAIL=on` in the environment. Leave it
  unset until the wording in `repayment-score-email.ts` is approved. No SMS or WhatsApp is sent.

## Hot leads
`is_hot` = (weakest part low OR raising money this year OR book over $1M) AND role is
CEO/Founder/MD or head of credit/risk. `hot_reasons` records which conditions matched.
View `repayment_score_hot_leads` lists them newest first.
