import { Card, Col, InputNumber, Row, Segmented, Select, Skeleton, Space, Statistic, Typography } from "antd";
import { useAnalyticsOverview } from "../api/analytics";
import { categoryLabel, useExamCategories } from "../api/categories";
import { useAnalyticsFilters } from "../features/analytics/filters";
import { TrendChart } from "../features/analytics/TrendChart";

const WINDOW_PRESETS = [10, 20, 50] as const;

export function StudentProgressPage() {
  const { filters, update } = useAnalyticsFilters();
  const categories = useExamCategories();
  const overview = useAnalyticsOverview(filters);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>My Progress</Typography.Title>
        <Space wrap style={{ marginTop: 8 }}>
          <Select
            allowClear
            placeholder="All categories"
            style={{ minWidth: 160 }}
            value={filters.categoryId ?? undefined}
            options={(categories.data ?? []).map((c) => ({ value: c.id, label: categoryLabel(c) }))}
            onChange={(v) => update({ categoryId: v ?? null })}
          />
          <Segmented
            value={filters.mode}
            options={[
              { label: "All exams", value: "all" },
              { label: "Live", value: "live" },
              { label: "Open", value: "open" },
            ]}
            onChange={(v) => update({ mode: v as typeof filters.mode })}
          />
          <Segmented
            value={filters.lastN && (WINDOW_PRESETS as readonly number[]).includes(filters.lastN) ? filters.lastN : filters.lastN ? "custom" : "all"}
            options={[
              ...WINDOW_PRESETS.map((n) => ({ label: `Last ${n}`, value: n })),
              { label: "All time", value: "all" },
            ]}
            onChange={(v) => update({ lastN: v === "all" ? null : (v as number) })}
          />
          <InputNumber
            min={1}
            max={200}
            placeholder="Custom N"
            value={filters.lastN ?? undefined}
            onChange={(v) => update({ lastN: v ?? null })}
          />
        </Space>
      </div>

      {overview.isLoading ? (
        <Card><Skeleton active /></Card>
      ) : overview.data && overview.data.examsTaken > 0 ? (
        <>
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}>
              <Card size="small"><Statistic title="Exams taken" value={overview.data.examsTaken}
                suffix={overview.data.practiceRetakes > 0 ? ` (+${overview.data.practiceRetakes} practice)` : undefined} /></Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small"><Statistic title="Overall accuracy" value={overview.data.overallAccuracy} suffix="%" /></Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small"><Statistic title="Avg percentile" value={overview.data.avgPercentile ?? "—"}
                suffix={overview.data.avgPercentile !== null ? "th" : undefined} /></Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small"><Statistic title="Focus area" value={overview.data.focusAreaLabel ?? "—"}
                valueStyle={{ fontSize: 16 }} /></Card>
            </Col>
          </Row>
          <TrendChart points={overview.data.trend} />
        </>
      ) : (
        <Card><Typography.Text>No revealed results yet — take an exam from the catalog and come back!</Typography.Text></Card>
      )}
    </div>
  );
}
