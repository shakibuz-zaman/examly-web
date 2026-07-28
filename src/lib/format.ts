import { bnNum } from "./bn";

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// H:MM:SS above an hour, MM:SS below. Never negative.
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const MONTHS_BN = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

// Dhaka-pinned (+06:00 fixed) short datetime in Bengali digits: «২৫ জুলাই, ৩:০৫ PM».
// Prose datetimes are Bengali-first (spec §3.1); AM/PM stays Latin per common BD usage.
export function formatDhakaShortBn(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t + 6 * 3_600_000);
  let h = d.getUTCHours();
  const ampm = h < 12 ? "AM" : "PM";
  h = h % 12 || 12;
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${bnNum(d.getUTCDate())} ${MONTHS_BN[d.getUTCMonth()]}, ${bnNum(h)}:${bnNum(mm)} ${ampm}`;
}

// Dhaka-pinned (+06:00 fixed) date-only label in Bengali digits: «২৫ জুলাই».
// Chart X-axis ticks want ~6 characters. The datetime above runs 17–23, which at
// fontSize 11 on a 375px chart makes recharts drop all but one or two ticks — and it
// carries a Latin AM/PM that has no business on an axis. Prose keeps the full form.
export function formatDhakaDayMonthBn(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t + 6 * 3_600_000);
  return `${bnNum(d.getUTCDate())} ${MONTHS_BN[d.getUTCMonth()]}`;
}

// Bengali-numeral duration for card meta (§3.1 — prose counts use bnNum).
export function formatDurationBn(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${bnNum(h)} ঘণ্টা ${bnNum(m)} মিনিট`;
  if (h > 0) return `${bnNum(h)} ঘণ্টা`;
  return `${bnNum(m)} মিনিট`;
}
