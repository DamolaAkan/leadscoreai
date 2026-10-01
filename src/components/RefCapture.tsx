"use client";

import { useEffect } from "react";

// Remembers a partner's ?ref= code for 90 days, so a business that signs up
// later is credited to the marketer who sent them (see verify-code).
export default function RefCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref")?.toLowerCase();
      if (ref && /^[a-z0-9]{3,40}$/.test(ref)) {
        document.cookie = `lsai_ref=${ref}; max-age=${90 * 86400}; path=/; samesite=lax`;
      }
    } catch {}
  }, []);
  return null;
}
