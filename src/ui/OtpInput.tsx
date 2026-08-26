import { useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { bnNum } from "../lib/bn";

// The OTP SMS carries Western digits (identifier rule), but a Bengali keypad types ০-৯ —
// map at entry; the API's normaliser STRIPS Bengali digits rather than converting them.
const BN_TO_EN: Record<string, string> = {
  "০": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

function toAsciiDigits(s: string): string {
  return [...s].map((c) => BN_TO_EN[c] ?? c).join("").replace(/[^0-9]/g, "");
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
}: {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function commit(next: string) {
    const code = next.slice(0, length);
    onChange(code);
    if (code.length === length) onComplete?.(code);
    else refs.current[code.length]?.focus();
  }

  function handleChange(index: number, raw: string) {
    const digits = toAsciiDigits(raw);
    if (!digits) return;
    commit(value.slice(0, index) + digits);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Backspace") return;
    e.preventDefault();
    if (value.length === 0) return;
    const cut = value.slice(0, -1);
    onChange(cut);
    refs.current[Math.max(0, cut.length)]?.focus();
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = toAsciiDigits(e.clipboardData.getData("text"));
    if (digits) commit(digits);
  }

  return (
    <div className="ex-otp" onPaste={handlePaste}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="ex-otp-box"
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={value[i] ?? ""}
          disabled={disabled}
          aria-label={`কোডের ${bnNum(i + 1)} নম্বর ঘর`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
