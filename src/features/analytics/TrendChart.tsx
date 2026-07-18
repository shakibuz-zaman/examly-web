import { Card, Segmented, Space, Switch, Table, Typography } from "antd";
import { useState } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { TrendPoint } from "../../api/analytics";
import { useChartColors } from "./chartTheme";

type Metric = "score" | "percentile";

// Hollow dot for practice retakes — visible but distinct from ranked attempts.
// `accent` is passed by TrendChart (recharts cloneElement preserves it) so this
// helper stays hook-free and mode-aware.
function AttemptDot(props: { cx?: number; cy?: number; payload?: TrendPoint; accent?: string }) {
  const { cx, cy, payload, accent } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  return payload.isPractice ? (
    <circle cx={cx} cy={cy} r={4.5} fill="var(--ex-card)" stroke={accent} strokeWidth={2} />
  ) : (
    <circle cx={cx} cy={cy} r={4.5} fill={accent} stroke="var(--ex-card)" strokeWidth={2} />
  );
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const chartColors = useChartColors();
  const [metric, setMetric] = useState<Metric>("score");
  const [asTable, setAsTable] = useState(false);

  const data = (metric === "score" ? points : points.filter((p) => !p.isPractice)).map((p) => ({
    ...p,
    label: new Date(p.submittedAtUtc).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    value: metric === "score" ? p.scorePercent : p.percentile,
    top: metric === "score" ? p.examTopScorePercent : null,
  }));

  return (
    <Card
      title="Attempt history"
      extra={
        <Space>
          <Segmented
            value={metric}
            options={[{ label: "Score %", value: "score" }, { label: "Percentile", value: "percentile" }]}
            onChange={(v) => setMetric(v as Metric)}
          />
          <Switch checkedChildren="Table" unCheckedChildren="Chart" checked={asTable} onChange={setAsTable} />
        </Space>
      }
    >
      {asTable ? (
        <Table<TrendPoint>
          rowKey="attemptId"
          size="small"
          pagination={false}
          dataSource={metric === "score" ? points : points.filter((p) => !p.isPractice)}
          columns={[
            { title: "Exam", dataIndex: "examTitle" },
            { title: "Date", render: (_, p) => new Date(p.submittedAtUtc).toLocaleDateString() },
            { title: "Score %", dataIndex: "scorePercent" },
            { title: "Percentile", render: (_, p) => p.percentile ?? "—" },
            { title: "Top %", dataIndex: "examTopScorePercent" },
            { title: "Type", render: (_, p) => (p.isPractice ? "Practice" : "Ranked") },
          ]}
        />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 24, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartColors.axis }} />
            <YAxis domain={[Math.min(0, ...data.map((d) => d.value ?? 0)), 100]}
              tick={{ fontSize: 11, fill: chartColors.axis }} />
            <Tooltip
              formatter={(value, name) =>
                [metric === "score" ? `${value}%` : `${value}th`, name]}
              labelFormatter={(_, payload) => payload?.[0]?.payload.examTitle ?? ""}
            />
            {metric === "score" && (
              <Line dataKey="top" name="Exam top score" stroke={chartColors.top}
                strokeWidth={2} dot={false} isAnimationActive={false} />
            )}
            <Line dataKey="value" name={metric === "score" ? "Your score" : "Your percentile"}
              stroke={chartColors.you} strokeWidth={2} dot={<AttemptDot accent={chartColors.you} />} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Hollow dots are practice retakes{metric === "percentile" ? " (excluded — practice never ranks)" : ""};
        the green line is each exam's top score.
      </Typography.Text>
    </Card>
  );
}
