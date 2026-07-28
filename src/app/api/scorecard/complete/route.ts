import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Finalizes a scorecard response (writes contact details + score). Runs with the
// service role so the public anon key never needs UPDATE/SELECT on the leads
// table. Public endpoint, but only finalizes a not-yet-completed response.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { responseId } = body;
    if (!responseId) {
      return NextResponse.json({ error: "responseId required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("quiz_responses")
      .select("id, completed_at")
      .eq("id", responseId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }
    if (existing.completed_at) {
      return NextResponse.json({ ok: true, alreadyCompleted: true });
    }

    const { error } = await supabase
      .from("quiz_responses")
      .update({
        contact_name: body.contact_name ?? null,
        contact_email: body.contact_email ?? null,
        contact_phone: body.contact_phone ?? "",
        contact_company: body.contact_company ?? null,
        contact_website: body.contact_website ?? null,
        score: body.score ?? null,
        max_score: body.max_score ?? null,
        percentage: body.percentage ?? null,
        qualification: body.qualification ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", responseId);

    if (error) {
      console.error("[scorecard/complete] update error:", error.message);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[scorecard/complete] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
