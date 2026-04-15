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
  const appointment = url.searchParams.get("appointment") || "";

  console.log("[dashboard/calls] orgId:", user.organizationId);

  // First: raw count of ALL voice_calls for this org (no filters)
  const { count: rawCount, error: rawError } = await supabase
    .from("voice_calls")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", user.organizationId);

  console.log("[dashboard/calls] Raw count for org:", rawCount, "error:", rawError?.message ?? "none");

  // Also check total rows in table regardless of org
  const { count: allCount } = await supabase
    .from("voice_calls")
    .select("*", { count: "exact", head: true });

  console.log("[dashboard/calls] Total rows in voice_calls table:", allCount);

  let query = supabase
    .from("voice_calls")
    .select("*", { count: "exact" })
    .eq("organization_id", user.organizationId)
    .order("triggered_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      `contact_name.ilike.%${search}%,phone_number.ilike.%${search}%`
    );
  }

  if (appointment === "booked") {
    query = query.eq("appointment_booked", true);
  } else if (appointment === "none") {
    query = query.or("appointment_booked.is.null,appointment_booked.eq.false");
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data: calls, error, count } = await query;

  console.log("[dashboard/calls] Query result — count:", count, "rows:", calls?.length, "error:", error?.message ?? "none");

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
    .in("status", ["ended", "completed"]);

  const { count: appointmentsBooked } = await supabase
    .from("voice_calls")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", user.organizationId)
    .eq("appointment_booked", true);

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
      appointmentsBooked: appointmentsBooked || 0,
    },
  });
}

export async function PATCH(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateSession(sessionId);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { callId, action } = await request.json();

  if (action === "confirm_appointment" && callId) {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("voice_calls")
      .update({ appointment_confirmed_by: user.username })
      .eq("id", callId)
      .eq("organization_id", user.organizationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, confirmedBy: user.username });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
