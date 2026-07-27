"use client";

import { useState } from "react";

// When Damola's TrustPoint Microfinance walkthrough is recorded, paste the
// YouTube ID here (just the id, e.g. "dQw4w9WgXcQ") and the player goes live.
const VIDEO_ID = "";

export default function CheckupVideo() {
  const [playing, setPlaying] = useState(false);
  const hasVideo = VIDEO_ID.length > 0;

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "16/9",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,.14)",
        boxShadow: "0 40px 80px -36px rgba(0,0,0,.7)",
      }}
    >
      {playing && hasVideo ? (
        <iframe
          src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          title="LeadScoreAI microfinance walkthrough"
        />
      ) : (
        <button
          onClick={() => hasVideo && setPlaying(true)}
          aria-label={hasVideo ? "Play walkthrough" : "Walkthrough coming soon"}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            padding: 0,
            border: 0,
            cursor: hasVideo ? "pointer" : "default",
            background: "#15131c",
            display: "block",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/video-thumbnail.png"
            alt="Walkthrough: predicting who repays from your loan applications"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              opacity: hasVideo ? 1 : 0.55,
            }}
          />
          <span
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 86,
              height: 86,
              borderRadius: "50%",
              background: "rgba(109,40,217,.94)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 16px 44px rgba(109,40,217,.5)",
            }}
          >
            <span
              style={{
                width: 0,
                height: 0,
                borderLeft: "23px solid #fff",
                borderTop: "15px solid transparent",
                borderBottom: "15px solid transparent",
                marginLeft: 7,
              }}
            />
          </span>
          {!hasVideo && (
            <span
              style={{
                position: "absolute",
                bottom: 18,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0,0,0,.6)",
                color: "#fff",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                letterSpacing: "0.04em",
                padding: "7px 14px",
                borderRadius: 999,
                whiteSpace: "nowrap",
              }}
            >
              FULL WALKTHROUGH COMING SOON
            </span>
          )}
        </button>
      )}
    </div>
  );
}
