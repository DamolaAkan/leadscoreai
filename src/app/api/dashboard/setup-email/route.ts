import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { encrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  try {
    const { orgSlug, resendApiKey, fromEmail, fromName, setupSecret } =
      await request.json();

    if (!orgSlug || !resendApiKey || !fromEmail || !fromName || !setupSecret) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (setupSecret !== process.env.SETUP_SECRET) {
      return NextResponse.json(
        { error: "Invalid setup secret" },
        { status: 403 }
      );
    }

    const supabase = createServiceClient();

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const encryptedKey = encrypt(resendApiKey);

    // Check if org_features row exists
    const { data: existing } = await supabase
      .from("org_features")
      .select("id")
      .eq("organization_id", org.id)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("org_features")
        .update({
          email_sequences_enabled: true,
          resend_api_key: encryptedKey,
          resend_from_email: fromEmail,
          resend_from_name: fromName,
        })
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update", detail: updateError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from("org_features")
        .insert({
          organization_id: org.id,
          email_sequences_enabled: true,
          resend_api_key: encryptedKey,
          resend_from_email: fromEmail,
          resend_from_name: fromName,
        });

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to insert", detail: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Email sequences configured and enabled",
    });
  } catch (err) {
    console.error("[setup-email] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
