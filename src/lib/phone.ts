// src/lib/phone.ts
// TS twin of Examly.Api Domain/Common/PhoneNumber.cs — login and roster must agree
// byte-for-byte with the API, so keep this in lockstep with the C# (both files say so).
// [^0-9] mirrors char.IsAsciiDigit: a Bengali-keypad "০১৭…" is STRIPPED (→ null), never
// silently rewritten into a different phone.

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  let digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("00880")) digits = digits.slice(2); // "00" + 880… → 880…
  if (digits.startsWith("880")) digits = digits.slice(2);   // "88" + 0…   → 0…
  if (digits.length !== 11 || !digits.startsWith("01")) return null;
  if (digits[2] < "3" || digits[2] > "9") return null;      // operators are 013–019
  return "+880" + digits.slice(1);
}

export function toLocalPhone(e164: string): string {
  return e164.startsWith("+880") ? "0" + e164.slice(4) : e164;
}
