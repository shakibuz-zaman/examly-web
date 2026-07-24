import type { ReactNode } from "react";

// Overline + rule + trailing slot (§4). Bengali has no case — text-transform is inert
// on it by design; the tracking + size carry the overline voice.
export function SectionHeader({ label, trailing }: { label: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="ex-secheader">
      <span className="ex-secheader-label">{label}</span>
      <span className="ex-secheader-rule" aria-hidden />
      {trailing && <span className="ex-secheader-trailing">{trailing}</span>}
    </div>
  );
}
