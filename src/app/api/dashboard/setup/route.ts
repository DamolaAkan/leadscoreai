import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { orgSlug, username, fullName, password, setupSecret } =
      await request.json();

    if (!orgSlug || !username || !fullName || !password || !setupSecret) {
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

    console.log("[setup] org lookup:", { orgSlug, org, orgError });

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    console.log("[setup] hashed password for:", username, "hash length:", passwordHash.length);

    // Check if member already exists — use .maybeSingle() to avoid error on 0 rows
    const { data: existing, error: lookupError } = await supabase
      .from("org_members")
      .select("id")
      .eq("organization_id", org.id)
      .eq("username", username)
      .maybeSingle();

    console.log("[setup] existing member lookup:", { existing, lookupError });

    if (existing) {
      // Update existing member
      const { data: updated, error: updateError } = await supabase
        .from("org_members")
        .update({
          full_name: fullName,
          password_hash: passwordHash,
          role: "superadmin",
          is_active: true,
        })
        .eq("id", existing.id)
        .select("id, username, role")
        .single();

      console.log("[setup] update result:", { updated, updateError });

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update member", detail: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "Admin user updated", id: updated?.id });
    } else {
      // Insert new member
      const { data: inserted, error: insertError } = await supabase
        .from("org_members")
        .insert({
          organization_id: org.id,
          username,
          full_name: fullName,
          password_hash: passwordHash,
          role: "superadmin",
          is_active: true,
        })
        .select("id, username, role")
        .single();

      console.log("[setup] insert result:", { inserted, insertError });

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to create member", detail: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "Admin user created", id: inserted?.id });
    }
  } catch (err) {
    console.error("[setup] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
