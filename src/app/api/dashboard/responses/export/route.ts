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
  const headers = [
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
