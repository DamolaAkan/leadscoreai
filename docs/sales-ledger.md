# Sales Ledger + Deal Page (internal staff area)

A lightweight sales pipeline and commission ledger for LeadScoreAI reps, plus a
Demos launcher. Lives in the internal staff app alongside `/invoices`.

## Auth model (important)

This area uses the **existing custom admin session auth**, not Supabase Auth / RLS:
`admin_users` + `admin_sessions`, validated in `src/lib/invoice-auth.ts`
(`validateAdminSession`, `requireAdmin`, `canManage`). Client stores the session in
`localStorage["lsai-admin-session"]` and sends `Authorization: Bearer <session>`.

`admin_users.role` was added: `rep | supervisor | super_admin` (founder set to
`super_admin`). `canManage()` = supervisor or super_admin.

This is a **separate** auth system from the per-client org dashboards
(`org_members` / `org_sessions`), which is intentional.

## Database (migrations applied to project `dkdzdnyvvfjhhlyzagxv`)

- `sl_sales_ledger_init` — enums (`sl_deal_stage`, `sl_currency`, `sl_commission_status`),
  tables `sl_products`, `sl_deals`, `sl_payouts`, `sl_commissions`, view `sl_balances`.
  Seeds 3 products (only **LeadScoreAI Scorecard** is commission-eligible at 2.5%).
- `sl_sales_ledger_rpcs` — the only write path for commissions (all `security definer`):
  `sl_mark_deal_paid`, `sl_approve_commission`, `sl_void_commission`, `sl_record_payout`.
- `sl_usd_commission_rate_cap` — USD deals convert to naira for commission at a
  **maximum of ₦1,350/$**. The actual CBN clearance rate is still stored on the
  commission (frozen for reconciliation); only the commission base is capped.
- `org_is_demo_flag` — `organizations.is_demo` for the Demos launcher (DriveNow = true).

Commission snapshots (`currency`, `setup_fee_original`, `cbn_rate`, `setup_fee_naira`,
`commission_rate`, `commission_naira`) are frozen at earning time and never recomputed.
Balances are always derived from `sl_balances`, never stored.

## Routes added

UI (route group `src/app/(sales)`, shared shell + mobile drawer):
- `/deals` — list (filters: stage, product, owner [managers], date range; search)
- `/deals/new`, `/deals/[id]`, `/deals/[id]/edit` — create / detail (funnel + Mark Paid
  dialog with USD CBN rate + live commission preview + Mark Lost) / edit
- `/earnings` — Commission Ledger (4 balance cards + read-only table)
- `/approvals` — managers only (approve / void; approving your own is blocked)
- `/payouts` — managers only (select rep → approved commissions → record payout)
- `/demos` — one-click launcher into demo client dashboards

API:
- `GET/POST /api/deals`, `GET/PATCH/DELETE /api/deals/[id]`, `GET /api/deals/meta`
- `POST /api/deals/[id]/stage`, `POST /api/deals/[id]/pay`
- `GET /api/commissions`, `POST /api/commissions/[id]/approve`, `.../void`
- `GET/POST /api/payouts`
- `GET /api/demos`, `POST /api/demos/enter` (mints a demo org_session, demo orgs only)

## Access control (enforced on every server route, not just hidden UI)

- Reps see and edit **only their own** deals/commissions. Managers see all, with an
  owner filter. Enforced in each route via `requireAdmin` + `canManage` + owner checks.
- Commission approve/void and payout runs are manager-only in the route **and** in the
  RPC. A rep can never approve their own commission (RPC guard).
- `/api/demos/enter` refuses any org where `is_demo` is not true, and requires a staff
  session.

## Assumptions / deviations

- The brief named `admin_users`/`admin_sessions` as the staff auth — confirmed correct;
  this is the same system that powers `/invoices`.
- Brief asked for Fraunces + IBM Plex Mono. Those fonts are not loaded in the app, so
  this area matches the existing internal look: Inter + purple `#7C3AED`, monetary
  values in `tabular-nums` with the ₦ symbol and thousands separators. British spelling,
  no em-dashes in UI copy.
- Stage badges use slate/violet/indigo/teal, deliberately **not** the scorecard tier
  colours (green/amber/blue/red = Hot/Warm/Cold/Not-Qualified elsewhere).
- USD commission cap is ₦1,350/$ (`USD_COMMISSION_RATE_CAP` in `src/lib/sl-types.ts`
  and `v_cap` in `sl_mark_deal_paid`). Keep the two in sync if the cap changes.
