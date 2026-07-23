import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";

export const dynamic = "force-dynamic";

// GET /api/demos — demo client orgs for the launcher (staff only).
export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, slug, name, industry, logo_url, primary_color")
    .eq("is_demo", true)
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Response counts give each card a sense of "there's data inside".
  const demos = await Promise.all(
    (orgs || []).map(async (o) => {
      const { count } = await supabase
        .from("quiz_responses")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", o.id)
        .not("completed_at", "is", null);
      return { ...o, responses: count || 0 };
    })
  );

  return NextResponse.json({ demos });
}
