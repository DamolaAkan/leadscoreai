import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";

// Lightweight: the org's public scorecard link(s), so the Demo tab can open the
// live quiz. Available to any authenticated member (unlike the superadmin-only
// settings endpoint).
export async function GET(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await validateSession(sessionId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", user.organizationId)
    .single();

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, name, slug, is_active")
    .eq("organization_id", user.organizationId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    orgSlug: org?.slug || user.orgSlug,
    quizzes: quizzes || [],
  });
}
