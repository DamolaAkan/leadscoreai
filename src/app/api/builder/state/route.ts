import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireBuilderUser } from "@/lib/builder-server";
import { getCreditStatus, loadOrgForCredits } from "@/lib/credits";

export const dynamic = "force-dynamic";

// Everything the builder studio needs on load: the business and its quizzes.
export async function GET(request: Request) {
  const auth = await requireBuilderUser(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const supabase = createServiceClient();

  const [{ data: org }, { data: quizzes }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, email, primary_color, logo_url, self_serve")
      .eq("id", user.organizationId)
      .single(),
    supabase
      .from("quizzes")
      .select("id, name, slug, start_headline, is_active, builder_config, updated_at, created_at")
      .eq("organization_id", user.organizationId)
      .order("created_at", { ascending: false }),
  ]);

  const ids = (quizzes || []).map((q) => q.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: rows } = await supabase
      .from("quiz_responses")
      .select("quiz_id")
      .in("quiz_id", ids)
      .not("completed_at", "is", null);
    for (const r of rows || []) counts.set(r.quiz_id, (counts.get(r.quiz_id) || 0) + 1);
  }

  const creditOrg = await loadOrgForCredits(user.organizationId);
  const credits = creditOrg ? await getCreditStatus(creditOrg) : null;

  return NextResponse.json({
    org,
    credits,
    quizzes: (quizzes || []).map((q) => ({
      id: q.id,
      name: q.name,
      slug: q.slug,
      headline: q.start_headline,
      is_active: !!q.is_active,
      kind: q.builder_config?.kind ?? null,
      builder: !!q.builder_config,
      template: q.builder_config?.template ?? "classic",
      leads: counts.get(q.id) || 0,
      updated_at: q.updated_at,
    })),
  });
}
