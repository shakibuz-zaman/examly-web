import type { ReactNode } from "react";

// §8 প্রোগ্রেস tile: overline label, big value, optional suffix and delta. Replaces antd
// Statistic, which brought its own type ramp and colour. `value` is a ReactNode because
// the tiles legitimately render "—" for a null percentile and a composed bilingual label
// for the focus area — both of which a `number` prop would force the caller to stringify
// twice. Numbers must already be through bnNum() at the call site (spec §3.1).
// Callers wrap a row of these in `.ex-stattiles` — the grid that makes them 2-col on
// mobile and 4-col from 768px up; a bare tile outside that wrapper does not lay out.
export function StatTile({
  label,
  value,
  suffix,
  delta,
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  delta?: { direction: "up" | "down"; text: string };
}) {
  return (
    <div className="ex-stattile">
      <div className="ex-stattile-label">{label}</div>
      <div className="ex-stattile-value">
        {value}
        {suffix && <span className="ex-stattile-suffix">{suffix}</span>}
      </div>
      {delta && (
        // Direction is carried by the WORD in `text`, never by the arrow or colour alone —
        // the OrgDashboard ticket (colour-only delta) is the defect this avoids repeating.
        <div className={`ex-stattile-delta is-${delta.direction}`}>
          <span aria-hidden>{delta.direction === "up" ? "▲" : "▼"}</span> {delta.text}
        </div>
      )}
    </div>
  );
}
