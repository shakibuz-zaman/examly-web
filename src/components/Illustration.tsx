import type { ReactElement } from "react";

export type IllustrationProps = {
  name: "empty" | "success" | "lobby" | "soon";
  size?: number;
};

// Abstract line-art (no faces). Palette restricted to teal / teal-tint-2 / ink-faint / stage.
const TEAL = "var(--ex-teal)";
const TINT = "var(--ex-teal-tint-2)";
const FAINT = "var(--ex-ink-faint)";

const ART: Record<IllustrationProps["name"], ReactElement> = {
  // Open folder + dotted sparkles.
  empty: (
    <>
      <path
        d="M14 38v-8a3 3 0 0 1 3-3h13l4 5h29a3 3 0 0 1 3 3v3"
        fill={TINT}
        stroke={TEAL}
      />
      <path d="M12 44h56l-6 20a3 3 0 0 1-3 2H21a3 3 0 0 1-3-2z" fill={TINT} stroke={TEAL} />
      <g stroke={FAINT}>
        <path d="M60 18v6M57 21h6" />
        <path d="M23 22v4M21 24h4" />
      </g>
    </>
  ),
  // Circled check + confetti dashes.
  success: (
    <>
      <circle cx="40" cy="42" r="19" fill={TINT} stroke={TEAL} />
      <path d="M31 42l6 6 12-14" fill="none" stroke={TEAL} />
      <g stroke={FAINT}>
        <path d="M18 20l3 3M62 20l-3 3M40 12v4M14 42h-3M69 42h-3" />
      </g>
    </>
  ),
  // Clock face + two small figures (circles + arcs).
  lobby: (
    <>
      <circle cx="30" cy="34" r="16" fill={TINT} stroke={TEAL} />
      <path d="M30 24v10l7 4" fill="none" stroke={TEAL} />
      <g stroke={FAINT}>
        <circle cx="52" cy="46" r="4" fill="none" />
        <path d="M46 62a6 6 0 0 1 12 0" fill="none" />
        <circle cx="63" cy="50" r="3.5" fill="none" />
        <path d="M58 64a5 5 0 0 1 10 0" fill="none" />
      </g>
    </>
  ),
  // Hammer + sparkle.
  soon: (
    <>
      <g transform="rotate(38 40 40)">
        <rect x="22" y="24" width="34" height="12" rx="3" fill={TINT} stroke={TEAL} />
        <rect x="35" y="36" width="8" height="28" rx="4" fill={TINT} stroke={TEAL} />
      </g>
      <g stroke={FAINT}>
        <path d="M58 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="none" />
        <path d="M20 50v5M17.5 52.5h5" />
      </g>
    </>
  ),
};

export function Illustration({ name, size = 96 }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-hidden="true"
    >
      {ART[name]}
    </svg>
  );
}
