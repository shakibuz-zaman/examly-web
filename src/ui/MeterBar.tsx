import { useId, type ReactNode } from "react";

// Labeled meter (§8): continue-card progress, weak-topic bars (7e). Width is the only
// inline style (dynamic value); everything else is classed and tokened.
//
// A progressbar with no accessible name is announced as a bare percentage, so a bar either
// shows a visible `label` (pointed at with aria-labelledby, so the two can never drift
// apart) or it names itself with `name`. `trailing` cannot stand in as the name: the value
// row is gated on label/trailing and a trailing-only bar (the চালিয়ে যান card: «৩/১০» and
// nothing else) leaves no text saying WHAT is progressing.
//
// The union only rules out passing NEITHER prop. It canNOT guarantee a label exists, and
// must not be read as if it did: ReactNode admits null/undefined/""/boolean, so
// `label={row.topicName?.bn}` off a `BilingualText | null` (the 7e weak-topic rows) type-
// checks and arrives null. `hasLabel` below is therefore the real gate — it drives BOTH
// the label element and the aria-labelledby that points at it, so the attribute can never
// outlive its target. A null label with no `name` falls back to an unnamed bar, which is
// merely uninformative; aria-labelledby dangling at an unmounted id is that PLUS a broken
// IDREF (axe aria-valid-attr-value), i.e. strictly worse.
type MeterBarProps = {
  percent: number;
  tone?: "teal" | "coral" | "amber" | "green";
  trailing?: ReactNode;
  // What the eye reads. aria-valuenow is a number and is spoken in ASCII digits ("30
  // percent"), so a Bengali-numeral value row would otherwise be announced as a different
  // number than the one on screen; aria-valuetext replaces the percentage in the
  // announcement. valuenow stays for the machine-readable semantics.
  valueText?: string;
} & ({ label: ReactNode; name?: string } | { label?: undefined; name: string });

export function MeterBar({ percent, tone = "teal", label, trailing, name, valueText }: MeterBarProps) {
  const labelId = useId();
  // != null, not truthiness: a defined-but-falsy label (0, "") still renders and is still
  // a legitimate name target.
  const hasLabel = label != null;
  // Number.isFinite first: the clamp alone PROPAGATES NaN (Math.max/Math.min of NaN is
  // NaN, from a 0/0 upstream), and `width: "NaN%"` is an invalid declaration the browser
  // drops — which leaves .ex-meter-fill at its `width: auto` default, i.e. a FULL bar
  // where the truth is "no data", plus aria-valuenow="NaN". Zero is the honest fallback.
  const width = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  return (
    <div className="ex-meter">
      {/* The row also mounts for a trailing-only bar, where the label span is empty and
          nothing points at it — it is the layout slot that keeps trailing right-aligned. */}
      {(hasLabel || trailing) && (
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
        // hasLabel, not just `name == null`: see the note above — the label element is the
        // only thing this id can resolve to, so the two conditions have to be the same one.
        aria-labelledby={name == null && hasLabel ? labelId : undefined}
        aria-valuenow={Math.round(width)}
        aria-valuetext={valueText}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`ex-meter-fill ex-meter--${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
