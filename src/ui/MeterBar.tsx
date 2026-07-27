import { useId, type ReactNode } from "react";

// Labeled meter (§8): continue-card progress, weak-topic bars (7e). Width is the only
// inline style (dynamic value); everything else is classed and tokened.
//
// A progressbar with no accessible name is announced as a bare percentage, so `name` is
// REQUIRED and is the floor. It cannot be expressed away by a type: an earlier union tried
// to make "label OR name" safe, but ReactNode admits null/undefined/""/boolean, so
// `label={row.topicName?.bn}` off a `BilingualText | null` (the 7e weak-topic rows) type-
// checked, arrived null, and left the bar nameless. A required string cannot.
//
// When a visible label DOES mount, aria-labelledby points at it, so the announced name is
// literally the on-screen text and the two cannot drift; `name` is then the fallback for
// the run where that label resolves to null. Exactly one of the two attributes is ever
// emitted, and aria-labelledby only when its target mounted, so it cannot dangle.
//
// `trailing` cannot stand in as the name: a trailing-only bar (the চালিয়ে যান card: «৩/১০»
// and nothing else) says how far but not how far through WHAT.
type MeterBarProps = {
  percent: number;
  tone?: "teal" | "coral" | "amber" | "green";
  // What the eye reads. Purely visual, and may legitimately arrive null — see above.
  label?: ReactNode;
  trailing?: ReactNode;
  // aria-valuenow is a number and is spoken in ASCII digits ("30 percent"), so a Bengali-
  // numeral value row would otherwise be announced as a different number than the one on
  // screen; aria-valuetext replaces the percentage in the announcement. valuenow stays for
  // the machine-readable semantics.
  valueText?: string;
  name: string;
};

export function MeterBar({ percent, tone = "teal", label, trailing, name, valueText }: MeterBarProps) {
  const labelId = useId();
  // != null, not truthiness: a defined-but-falsy label (0) still renders and is still a
  // legitimate name target. "" is excluded because an empty span RESOLVES its IDREF while
  // computing an empty name — a named-looking bar with no name, worse than falling back.
  const hasLabel = label != null && label !== "";
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
        // The visible label wins when it mounted, so the announced name IS the on-screen
        // text; `name` covers the run where it didn't. One or the other, never both.
        aria-label={hasLabel ? undefined : name}
        aria-labelledby={hasLabel ? labelId : undefined}
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
