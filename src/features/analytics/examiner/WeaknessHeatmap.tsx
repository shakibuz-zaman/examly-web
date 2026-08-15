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

// Text that stays legible on the interpolated cell fill — picked from the FILL's luminance,
// not from the theme. A heat cell paints its own background in both modes, so `paletteFor(mode)`
// would be the wrong source here: dark's ink is near-white and would vanish on the pale end of
// the ramp. The two ends still come from the token module rather than a local hex — `onSolid`
// is mode-independent by definition, and the light palette's `ink` IS the dark-ink constant
// (paletteDark re-tints ink for a dark surface, which is not what a light cell fill is). A
// palette re-tune therefore reaches these cells too.
function readableText(bg: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? palette.ink : palette.onSolid;
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
