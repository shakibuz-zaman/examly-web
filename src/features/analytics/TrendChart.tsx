import { Card, Segmented, Space, Switch, Table, Typography } from "antd";
import { useState } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { TrendPoint } from "../../api/analytics";
import { bnNum } from "../../lib/bn";
import { formatDhakaDayMonthBn, formatDhakaShortBn } from "../../lib/format";
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
    // Date only: an axis tick has no room for the time, and the datetime formatter's
    // AM/PM is Latin. The table column below keeps the full datetime — it has the width.
    label: formatDhakaDayMonthBn(p.submittedAtUtc),
    value: metric === "score" ? p.scorePercent : p.percentile,
    top: metric === "score" ? p.examTopScorePercent : null,
  }));

  return (
    <Card
      title="অ্যাটেম্পট ইতিহাস"
      extra={
        <Space>
          <Segmented
            value={metric}
            options={[{ label: "স্কোর %", value: "score" }, { label: "পার্সেন্টাইল", value: "percentile" }]}
            onChange={(v) => setMetric(v as Metric)}
          />
          <Switch checkedChildren="টেবিল" unCheckedChildren="চার্ট" checked={asTable} onChange={setAsTable} />
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
            { title: "পরীক্ষা", dataIndex: "examTitle" },
            { title: "তারিখ", render: (_, p) => formatDhakaShortBn(p.submittedAtUtc) },
            // Every numeric cell guards before bnNum: bnNum only substitutes digits, so a
            // missing field would print the literal "null". These two are typed non-null,
            // but the guard is the column contract, not a reaction to a known null.
            { title: "স্কোর %", dataIndex: "scorePercent",
              render: (v: number) => (v === null || v === undefined ? "—" : bnNum(v)) },
            // `=== null`, not `??`/truthiness: percentile 0 is the top of the cohort and must
            // print «০», not the em-dash the missing-value branch renders.
            { title: "পার্সেন্টাইল", render: (_, p) => (p.percentile === null ? "—" : bnNum(p.percentile)) },
            { title: "সর্বোচ্চ %", dataIndex: "examTopScorePercent",
              render: (v: number) => (v === null || v === undefined ? "—" : bnNum(v)) },
            { title: "ধরন", render: (_, p) => (p.isPractice ? "প্র্যাকটিস" : "র‍্যাঙ্কড") },
          ]}
        />
      ) : (
        // recharts renders a bare <svg> that announces as nothing; the caption below is the
        // text alternative, this is the accessible name. Mode-aware: the same chart plots
        // percentile under the other Segmented value, and the name must not say «স্কোর» then.
        <div role="img" aria-label={metric === "score"
          ? "স্কোরের ধারা — প্রতিটি পরীক্ষার ফল"
          : "পার্সেন্টাইলের ধারা — প্রতিটি পরীক্ষার ফল"}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 24, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartColors.axis }} />
              <YAxis domain={[Math.min(0, ...data.map((d) => d.value ?? 0)), 100]}
                tickFormatter={(v) => bnNum(v)}
                tick={{ fontSize: 11, fill: chartColors.axis }} />
              <Tooltip
                formatter={(value, name) => {
                  // A ranked attempt whose exam has not revealed yet carries a null percentile
                  // and still sits in the series; `100 - null` would print a confident «টপ ১০০%».
                  if (value === null || value === undefined) return ["—", name];
                  const n = Number(value);
                  return [metric === "score" ? `${bnNum(n)}%` : `টপ ${bnNum(100 - n)}%`, name];
                }}
                labelFormatter={(_, payload) => payload?.[0]?.payload.examTitle ?? ""}
              />
              {metric === "score" && (
                <Line dataKey="top" name="সর্বোচ্চ স্কোর" stroke={chartColors.top}
                  strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
              <Line dataKey="value" name={metric === "score" ? "আপনার স্কোর" : "আপনার পার্সেন্টাইল"}
                stroke={chartColors.you} strokeWidth={2} dot={<AttemptDot accent={chartColors.you} />} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Split by mode rather than splicing a parenthetical into one sentence: পার্সেন্টাইল mode
          filters practice points out entirely — there are no hollow dots to explain — and draws
          no top-score line, so the single sentence described two things that were not on screen. */}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {metric === "score"
          ? "ফাঁপা বিন্দু = প্র্যাকটিস রিটেক; সবুজ রেখা প্রতিটি পরীক্ষার সর্বোচ্চ স্কোর।"
          : "প্র্যাকটিস রিটেক এখানে নেই — প্র্যাকটিস র‍্যাঙ্কে গোনা হয় না।"}
      </Typography.Text>
    </Card>
  );
}
