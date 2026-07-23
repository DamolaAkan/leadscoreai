"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AdminUser } from "@/lib/useInvoiceAuth";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  managerOnly?: boolean;
}

const SALES: NavItem[] = [
  { href: "/deals", label: "Deals", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { href: "/earnings", label: "Commission Ledger", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { href: "/approvals", label: "Approvals", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", managerOnly: true },
  { href: "/payouts", label: "Payouts", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", managerOnly: true },
];

const OTHER: NavItem[] = [
  { href: "/demos", label: "Demos", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { href: "/invoices", label: "Invoicing", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

export default function StaffSidebar({
  user,
  onLogout,
  onNavigate,
}: {
  user: AdminUser;
  onLogout: () => Promise<void>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const manager = user.role === "supervisor" || user.role === "super_admin";

  function isActive(href: string) {
    if (href === "/invoices") return pathname.startsWith("/invoices");
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleLogout() {
    await onLogout();
    router.replace("/invoices/login");
  }

  const renderItem = (item: NavItem) => {
    if (item.managerOnly && !manager) return null;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-colors ${
          isActive(item.href)
            ? "bg-[#7C3AED] text-white"
            : "text-gray-500 hover:text-[#111827] hover:bg-gray-50"
        }`}
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
        </svg>
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-black/[0.08] flex flex-col">
      <div className="p-6 border-b border-black/[0.08]">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="0" y="18" width="5" height="10" rx="1.5" fill="#dc2626" />
            <rect x="7.67" y="13" width="5" height="15" rx="1.5" fill="#2563eb" />
            <rect x="15.33" y="8" width="5" height="20" rx="1.5" fill="#d99409" />
            <rect x="23" y="1" width="5" height="27" rx="1.5" fill="#16a34a" />
          </svg>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "#15131c" }}>
            LeadScore<span style={{ color: "#6d28d9" }}>AI</span>
          </h1>
        </div>
        <p className="text-xs text-black/50 mt-1">Sales workspace</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {SALES.map(renderItem)}
        <div className="pt-3 mt-3 border-t border-black/[0.06] space-y-1">{OTHER.map(renderItem)}</div>
      </nav>

      <div className="p-4 border-t border-black/[0.08]">
        <div className="px-3 pb-2">
          <p className="text-sm font-medium text-[#111827] truncate">{user.full_name}</p>
          <p className="text-xs text-black/40 capitalize">{user.role.replace("_", " ")}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium w-full transition-colors"
          style={{ color: "rgba(0,0,0,0.4)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e63946")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(0,0,0,0.4)")}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
