import { Card, Tooltip, Typography } from "antd";
import type { HeatmapExam, HeatmapRow } from "../../../api/examinerAnalytics";
import { nodeLabel } from "../StrengthMap";
import { useChartColors } from "../chartTheme";

// Linear interpolation between two #rrggbb colors, t clamped to [0,1].
function mix(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// Text that stays legible on the interpolated cell fill (contrast, not theme).
function readableText(bg: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? "#1C201D" : "#FFFFFF";
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

export function WeaknessHeatmap({ exams, rows }: { exams: HeatmapExam[]; rows: HeatmapRow[] }) {
  const { heatLow, heatHigh } = useChartColors();

  if (exams.length === 0 || rows.length === 0) {
    return (
      <Card title="Topic weakness by exam">
        <Typography.Text type="secondary">No ranked attempts in this window yet.</Typography.Text>
      </Card>
    );
  }

  const legend = [0, 20, 40, 60, 80, 100].map((r) => heatColor(r, heatLow, heatHigh));

  return (
    <Card title="Topic weakness by exam">
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
            <Tooltip key={e.examId} title={e.archived ? `${e.title} (archived)` : e.title}>
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
                {nodeLabel(row)}
              </Typography.Text>
              {row.cells.map((cell, i) => {
                const fill = cell ? heatColor(cell.errorRate, heatLow, heatHigh) : undefined;
                return (
                  <Tooltip
                    key={exams[i].examId}
                    title={
                      cell
                        ? `${cell.answers} answers · ${cell.errorRate}% wrong or skipped`
                        : "Not in this exam"
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
                      {cell ? `${cell.errorRate}` : ""}
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>error rate 0%</Typography.Text>
        {legend.map((c, i) => (
          <div key={i} style={{ width: 22, height: 10, background: c, borderRadius: 2 }} />
        ))}
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>100%</Typography.Text>
        <div style={{ width: 22, height: 10, backgroundImage: HATCH, borderRadius: 2, marginLeft: 10 }} />
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>not in exam</Typography.Text>
      </div>
    </Card>
  );
}
