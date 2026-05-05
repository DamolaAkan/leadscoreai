"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useInvoiceAuth } from "@/lib/useInvoiceAuth";
import InvoiceSidebar from "@/components/invoices/InvoiceSidebar";

export default function InvoicesLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useInvoiceAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/invoices/login";

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push("/invoices/login");
    }
  }, [loading, user, isLoginPage, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render login page without sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Not logged in and not on login page — will redirect via useEffect
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F1A] flex">
      <InvoiceSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
