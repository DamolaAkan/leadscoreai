"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authHeaders } from "@/lib/sl-client";

// Opened in a new tab from the Demos launcher. Mints a demo org session and
// redirects into that client dashboard. Kept separate so the launcher tab is
// never touched and the link opens reliably.
export default function DemoOpenPage() {
  const { slug } = useParams<{ slug: string }>();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/demos/enter", {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Could not open this demo.");
        if (cancelled) return;
        localStorage.setItem("lsai-session", d.session_id);
        window.location.replace(`/dashboard/${d.slug}`);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not open this demo.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ fontFamily: "var(--font-inter)", background: "#f8fafc" }}
    >
      {error ? (
        <>
          <p className="text-sm text-red-600 max-w-sm">{error}</p>
          <p className="text-xs text-[#94a3b8]">
            You may need to sign in to the staff workspace again, then reopen the demo.
          </p>
        </>
      ) : (
        <>
          <div className="w-7 h-7 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#64748b]">Opening demo…</p>
        </>
      )}
    </div>
  );
}
