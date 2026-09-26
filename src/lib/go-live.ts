import { createServiceClient } from "./supabase";

// When the owner built their first quiz in the builder: starts the 48-hour
// go-live offer clock. Null = no quiz yet (no offer until they build one).
export async function firstBuilderQuizAt(orgId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("quizzes")
    .select("created_at")
    .eq("organization_id", orgId)
    .not("builder_config", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.created_at ?? null;
}
