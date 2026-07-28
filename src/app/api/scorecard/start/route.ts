import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";

// Creates a scorecard response (service role). Public endpoint; rate limited
// per IP so nobody can flood the leads table.
export async function POST(request: Request) {
  try {
    const { quizId, organizationId, sessionId } = await request.json();
    if (!quizId || !organizationId || !sessionId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { allowed } = await checkRateLimit(request, "scorecard_start", 40);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = createServiceClient();

    // Validate the quiz is real, active, and belongs to the org.
    const { data: quiz } = await supabase
      .from("quizzes")
      .select("id")
      .eq("id", quizId)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("quiz_responses")
      .insert({ quiz_id: quizId, organization_id: organizationId, session_id: sessionId })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[scorecard/start] insert error:", error?.message);
      return NextResponse.json({ error: "Failed to start" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("[scorecard/start] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
