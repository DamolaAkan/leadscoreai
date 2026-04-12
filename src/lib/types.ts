export interface Organization {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  plan: string;
  is_active: boolean;
}

export interface QuizOption {
  text: string;
  value: string;
  points: number;
}

export interface Quiz {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  start_headline: string;
  start_subheadline: string;
  start_cta_text: string;
  max_score: number;
  is_active: boolean;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_order: number;
  question_text: string;
  question_type: "radio" | "text" | "matrix";
  options: QuizOption[];
  max_points: number;
}

export interface QuizResponse {
  id: string;
  quiz_id: string;
  organization_id: string;
  session_id: string;
  gender: string | null;
  age: string | null;
  location: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  qualification: "HOT_LEAD" | "WARM_LEAD" | "COLD_LEAD" | "NOT_QUALIFIED" | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  agent_code: string | null;
  converted_to_sale: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface ResponseAnswer {
  id: string;
  response_id: string;
  question_id: string;
  question_order: number;
  answer_value: Record<string, unknown>;
  points_awarded: number;
}

export type Qualification = "HOT_LEAD" | "WARM_LEAD" | "COLD_LEAD" | "NOT_QUALIFIED";

export function getQualification(percentage: number): Qualification {
  if (percentage >= 80) return "HOT_LEAD";
  if (percentage >= 60) return "WARM_LEAD";
  if (percentage >= 40) return "COLD_LEAD";
  return "NOT_QUALIFIED";
}

export function generateSessionId(): string {
  return `lsai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
