import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";
import { labelForStage } from "@/lib/outcomes";

export const dynamic = "force-dynamic";

interface ImportRow {
  email?: string;
  phone?: string;
  stage?: string;
  loan_amount?: number | string;
  notes?: string;
}

const MAX_ROWS = 5000;

// POST /api/dashboard/outcomes/import — bulk-record outcomes from a CSV upload.
// Each row is matched to the caller's own leads by email (preferred) or phone.
// Returns a per-row summary so the UI can show matched / unmatched / invalid.
export async function POST(request: Request) {
  const user = await validateSession(getSessionIdFromRequest(request) || "");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await request.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS})` }, { status: 400 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  let matched = 0;
  let unmatched = 0;
  let invalid = 0;
  const problems: { row: number; reason: string }[] = [];

  for (let i = 0; i < (rows as ImportRow[]).length; i++) {
    const r = rows[i] as ImportRow;
    const label = labelForStage((r.stage || "").trim());
    const email = (r.email || "").trim().toLowerCase();
    const phone = (r.phone || "").replace(/[^0-9+]/g, "");
    if (!label || (!email && !phone)) {
      invalid++;
      problems.push({ row: i + 1, reason: !label ? "invalid stage" : "no email or phone" });
      continue;
    }

    // Find the caller's most recent completed lead matching email or phone.
    let query = supabase
      .from("quiz_responses")
      .select("id")
      .eq("organization_id", user.organizationId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1);
    query = email ? query.ilike("contact_email", email) : query.eq("contact_phone", phone);
    const { data: match } = await query.single();

    if (!match) {
      unmatched++;
      continue;
    }

    const amount =
      typeof r.loan_amount === "number"
        ? r.loan_amount
        : r.loan_amount
        ? Number(String(r.loan_amount).replace(/[^0-9.]/g, "")) || null
        : null;

    await supabase.from("response_outcomes").insert({
      response_id: match.id,
      organization_id: user.organizationId,
      stage: (r.stage || "").trim(),
      label,
      loan_amount: amount,
      notes: r.notes || null,
      source: "csv",
      recorded_by: user.username,
    });
    await supabase
      .from("quiz_responses")
      .update({ outcome_stage: (r.stage || "").trim(), outcome_label: label, outcome_at: now })
      .eq("id", match.id);
    matched++;
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    matched,
    unmatched,
    invalid,
    problems: problems.slice(0, 20),
  });
}
