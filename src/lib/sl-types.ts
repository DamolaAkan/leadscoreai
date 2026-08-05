// Sales Ledger (sl_) shared types — mirrors the DB schema.

export type SlStage =
  | "prospecting"
  | "contact_added"
  | "meeting_booked"
  | "proposal_sent"
  | "paid"
  | "lost";

export type SlCurrency = "NGN" | "USD";
export type SlCommissionStatus = "pending" | "approved" | "paid" | "void";

// USD deals are converted to naira for commission at a maximum of this rate.
// The actual CBN clearance rate is still stored on the commission for reconciliation.
export const USD_COMMISSION_RATE_CAP = 1350;

export interface SlProduct {
  id: string;
  name: string;
  slug: string;
  is_commission_eligible: boolean;
  commission_rate: number;
  is_active: boolean;
}

export interface SlDeal {
  id: string;
  owner_id: string;
  product_id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  company_name: string | null;
  currency: SlCurrency;
  setup_fee: number;
  monthly_amount: number;
  stage: SlStage;
  interested_at: string | null;
  meeting_booked_at: string | null;
  proposal_sent_at: string | null;
  paid_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // joined
  product?: SlProduct | null;
  owner?: { id: string; full_name: string } | null;
}

export interface SlCommission {
  id: string;
  deal_id: string;
  owner_id: string;
  currency: SlCurrency;
  setup_fee_original: number;
  cbn_rate: number | null;
  setup_fee_naira: number;
  commission_rate: number;
  commission_naira: number;
  status: SlCommissionStatus;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payout_id: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
  // joined
  deal?: Pick<SlDeal, "contact_name" | "company_name"> | null;
  owner?: { id: string; full_name: string } | null;
}

export interface SlBalances {
  owner_id: string;
  pending_naira: number;
  approved_naira: number;
  paid_naira: number;
  outstanding_naira: number;
}

// Stage badges — deliberately NOT the scorecard tier colours (green/amber/blue/red),
// which mean Hot/Warm/Cold/Not-Qualified elsewhere in the product.
export const STAGE_META: Record<SlStage, { label: string; bg: string; text: string }> = {
  prospecting: { label: "Prospecting", bg: "#f5f5f4", text: "#78716c" },
  contact_added: { label: "Interested", bg: "#f1f5f9", text: "#475569" },
  meeting_booked: { label: "Meeting Booked", bg: "#ede9fe", text: "#5b21b6" },
  proposal_sent: { label: "Proposal Sent", bg: "#e0e7ff", text: "#3730a3" },
  paid: { label: "Paid", bg: "#ccfbf1", text: "#115e59" },
  lost: { label: "Lost", bg: "#f3f4f6", text: "#6b7280" },
};

export const STAGE_ORDER: SlStage[] = [
  "prospecting",
  "contact_added",
  "meeting_booked",
  "proposal_sent",
  "paid",
];

export const COMMISSION_STATUS_META: Record<
  SlCommissionStatus,
  { label: string; bg: string; text: string }
> = {
  pending: { label: "Pending", bg: "#fef9c3", text: "#854d0e" },
  approved: { label: "Approved", bg: "#e0e7ff", text: "#3730a3" },
  paid: { label: "Paid", bg: "#ccfbf1", text: "#115e59" },
  void: { label: "Void", bg: "#f3f4f6", text: "#6b7280" },
};
