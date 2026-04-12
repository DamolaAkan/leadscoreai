import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const DEFAULT_FIRST_MESSAGE = `Hi {{firstName}}, this is Maya from {{orgName}}. I'm calling because you just completed our performance assessment and I noticed some really interesting results. Do you have a quick moment to chat?`;

const DEFAULT_SYSTEM_PROMPT = `You are Maya, a friendly and professional performance consultant from {{orgName}}. You're calling {{firstName}} who just completed a performance assessment and scored {{percentage}}%.

Your goals:
1. Congratulate them on completing the assessment
2. Briefly highlight that their score of {{percentage}}% shows interesting patterns
3. Ask about their biggest performance challenge right now
4. Listen actively and relate their challenge back to their assessment results
5. Suggest that a deeper strategy session with the team could help them unlock their next level
6. If they're interested, offer to schedule a 15-minute strategy call with a senior consultant
7. Be warm, encouraging, and never pushy

Keep responses concise and conversational (2-3 sentences max per turn). If they're busy or not interested, thank them warmly and end the call gracefully.`;

export async function POST(request: Request) {
  try {
    const { orgSlug, setupSecret, vapiApiKey, vapiPhoneNumberId } =
      await request.json();

    if (setupSecret !== process.env.SETUP_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }

    if (!orgSlug) {
      return NextResponse.json(
        { error: "orgSlug required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if org_features row exists
    const { data: existing } = await supabase
      .from("org_features")
      .select("id")
      .eq("organization_id", org.id)
      .maybeSingle();

    const updates: Record<string, unknown> = {
      voice_calls_enabled: true,
      voice_system_prompt: DEFAULT_SYSTEM_PROMPT,
      voice_first_message: DEFAULT_FIRST_MESSAGE,
    };

    if (vapiApiKey) updates.vapi_api_key = vapiApiKey;
    if (vapiPhoneNumberId) updates.vapi_phone_number_id = vapiPhoneNumberId;

    if (existing) {
      const { error } = await supabase
        .from("org_features")
        .update(updates)
        .eq("organization_id", org.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase.from("org_features").insert({
        organization_id: org.id,
        ...updates,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Voice settings configured with default VITALIC prompt",
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
