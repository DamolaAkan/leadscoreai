import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { validateSession, getSessionIdFromRequest } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateSession(sessionId);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: response, error } = await supabase
    .from("quiz_responses")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", user.organizationId)
    .single();

  if (error || !response) {
    return NextResponse.json(
      { error: "Response not found" },
      { status: 404 }
    );
  }

  // Fetch answers with question text
  const { data: answers } = await supabase
    .from("response_answers")
    .select("*, quiz_questions(question_text, question_type, options)")
    .eq("response_id", params.id)
    .order("question_order", { ascending: true });

  return NextResponse.json({ response, answers: answers || [] });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateSession(sessionId);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("quiz_responses")
    .update({ converted_to_sale: body.converted_to_sale })
    .eq("id", params.id)
    .eq("organization_id", user.organizationId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update response" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateSession(sessionId);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Delete answers first, then response
  await supabase.from("response_answers").delete().eq("response_id", params.id);

  const { error } = await supabase
    .from("quiz_responses")
    .delete()
    .eq("id", params.id)
    .eq("organization_id", user.organizationId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete response" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
