export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc]" style={{ fontFamily: "var(--font-inter)" }}>
      <header className="bg-white border-b border-[#e2e8f0]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="0" y="18" width="5" height="10" rx="1.5" fill="#dc2626" />
            <rect x="7.67" y="13" width="5" height="15" rx="1.5" fill="#2563eb" />
            <rect x="15.33" y="8" width="5" height="20" rx="1.5" fill="#d99409" />
            <rect x="23" y="1" width="5" height="27" rx="1.5" fill="#16a34a" />
          </svg>
          <span className="text-lg font-extrabold tracking-tight" style={{ color: "#15131c" }}>
            LeadScore<span style={{ color: "#6d28d9" }}>AI</span>
          </span>
          <span className="ml-2 text-sm text-[#94a3b8]">Policies</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">{children}</main>
      <footer className="max-w-3xl mx-auto px-6 pb-12 text-xs text-[#94a3b8]">
        This is a working draft for internal onboarding and may be updated. It does not replace formal legal advice.
      </footer>
    </div>
  );
}
