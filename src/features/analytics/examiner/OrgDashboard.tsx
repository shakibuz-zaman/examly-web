import { useState } from "react";
import {
  Card, Col, DatePicker, Row, Segmented, Select, Skeleton, Statistic, Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useOrgAnalytics } from "../../../api/examinerAnalytics";
import { categoryLabel, useExamCategories } from "../../../api/categories";
import { useModelTests } from "../../../api/modelTests";
import type { AnalyticsMode } from "../filters";
import { useChartColors } from "../chartTheme";
import { WeaknessHeatmap } from "./WeaknessHeatmap";
import { WeakestTopicsList } from "./WeakestTopicsList";

// Lazy-loaded from DashboardPage (recharts must stay out of the main bundle).
export function OrgDashboard() {
  const chartColors = useChartColors();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [modelTestId, setModelTestId] = useState<string | null>(null);
  const [mode, setMode] = useState<AnalyticsMode>("all");
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);

  const categories = useExamCategories();
  const modelTests = useModelTests({ page: 1, pageSize: 50 });
  const org = useOrgAnalytics({
    categoryId,
    modelTestId,
    mode,
    fromUtc: range ? range[0].startOf("day").toISOString() : null,
    toUtc: range ? range[1].endOf("day").toISOString() : null,
  });

  const k = org.data?.kpis;
  const delta = k?.deltaVsPriorPct ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>Organization analytics</Typography.Title>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="All categories"
            style={{ minWidth: 170 }}
            value={categoryId ?? undefined}
            options={(categories.data ?? []).map((c) => ({ value: c.id, label: categoryLabel(c) }))}
            onChange={(v) => setCategoryId(v ?? null)}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="All model tests"
            style={{ minWidth: 170 }}
            value={modelTestId ?? undefined}
            options={(modelTests.data?.items ?? []).map((m) => ({ value: m.id, label: m.title }))}
            onChange={(v) => setModelTestId(v ?? null)}
          />
          <Segmented
            value={mode}
            options={[
              { label: "All exams", value: "all" },
              { label: "Live", value: "live" },
              { label: "Open", value: "open" },
            ]}
            onChange={(v) => setMode(v as AnalyticsMode)}
          />
          <DatePicker.RangePicker
            value={range}
            onChange={(v) => setRange(v && v[0] && v[1] ? [v[0], v[1]] : null)}
            allowClear
          />
        </div>
      </div>

      {org.isLoading || !org.data ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          <Card>
            <Row gutter={[16, 16]}>
              <Col xs={12} md={8}>
                <Statistic
                  title="Attempts (last 30 days)"
                  value={k!.attempts30d}
                  suffix={
                    delta !== null && (
                      <Typography.Text
                        type={delta >= 0 ? "success" : "danger"}
                        style={{ fontSize: 13 }}
                      >
                        {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs prior
                      </Typography.Text>
                    )
                  }
                />
              </Col>
              <Col xs={12} md={8}>
                <Statistic title="Active students (30d)" value={k!.activeStudents} />
              </Col>
              <Col xs={12} md={8}>
                <Statistic
                  title="Median score (ranked, 30d)"
                  value={k!.medianScorePercent ?? "—"}
                  suffix={k!.medianScorePercent !== null ? "%" : undefined}
                />
              </Col>
            </Row>
          </Card>

          <Card title="Weekly participation">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={org.data.weekly.map((p) => ({
                  week: dayjs(p.weekStartUtc).format("D MMM"),
                  attempts: p.attempts,
                  students: p.activeStudents,
                }))}
              >
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: chartColors.axis }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: chartColors.axis }} width={28} />
                <Tooltip
                  formatter={(v, name) =>
                    [v as number, name === "attempts" ? "attempts" : "active students"]}
                />
                <Line dataKey="attempts" stroke={chartColors.you} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line dataKey="students" stroke={chartColors.peer} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Blue = finalized attempts per week · gray = distinct students. Default window: last 12 weeks.
            </Typography.Text>
          </Card>

          <Row gutter={[12, 12]}>
            <Col xs={24} xl={14}>
              <WeaknessHeatmap exams={org.data.heatmapExams} rows={org.data.heatmapRows} />
            </Col>
            <Col xs={24} xl={10}>
              <WeakestTopicsList rows={org.data.weakestTopics} />
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
