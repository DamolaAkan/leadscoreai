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

export const QUALIFICATION_COLORS: Record<string, string> = {
  HOT_LEAD: "#16a34a",
  WARM_LEAD: "#f59e0b",
  COLD_LEAD: "#f97316",
  NOT_QUALIFIED: "#ef4444",
};

export const QUALIFICATION_LABELS: Record<string, string> = {
  HOT_LEAD: "Hot Lead",
  WARM_LEAD: "Warm Lead",
  COLD_LEAD: "Cold Lead",
  NOT_QUALIFIED: "Not Qualified",
};
