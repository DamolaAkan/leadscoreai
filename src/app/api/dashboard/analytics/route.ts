import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";

// Slim row shape we pull once and aggregate in memory (one round-trip instead
// of a dozen head-count queries). All universal metrics derive from these.
interface Row {
  percentage: number | null;
  qualification: string | null;
  gender: string | null;
  age: number | null;
  location: string | null;
  contact_email: string | null;
  converted_to_sale: boolean | null;
  completed_at: string | null;
  converted_at: string | null;
}

function tally(
  rows: Row[],
  pick: (r: Row) => string | null | undefined
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const v = pick(r);
    if (v === null || v === undefined || v === "") continue;
    out[v] = (out[v] || 0) + 1;
  }
  return out;
}

// age is a raw integer; bucket into the standard demographic ranges.
function ageBucket(age: number): string {
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  return "55+";
}

const DAY_MS = 1000 * 60 * 60 * 24;

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

  // Started = every response including incomplete ones (cheap head count).
  const { count: startedCount } = await supabase
    .from("quiz_responses")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);

  // Pull completed rows once; everything else is computed from this set.
  const { data, error } = await supabase
    .from("quiz_responses")
    .select(
      "percentage, qualification, gender, age, location, contact_email, converted_to_sale, completed_at, converted_at"
    )
    .eq("organization_id", orgId)
    .not("completed_at", "is", null);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }

  const rows = (data || []) as unknown as Row[];
  const started = startedCount || 0;
  const completed = rows.length;
  const contacted = rows.filter((r) => !!r.contact_email).length;
  const converted = rows.filter((r) => r.converted_to_sale).length;

  const qualDistribution = tally(rows, (r) => r.qualification);
  const hot = qualDistribution["HOT_LEAD"] || 0;
  const warm = qualDistribution["WARM_LEAD"] || 0;
  const qualified = hot + warm;

  const percentages = rows
    .map((r) => r.percentage)
    .filter((p): p is number => p !== null && p !== undefined);
  const avgScore =
    percentages.length > 0
      ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
      : 0;

  const pct = (num: number, den: number) =>
    den > 0 ? Math.round((num / den) * 1000) / 10 : 0;

  // Funnel + close-rate metrics (all derivable without a scorecard).
  const rates = {
    leadQualificationRate: pct(qualified, completed), // Qualified ÷ Completed
    salesConversionAll: pct(converted, completed), // Sales ÷ Completed
    salesConversionQualified: pct(converted, qualified), // Sales ÷ Qualified
    salesCloseRate: pct(converted, qualified), // Sales ÷ Qualified
    trueConversionRate: pct(converted, completed), // Sales ÷ Completed
  };

  // Score distribution (buckets of 10%).
  const scoreBuckets: Record<string, number> = {};
  for (let i = 0; i <= 90; i += 10) scoreBuckets[`${i}-${i + 10}%`] = 0;
  for (const p of percentages) {
    const bucket = Math.min(Math.floor(p / 10) * 10, 90);
    scoreBuckets[`${bucket}-${bucket + 10}%`] += 1;
  }

  // Universal demographics (rendered client-side only when non-empty).
  const genderDistribution = tally(rows, (r) => r.gender);
  const ageDistribution = tally(rows, (r) =>
    r.age === null || r.age === undefined ? null : ageBucket(r.age)
  );
  const locationCounts = tally(rows, (r) => r.location);
  const topLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([location, count]) => ({ location, count }));

  // Daily completions (last 30 days).
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString();

  const dailyMap: Record<string, { completed: number; converted: number }> = {};
  for (const r of rows) {
    if (!r.completed_at || r.completed_at < cutoff) continue;
    const day = r.completed_at.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { completed: 0, converted: 0 };
    dailyMap[day].completed++;
    if (r.converted_to_sale) dailyMap[day].converted++;
  }
  const dailyConversion = Object.entries(dailyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, counts]) => ({ date, ...counts }));

  // Days-to-convert for any row that has both completion and conversion stamps.
  const daysToConvert = (r: Row): number | null => {
    if (!r.converted_to_sale || !r.completed_at || !r.converted_at) return null;
    const d =
      (new Date(r.converted_at).getTime() -
        new Date(r.completed_at).getTime()) /
      DAY_MS;
    return d >= 0 ? d : null;
  };

  const allConvertDays = rows
    .map(daysToConvert)
    .filter((d): d is number => d !== null);
  const leadToSaleDays =
    allConvertDays.length > 0
      ? Math.round(allConvertDays.reduce((a, b) => a + b, 0) / allConvertDays.length)
      : null;

  // Monthly breakdown (Surveys / Conversions / Rate / Avg Days to Convert),
  // grouped by the month the survey was completed.
  const monthlyMap: Record<
    string,
    { completed: number; converted: number; convertDays: number[] }
  > = {};
  for (const r of rows) {
    if (!r.completed_at) continue;
    const month = r.completed_at.slice(0, 7); // YYYY-MM
    if (!monthlyMap[month])
      monthlyMap[month] = { completed: 0, converted: 0, convertDays: [] };
    monthlyMap[month].completed++;
    if (r.converted_to_sale) monthlyMap[month].converted++;
    const d = daysToConvert(r);
    if (d !== null) monthlyMap[month].convertDays.push(d);
  }
  const monthlyBreakdown = Object.entries(monthlyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, m]) => ({
      month,
      completed: m.completed,
      converted: m.converted,
      conversionRate: pct(m.converted, m.completed),
      avgDaysToConvert:
        m.convertDays.length > 0
          ? Math.round(
              (m.convertDays.reduce((a, b) => a + b, 0) / m.convertDays.length) *
                10
            ) / 10
          : null,
    }));

  return NextResponse.json({
    kpis: {
      totalAssessments: completed,
      avgScore,
      hotLeads: hot,
      converted,
      conversionRate: rates.trueConversionRate,
      leadQualificationRate: rates.leadQualificationRate,
    },
    funnel: { started, completed, contacted, converted },
    rates,
    qualified,
    leadToSaleDays,
    qualDistribution,
    scoreBuckets,
    genderDistribution,
    ageDistribution,
    topLocations,
    dailyConversion,
    monthlyBreakdown,
  });
}
