import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get("x-vapi-secret");
      if (authHeader !== webhookSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { message } = body;

    if (!message?.type) {
      return NextResponse.json({ ok: true });
    }

    const supabase = createServiceClient();
    const callId = message.call?.id;

    if (!callId) {
      return NextResponse.json({ ok: true });
    }

    switch (message.type) {
      case "status-update": {
        const status = message.status;
        const updates: Record<string, unknown> = {
          status,
          updated_at: new Date().toISOString(),
        };

        if (status === "in-progress") {
          updates.started_at = new Date().toISOString();
        }
        if (status === "ended") {
          updates.ended_at = new Date().toISOString();
          if (message.endedReason) {
            updates.ended_reason = message.endedReason;
          }
        }

        await supabase
          .from("voice_calls")
          .update(updates)
          .eq("vapi_call_id", callId);

        console.log("[voice-webhook] Status update:", { callId, status });
        break;
      }

      case "end-of-call-report": {
        const updates: Record<string, unknown> = {
          status: "ended",
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (message.transcript) {
          updates.transcript = message.transcript;
        }
        if (message.summary) {
          updates.summary = message.summary;
        }
        if (message.recordingUrl) {
          updates.recording_url = message.recordingUrl;
        }
        if (typeof message.cost === "number") {
          updates.cost_cents = Math.round(message.cost * 100);
        }
        if (typeof message.duration === "number") {
          updates.duration_seconds = message.duration;
        }
        if (message.endedReason) {
          updates.ended_reason = message.endedReason;
        }

        await supabase
          .from("voice_calls")
          .update(updates)
          .eq("vapi_call_id", callId);

        console.log("[voice-webhook] End of call report:", {
          callId,
          duration: message.duration,
        });
        break;
      }

      case "transcript": {
        // Live transcript updates — we store the final one in end-of-call-report
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[voice-webhook] Error:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to avoid retries
  }
}
