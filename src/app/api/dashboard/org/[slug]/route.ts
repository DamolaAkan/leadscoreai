import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const supabase = createServiceClient();

  const { data: org, error } = await supabase
    .from("organizations")
    .select("name, slug, primary_color")
    .eq("slug", params.slug)
    .single();

  if (error || !org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(org);
}
