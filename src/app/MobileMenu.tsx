"use client";

import { useState } from "react";

export default function MobileMenu({ calendlyUrl }: { calendlyUrl: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="hp-hamburger"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15131c" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className={`hp-mobile-menu${open ? " open" : ""}`}>
        <button
          className="hp-mobile-close"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15131c" strokeWidth="2">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <a href="#problem" onClick={() => setOpen(false)}>why</a>
        <a href="#pipeline" onClick={() => setOpen(false)}>how</a>
        <a href="#predictive" onClick={() => setOpen(false)}>predictive</a>
        <a href="#pricing" onClick={() => setOpen(false)}>pricing</a>
        <a
          href={calendlyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          style={{
            background: "#6d28d9",
            color: "#fff",
            padding: "14px 28px",
            borderRadius: 3,
            fontFamily: "'Archivo'",
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          Book a call &rarr;
        </a>
      </div>
    </>
  );
}
