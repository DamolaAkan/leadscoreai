import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";
import { QuizResponse } from "@/lib/types";

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

  // Build a freshly-filtered query each call (Supabase builders are single-use)
  // so the paged list and the aggregate stats always share the same filter set.
  const filtered = (
    selectArg: string,
    opts?: { count?: "exact"; head?: boolean }
  ) => {
    let q = supabase
      .from("quiz_responses")
      .select(selectArg, opts)
      .eq("organization_id", user.organizationId)
      .not("completed_at", "is", null);
    if (qualification) q = q.eq("qualification", qualification);
    if (dateFrom) q = q.gte("completed_at", `${dateFrom}T00:00:00`);
    if (dateTo) q = q.lte("completed_at", `${dateTo}T23:59:59`);
    if (search) {
      q = q.or(
        `contact_name.ilike.%${search}%,contact_email.ilike.%${search}%,contact_phone.ilike.%${search}%`
      );
    }
    return q;
  };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Paged rows for the table + two full-set aggregates for the KPI cards.
  const [listResult, convertedResult, qualifiedResult] = await Promise.all([
    filtered("*", { count: "exact" })
      .order("completed_at", { ascending: false })
      .range(from, to),
    filtered("id", { count: "exact", head: true }).eq("converted_to_sale", true),
    filtered("id", { count: "exact", head: true }).in("qualification", [
      "HOT_LEAD",
      "WARM_LEAD",
    ]),
  ]);

  const { data, error, count } = listResult;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch responses" },
      { status: 500 }
    );
  }

  const total = count || 0;
  const convertedCount = convertedResult.count || 0;
  const qualifiedCount = qualifiedResult.count || 0;
  const stats = {
    total,
    converted: convertedCount,
    qualified: qualifiedCount,
    conversionRate: total > 0 ? Math.round((convertedCount / total) * 100) : 0,
  };

  // The dynamic string select() widens the row type, so cast back to rows.
  const rows = (data || []) as unknown as QuizResponse[];

  // Fetch email sequence status for these responses
  const responseIds = rows.map((r) => r.id);
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
    responses: rows,
    sequenceMap,
    stats,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
