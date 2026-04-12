import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  validateSession,
  getSessionIdFromRequest,
  hasRole,
} from "@/lib/auth";

export async function GET(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", user.organizationId)
    .single();

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, name, slug, is_active, created_at")
    .eq("organization_id", user.organizationId)
    .order("created_at", { ascending: true });

  // Get voice settings
  const { data: features } = await supabase
    .from("org_features")
    .select(
      "voice_calls_enabled, voice_system_prompt, voice_first_message, email_sequences_enabled"
    )
    .eq("organization_id", user.organizationId)
    .single();

  return NextResponse.json({
    org,
    quizzes: quizzes || [],
    voiceSettings: features
      ? {
          voice_calls_enabled: features.voice_calls_enabled || false,
          voice_system_prompt: features.voice_system_prompt || "",
          voice_first_message: features.voice_first_message || "",
          email_sequences_enabled: features.email_sequences_enabled || false,
        }
      : null,
  });
}

export async function PUT(request: Request) {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateSession(sessionId);
  if (!user || !hasRole(user, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const supabase = createServiceClient();

  // Handle voice settings update
  if (body.voiceSettings) {
    const vs = body.voiceSettings;
    const voiceUpdates: Record<string, unknown> = {};
    if (typeof vs.voice_calls_enabled === "boolean")
      voiceUpdates.voice_calls_enabled = vs.voice_calls_enabled;
    if (typeof vs.voice_system_prompt === "string")
      voiceUpdates.voice_system_prompt = vs.voice_system_prompt;
    if (typeof vs.voice_first_message === "string")
      voiceUpdates.voice_first_message = vs.voice_first_message;

    if (Object.keys(voiceUpdates).length > 0) {
      const { error: vErr } = await supabase
        .from("org_features")
        .update(voiceUpdates)
        .eq("organization_id", user.organizationId);

      if (vErr) {
        return NextResponse.json(
          { error: "Failed to update voice settings" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  }

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.primary_color) updates.primary_color = body.primary_color;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const { error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", user.organizationId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
