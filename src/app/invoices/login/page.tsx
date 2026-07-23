"use client";

import { useEffect } from "react";

// The staff login now lives at /staff. Keep this path working for old bookmarks.
export default function InvoiceLoginRedirect() {
  useEffect(() => {
    window.location.replace("/staff");
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
