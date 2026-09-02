import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Records that a mortgage lead clicked "Claim my free scorecard" on the result
// page — the extra intent signal beyond just completing the assessment. Shown
// in the dashboard as "Interested in dashboard". Public, best-effort.
export async function POST(request: Request) {
  try {
    const { responseId } = await request.json();
    if (!responseId) {
      return NextResponse.json({ error: "responseId required" }, { status: 400 });
    }
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("quiz_responses")
      .update({ dashboard_interest: true })
      .eq("id", responseId);
    if (error) {
      console.error("[mortgage/interest] update error:", error.message);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mortgage/interest] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
