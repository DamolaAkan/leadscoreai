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

  const { searchParams } = new URL(request.url);
  const qualification = searchParams.get("qualification") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  const supabase = createServiceClient();

  let query = supabase
    .from("quiz_responses")
    .select("*", { count: "exact" })
    .eq("organization_id", user.organizationId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  if (qualification) {
    query = query.eq("qualification", qualification);
  }

  if (dateFrom) {
    query = query.gte("completed_at", `${dateFrom}T00:00:00`);
  }

  if (dateTo) {
    query = query.lte("completed_at", `${dateTo}T23:59:59`);
  }

  if (search) {
    query = query.or(
      `contact_name.ilike.%${search}%,contact_email.ilike.%${search}%,contact_phone.ilike.%${search}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch responses" },
      { status: 500 }
    );
  }

  // Fetch email sequence status for these responses
  const responseIds = (data || []).map((r) => r.id);
  const sequenceMap: Record<string, { current_step: number; completed: boolean; next_send_at: string | null; sequence_track: string }> = {};

  if (responseIds.length > 0) {
    const { data: sequences } = await supabase
      .from("email_sequences")
      .select("response_id, current_step, completed, next_send_at, sequence_track")
      .in("response_id", responseIds);

    if (sequences) {
      for (const seq of sequences) {
        sequenceMap[seq.response_id] = {
          current_step: seq.current_step,
          completed: seq.completed,
          next_send_at: seq.next_send_at,
          sequence_track: seq.sequence_track,
        };
      }
    }
  }

  return NextResponse.json({
    responses: data,
    sequenceMap,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  });
}
