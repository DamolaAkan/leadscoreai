import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";
import { isClaudeConfigured } from "@/lib/claude";

// Latest stored AI-analyst report — no agent call. POST /analyst/generate re-runs it.
export async function GET(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data } = await supabase
    .from("analyst_reports")
    .select("report, total_responses, converted_count, model, generated_at")
    .eq("organization_id", user.organizationId)
    .not("report", "is", null)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    configured: isClaudeConfigured(),
    hasReport: !!data,
    generatedAt: data?.generated_at || null,
    model: data?.model || null,
    totals: data
      ? { completed: data.total_responses, converted: data.converted_count }
      : null,
    report: data?.report || null,
  });
}
