const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
// Bangla numerals for prose. Timers/scores keep Western digits + .tnum (spec §1.2).
export function bnNum(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

// The one ৳ formatter. Three sites used to carry their own `taka`/badge helper on
// `toLocaleString("en-US")`, which groups in Western thousands — «৳1,234,567». Bangladesh
// reads the lakh/crore break instead («১২,৩৪,৫৬৭»), and `en-IN` is the only locale in the
// app that produces that grouping. The digits are then mapped by bnNum rather than asking
// for `bn-BD` directly, so the app keeps exactly one digit-mapping rule (this file) and the
// separators toLocaleString inserted survive untouched — bnNum only rewrites [0-9].
//
// Rounded because the 20% B2C commission produces fractional taka by construction, and a
// «৳১,২৩,৪৫৬.৭৮» in an 11px sidebar pill or a price matrix cell is noise, not precision.
// The sign is lifted out in front of the symbol: `(-1234).toLocaleString()` yields
// "-1,234", which would otherwise print as «৳-১,২৩৪» with the minus stranded after the
// currency mark. U+2212 to match the negative-marking copy elsewhere.
export function bnMoney(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "−" : "";
  return `${sign}৳${bnNum(Math.abs(rounded).toLocaleString("en-IN"))}`;
}
