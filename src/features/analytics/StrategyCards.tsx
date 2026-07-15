import { Card, Col, Row, Tag, Typography } from "antd";
import { useQueries } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import type { DifficultyRow, StrategyCard, StrengthRow } from "../../api/analytics";
import { useStrength } from "../../api/analytics";
import { analyticsQueryString, type AnalyticsFilters } from "./filters";
import { nodeLabel } from "./StrengthMap";
import { chartColors } from "./chartTheme";

export function DifficultyCard({ rows }: { rows: DifficultyRow[] }) {
  const order = ["easy", "medium", "hard"];
  const sorted = [...rows].sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty));
  return (
    <Card title="Accuracy by difficulty" size="small">
      {sorted.map((r) => (
        <div key={r.difficulty} style={{ display: "grid", gridTemplateColumns: "80px 1fr 48px", gap: 10, alignItems: "center", padding: "5px 0" }}>
          <div style={{ fontSize: 13, textTransform: "capitalize" }}>
            {r.difficulty}
            <div style={{ fontSize: 11, color: "#8c8c8c" }}>{r.attempted} questions</div>
          </div>
          <div style={{ height: 10, background: "#f5f5f5", borderRadius: "0 5px 5px 0", position: "relative" }}>
            <div style={{ position: "absolute", inset: "0 auto 0 0", width: `${r.accuracy}%`, background: chartColors.you, borderRadius: "0 4px 4px 0" }} />
          </div>
          <div style={{ textAlign: "right", fontWeight: 600 }}>{r.accuracy}%</div>
        </div>
      ))}
    </Card>
  );
}

export function NegativeMarkingCard({ strategy }: { strategy: StrategyCard }) {
  return (
    <Card title="Negative marking — latest ranked attempt" size="small">
      <Typography.Paragraph style={{ marginBottom: 4 }}>{strategy.examTitle}</Typography.Paragraph>
      {strategy.wrong === 0 ? (
        <Typography.Text type="success">No wrong answers — nothing lost to negative marking. 🎯</Typography.Text>
      ) : (
        <Typography.Text>
          {strategy.wrong} wrong answer{strategy.wrong === 1 ? "" : "s"} cost you{" "}
          <b>{strategy.marksLost} marks</b> — skipping them would have scored{" "}
          <b>{strategy.scoreIfWrongsSkipped}</b> instead of {strategy.score}
          {strategy.ranksGained > 0 ? <> and moved you up <b>≈{strategy.ranksGained} rank{strategy.ranksGained === 1 ? "" : "s"}</b></> : null}.
        </Typography.Text>
      )}
    </Card>
  );
}

// Top-3 / bottom-3 across non-low-sample topic and subtopic rows of every subject.
export function StrengthsFocusCard({ filters }: { filters: AnalyticsFilters }) {
  const subjects = useStrength(filters);
  const subjectIds = (subjects.data ?? []).filter((s) => s.nodeId).map((s) => s.nodeId!);
  const drills = useQueries({
    queries: subjectIds.map((id) => ({
      queryKey: ["analytics", "strength", id, filters],
      staleTime: 60_000,
      queryFn: async () =>
        (await apiClient.get<StrengthRow[]>(
          `/api/v1/student/analytics/strength/${id}${analyticsQueryString(filters)}`)).data,
    })),
  });

  const subjectName = new Map(
    (subjects.data ?? []).filter((s) => s.nodeId).map((s) => [s.nodeId!, nodeLabel(s)]));
  const candidates = drills.flatMap((d, i) =>
    (d.data ?? []).flatMap((topic) => [topic, ...topic.subtopics])
      .filter((r) => r.nodeId && !r.lowSample)
      .map((r) => ({ ...r, subject: subjectName.get(subjectIds[i]) ?? "" })));

  if (candidates.length === 0) return null;
  const byAccuracy = [...candidates].sort((a, b) => b.accuracy - a.accuracy);
  const strengths = byAccuracy.slice(0, 3);
  const focus = byAccuracy.slice(-3).reverse();

  const Item = ({ r, good }: { r: (typeof candidates)[number]; good: boolean }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
      <Tag color={good ? "green" : "orange"} style={{ margin: 0 }}>{r.accuracy}%</Tag>
      <div style={{ fontSize: 13 }}>
        {r.subject} → {nodeLabel(r)}
        <div style={{ fontSize: 11, color: "#8c8c8c" }}>{r.attempted} questions</div>
      </div>
    </div>
  );

  return (
    <Card title="Strengths & focus areas" size="small">
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Typography.Text strong type="success">Strengths</Typography.Text>
          {strengths.map((r) => <Item key={`s-${r.nodeId}`} r={r} good />)}
        </Col>
        <Col xs={24} md={12}>
          <Typography.Text strong>Focus areas</Typography.Text>
          {focus.map((r) => <Item key={`f-${r.nodeId}`} r={r} good={false} />)}
        </Col>
      </Row>
    </Card>
  );
}
