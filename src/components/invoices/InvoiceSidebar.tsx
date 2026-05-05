"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/invoices", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/invoices/new", label: "New Invoice", icon: "M12 4v16m8-8H4" },
  { href: "/invoices/clients", label: "Clients", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/invoices/recurring", label: "Recurring", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
];

export default function InvoiceSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/invoices") return pathname === "/invoices";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-64 min-h-screen bg-[#0d0d1a] border-r border-[#2a2a3d] flex flex-col">
      <div className="p-6 border-b border-[#2a2a3d]">
        <h1 className="text-xl font-bold text-[#7C3AED]">LeadscoreAI</h1>
        <p className="text-xs text-gray-500 mt-1">Invoicing</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-[#7C3AED]/10 text-[#7C3AED]"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#1a1a2e]"
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
