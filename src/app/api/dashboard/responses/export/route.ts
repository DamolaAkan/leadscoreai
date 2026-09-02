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
  const quizId = searchParams.get("quizId") || "";

  const supabase = createServiceClient();

  let query = supabase
    .from("quiz_responses")
    .select("*")
    .eq("organization_id", user.organizationId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  if (qualification) {
    query = query.eq("qualification", qualification);
  }
  if (quizId) {
    query = query.eq("quiz_id", quizId);
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

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to export" },
      { status: 500 }
    );
  }

  const rows = data || [];

  // Resolve each row's scorecard name for the export column.
  const quizIds = Array.from(new Set(rows.map((r) => r.quiz_id).filter(Boolean)));
  const quizNames: Record<string, string> = {};
  if (quizIds.length > 0) {
    const { data: quizzes } = await supabase
      .from("quizzes")
      .select("id, name")
      .in("id", quizIds);
    for (const q of quizzes || []) quizNames[q.id] = q.name;
  }

  const headers = [
    "Scorecard",
    "Name",
    "Email",
    "Phone",
    "Score",
    "Max Score",
    "Percentage",
    "Qualification",
    "Gender",
    "Age",
    "Location",
    "Agent Code",
    "Converted",
    "Completed At",
  ];

  const csvRows = [
    headers.join(","),
    ...rows.map((r) =>
      [
        escCsv(quizNames[r.quiz_id] || ""),
        escCsv(r.contact_name),
        escCsv(r.contact_email),
        escCsv(r.contact_phone),
        r.score,
        r.max_score,
        r.percentage,
        r.qualification,
        escCsv(r.gender),
        escCsv(r.age),
        escCsv(r.location),
        escCsv(r.agent_code),
        r.converted_to_sale ? "Yes" : "No",
        r.completed_at,
      ].join(",")
    ),
  ];

  const csv = csvRows.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="responses-${Date.now()}.csv"`,
    },
  });
}

function escCsv(val: string | null): string {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
