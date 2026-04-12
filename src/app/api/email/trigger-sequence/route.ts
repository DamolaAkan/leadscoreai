import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { decrypt } from "@/lib/encryption";
import { sendSequenceEmail } from "@/lib/email";
import { sequenceConfig, TIER_LABELS } from "@/lib/sequence-config";

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

    // Check if email sequences are enabled for this org
    const { data: features } = await supabase
      .from("org_features")
      .select(
        "email_sequences_enabled, resend_api_key, resend_from_email, resend_from_name"
      )
      .eq("organization_id", organizationId)
      .single();

    if (!features?.email_sequences_enabled || !features?.resend_api_key) {
      return NextResponse.json({ skipped: true, reason: "sequences not enabled" });
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

    if (!response.contact_email || !response.qualification) {
      return NextResponse.json({ skipped: true, reason: "no email or qualification" });
    }

    // Check if sequence already exists for this response
    const { data: existingSeq } = await supabase
      .from("email_sequences")
      .select("id")
      .eq("response_id", responseId)
      .maybeSingle();

    if (existingSeq) {
      return NextResponse.json({ skipped: true, reason: "sequence already exists" });
    }

    const qualification = response.qualification as string;
    const trackMap: Record<string, string> = {
      HOT_LEAD: "hot",
      WARM_LEAD: "warm",
      COLD_LEAD: "cold",
      NOT_QUALIFIED: "not_qualified",
    };
    const track = trackMap[qualification] ?? "cold";
    const steps = sequenceConfig[qualification];
    if (!steps || steps.length === 0) {
      return NextResponse.json({ skipped: true, reason: "no sequence for qualification" });
    }

    const apiKey = decrypt(features.resend_api_key);
    const firstName = (response.contact_name || "there").split(" ")[0];
    const score = response.score || 0;
    const percentage = response.percentage || 0;
    const tierLabel = TIER_LABELS[qualification] || qualification;

    // Send step 0 immediately
    const step0 = steps[0];
    const html = step0.getHtml({ firstName, score, percentage, tierLabel });

    const messageId = await sendSequenceEmail({
      to: response.contact_email,
      subject: step0.subject,
      html,
      apiKey,
      fromEmail: features.resend_from_email,
      fromName: features.resend_from_name,
    });

    console.log("[email] Step 0 sent:", {
      to: response.contact_email,
      qualification,
      messageId,
    });

    // Calculate next send date
    const isComplete = steps.length === 1;
    const nextStep = steps[1];
    const nextSendAt = nextStep
      ? new Date(
          Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000
        ).toISOString()
      : null;

    // Insert email_sequences row
    console.log("[email] Inserting email_sequences row:", {
      response_id: responseId,
      organization_id: organizationId,
      email_address: response.contact_email,
      sequence_track: track,
      current_step: 1,
      next_send_at: nextSendAt,
      completed: isComplete,
    });

    const { data: seq, error: seqError } = await supabase
      .from("email_sequences")
      .insert({
        response_id: responseId,
        organization_id: organizationId,
        email_address: response.contact_email,
        sequence_track: track,
        current_step: 1,
        next_send_at: nextSendAt,
        completed: isComplete,
      })
      .select("id")
      .single();

    console.log("[email] email_sequences insert result:", {
      seq,
      seqError: seqError?.message,
    });

    if (seqError || !seq) {
      console.error("[email] Failed to insert email_sequences:", seqError);
      return NextResponse.json({
        success: false,
        emailSent: true,
        messageId,
        error: "Email sent but failed to save sequence record",
        detail: seqError?.message,
      });
    }

    // Log the send
    console.log("[email] Inserting email_sequence_log for step 0, sequence_id:", seq.id);

    const { error: logError } = await supabase
      .from("email_sequence_log")
      .insert({
        sequence_id: seq.id,
        step: 0,
        subject: step0.subject,
        resend_message_id: messageId,
      });

    if (logError) {
      console.error("[email] Failed to insert email_sequence_log:", logError.message);
    } else {
      console.log("[email] email_sequence_log inserted successfully");
    }

    return NextResponse.json({
      success: true,
      sequenceId: seq.id,
      messageId,
      track: qualification,
    });
  } catch (err) {
    console.error("[email] Trigger sequence error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
