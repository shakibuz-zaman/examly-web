import type { ReactNode } from "react";

// Labeled meter (§8): continue-card progress, weak-topic bars (7e). Width is the only
// inline style (dynamic value); everything else is classed and tokened.
export function MeterBar({
  percent,
  tone = "teal",
  label,
  trailing,
}: {
  percent: number;
  tone?: "teal" | "coral" | "amber" | "green";
  label?: ReactNode;
  trailing?: ReactNode;
}) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div className="ex-meter">
      {(label || trailing) && (
        <div className="ex-meter-row">
          <span className="ex-meter-label">{label}</span>
          {trailing && <span className="ex-meter-trailing tnum">{trailing}</span>}
        </div>
      )}
      <div className="ex-meter-track" role="progressbar" aria-valuenow={Math.round(width)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`ex-meter-fill ex-meter--${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
