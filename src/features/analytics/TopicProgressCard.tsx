import { Card, Select, Skeleton, Space, Typography } from "antd";
import { useState } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  useStrength, useSubjectStrength, useTopicTrend, type TopicTrendPoint, type TrendNode,
} from "../../api/analytics";
import { bnNum } from "../../lib/bn";
import { formatDhakaDayMonthBn } from "../../lib/format";
import { bilingualLabel } from "../../lib/labels";
import type { AnalyticsFilters } from "./filters";
import { useChartColors } from "./chartTheme";

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
    .map((r) => ({ value: r.nodeId!, label: bilingualLabel(r.name) }));

  const nodeOptions = [
    ...(subjectId ? [{ value: `s:${subjectId}`, label: "পুরো বিষয়" }] : []),
    ...(topics.data ?? []).flatMap((t) => [
      ...(t.nodeId ? [{ value: `t:${t.nodeId}`, label: bilingualLabel(t.name) }] : []),
      ...t.subtopics.filter((s) => s.nodeId).map((s) => ({
        value: `t:${s.nodeId}`, label: `↳ ${bilingualLabel(s.name)}`,
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
    // Date only — this label is an axis tick and nothing else. See TrendChart.
    label: formatDhakaDayMonthBn(p.submittedAtUtc),
  }));

  return (
    <Card title="টপিক প্রোগ্রেস" extra={<Typography.Text type="secondary" style={{ fontSize: 12 }}>প্রতি পরীক্ষায় একটি বিন্দু</Typography.Text>}>
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          placeholder="বিষয়"
          style={{ minWidth: 150 }}
          options={subjectOptions}
          value={subjectId ?? undefined}
          onChange={(v) => { setSubjectId(v); setNode({ subjectId: v }); }}
        />
        <Select
          placeholder="টপিক / সাবটপিক"
          style={{ minWidth: 190 }}
          disabled={!subjectId}
          options={nodeOptions}
          value={node ? ("subjectId" in node ? `s:${node.subjectId}` : `t:${node.topicId}`) : undefined}
          onChange={pickNode}
        />
      </Space>
      {node === null ? (
        <Typography.Text type="secondary">পরীক্ষাভিত্তিক ধারা দেখতে একটি বিষয় বাছুন।</Typography.Text>
      ) : trend.isLoading ? (
        <Skeleton active />
      ) : data.length === 0 ? (
        <Typography.Text type="secondary">এই টপিক আছে এমন কোনো র‍্যাঙ্কড অ্যাটেম্পট এখনো নেই।</Typography.Text>
      ) : (
        <>
          <div role="img" aria-label="টপিকের ধারা — প্রতিটি পরীক্ষায় আপনার সঠিকতা">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={{ top: 8, right: 24, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartColors.axis }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => bnNum(v)}
                  tick={{ fontSize: 11, fill: chartColors.axis }} />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload.examTitle ?? ""}
                  formatter={(value, name, entry) => {
                    // recharts calls the formatter for every series at the hovered index, nulls
                    // included (DefaultTooltipContent skips only `type: "none"`), and both the
                    // peer and top series are nullable — that is what `connectNulls` is for.
                    // `Number(null)` is 0, so without this the tooltip would invent a «০%».
                    if (value === null || value === undefined) return ["—", name];
                    // Keyed on dataKey, not on the series name: the name is display copy and
                    // moved to «আপনি» in this commit, which would have silently dropped the
                    // k/n detail if the comparison had followed it.
                    if (entry.dataKey === "accuracy") {
                      const p = entry.payload as TopicTrendPoint;
                      return [`${bnNum(Number(value))}% (${bnNum(p.k)}/${bnNum(p.n)})`, name];
                    }
                    return [`${bnNum(Number(value))}%`, name];
                  }}
                />
                <Line dataKey="topAccuracy" name="সর্বোচ্চ" stroke={chartColors.top}
                  strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                <Line dataKey="peerAccuracy" name="সহপাঠীর গড়" stroke={chartColors.peer}
                  strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                <Line dataKey="accuracy" name="আপনি" stroke={chartColors.you}
                  strokeWidth={2} dot={<SampleDot accent={chartColors.you} />} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ফাঁপা বিন্দু = ওই পরীক্ষায় ৫টির কম প্রশ্ন; যেসব পরীক্ষায় এই টপিক ছিল না সেগুলো বাদ।
            ধূসর = সহপাঠীর গড়, সবুজ = সর্বোচ্চ।
          </Typography.Text>
        </>
      )}
    </Card>
  );
}
