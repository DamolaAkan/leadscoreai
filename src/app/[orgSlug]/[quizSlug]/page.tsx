import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase";
import { Organization, Quiz, QuizQuestion } from "@/lib/types";
import { notFound } from "next/navigation";
import QuizFlow from "./QuizFlow";
import MetaPixel from "@/components/MetaPixel";
import { canPublish, type OrgBilling } from "@/lib/paystack";

// Always fetch fresh org/quiz config so branding + questions reflect immediately.
export const dynamic = "force-dynamic";

interface PageProps {
  params: { orgSlug: string; quizSlug: string };
  searchParams?: { embed?: string };
}

// Link previews (WhatsApp, Facebook, X): the quiz headline + business name.
// The image comes from opengraph-image.tsx in this folder.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", params.orgSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (!org) return {};
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("start_headline, start_subheadline")
    .eq("organization_id", org.id)
    .eq("slug", params.quizSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (!quiz) return {};
  const title = quiz.start_headline || org.name;
  const description = quiz.start_subheadline || `A quick quiz from ${org.name}`;
  const base = process.env.NEXT_PUBLIC_APP_URL;
  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: { absolute: `${title} | ${org.name}` },
    description,
    openGraph: { title, description, siteName: org.name, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function QuizPage({ params, searchParams }: PageProps) {
  const embed = searchParams?.embed === "1";
  const supabase = createServiceClient();

  // Fetch organization by slug
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", params.orgSlug)
    .eq("is_active", true)
    .single<Organization>();

  if (!org) notFound();
  // Self-serve quizzes are only live on a paid plan (free to build, pay to publish).
  if (!canPublish(org as unknown as OrgBilling)) notFound();

  // Fetch quiz by slug and org
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("*")
    .eq("slug", params.quizSlug)
    .eq("organization_id", org.id)
    .eq("is_active", true)
    .single<Quiz>();

  if (!quiz) notFound();

  // Fetch questions ordered
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("question_order", { ascending: true })
    .returns<QuizQuestion[]>();

  if (!questions || questions.length === 0) notFound();

  return (
    <>
      {org.slug === "loandoctor" && <MetaPixel />}
      <QuizFlow
        org={org}
        quiz={quiz}
        questions={questions}
        embed={embed}
      />
    </>
  );
}
