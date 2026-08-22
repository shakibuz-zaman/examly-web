const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
// Bangla numerals for prose. Timers/scores keep Western digits + .tnum (spec §1.2).
export function bnNum(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

// The one ৳ formatter, in its two scripts. `enMoney` owns the arithmetic — round, group,
// lift the sign — and `bnMoney` is that string with its digits mapped, so the rounding rule,
// the grouping locale and the sign glyph exist exactly once. Three sites used to carry their
// own `taka`/badge helper on `toLocaleString("en-US")`, which groups in Western thousands —
// «৳1,234,567». Bangladesh reads the lakh/crore break instead, and `en-IN` is the only locale
// in the app that produces that grouping.
//
// Rounded because the 20% B2C commission produces fractional taka by construction, and a
// «৳১,২৩,৪৫৬.৭৮» in an 11px sidebar pill or a price matrix cell is noise, not precision.
// The sign is lifted out in front of the symbol: `(-1234).toLocaleString()` yields
// "-1,234", which would otherwise print as «৳-১,২৩৪» with the minus stranded after the
// currency mark. U+2212 to match the negative-marking copy elsewhere.
//
// Which one a surface uses is a COPY decision, not a taste one: Bengali student/examiner
// prose takes `bnMoney`; the platform_admin pages take `enMoney`, whose Western digits are
// both D1 (admin bodies are English) and D8 (tallies and identifiers keep Latin numerals).
export function enMoney(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "−" : "";
  return `${sign}৳${Math.abs(rounded).toLocaleString("en-IN")}`;
}

// The digits are mapped by bnNum rather than asking `toLocaleString` for `bn-BD` directly, so
// the app keeps exactly one digit-mapping rule (this file) and the separators toLocaleString
// inserted survive untouched — bnNum only rewrites [0-9], and leaves ৳ and − alone.
export function bnMoney(value: number): string {
  return bnNum(enMoney(value));
}
