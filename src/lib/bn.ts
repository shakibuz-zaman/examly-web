const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
// Bangla numerals for prose. Timers/scores keep Western digits + .tnum (spec §1.2).
export function bnNum(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}
