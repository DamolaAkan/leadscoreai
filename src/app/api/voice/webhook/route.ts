import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseAppointmentDateTime(dateStr: string, timeStr: string): string | null {
  try {
    // Parse date: "Monday 14 April", "14 April", "April 14", etc.
    const dateClean = dateStr.replace(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*/i, "");
    let day: number | null = null;
    let month: number | null = null;

    // Try "14 April" or "April 14"
    const dmMatch = dateClean.match(/^(\d{1,2})\s+(\w+)/);
    const mdMatch = dateClean.match(/^(\w+)\s+(\d{1,2})/);
    if (dmMatch) {
      day = parseInt(dmMatch[1]);
      month = MONTHS[dmMatch[2].toLowerCase()] ?? null;
    } else if (mdMatch) {
      month = MONTHS[mdMatch[1].toLowerCase()] ?? null;
      day = parseInt(mdMatch[2]);
    }
    if (day === null || month === null) return null;

    // Parse time: "10:00am", "2pm", "14:00", "2:30pm"
    const timeMatch = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!timeMatch) return null;
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2] || "0");
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;

    // Use current year, pick the next occurrence of this date
    const now = new Date();
    const year = now.getFullYear();
    const candidate = new Date(year, month, day, hours, minutes, 0);
    if (candidate.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000) {
      // If more than a week in the past, assume next year
      candidate.setFullYear(year + 1);
    }

    if (isNaN(candidate.getTime())) return null;
    return candidate.toISOString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    console.log("[vapi-webhook] Received:", body.message?.type);

    const message = body.message;
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
      // Try to parse into a proper ISO datetime
      // structured.appointment_date might be "Monday 14 April" or "Friday 18 April"
      // structured.appointment_time might be "10:00am" or "2pm"
      const parsed = parseAppointmentDateTime(
        structured.appointment_date,
        structured.appointment_time
      );
      appointmentDatetime = parsed ?? `${structured.appointment_date} at ${structured.appointment_time}`;
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
  } catch (error) {
    console.error("[vapi-webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
