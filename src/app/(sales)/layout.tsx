"use client";

import { useState } from "react";
import { useInvoiceAuth } from "@/lib/useInvoiceAuth";
import StaffSidebar from "@/components/sales/StaffSidebar";
import UpdateBanner from "@/components/sales/UpdateBanner";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useInvoiceAuth();
  const [drawer, setDrawer] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/staff";
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] md:flex">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b border-black/[0.08] px-4 h-14">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="0" y="18" width="5" height="10" rx="1.5" fill="#dc2626" />
            <rect x="7.67" y="13" width="5" height="15" rx="1.5" fill="#2563eb" />
            <rect x="15.33" y="8" width="5" height="20" rx="1.5" fill="#d99409" />
            <rect x="23" y="1" width="5" height="27" rx="1.5" fill="#16a34a" />
          </svg>
          <span className="font-extrabold tracking-tight" style={{ color: "#15131c" }}>
            LeadScore<span style={{ color: "#6d28d9" }}>AI</span>
          </span>
        </div>
        <button onClick={() => setDrawer(true)} aria-label="Open menu" className="p-2 -mr-2 text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <StaffSidebar user={user} onLogout={logout} />
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawer(false)} />
          <div className="relative">
            <StaffSidebar user={user} onLogout={logout} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-full">
        <UpdateBanner />
        {children}
      </main>
    </div>
  );
}
