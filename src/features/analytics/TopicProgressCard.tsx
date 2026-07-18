import { Card, Select, Skeleton, Space, Typography } from "antd";
import { useState } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  useStrength, useSubjectStrength, useTopicTrend, type TopicTrendPoint, type TrendNode,
} from "../../api/analytics";
import type { AnalyticsFilters } from "./filters";
import { useChartColors } from "./chartTheme";
import { nodeLabel } from "./StrengthMap";

// Hollow dot when the exam had <5 questions for the node (honest small samples).
// `accent` is passed by TopicProgressCard (recharts cloneElement preserves it).
function SampleDot(props: { cx?: number; cy?: number; payload?: TopicTrendPoint; accent?: string }) {
  const { cx, cy, payload, accent } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  return payload.lowSample ? (
    <circle cx={cx} cy={cy} r={4} fill="var(--ex-card)" stroke={accent} strokeWidth={2} />
  ) : (
    <circle cx={cx} cy={cy} r={4.5} fill={accent} stroke="var(--ex-card)" strokeWidth={2} />
  );
}

export function TopicProgressCard({ filters }: { filters: AnalyticsFilters }) {
  const chartColors = useChartColors();
  const subjects = useStrength(filters);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const topics = useSubjectStrength(filters, subjectId);
  const [node, setNode] = useState<TrendNode | null>(null);
  const trend = useTopicTrend(filters, node);

  const subjectOptions = (subjects.data ?? [])
    .filter((r) => r.nodeId !== null)
    .map((r) => ({ value: r.nodeId!, label: nodeLabel(r) }));

  const nodeOptions = [
    ...(subjectId ? [{ value: `s:${subjectId}`, label: "Whole subject" }] : []),
    ...(topics.data ?? []).flatMap((t) => [
      ...(t.nodeId ? [{ value: `t:${t.nodeId}`, label: nodeLabel(t) }] : []),
      ...t.subtopics.filter((s) => s.nodeId).map((s) => ({
        value: `t:${s.nodeId}`, label: `↳ ${nodeLabel(s)}`,
      })),
    ]),
  ];

  function pickNode(value: string) {
    setNode(value.startsWith("s:")
      ? { subjectId: value.slice(2) }
      : { topicId: value.slice(2) });
  }

  const data = (trend.data ?? []).map((p) => ({
    ...p,
    label: new Date(p.submittedAtUtc).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
  }));

  return (
    <Card title="Topic progress" extra={<Typography.Text type="secondary" style={{ fontSize: 12 }}>one point per exam</Typography.Text>}>
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          placeholder="Subject"
          style={{ minWidth: 150 }}
          options={subjectOptions}
          value={subjectId ?? undefined}
          onChange={(v) => { setSubjectId(v); setNode({ subjectId: v }); }}
        />
        <Select
          placeholder="Topic / subtopic"
          style={{ minWidth: 190 }}
          disabled={!subjectId}
          options={nodeOptions}
          value={node ? ("subjectId" in node ? `s:${node.subjectId}` : `t:${node.topicId}`) : undefined}
          onChange={pickNode}
        />
      </Space>
      {node === null ? (
        <Typography.Text type="secondary">Pick a subject to see your per-exam trend.</Typography.Text>
      ) : trend.isLoading ? (
        <Skeleton active />
      ) : data.length === 0 ? (
        <Typography.Text type="secondary">No ranked attempts include this topic yet.</Typography.Text>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 8, right: 24, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartColors.axis }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: chartColors.axis }} />
              <Tooltip
                labelFormatter={(_, payload) => payload?.[0]?.payload.examTitle ?? ""}
                formatter={(value, name, entry) => {
                  if (name === "You") {
                    const p = entry.payload as TopicTrendPoint;
                    return [`${value}% (${p.k}/${p.n})`, name];
                  }
                  return [`${value}%`, name];
                }}
              />
              <Line dataKey="topAccuracy" name="Top score" stroke={chartColors.top}
                strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              <Line dataKey="peerAccuracy" name="Peer average" stroke={chartColors.peer}
                strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              <Line dataKey="accuracy" name="You" stroke={chartColors.you}
                strokeWidth={2} dot={<SampleDot accent={chartColors.you} />} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Hollow dots = fewer than 5 questions in that exam; exams that didn't test this topic are omitted.
            Gray = peer average, green = top score.
          </Typography.Text>
        </>
      )}
    </Card>
  );
}
