import { Card, Skeleton, Tooltip, Typography } from "antd";
import type { HeatmapExam, HeatmapRow } from "../../../api/examinerAnalytics";
import { bnNum } from "../../../lib/bn";
import { bilingualLabel } from "../../../lib/labels";
import { palette } from "../../../theme/tokens";
import { useChartColors } from "../chartTheme";

// Linear interpolation between two #rrggbb colors, t clamped to [0,1].
function mix(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// WCAG relative luminance (2.x): sRGB channels linearised before weighting. The previous
// readableText weighted the *gamma-encoded* channels and compared the result to a 0.55
// constant, which is not a contrast test at all — it only correlates with one, and it
// correlated badly exactly where the ramp is darkest.
function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// Both constants are mode-independent (identical in `paletteDark`), so hoisting is safe.
const LUM_ON_SOLID = relativeLuminance(palette.onSolid);
const LUM_ON_SOLID_INK = relativeLuminance(palette.onSolidInk);

// Text that stays legible on the interpolated cell fill — picked from the FILL, not from the
// theme. A heat cell paints its own background in both modes, so `paletteFor(mode)` would be
// the wrong source here: dark's ink is near-white and would vanish on the pale end of the ramp.
// Both ends still come from the token module rather than local hexes, so a palette re-tune
// reaches these cells.
//
// The pick is the higher of the two real contrast ratios, not a luminance threshold. There is
// no threshold that works: `palette.ink` (#1C201D) and white cross at 4.06:1 on this ramp, so
// with those two constants a band of mid-teal fills fails AA whichever one you hand it —
// which is why the old 0.55 cut produced white-on-#2AA894 at 2.95:1 and had no better option
// available. `onSolidInk` (black) moves the crossover to 4.60:1; see the tokens.ts note.
//
// Measured, this file's ramps (chartTheme heatLow→heatHigh), before → after, at the four
// sampled error rates. "before" = 0.55 threshold with ink #1C201D; "after" = this function.
//   light #E4F1EE→#0E7A6B   55: ink 6.61 → black 8.42 | 70: white 3.17 ✗ → black 6.63
//                           90: white 4.42 ✗ → black 4.75 | 100: white 5.23 → white 5.23
//   dark  #12332E→#2AA894   55: white 5.67 → white 5.67 | 70: white 4.48 ✗ → black 4.68
//                           90: white 3.38 ✗ → black 6.21 | 100: white 2.95 ✗ → black 7.13
// Worst case across the whole 0–100 sweep: 3.17 (light) / 2.95 (dark) before, 4.60 for both
// after. 11px digits are not large text, so 4.5:1 (1.4.3) is the floor that applies.
function readableText(bg: string): string {
  const lum = relativeLuminance(bg);
  // Compared through the real ratios rather than a hard-coded crossover, so re-tuning either
  // token moves the switch point instead of silently invalidating it.
  return contrast(lum, LUM_ON_SOLID) >= contrast(lum, LUM_ON_SOLID_INK)
    ? palette.onSolid
    : palette.onSolidInk;
}

// heatColor is a pure exported helper (Task 8 contract); it interpolates the
// mode's heatLow→heatHigh ramp over errorRate (0→100). Exporting it alongside
// the component trips fast-refresh's component-only rule (cf. StrengthMap.tsx).
// eslint-disable-next-line react-refresh/only-export-components
export function heatColor(errorRate: number, low: string, high: string): string {
  return mix(low, high, errorRate / 100);
}

// Null cells (topic not in that exam) get a hatched card-colored base.
const HATCH =
  "repeating-linear-gradient(45deg, var(--ex-card), var(--ex-card) 4px, var(--ex-line) 4px, var(--ex-line) 8px)";

// `stale` = the org query is serving keepPreviousData. It gates the EMPTY branch only: an
// empty grid is a claim about the filters on screen, but held data belongs to the filters
// BEFORE the change, and the empty copy is achromatic so the page's saturate() cue cannot
// mark it. Emptiness therefore waits for the real answer behind a skeleton, while a
// non-empty grid is free to render stale-and-desaturated. (Same guard as TopicProgressCard.)
export function WeaknessHeatmap({
  exams, rows, stale,
}: { exams: HeatmapExam[]; rows: HeatmapRow[]; stale: boolean }) {
  const { heatLow, heatHigh } = useChartColors();

  if (exams.length === 0 || rows.length === 0) {
    return (
      <Card title="পরীক্ষাভিত্তিক টপিক দুর্বলতা">
        {stale ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <Typography.Text type="secondary">
            এই সময়সীমায় এখনো কোনো র‍্যাঙ্কড অ্যাটেম্পট নেই।
          </Typography.Text>
        )}
      </Card>
    );
  }

  const legend = [0, 20, 40, 60, 80, 100].map((r) => heatColor(r, heatLow, heatHigh));

  return (
    <Card title="পরীক্ষাভিত্তিক টপিক দুর্বলতা">
      <div style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `minmax(140px, 200px) repeat(${exams.length}, minmax(56px, 1fr))`,
            gap: 3,
            minWidth: 140 + exams.length * 60,
          }}
        >
          <div />
          {exams.map((e) => (
            <Tooltip key={e.examId} title={e.archived ? `${e.title} (আর্কাইভড)` : e.title}>
              <Typography.Text
                ellipsis
                type={e.archived ? "secondary" : undefined}
                style={{ fontSize: 11, textAlign: "center" }}
              >
                {e.title}{e.archived ? " ⌫" : ""}
              </Typography.Text>
            </Tooltip>
          ))}
          {rows.map((row) => (
            <div key={row.nodeId ?? "uncategorized"} style={{ display: "contents" }}>
              <Typography.Text ellipsis style={{ fontSize: 12, alignSelf: "center" }}>
                {bilingualLabel(row.name)}
              </Typography.Text>
              {row.cells.map((cell, i) => {
                const fill = cell ? heatColor(cell.errorRate, heatLow, heatHigh) : undefined;
                return (
                  <Tooltip
                    key={exams[i].examId}
                    title={
                      cell
                        ? `${bnNum(cell.answers)}টি উত্তর · ${bnNum(cell.errorRate)}% ভুল বা খালি`
                        : "এই পরীক্ষায় নেই"
                    }
                  >
                    <div
                      style={{
                        height: 32,
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: fill,
                        backgroundImage: cell ? undefined : HATCH,
                        color: fill ? readableText(fill) : "var(--ex-ink-faint)",
                        fontSize: 11,
                      }}
                    >
                      {/* Bengali digits, matching the ramp legend right under this grid
                          («ভুলের হার ০% … ১০০%»). This is chart data with a colour scale, not
                          a table column, so D8's Western-digit rule does not reach it — the
                          same 7f ruling that put Bengali ticks on the chart axes. */}
                      {cell ? bnNum(cell.errorRate) : ""}
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>ভুলের হার ০%</Typography.Text>
        {legend.map((c, i) => (
          <div key={i} style={{ width: 22, height: 10, background: c, borderRadius: 2 }} />
        ))}
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>১০০%</Typography.Text>
        <div style={{ width: 22, height: 10, backgroundImage: HATCH, borderRadius: 2, marginLeft: 10 }} />
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>পরীক্ষায় নেই</Typography.Text>
      </div>
    </Card>
  );
}
