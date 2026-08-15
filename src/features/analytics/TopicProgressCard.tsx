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

  // Clear-on-settled-absent. placeholderData took away an unmount: a চিপ tap used to flip the
  // page to isPending, blank this whole stack and reset the card's selection with it. The card
  // stays mounted now, so a subject picked under the old filters can outlive the slice that
  // contained it — and antd paints a value with no matching option as its raw ObjectId, so the
  // বিষয় box would read «507f1f77…».
  // SETTLED is the whole condition. While isPlaceholderData the list on hand is the previous
  // slice's and says nothing about this one; clearing there would wipe the selection on every
  // tap, i.e. rebuild the collapse this change exists to remove. isSuccess likewise keeps a
  // failed request from counting as "the subject is gone".
  // Adjusted during render, not in an effect: the condition is self-extinguishing (subjectId is
  // null afterwards, so it cannot loop) and React re-runs the component before painting, so no
  // frame ever shows the phantom subject. `node` goes with it — it is scoped to the subject,
  // and left behind it would keep drawing the old node's line under an empty picker.
  const subjectCleared =
    subjectId !== null &&
    subjects.isSuccess &&
    !subjects.isPlaceholderData &&
    !subjectOptions.some((o) => o.value === subjectId);
  if (subjectCleared) {
    setSubjectId(null);
    setNode(null);
  }

  // Held topics stay in the LIST but the box is disabled while they are stale (see the Select).
  // The list has a second job besides offering choices: it is where antd looks up the label for
  // the current value, and a value with no matching option is painted as its raw string. So
  // dropping the stale entries would swap a leak for «t:507f1f77…» in the box every time a
  // student with a topic selected taps a চিপ — strictly worse and far more reachable.
  const nodeOptions = [
    ...(subjectId ? [{ value: `s:${subjectId}`, label: "পুরো বিষয়" }] : []),
    ...(topics.data ?? []).flatMap((t) => [
      ...(t.nodeId ? [{ value: `t:${t.nodeId}`, label: bilingualLabel(t.name) }] : []),
      ...t.subtopics.filter((s) => s.nodeId).map((s) => ({
        value: `t:${s.nodeId}`, label: `↳ ${bilingualLabel(s.name)}`,
      })),
    ]),
  ];

  // Second half of clear-on-settled-absent, for the topic. Same rule, same reason: once THIS
  // subject's topics have settled, a topic that is not among them cannot be drilled and would
  // otherwise sit in the box as a raw ObjectId. It falls back to «পুরো বিষয়» rather than to
  // nothing — the subject is still valid, and emptying the chart under a subject the student
  // can still see selected would be its own kind of wrong. Guarded on the subject not having
  // just been cleared, so the two adjustments cannot fight over `node` in one pass.
  if (
    !subjectCleared &&
    node !== null && "topicId" in node &&
    topics.isSuccess && !topics.isPlaceholderData &&
    !nodeOptions.some((o) => o.value === `t:${node.topicId}`)
  ) {
    setNode(subjectId === null ? null : { subjectId });
  }

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
          // Disabled while the topic list is the PREVIOUS subject's: antd portals this dropdown
          // out of the page, so no cue on the card or the page reaches it, and an open list of
          // subject A's topics under subject B invites a pick that queries a topic B does not
          // contain. Disabling blocks the pick while the options stay available for labelling
          // the current value, which is what keeps the box readable rather than raw.
          disabled={!subjectId || topics.isPlaceholderData}
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
        // প্রশ্নব্যাংক's guard: an empty chart is a claim about the node in the Selects, but
        // the held data belongs to the node BEFORE the switch — so emptiness waits for the
        // real answer while a non-empty chart is free to show stale-and-saturated.
        trend.isPlaceholderData ? (
          <Skeleton active />
        ) : (
          <Typography.Text type="secondary">এই টপিক আছে এমন কোনো র‍্যাঙ্কড অ্যাটেম্পট এখনো নেই।</Typography.Text>
        )
      ) : (
        <>
          {/* Every cue on প্রোগ্রেস is keyed on the query that owns the pixels under it, and
              this chart's owner is useTopicTrend — which moves on a Select change, when no
              filter and therefore no other query on the page has moved at all. It is also the
              only cue over this chart: a second one on an ancestor would multiply into it
              (.35 × .35 ≈ .12) and read as broken rather than stale. */}
          <div
            role="img"
            aria-label="টপিকের ধারা — প্রতিটি পরীক্ষায় আপনার সঠিকতা"
            aria-busy={trend.isPlaceholderData}
            style={{
              filter: trend.isPlaceholderData ? "saturate(0.35)" : undefined,
              transition: "filter .2s",
            }}
          >
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
