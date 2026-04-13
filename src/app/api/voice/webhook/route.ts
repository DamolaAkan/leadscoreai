import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-vapi-signature");
    const secret = process.env.VAPI_WEBHOOK_SECRET;

    if (!secret) {
      console.error("[vapi-webhook] VAPI_WEBHOOK_SECRET not set");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    if (!signature) {
      console.error("[vapi-webhook] No signature header present");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const trusted = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!trusted) {
      console.error("[vapi-webhook] Invalid signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log("[vapi-webhook] Verified and received:", body.message?.type);

    const message = body.message;
    if (!message || message.type !== "end-of-call-report") {
      return NextResponse.json({ received: true });
    }

    const supabaseAdmin = createServiceClient();

    const call = message.call;
    const callId = call?.id;
    const transcript = call?.artifact?.transcript ?? "";
    const recordingUrl = call?.artifact?.recordingUrl ?? null;
    const endedReason = call?.endedReason ?? null;
    const startedAt = call?.startedAt ?? null;
    const endedAt = call?.endedAt ?? null;
    const structured = call?.analysis?.structuredData ?? {};

    // Calculate duration
    let durationSeconds = null;
    if (startedAt && endedAt) {
      durationSeconds = Math.round(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
      );
    }

    // Determine status
    const status =
      endedReason === "customer-did-not-answer" ||
      endedReason === "no-answer"
        ? "no_answer"
        : "completed";

    // Build appointment datetime if booked
    let appointmentDatetime = null;
    if (
      structured.appointment_booked &&
      structured.appointment_date &&
      structured.appointment_time
    ) {
      appointmentDatetime = `${structured.appointment_date} at ${structured.appointment_time}`;
    }

    // Update voice_calls row
    const { error } = await supabaseAdmin
      .from("voice_calls")
      .update({
        status,
        transcript,
        recording_url: recordingUrl,
        ended_reason: endedReason,
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        appointment_booked: structured.appointment_booked ?? false,
        appointment_date: structured.appointment_date ?? null,
        appointment_time: structured.appointment_time ?? null,
        appointment_datetime: appointmentDatetime,
        interest_level: structured.interest_level ?? null,
        structured_data: structured,
        updated_at: new Date().toISOString(),
      })
      .eq("vapi_call_id", callId);

    if (error) {
      console.error("[vapi-webhook] DB update error:", error);
    } else {
      console.log("[vapi-webhook] Call updated successfully:", callId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[vapi-webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
