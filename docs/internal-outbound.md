# Internal outbound (staff only)

Route: `/internal-outbound` in the staff workspace (sidebar: Outbound). Gated like the other `(sales)` pages: the admin session from localStorage goes to every API route as a Bearer header, checked by `requireAdmin`.

**It never sends anything.** No email, SMS or WhatsApp, and no call to any sending provider. Sending happens in a separate tool, from separate warmed-up domains, using the CSV export.

## What it does

- **Import CSV** (Explee now, Apollo later). Columns are guessed from the headers and can be changed. Pick a segment (Africa or US/Canada thin-file) per file. Imports in batches of 250.
  - Companies dedupe by domain (from the website column, or from a business email), else by name.
  - Contacts dedupe by email, then by name at the same company. A match only fills blank fields; stage and first lines are never overwritten.
  - Rows on the do-not-contact list are skipped and never stored.
- **Do not contact** by domain (covers subdomains and every email at it) or by company name (substring after lower-casing and stripping punctuation). Seeded and locked: `sunking.com`, `greenlightplanet.com`, and the names "sunking" and "greenlightplanet". Any staff member can add an entry; only a super admin can remove one, and locked entries cannot be removed in the app.
- **Write first line** (per contact or company, or up to 25 picked at once). Reads the company's home page and about page, then Claude (`CLAUDE_MODEL` from `src/lib/claude.ts`) writes one sentence naming what they finance and where. The line is stored on the company; a contact can have its own override. The contacts move from New to Researched. The prompt and a wording check keep the scoring recipe out and never say "quiz".
- **Stages**: new, researched, contacted, replied, meeting, not a fit. Filters: segment, niche, country, stage, search.
- **Export CSV** of the current filters, or of the picked contacts. It reads only the `outbound_exportable_contacts` view and checks the do-not-contact list again in code. Do-not-contact, no-email, invalid or bounced emails, and "not a fit" contacts never appear.

## Database

Migration: `supabase/migrations/20261106120000_internal_outbound.sql`. Applied to the live database on 2026-11-06 with Damola's OK. Additive only: `outbound_companies`, `outbound_contacts`, `outbound_dnc`, two functions and three views. RLS on with no policies (service role only).
