import { Card, Segmented, Skeleton, Typography } from "antd";
import { useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { usePosition } from "../../api/analytics";
import type { AnalyticsMode } from "./filters";
import { useChartColors } from "./chartTheme";

export function PositionCard({ categoryId }: { categoryId: string | null }) {
  const chartColors = useChartColors();
  const [mode, setMode] = useState<AnalyticsMode>("live"); // spec: position defaults to live
  const position = usePosition(categoryId, mode);
  const p = position.data;

  return (
    <Card
      title="Your position"
      extra={
        <Segmented
          value={mode}
          options={[
            { label: "All", value: "all" },
            { label: "Live only", value: "live" },
            { label: "Open only", value: "open" },
          ]}
          onChange={(v) => setMode(v as AnalyticsMode)}
        />
      }
    >
      {position.isLoading || !p ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : p.participants === 0 || p.yourAvgPercentile === null ? (
        <Typography.Text type="secondary">
          No ranked attempts in this slice yet.
        </Typography.Text>
      ) : (
        <>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            Top {100 - p.yourAvgPercentile}% of {p.participants.toLocaleString()} students
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            Average percentile across {p.examCount} exam{p.examCount === 1 ? "" : "s"}: {p.yourAvgPercentile}th
          </Typography.Paragraph>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={p.buckets.map((count, i) => ({ bucket: `${i * 10}`, count }))}>
              <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: chartColors.axis }} />
              <Tooltip
                formatter={(v) => [`${v} students`, ""]}
                labelFormatter={(l) => `${l}–${Number(l) + 9} percentile`}
              />
              <Bar dataKey="count" isAnimationActive={false}>
                {p.buckets.map((_, i) => (
                  <Cell key={i} fill={i === p.yourBucket ? chartColors.you : "#b7d3f6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            The dark bar is where you sit. Live exams are the fair everyone-at-once cohort.
          </Typography.Text>
        </>
      )}
    </Card>
  );
}
