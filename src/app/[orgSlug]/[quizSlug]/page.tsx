import { createServiceClient } from "@/lib/supabase";
import { Organization, Quiz, QuizQuestion } from "@/lib/types";
import { notFound } from "next/navigation";
import QuizFlow from "./QuizFlow";

interface PageProps {
  params: { orgSlug: string; quizSlug: string };
}

export default async function QuizPage({ params }: PageProps) {
  const supabase = createServiceClient();

  // Fetch organization by slug
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", params.orgSlug)
    .eq("is_active", true)
    .single<Organization>();

  if (!org) notFound();

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
    <QuizFlow
      org={org}
      quiz={quiz}
      questions={questions}
    />
  );
}
