import type { MetadataRoute } from "next";

// Installable web app ("Add to Home Screen") until the native app exists.
// Opens on /login, which goes straight to the owner's dashboard when signed in.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LeadScoreAI",
    short_name: "LeadScoreAI",
    description: "Build Buyer Scorecards that find your buyers, and see every lead scored.",
    start_url: "/login?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["business", "productivity"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
