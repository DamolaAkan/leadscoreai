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

// Solid colors for charts (pie/bar fills) — design-system semantic hues.
export const QUALIFICATION_COLORS: Record<string, string> = {
  HOT_LEAD: "#10b981",
  WARM_LEAD: "#f59e0b",
  COLD_LEAD: "#3b82f6",
  NOT_QUALIFIED: "#ef4444",
};

// Soft badge tints (bg + text) — straight-edge, no border, dark text.
export const QUALIFICATION_BADGE: Record<string, { bg: string; text: string }> = {
  HOT_LEAD: { bg: "#dcfce7", text: "#166534" },
  WARM_LEAD: { bg: "#fef3c7", text: "#92400e" },
  COLD_LEAD: { bg: "#dbeafe", text: "#0c2d6b" },
  NOT_QUALIFIED: { bg: "#fee2e2", text: "#991b1b" },
};

export const QUALIFICATION_LABELS: Record<string, string> = {
  HOT_LEAD: "Hot Lead",
  WARM_LEAD: "Warm Lead",
  COLD_LEAD: "Cold Lead",
  NOT_QUALIFIED: "Not Qualified",
};
