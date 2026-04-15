import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { decrypt } from "@/lib/encryption";
import { sendSequenceEmail } from "@/lib/email";
import { sequenceConfig, TIER_LABELS } from "@/lib/sequence-config";

export async function POST() {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const errors: string[] = [];
  let processed = 0;

  // Get all sequences that are due
  const { data: sequences, error: seqError } = await supabase
    .from("email_sequences")
    .select("*")
    .eq("completed", false)
    .lte("next_send_at", now);

  if (seqError || !sequences) {
    return NextResponse.json({ processed: 0, errors: [seqError?.message] });
  }

  const qualMap: Record<string, string> = {
    hot: "HOT_LEAD",
    warm: "WARM_LEAD",
    cold: "COLD_LEAD",
    not_qualified: "NOT_QUALIFIED",
  };

  for (const seq of sequences) {
    try {
      const track = seq.sequence_track as string;
      const qualification = qualMap[track] || track;
      const steps = sequenceConfig[qualification];
      if (!steps || seq.current_step >= steps.length) {
        // Mark complete if no more steps
        await supabase
          .from("email_sequences")
          .update({ completed: true, updated_at: now })
          .eq("id", seq.id);
        continue;
      }

      // Check if this step was already sent (duplicate guard)
      const { data: existingLog } = await supabase
        .from("email_sequence_log")
        .select("id")
        .eq("sequence_id", seq.id)
        .eq("step", seq.current_step)
        .maybeSingle();

      if (existingLog) {
        // Already sent — advance to next step
        const nextStepIdx = seq.current_step + 1;
        const nextStepDef = steps[nextStepIdx];
        await supabase
          .from("email_sequences")
          .update({
            current_step: nextStepIdx,
            next_send_at: nextStepDef
              ? new Date(
                  Date.now() + nextStepDef.delayDays * 24 * 60 * 60 * 1000
                ).toISOString()
              : null,
            completed: !nextStepDef,
            updated_at: now,
          })
          .eq("id", seq.id);
        continue;
      }

      // Get response data for template
      const { data: response } = await supabase
        .from("quiz_responses")
        .select("*")
        .eq("id", seq.response_id)
        .single();

      if (!response) {
        errors.push(`Response not found for sequence ${seq.id}`);
        continue;
      }

      // Get org features for API key
      const { data: features } = await supabase
        .from("org_features")
        .select(
          "resend_api_key, resend_from_email, resend_from_name"
        )
        .eq("organization_id", seq.organization_id)
        .single();

      if (!features?.resend_api_key) {
        errors.push(`No API key for org ${seq.organization_id}`);
        continue;
      }

      const step = steps[seq.current_step];
      const firstName = (response.contact_name || "there").split(" ")[0];
      const tierLabel = TIER_LABELS[qualification] || track;

      const html = step.getHtml({
        firstName,
        score: response.score || 0,
        percentage: response.percentage || 0,
        tierLabel,
      });

      const apiKey = decrypt(features.resend_api_key);
      const { id: messageId, error: sendError } = await sendSequenceEmail({
        to: seq.email_address,
        subject: step.subject,
        html,
        apiKey,
        fromEmail: features.resend_from_email,
        fromName: features.resend_from_name,
      });

      console.log("[email] Sequence step result:", {
        sequenceId: seq.id,
        step: seq.current_step,
        to: seq.email_address,
        messageId,
        sendError,
      });

      // Log the send
      await supabase.from("email_sequence_log").insert({
        sequence_id: seq.id,
        step: seq.current_step,
        subject: step.subject,
        resend_message_id: messageId,
      });

      // Advance sequence
      const nextStepIdx = seq.current_step + 1;
      const nextStepDef = steps[nextStepIdx];
      await supabase
        .from("email_sequences")
        .update({
          current_step: nextStepIdx,
          next_send_at: nextStepDef
            ? new Date(
                Date.now() + nextStepDef.delayDays * 24 * 60 * 60 * 1000
              ).toISOString()
            : null,
          completed: !nextStepDef,
          updated_at: now,
        })
        .eq("id", seq.id);

      processed++;
    } catch (err) {
      errors.push(`Sequence ${seq.id}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({ processed, errors });
}
