import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { placeOutboundCall } from "@/lib/vapi";

const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // ElevenLabs Rachel
const DEFAULT_VOICE_PROVIDER = "11labs";

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
        "voice_calls_enabled, vapi_api_key, vapi_phone_number_id, voice_system_prompt, voice_first_message, voice_id, voice_provider"
      )
      .eq("organization_id", organizationId)
      .single();

    if (!features?.voice_calls_enabled || !features?.vapi_api_key) {
      return NextResponse.json({
        skipped: true,
        reason: "voice calls not enabled",
      });
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

    const firstName = (response.contact_name || "there").split(" ")[0];
    const score = response.score || 0;
    const percentage = response.percentage || 0;

    // Build the system prompt with dynamic values
    const rawPrompt =
      features.voice_system_prompt ||
      `You are Maya, a friendly and professional performance consultant from ${org?.name || "our company"}. You're calling {{firstName}} who just completed a performance assessment and scored {{percentage}}%.`;

    const systemPrompt = rawPrompt
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{score\}\}/g, String(score))
      .replace(/\{\{percentage\}\}/g, String(percentage))
      .replace(/\{\{orgName\}\}/g, org?.name || "our company")
      .replace(/\{\{qualification\}\}/g, response.qualification || "");

    const rawFirstMessage =
      features.voice_first_message ||
      `Hi {{firstName}}, this is Maya from ${org?.name || "our company"}. I'm calling because you just completed our performance assessment and I noticed some really interesting results. Do you have a quick moment to chat?`;

    const firstMessage = rawFirstMessage
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{score\}\}/g, String(score))
      .replace(/\{\{percentage\}\}/g, String(percentage))
      .replace(/\{\{orgName\}\}/g, org?.name || "our company");

    const phoneNumberId =
      features.vapi_phone_number_id ||
      process.env.VAPI_PHONE_NUMBER_ID ||
      "";
    const apiKey = features.vapi_api_key || process.env.VAPI_API_KEY || "";

    // DB may store "elevenlabs" but Vapi API expects "11labs"
    let voiceProvider = features.voice_provider || DEFAULT_VOICE_PROVIDER;
    if (voiceProvider === "elevenlabs") voiceProvider = "11labs";
    const voiceId = features.voice_id || DEFAULT_VOICE_ID;

    console.log("[voice] Placing call with params:", {
      phoneNumberId,
      customerPhone: response.contact_phone,
      voiceProvider,
      voiceId,
      apiKeyPresent: !!apiKey,
      apiKeyLength: apiKey?.length,
    });

    const vapiResult = await placeOutboundCall({
      apiKey,
      phoneNumberId,
      customerPhone: response.contact_phone,
      assistantConfig: {
        firstMessage,
        systemPrompt,
        voiceId,
        voiceProvider,
      },
      metadata: {
        responseId,
        organizationId,
        contactName: response.contact_name || "",
        qualification: response.qualification || "",
      },
    });

    console.log("[voice] Call placed:", {
      callId: vapiResult.id,
      to: response.contact_phone,
      responseId,
    });

    // Insert voice_calls record
    const callRecord = {
      response_id: responseId,
      organization_id: organizationId,
      vapi_call_id: vapiResult.id,
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
      console.log("[voice] 'ringing' rejected by check constraint, retrying without status");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { status: _s, ...recordWithoutStatus } = callRecord;
      const retry = await supabase
        .from("voice_calls")
        .insert(recordWithoutStatus);
      insertError = retry.error;
    }

    if (insertError) {
      console.error("[voice] Failed to save call record:", insertError.message);
    }

    return NextResponse.json({
      success: true,
      callId: vapiResult.id,
    });
  } catch (err) {
    console.error("[voice] Trigger call error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
