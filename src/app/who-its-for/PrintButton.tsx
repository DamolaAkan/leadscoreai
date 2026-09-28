"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="hidden sm:block px-3.5 py-2 text-[14px] font-medium text-slate-600 hover:text-slate-900"
    >
      Print
    </button>
  );
}
