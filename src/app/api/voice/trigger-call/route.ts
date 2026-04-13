import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { placeOutboundCall } from "@/lib/vapi";

export async function POST(request: Request) {
  try {
    const { responseId, organizationId } = await request.json();

    if (!responseId || !organizationId) {
      return NextResponse.json(
        { error: "responseId and organizationId required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if voice calls are enabled for this org
    const { data: features } = await supabase
      .from("org_features")
      .select(
        "voice_calls_enabled, vapi_assistant_id, vapi_phone_number_id"
      )
      .eq("organization_id", organizationId)
      .single();

    if (!features?.voice_calls_enabled) {
      return NextResponse.json({
        skipped: true,
        reason: "voice calls not enabled",
      });
    }

    const assistantId = features.vapi_assistant_id;
    const phoneNumberId = features.vapi_phone_number_id;

    if (!assistantId) {
      console.error("[vapi] No vapi_assistant_id configured for this org");
      return NextResponse.json(
        { error: "No assistant configured" },
        { status: 400 }
      );
    }

    // Get the response data
    const { data: response, error: respError } = await supabase
      .from("quiz_responses")
      .select("*")
      .eq("id", responseId)
      .eq("organization_id", organizationId)
      .single();

    if (respError || !response) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 }
      );
    }

    // Only call HOT and WARM leads
    if (
      response.qualification !== "HOT_LEAD" &&
      response.qualification !== "WARM_LEAD"
    ) {
      return NextResponse.json({
        skipped: true,
        reason: "not a hot or warm lead",
      });
    }

    if (!response.contact_phone) {
      return NextResponse.json({
        skipped: true,
        reason: "no phone number",
      });
    }

    // Check if call already placed for this response
    const { data: existingCall } = await supabase
      .from("voice_calls")
      .select("id")
      .eq("response_id", responseId)
      .maybeSingle();

    if (existingCall) {
      return NextResponse.json({
        skipped: true,
        reason: "call already placed",
      });
    }

    // Get org name for context
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    // Build quiz answers summary from response_answers
    let quizAnswersSummary = "";
    try {
      const { data: answers } = await supabase
        .from("response_answers")
        .select("question_order, answer_value, points_awarded")
        .eq("response_id", responseId)
        .order("question_order", { ascending: true });

      if (answers && answers.length > 0) {
        const { data: questions } = await supabase
          .from("quiz_questions")
          .select("id, question_text, question_order")
          .eq("quiz_id", response.quiz_id)
          .order("question_order", { ascending: true });

        const qMap = new Map(
          (questions || []).map((q) => [q.question_order, q.question_text])
        );

        quizAnswersSummary = answers
          .map((a) => {
            const qText = qMap.get(a.question_order) || `Q${a.question_order}`;
            const ansVal =
              typeof a.answer_value === "object"
                ? JSON.stringify(a.answer_value)
                : String(a.answer_value);
            return `- ${qText}: ${ansVal} (${a.points_awarded} pts)`;
          })
          .join("\n");
      }
    } catch {
      console.error("[voice] Failed to build quiz answers summary");
    }

    const callId = await placeOutboundCall({
      phoneNumber: response.contact_phone,
      prospectName: response.contact_name || "there",
      score: response.score || 0,
      percentage: Math.round(
        ((response.score || 0) / (response.max_score || 1)) * 100
      ),
      qualification: response.qualification || "",
      quizAnswersSummary,
      organizationName: org?.name || "our company",
      responseId,
      organizationId,
      assistantId,
      phoneNumberId: phoneNumberId || "",
    });

    if (!callId) {
      return NextResponse.json(
        { error: "Failed to place call" },
        { status: 500 }
      );
    }

    console.log("[voice] Call placed:", {
      callId,
      to: response.contact_phone,
      responseId,
    });

    // Insert voice_calls record
    const callRecord = {
      response_id: responseId,
      organization_id: organizationId,
      vapi_call_id: callId,
      phone_number: response.contact_phone,
      contact_name: response.contact_name || "",
      qualification: response.qualification,
      status: "ringing",
    };

    let { error: insertError } = await supabase
      .from("voice_calls")
      .insert(callRecord);

    // If status check constraint fails, try without status (use DB default)
    if (insertError?.message?.includes("voice_calls_status_check")) {
      console.log(
        "[voice] 'ringing' rejected by check constraint, retrying without status"
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { status: _s, ...recordWithoutStatus } = callRecord;
      const retry = await supabase
        .from("voice_calls")
        .insert(recordWithoutStatus);
      insertError = retry.error;
    }

    if (insertError) {
      console.error(
        "[voice] Failed to save call record:",
        insertError.message
      );
    }

    return NextResponse.json({
      success: true,
      callId,
    });
  } catch (err) {
    console.error("[voice] Trigger call error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
