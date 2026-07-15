import { Card, Tooltip, Typography } from "antd";
import type { HeatmapExam, HeatmapRow } from "../../../api/examinerAnalytics";
import { nodeLabel } from "../StrengthMap";

// Sequential blue ramp over errorRate (0 → 100), six 20-point steps.
const RAMP = ["#f0f7ff", "#c4dcf7", "#8fbdec", "#5b9bd9", "#2a78d6", "#1b4f96"];
// heatColor is a pure exported helper (Task 8 contract); exporting it alongside
// the component trips fast-refresh's component-only rule (cf. StrengthMap.tsx).
// eslint-disable-next-line react-refresh/only-export-components
export function heatColor(errorRate: number): string {
  return RAMP[Math.min(RAMP.length - 1, Math.floor(errorRate / 20))];
}

const HATCH = "repeating-linear-gradient(45deg, #fafafa, #fafafa 4px, #f0f0f0 4px, #f0f0f0 8px)";

export function WeaknessHeatmap({ exams, rows }: { exams: HeatmapExam[]; rows: HeatmapRow[] }) {
  if (exams.length === 0 || rows.length === 0) {
    return (
      <Card title="Topic weakness by exam">
        <Typography.Text type="secondary">No ranked attempts in this window yet.</Typography.Text>
      </Card>
    );
  }
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
              {row.cells.map((cell, i) => (
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
                      background: cell ? heatColor(cell.errorRate) : undefined,
                      backgroundImage: cell ? undefined : HATCH,
                      color: cell && cell.errorRate >= 60 ? "#fff" : "#444",
                      fontSize: 11,
                    }}
                  >
                    {cell ? `${cell.errorRate}` : ""}
                  </div>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>error rate 0%</Typography.Text>
        {RAMP.map((c) => (
          <div key={c} style={{ width: 22, height: 10, background: c, borderRadius: 2 }} />
        ))}
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>100%</Typography.Text>
        <div style={{ width: 22, height: 10, backgroundImage: HATCH, borderRadius: 2, marginLeft: 10 }} />
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>not in exam</Typography.Text>
      </div>
    </Card>
  );
}
