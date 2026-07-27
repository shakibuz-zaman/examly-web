import { useId, type ReactNode } from "react";

// Labeled meter (§8): continue-card progress, weak-topic bars (7e). Width is the only
// inline style (dynamic value); everything else is classed and tokened.
//
// A progressbar with no accessible name is announced as a bare percentage, so the type
// makes a name unskippable: either the bar shows a visible `label` (pointed at with
// aria-labelledby, so the two can never drift apart) or it names itself with `name`.
// The union is doing real work — `trailing` cannot stand in as the name, because the
// value row is gated on label/trailing and a trailing-only bar (the চালিয়ে যান card:
// «৩/১০» and nothing else) leaves no text saying WHAT is progressing.
type MeterBarProps = {
  percent: number;
  tone?: "teal" | "coral" | "amber" | "green";
  trailing?: ReactNode;
} & ({ label: ReactNode; name?: string } | { label?: undefined; name: string });

export function MeterBar({ percent, tone = "teal", label, trailing, name }: MeterBarProps) {
  const labelId = useId();
  // Number.isFinite first: the clamp alone PROPAGATES NaN (Math.max/Math.min of NaN is
  // NaN, from a 0/0 upstream), and `width: "NaN%"` is an invalid declaration the browser
  // drops — which leaves .ex-meter-fill at its `width: auto` default, i.e. a FULL bar
  // where the truth is "no data", plus aria-valuenow="NaN". Zero is the honest fallback.
  const width = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  return (
    <div className="ex-meter">
      {/* != null, not truthiness: a defined-but-falsy label still has to render, or the
          aria-labelledby below would point at an element that was never mounted. */}
      {(label != null || trailing) && (
        <div className="ex-meter-row">
          <span className="ex-meter-label" id={labelId}>{label}</span>
          {trailing && <span className="ex-meter-trailing tnum">{trailing}</span>}
        </div>
      )}
      <div
        className="ex-meter-track"
        role="progressbar"
        // `name` wins when both are given — an explicit name beats the derived one.
        aria-label={name}
        aria-labelledby={name == null ? labelId : undefined}
        aria-valuenow={Math.round(width)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`ex-meter-fill ex-meter--${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
