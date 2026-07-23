"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/invoices", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/invoices/new", label: "New Invoice", icon: "M12 4v16m8-8H4" },
  { href: "/invoices/clients", label: "Clients", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/invoices/recurring", label: "Recurring", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
];

const crossLinks = [
  { href: "/deals", label: "Deals", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { href: "/demos", label: "Demos", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
];

interface InvoiceSidebarProps {
  onLogout: () => Promise<void>;
}

export default function InvoiceSidebar({ onLogout }: InvoiceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    if (href === "/invoices") return pathname === "/invoices";
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    await onLogout();
    router.replace("/invoices/login");
  }

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-black/[0.08] flex flex-col">
      <div className="p-6 border-b border-black/[0.08]">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="0" y="18" width="5" height="10" rx="1.5" fill="#dc2626"/>
            <rect x="7.67" y="13" width="5" height="15" rx="1.5" fill="#2563eb"/>
            <rect x="15.33" y="8" width="5" height="20" rx="1.5" fill="#d99409"/>
            <rect x="23" y="1" width="5" height="27" rx="1.5" fill="#16a34a"/>
          </svg>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "#15131c" }}>LeadScore<span style={{ color: "#6d28d9" }}>AI</span></h1>
        </div>
        <p className="text-xs text-black/50 mt-1">Invoicing</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
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
        ))}
        <div className="pt-3 mt-3 border-t border-black/[0.06] space-y-1">
          {crossLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-colors text-gray-500 hover:text-[#111827] hover:bg-gray-50"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="p-4 border-t border-black/[0.08]">
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
