import { Card, InputNumber, Segmented, Select, Skeleton, Space, Typography } from "antd";
import { useAnalyticsOverview } from "../api/analytics";
import { categoryLabel, useExamCategories } from "../api/categories";
import { useAnalyticsFilters } from "../features/analytics/filters";

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
      ) : (
        <Card size="small">
          <Typography.Text type="secondary">
            {overview.data?.examsTaken ?? 0} exams in scope — sections arrive in Tasks 15–18.
          </Typography.Text>
        </Card>
      )}
    </div>
  );
}
