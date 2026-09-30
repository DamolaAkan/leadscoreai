"use client";

import { useEffect, useState } from "react";
import type { Currency } from "./money";

// Which price a landing-page visitor sees: naira if they look Nigerian (Lagos
// device clock or a Nigerian IP), otherwise USD. Same signals sign-up uses
// (src/lib/region.ts), minus the WhatsApp number we don't have yet. Starts on
// NGN so Nigerian visitors never see a flash of dollars.
const KEY = "lsai-visitor-currency";

export function useVisitorCurrency(): Currency {
  const [currency, setCurrency] = useState<Currency>("NGN");
  useEffect(() => {
    // ?currency=USD|NGN previews the other price (e.g. to check the page).
    const forced = new URLSearchParams(window.location.search).get("currency")?.toUpperCase();
    if (forced === "USD" || forced === "NGN") return setCurrency(forced);
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved === "NGN" || saved === "USD") return setCurrency(saved);
    } catch {
      /* storage blocked */
    }
    const remember = (c: Currency) => {
      setCurrency(c);
      try {
        sessionStorage.setItem(KEY, c);
      } catch {
        /* ignore */
      }
    };
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Africa/Lagos") return remember("NGN");
    fetch("/api/geo")
      .then((r) => r.json())
      .then((d: { country: string | null }) => remember(d.country === "NG" || !d.country ? "NGN" : "USD"))
      .catch(() => {});
  }, []);
  return currency;
}
