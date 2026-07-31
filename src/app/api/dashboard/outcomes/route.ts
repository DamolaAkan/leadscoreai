import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";
import { labelForStage } from "@/lib/outcomes";

export const dynamic = "force-dynamic";

// POST /api/dashboard/outcomes — record what happened to an applicant (the label
// that calibrates WTP). Appends to response_outcomes (history) and denormalises
// the latest onto the response. Org-scoped: you can only label your own leads.
export async function POST(request: Request) {
  const user = await validateSession(getSessionIdFromRequest(request) || "");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { responseId, stage, loan_amount, notes } = await request.json();
  const label = labelForStage(stage);
  if (!responseId || !label) {
    return NextResponse.json({ error: "responseId and a valid stage are required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // The lead must belong to the caller's org.
  const { data: resp } = await supabase
    .from("quiz_responses")
    .select("id, organization_id")
    .eq("id", responseId)
    .eq("organization_id", user.organizationId)
    .single();
  if (!resp) return NextResponse.json({ error: "Response not found" }, { status: 404 });

  const now = new Date().toISOString();
  const { error: insErr } = await supabase.from("response_outcomes").insert({
    response_id: responseId,
    organization_id: user.organizationId,
    stage,
    label,
    loan_amount: typeof loan_amount === "number" ? loan_amount : null,
    notes: notes || null,
    source: "manual",
    recorded_by: user.username,
  });
  if (insErr) {
    console.error("[outcomes] insert error:", insErr.message);
    return NextResponse.json({ error: "Failed to record outcome" }, { status: 500 });
  }

  await supabase
    .from("quiz_responses")
    .update({ outcome_stage: stage, outcome_label: label, outcome_at: now })
    .eq("id", responseId);

  return NextResponse.json({ ok: true, stage, label });
}

// GET /api/dashboard/outcomes?response_id=... — outcome history for one lead.
export async function GET(request: Request) {
  const user = await validateSession(getSessionIdFromRequest(request) || "");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const responseId = new URL(request.url).searchParams.get("response_id");
  if (!responseId) return NextResponse.json({ error: "response_id required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("response_outcomes")
    .select("stage, label, loan_amount, notes, recorded_by, created_at")
    .eq("response_id", responseId)
    .eq("organization_id", user.organizationId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ outcomes: data || [] });
}
