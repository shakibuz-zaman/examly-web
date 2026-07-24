import type { CatalogItem } from "../api/types";

export type CatalogTimeStatus = "live" | "upcoming" | "anytime" | "ended";

// Client-side status grouping from existing fields (spec §10 note 3). Day-math uses
// the fixed Asia/Dhaka +06:00 offset (Bangladesh has no DST) — same rule as the API.
const DHAKA_OFFSET_MS = 6 * 3_600_000;
const dhakaDay = (ms: number) => Math.floor((ms + DHAKA_OFFSET_MS) / 86_400_000);

// Malformed/absent timestamps read as "no window" — never silently as লাইভ.
const ms = (s: string | null | undefined): number | null => {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
};

export function catalogStatus(item: CatalogItem, now: number): CatalogTimeStatus {
  const start = ms(item.windowStartUtc);
  const end = ms(item.windowEndUtc);
  if (end !== null && now >= end) return "ended";
  if (start !== null && now < start) return "upcoming";
  if (item.mode === "live" && start !== null) return "live";
  return "anytime";
}

// «আজ লাইভ» section membership (§6): live right now, or starts later today (Dhaka).
export function isLiveTodaySection(item: CatalogItem, now: number): boolean {
  const s = catalogStatus(item, now);
  if (s === "live") return true;
  // Mirror the API's LiveTodayCount: only Mode==live items join the section.
  if (s === "upcoming" && item.mode === "live") {
    const start = ms(item.windowStartUtc);
    return start !== null && dhakaDay(start) === dhakaDay(now);
  }
  return false;
}

export function groupCatalog(items: CatalogItem[], now: number) {
  const liveToday: CatalogItem[] = [];
  const anytime: CatalogItem[] = [];
  const ended: CatalogItem[] = [];
  for (const item of items) {
    if (catalogStatus(item, now) === "ended") ended.push(item);
    else if (isLiveTodaySection(item, now)) liveToday.push(item);
    else anytime.push(item);
  }
  return { liveToday, anytime, ended }; // within groups: server order preserved
}

// §3.4 chip labels.
export function timeStatusLabel(status: CatalogTimeStatus): string {
  switch (status) {
    case "live": return "লাইভ";
    case "upcoming": return "আসছে";
    case "anytime": return "যেকোনো সময়";
    case "ended": return "শেষ";
  }
}
