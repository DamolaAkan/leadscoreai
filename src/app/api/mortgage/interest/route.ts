import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { markDealInterested } from "@/lib/sales-pipeline";

// Records that a mortgage lead clicked "Claim my free scorecard" on the result
// page — the extra intent signal beyond just completing the assessment. Shown
// in the dashboard as "Interested in dashboard" and stamped onto Stella's
// pipeline deal as interested_at. Public, best-effort.
export async function POST(request: Request) {
  try {
    const { responseId } = await request.json();
    if (!responseId) {
      return NextResponse.json({ error: "responseId required" }, { status: 400 });
    }
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("quiz_responses")
      .update({ dashboard_interest: true })
      .eq("id", responseId)
      .select("contact_email")
      .single();
    if (error) {
      console.error("[mortgage/interest] update error:", error.message);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
    if (data?.contact_email) await markDealInterested(data.contact_email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mortgage/interest] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
