export type MemberRole = "staff" | "admin" | "superadmin";

export interface OrgMember {
  id: string;
  organization_id: string;
  username: string;
  full_name: string;
  password_hash: string;
  role: MemberRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface OrgSession {
  id: string;
  member_id: string;
  session_id: string;
  expires_at: string;
  created_at: string;
}

export interface AuthUser {
  memberId: string;
  organizationId: string;
  orgSlug: string;
  orgName: string;
  primaryColor: string;
  logoUrl: string | null;
  username: string;
  fullName: string;
  role: MemberRole;
}

export interface ResponseFilters {
  qualification?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// Solid chart fills — the LeadScoreAI logo palette mapped to semantic tiers:
// green (hot), amber (warm), blue (cold), red (not qualified).
export const QUALIFICATION_COLORS: Record<string, string> = {
  HOT_LEAD: "#16a34a",
  WARM_LEAD: "#d99409",
  COLD_LEAD: "#2563eb",
  NOT_QUALIFIED: "#dc2626",
};

// Status badges — 15%-tint background with AA-dark text of the same hue.
export const QUALIFICATION_BADGE: Record<string, { bg: string; text: string }> = {
  HOT_LEAD: { bg: "rgba(22,163,74,0.14)", text: "#166534" },
  WARM_LEAD: { bg: "rgba(217,148,9,0.14)", text: "#92510a" },
  COLD_LEAD: { bg: "rgba(37,99,235,0.14)", text: "#1e40af" },
  NOT_QUALIFIED: { bg: "rgba(220,38,38,0.14)", text: "#991b1b" },
};

export const QUALIFICATION_LABELS: Record<string, string> = {
  HOT_LEAD: "Hot Lead",
  WARM_LEAD: "Warm Lead",
  COLD_LEAD: "Cold Lead",
  NOT_QUALIFIED: "Not Qualified",
};
