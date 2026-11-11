// Press-play settings that aren't secrets. Client-safe.
//
// Cities set by Damola 2026-11-05: Lagos, Abuja, Port Harcourt, Ibadan. Each is a
// centre point and radius, so no Meta location keys are needed.
export interface Area {
  slug: string;
  name: string;
  geo: { latitude: number; longitude: number; radius: number; distance_unit: "kilometer" };
}

export const AREAS: Area[] = [
  { slug: "lagos", name: "Lagos", geo: { latitude: 6.5244, longitude: 3.3792, radius: 40, distance_unit: "kilometer" } },
  { slug: "abuja", name: "Abuja", geo: { latitude: 9.0765, longitude: 7.3986, radius: 30, distance_unit: "kilometer" } },
  { slug: "port-harcourt", name: "Port Harcourt", geo: { latitude: 4.8156, longitude: 7.0498, radius: 25, distance_unit: "kilometer" } },
  { slug: "ibadan", name: "Ibadan", geo: { latitude: 7.3775, longitude: 3.947, radius: 25, distance_unit: "kilometer" } },
];

// "Run as many campaigns as we want" (Damola). A ceiling per city, kept as a
// setting in ad_areas.installer_cap in case one city ever needs a limit.
export const DEFAULT_INSTALLER_CAP = 100;

// Customers' buyer leads go to their own dataset (the "Leadscoreai" pixel in
// CarPapers), not Siteflipmarket, which carries our own sign-up funnels.
// Mixing homeowners with business owners would muddy what Meta learns.
export const PRESS_PLAY_PIXEL_ID = process.env.META_ADS_PIXEL_ID || "8861400513919696";

export function geoFor(slugs: string[]): Record<string, unknown> {
  return {
    custom_locations: AREAS.filter((a) => slugs.includes(a.slug)).map((a) => a.geo),
  };
}
