// Academy: the daily "how to run ads" lessons from the Quiz Marketing Channel on
// YouTube, shown in the dashboard's Academy tab. Videos come straight from the
// channel's public feed, so a new upload appears without a deploy. Each video is
// filed under a segment by the words in its TITLE ("...ads for solar installers").
// Descriptions are ignored: they mention example businesses and would misfile.

// The channel's id (from the YouTube Studio URL).
export const ACADEMY_CHANNEL_ID = "UC0tknDMeD_ZPjFdK8cWe-4w";

export const ACADEMY_CHANNEL_URL = ACADEMY_CHANNEL_ID
  ? `https://www.youtube.com/channel/${ACADEMY_CHANNEL_ID}?sub_confirmation=1`
  : "";

export interface AcademyVideo {
  id: string;
  title: string;
  description: string;
  published: string;
  segment: string;
}

// First match wins, so the more specific segments come first.
const SEGMENTS: { label: string; words: RegExp }[] = [
  { label: "Solar", words: /\bsolar|inverter|power bill/i },
  { label: "Real estate", words: /real estate|realtor|property|properties|\bland\b|apartment|mortgage/i },
  { label: "Lending", words: /\blend|loan|\bcredit\b|financ|microfinance|fintech/i },
  { label: "Skincare & beauty", words: /skin ?care|beauty|spa\b|salon|aesthetic|cosmetic/i },
  { label: "Hair & fashion", words: /\bhair|\bwig|fashion|boutique|clothing/i },
  { label: "Coaching", words: /coach|consult|mentor/i },
  { label: "Education", words: /school|education|tutor|academy|ministry|church|seminar/i },
  { label: "Travel", words: /travel|\btours?\b|\bvisas?\b|\btrips?\b|holiday/i },
];

export function segmentFor(title: string): string {
  return SEGMENTS.find((s) => s.words.test(title))?.label ?? "Getting started";
}

function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1].trim()) : "";
};

// Parses YouTube's Atom feed (newest first, up to 15 videos).
export function parseFeed(xml: string): AcademyVideo[] {
  return (xml.match(/<entry>[\s\S]*?<\/entry>/g) || [])
    .map((entry) => {
      const title = tag(entry, "title");
      const description = tag(entry, "media:description");
      return {
        id: tag(entry, "yt:videoId"),
        title,
        description,
        published: tag(entry, "published"),
        segment: segmentFor(title),
      };
    })
    .filter((v) => v.id && !/#shorts/i.test(v.title));
}
