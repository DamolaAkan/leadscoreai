import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  validateSession,
  getSessionIdFromRequest,
  hasRole,
} from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const supabase = createServiceClient();

  // Verify quiz belongs to org
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id")
    .eq("id", params.id)
    .eq("organization_id", user.organizationId)
    .single();

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("quizzes")
    .update({ is_active: body.is_active })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update quiz" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
