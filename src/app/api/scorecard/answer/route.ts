import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Records one answer for a scorecard response (service role). Only accepts
// answers for a response that exists and hasn't been completed yet.
export async function POST(request: Request) {
  try {
    const { responseId, questionId, questionOrder, answerValue, pointsAwarded } = await request.json();
    if (!responseId || !questionId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: resp } = await supabase
      .from("quiz_responses")
      .select("id, completed_at")
      .eq("id", responseId)
      .single();
    if (!resp) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }
    if (resp.completed_at) {
      return NextResponse.json({ error: "Response already completed" }, { status: 409 });
    }

    // Replace any prior answer for this question (handles going back + re-answering).
    await supabase
      .from("response_answers")
      .delete()
      .eq("response_id", responseId)
      .eq("question_id", questionId);

    const { error } = await supabase.from("response_answers").insert({
      response_id: responseId,
      question_id: questionId,
      question_order: questionOrder,
      answer_value: answerValue,
      points_awarded: pointsAwarded,
    });

    if (error) {
      console.error("[scorecard/answer] insert error:", error.message);
      return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[scorecard/answer] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
