"use client";

import { useState } from "react";

export default function VideoPlayer() {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "16/9",
        marginTop: 16,
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,.14)",
        boxShadow: "0 40px 80px -36px rgba(0,0,0,.7)",
      }}
    >
      {playing ? (
        <iframe
          src="https://www.youtube.com/embed/J4M6c2i2Vy4?autoplay=1&rel=0&modestbranding=1"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
          }}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          onClick={() => setPlaying(true)}
          aria-label="Play video"
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            padding: 0,
            border: 0,
            cursor: "pointer",
            background: "transparent",
            display: "block",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/video-thumbnail.png"
            alt="Predictive analytics — who's going to convert?"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
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
        </button>
      )}
    </div>
  );
}
