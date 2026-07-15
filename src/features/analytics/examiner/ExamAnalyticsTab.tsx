import { Card, Col, Empty, Row, Skeleton, Statistic, Typography } from "antd";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useExamAnalytics } from "../../../api/examinerAnalytics";
import { chartColors } from "../chartTheme";

// Lazy-loaded from ExamResultsPage — this module (and Task 9's tables) is the only
// path by which recharts enters examiner code, so it must stay out of the main chunk.
export function ExamAnalyticsTab({ examId }: { examId: string }) {
  const { data, isLoading, isError } = useExamAnalytics(examId, true);

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (isError || !data) return <Empty description="Could not load analytics." />;
  if (data.funnel.started === 0) return <Empty description="No attempts yet." />;

  const { funnel, histogram } = data;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card>
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}><Statistic title="Started" value={funnel.started} /></Col>
          <Col xs={12} md={6}><Statistic title="Submitted" value={funnel.submitted} /></Col>
          <Col xs={12} md={6}><Statistic title="Expired" value={funnel.expired} /></Col>
          <Col xs={12} md={6}><Statistic title="In progress" value={funnel.inProgress} /></Col>
        </Row>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          First attempts only — practice retakes are not counted here.
        </Typography.Text>
      </Card>

      <Card title="Score distribution (ranked first attempts)">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={histogram.buckets.map((count, i) => ({ bucket: `${i * 10}`, count }))}>
            <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: chartColors.axis }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: chartColors.axis }} width={28} />
            <Tooltip
              formatter={(v) => [`${v} students`, ""]}
              labelFormatter={(l) => `${l}–${Number(l) + 9}% of max score`}
            />
            <Bar dataKey="count" isAnimationActive={false}>
              {histogram.buckets.map((_, i) => (
                <Cell key={i} fill={chartColors.you} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Median {histogram.medianPercent ?? "—"}% · Top {histogram.topPercent ?? "—"}%.
          Negative totals (negative marking) count in the 0–10 bucket.
        </Typography.Text>
      </Card>
    </div>
  );
}
