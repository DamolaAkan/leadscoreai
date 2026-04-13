import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const secret = process.env.VAPI_SERVER_SECRET ?? "";
  const sig = req.headers.get("x-vapi-signature") ?? "";

  console.log("[vapi-webhook] Secret present:", !!secret);
  console.log("[vapi-webhook] Secret length:", secret.length);
  console.log("[vapi-webhook] Signature received:", sig);
  console.log("[vapi-webhook] Signature length:", sig.length);

  // Read raw body ONCE — never call req.json() or req.text() again after this
  const rawBody = await req.text();

  // Verify signature — HMAC SHA-256, hex encoded
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  const sigBuf = Buffer.from(sig, "hex");
  const expBuf = Buffer.from(expected, "hex");

  const valid =
    sigBuf.length === expBuf.length &&
    crypto.timingSafeEqual(sigBuf, expBuf);

  if (!valid) {
    console.error("[vapi-webhook] Invalid signature");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const message = body.message;

  console.log("[vapi-webhook] Verified. Type:", message?.type);

  if (!message || message.type !== "end-of-call-report") {
    return NextResponse.json({ received: true });
  }

  const call = message.call;
  const callId = call?.id;
  const transcript = call?.artifact?.transcript ?? "";
  const recordingUrl = call?.artifact?.recordingUrl ?? null;
  const endedReason = call?.endedReason ?? null;
  const startedAt = call?.startedAt ?? null;
  const endedAt = call?.endedAt ?? null;
  const structured = call?.analysis?.structuredData ?? {};

  let durationSeconds = null;
  if (startedAt && endedAt) {
    durationSeconds = Math.round(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
    );
  }

  const status =
    endedReason === "customer-did-not-answer" || endedReason === "no-answer"
      ? "no_answer"
      : "completed";

  let appointmentDatetime = null;
  if (
    structured.appointment_booked &&
    structured.appointment_date &&
    structured.appointment_time
  ) {
    appointmentDatetime = `${structured.appointment_date} at ${structured.appointment_time}`;
  }

  const supabaseAdmin = createServiceClient();

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
    console.log("[vapi-webhook] Updated successfully:", callId);
  }

  return NextResponse.json({ received: true });
}
