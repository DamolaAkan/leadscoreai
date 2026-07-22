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
    .select("who_pays, where_to_focus, untapped_segments, total_responses, converted_count, model, generated_at")
    .eq("organization_id", user.organizationId)
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
    report: data
      ? {
          whoPays: data.who_pays,
          whereToFocus: data.where_to_focus,
          untappedSegments: data.untapped_segments,
        }
      : null,
  });
}
