import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter — the dashboard + scorecard design system font (applied on those roots
// only, so the marketing site keeps its own type).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "LeadScoreAI — Know which leads convert before you chase them",
    template: "%s | LeadScoreAI",
  },
  description:
    "LeadScoreAI scores every lead the moment they raise their hand, sorts them Hot, Warm, Cold, and learns which answers actually predict a sale.",
  icons: {
    icon: [
      { url: "/logo/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/logo/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/logo/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/logo/favicon-180.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/logo/favicon-32.png",
  },
  openGraph: {
    type: "website",
    siteName: "LeadScoreAI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
