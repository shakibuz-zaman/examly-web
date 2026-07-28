import { Card, Skeleton, Typography } from "antd";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { usePosition } from "../../api/analytics";
import type { AnalyticsFilters } from "./filters";
import { useChartColors } from "./chartTheme";

export function PositionCard({ filters }: { filters: AnalyticsFilters }) {
  const chartColors = useChartColors();
  // D8: one mode control per page. The card used to own a second Segmented with identical
  // vocabulary, so the page and the card could disagree on screen. P2: this also changes
  // the card's default from "live" to the page default "all" — accepted; the caption still
  // explains that live is the everyone-at-once cohort.
  const position = usePosition(filters.categoryId, filters.mode);
  const p = position.data;

  return (
    <Card title="Your position">
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
