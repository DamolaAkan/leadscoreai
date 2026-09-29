import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireBuilderUser } from "@/lib/builder-server";
import { isTemplateKey } from "@/lib/quiz-templates";
import { track } from "@/lib/track";

export const dynamic = "force-dynamic";

// The owner picks a design template for one quiz from the builder studio.
// Changing the look never costs an AI edit.
export async function PATCH(request: Request) {
  const auth = await requireBuilderUser(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body = await request.json().catch(() => ({}));
  if (typeof body.quizId !== "string" || !isTemplateKey(body.template)) {
    return NextResponse.json({ error: "Pick a template." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, builder_config")
    .eq("id", body.quizId)
    .eq("organization_id", user.organizationId)
    .not("builder_config", "is", null)
    .maybeSingle();
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const { error } = await supabase
    .from("quizzes")
    .update({
      builder_config: { ...(quiz.builder_config as Record<string, unknown>), template: body.template },
      updated_at: new Date().toISOString(),
    })
    .eq("id", quiz.id);
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });

  await track("template_changed", { orgId: user.organizationId, quizId: quiz.id, props: { template: body.template }, request });
  return NextResponse.json({ ok: true, template: body.template });
}
