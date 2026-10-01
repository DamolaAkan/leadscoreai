// Browser-side partner session (a bearer token, like the business dashboard).
export const PARTNER_SESSION_KEY = "lsai_partner_session";

export function partnerSession(): string | null {
  try {
    return localStorage.getItem(PARTNER_SESSION_KEY);
  } catch {
    return null;
  }
}
