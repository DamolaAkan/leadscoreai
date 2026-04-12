import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateSession(sessionId);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const orgId = user.organizationId;

  // Total started
  const { count: totalStarted } = await supabase
    .from("quiz_responses")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);

  // Total completed
  const { count: totalCompleted } = await supabase
    .from("quiz_responses")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .not("completed_at", "is", null);

  // Total with contact
  const { count: totalWithContact } = await supabase
    .from("quiz_responses")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .not("contact_email", "is", null);

  // Total converted
  const { count: totalConverted } = await supabase
    .from("quiz_responses")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("converted_to_sale", true);

  // Qualification distribution
  const { data: qualData } = await supabase
    .from("quiz_responses")
    .select("qualification")
    .eq("organization_id", orgId)
    .not("completed_at", "is", null)
    .not("qualification", "is", null);

  const qualDistribution: Record<string, number> = {};
  (qualData || []).forEach((r) => {
    const q = r.qualification as string;
    qualDistribution[q] = (qualDistribution[q] || 0) + 1;
  });

  // Score distribution (buckets of 10%)
  const { data: scoreData } = await supabase
    .from("quiz_responses")
    .select("percentage")
    .eq("organization_id", orgId)
    .not("completed_at", "is", null)
    .not("percentage", "is", null);

  const scoreBuckets: Record<string, number> = {};
  for (let i = 0; i <= 90; i += 10) {
    scoreBuckets[`${i}-${i + 10}%`] = 0;
  }
  (scoreData || []).forEach((r) => {
    const p = r.percentage as number;
    const bucket = Math.min(Math.floor(p / 10) * 10, 90);
    const key = `${bucket}-${bucket + 10}%`;
    scoreBuckets[key] = (scoreBuckets[key] || 0) + 1;
  });

  // Daily completions (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: dailyData } = await supabase
    .from("quiz_responses")
    .select("completed_at, converted_to_sale")
    .eq("organization_id", orgId)
    .not("completed_at", "is", null)
    .gte("completed_at", thirtyDaysAgo.toISOString())
    .order("completed_at", { ascending: true });

  const dailyMap: Record<string, { completed: number; converted: number }> = {};
  (dailyData || []).forEach((r) => {
    const day = r.completed_at!.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { completed: 0, converted: 0 };
    dailyMap[day].completed++;
    if (r.converted_to_sale) dailyMap[day].converted++;
  });

  const dailyConversion = Object.entries(dailyMap).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  return NextResponse.json({
    funnel: {
      started: totalStarted || 0,
      completed: totalCompleted || 0,
      contacted: totalWithContact || 0,
      converted: totalConverted || 0,
    },
    qualDistribution,
    scoreBuckets,
    dailyConversion,
  });
}
