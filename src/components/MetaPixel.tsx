"use client";

import Script from "next/script";

// Meta (Facebook) pixel used for the microfinance ad campaign. Loaded only on
// the MFB funnel pages (landing + Loan Doctor scorecard), never on client
// dashboards. Fire conversion events elsewhere with `trackPixel("Lead")`.
export const META_PIXEL_ID = "1351695133750893";

export function trackPixel(event: string): void {
  if (typeof window !== "undefined") {
    const w = window as unknown as { fbq?: (...args: unknown[]) => void };
    if (typeof w.fbq === "function") w.fbq("track", event);
  }
}

export default function MetaPixel({ pixelId = META_PIXEL_ID }: { pixelId?: string }) {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
