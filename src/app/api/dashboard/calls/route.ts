import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  validateSession,
  getSessionIdFromRequest,
} from "@/lib/auth";

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
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const status = url.searchParams.get("status") || "";
  const search = url.searchParams.get("search") || "";

  let query = supabase
    .from("voice_calls")
    .select("*", { count: "exact" })
    .eq("organization_id", user.organizationId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      `contact_name.ilike.%${search}%,phone_number.ilike.%${search}%`
    );
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data: calls, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get KPI stats
  const { count: totalCalls } = await supabase
    .from("voice_calls")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", user.organizationId);

  const { count: completedCalls } = await supabase
    .from("voice_calls")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", user.organizationId)
    .eq("status", "ended");

  const { data: durationData } = await supabase
    .from("voice_calls")
    .select("duration_seconds")
    .eq("organization_id", user.organizationId)
    .not("duration_seconds", "is", null);

  const totalDuration = (durationData || []).reduce(
    (sum, c) => sum + (c.duration_seconds || 0),
    0
  );
  const avgDuration =
    durationData && durationData.length > 0
      ? Math.round(totalDuration / durationData.length)
      : 0;

  return NextResponse.json({
    calls: calls || [],
    total: count || 0,
    page,
    pageSize,
    kpis: {
      totalCalls: totalCalls || 0,
      completedCalls: completedCalls || 0,
      avgDurationSeconds: avgDuration,
    },
  });
}
