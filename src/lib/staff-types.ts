// Staff workspace shared types (onboarding + profile).

export interface StaffOnboarding {
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  personal_email: string | null;
  phone: string | null;
  id_type: string | null;
  id_number: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  nok_name: string | null;
  nok_relationship: string | null;
  nok_phone: string | null;
  nok_address: string | null;
  guarantor_name: string | null;
  guarantor_occupation: string | null;
  guarantor_phone: string | null;
  guarantor_address: string | null;
  ack_employment: boolean;
  ack_nda: boolean;
  ack_conduct: boolean;
  ack_privacy: boolean;
  status: "draft" | "submitted";
  submitted_at: string | null;
}

export interface StaffProfile {
  admin_id: string;
  staff_no: number | null;
  title: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  photo_url: string | null;
}

// Editable onboarding fields (everything except status/timestamps).
export const ONBOARDING_FIELDS: (keyof StaffOnboarding)[] = [
  "full_name", "date_of_birth", "gender", "address", "personal_email", "phone",
  "id_type", "id_number",
  "bank_name", "account_number", "account_name",
  "nok_name", "nok_relationship", "nok_phone", "nok_address",
  "guarantor_name", "guarantor_occupation", "guarantor_phone", "guarantor_address",
  "ack_employment", "ack_nda", "ack_conduct", "ack_privacy",
];

export function staffId(no: number | null | undefined): string {
  if (!no) return "LS-0000";
  return "LS-" + String(no).padStart(4, "0");
}
