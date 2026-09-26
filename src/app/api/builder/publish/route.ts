import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireBuilderUser } from "@/lib/builder-server";

export const dynamic = "force-dynamic";

// Publish (go live on the public link) or unpublish a builder quiz.
export async function POST(request: Request) {
  const auth = await requireBuilderUser(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { quizId, publish } = await request.json().catch(() => ({}));
  if (typeof quizId !== "string") {
    return NextResponse.json({ error: "quizId required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, slug, builder_config")
    .eq("id", quizId)
    .eq("organization_id", user.organizationId)
    .maybeSingle();
  if (!quiz || !quiz.builder_config) {
    return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  }

  if (publish) {
    const { count } = await supabase
      .from("quiz_questions")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quizId);
    if (!count) return NextResponse.json({ error: "This quiz has no questions yet." }, { status: 400 });
  }

  const { error } = await supabase
    .from("quizzes")
    .update({ is_active: !!publish, updated_at: new Date().toISOString() })
    .eq("id", quizId);
  if (error) return NextResponse.json({ error: "Could not update the quiz." }, { status: 500 });

  return NextResponse.json({ ok: true, is_active: !!publish, path: `/${user.orgSlug}/${quiz.slug}` });
}
