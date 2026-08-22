import { bnNum } from "./bn";

// "1 price" vs "12 prices". English has a singular, so a count line built as `${n} prices`
// prints "1 prices" the moment the smallest real case shows up — a payout queue holding one
// request, a standalone order for one exam. Both halves are passed in because the plural is not
// always the noun plus "s" (and the phrase, not the noun, is what the caller is composing).
// Digits stay Western: D8 keeps tallies and identifiers on Latin numerals, and every caller so
// far is an English admin surface anyway. A Bengali caller must NOT use this — Bengali has no
// plural agreement here and the digits would be wrong; it composes with bnNum instead.
export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
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

// Shifting into a `Date` by +6h and then reading the UTC fields is how the whole file pins
// Dhaka without a tz library: the offset is fixed (+06:00, no DST), so the UTC getters on the
// shifted instant read out the Dhaka wall clock.
function dhakaInstant(iso: string): Date | null {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t + 6 * 3_600_000);
}

// «৩:০৫ PM» — the time half of the short form. Latin AM/PM is the ratified exception.
function dhakaTimeBn(d: Date): string {
  let h = d.getUTCHours();
  const ampm = h < 12 ? "AM" : "PM";
  h = h % 12 || 12;
  return `${bnNum(h)}:${bnNum(String(d.getUTCMinutes()).padStart(2, "0"))} ${ampm}`;
}

// Dhaka-pinned (+06:00 fixed) short datetime in Bengali digits: «২৫ জুলাই, ৩:০৫ PM».
// Prose datetimes are Bengali-first (spec §3.1); AM/PM stays Latin per common BD usage.
export function formatDhakaShortBn(iso: string): string {
  const d = dhakaInstant(iso);
  if (!d) return "";
  return `${bnNum(d.getUTCDate())} ${MONTHS_BN[d.getUTCMonth()]}, ${dhakaTimeBn(d)}`;
}

// Do two instants land on the same *Dhaka* day? Callers use this to decide whether a window
// can print as one line — the answer differs from the browser's own day boundary, which is
// exactly why it is computed here and not at the call site.
export function isSameDhakaDay(aIso: string, bIso: string): boolean {
  const a = dhakaInstant(aIso);
  const b = dhakaInstant(bIso);
  if (!a || !b) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// A scheduled window on one Dhaka day, collapsed to a single date: «২৫ জুলাই, ১০:০০ AM – ১২:০০ PM».
// Callers that may straddle two days must gate on `isSameDhakaDay` first — this formatter
// prints only the START date, so a cross-day range through it would silently lose the end date.
export function formatDhakaWindowBn(startIso: string, endIso: string): string {
  const end = dhakaInstant(endIso);
  const start = formatDhakaShortBn(startIso);
  if (!end || !start) return "";
  return `${start} – ${dhakaTimeBn(end)}`;
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

// Dhaka-pinned (+06:00 fixed) date WITH the year, in Bengali digits: «২৫ জুলাই ২০২৬».
// The two formatters above deliberately drop the year — a scheduled window and a chart tick
// are both read in the present — but a record's birth date is not: an org created in ২০২৫
// printed through formatDhakaShortBn reads as a date this year, and it carries a clock nobody
// asked for. Returns "" on an unparseable instant, like every formatter here; the caller
// decides what to print instead.
export function formatDhakaFullDateBn(iso: string): string {
  const d = dhakaInstant(iso);
  if (!d) return "";
  return `${bnNum(d.getUTCDate())} ${MONTHS_BN[d.getUTCMonth()]} ${bnNum(d.getUTCFullYear())}`;
}

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Dhaka-pinned (+06:00 fixed) datetime in ENGLISH: "25 Jul 2026, 3:05 PM".
// The Bengali formatters above are the same instant in the same timezone; this is the D1
// half for the platform_admin pages, whose bodies stay English. It exists rather than
// `new Date(iso).toLocaleString()` for the reason WalletPage's ledger column records: that
// prints in the READER's locale and timezone, so an admin abroad reads a payout queue and an
// order trail at different wall-clock times than the rows were written in — and on a money
// surface the two must agree. The year is kept (unlike formatDhakaShortBn) because these are
// historical records, not something happening today.
export function formatDhakaDateTimeEn(iso: string): string {
  const d = dhakaInstant(iso);
  if (!d) return "";
  let h = d.getUTCHours();
  const ampm = h < 12 ? "AM" : "PM";
  h = h % 12 || 12;
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS_EN[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${h}:${mm} ${ampm}`;
}

// Bengali-numeral duration for card meta (§3.1 — prose counts use bnNum).
export function formatDurationBn(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${bnNum(h)} ঘণ্টা ${bnNum(m)} মিনিট`;
  if (h > 0) return `${bnNum(h)} ঘণ্টা`;
  return `${bnNum(m)} মিনিট`;
}
