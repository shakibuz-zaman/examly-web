import { Card, Col, Row, Tag, Typography } from "antd";
import type { DifficultyRow, StrategyCard } from "../../api/analytics";
import { useStrength } from "../../api/analytics";
import { bnNum } from "../../lib/bn";
import { DIFFICULTY, bilingualLabel } from "../../lib/labels";
import type { AnalyticsFilters } from "./filters";
import { useChartColors } from "./chartTheme";

export function DifficultyCard({ rows }: { rows: DifficultyRow[] }) {
  const chartColors = useChartColors();
  const order = ["easy", "medium", "hard"];
  const sorted = [...rows].sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty));
  return (
    <Card title="কঠিনতা অনুযায়ী সঠিকতা" size="small">
      {sorted.map((r) => (
        <div key={r.difficulty} style={{ display: "grid", gridTemplateColumns: "80px 1fr 48px", gap: 10, alignItems: "center", padding: "5px 0" }}>
          {/* `capitalize` was doing the label's work on a raw enum; DIFFICULTY does it now.
              `?? r.difficulty`: the map is `Record<string, string>` over a wire value typed
              `string`, so an unmapped key yields undefined and renders blank — the raw value
              is ugly but legible, which is what the old code showed. */}
          <div style={{ fontSize: 13 }}>
            {DIFFICULTY[r.difficulty] ?? r.difficulty}
            <div style={{ fontSize: 11, color: "#8c8c8c" }}>{bnNum(r.attempted)}টি প্রশ্ন</div>
          </div>
          <div style={{ height: 10, background: "#f5f5f5", borderRadius: "0 5px 5px 0", position: "relative" }}>
            <div style={{ position: "absolute", inset: "0 auto 0 0", width: `${r.accuracy}%`, background: chartColors.you, borderRadius: "0 4px 4px 0" }} />
          </div>
          <div style={{ textAlign: "right", fontWeight: 600 }}>{bnNum(r.accuracy)}%</div>
        </div>
      ))}
    </Card>
  );
}

export function NegativeMarkingCard({ strategy }: { strategy: StrategyCard }) {
  return (
    <Card title="নেগেটিভ মার্কিং — সর্বশেষ র‍্যাঙ্কড অ্যাটেম্পট" size="small">
      <Typography.Paragraph style={{ marginBottom: 4 }}>{strategy.examTitle}</Typography.Paragraph>
      {strategy.wrong === 0 ? (
        <Typography.Text type="success">কোনো ভুল উত্তর নেই — নেগেটিভ মার্কিংয়ে কিছু হারাননি। <span aria-hidden>🎯</span></Typography.Text>
      ) : (
        <Typography.Text>
          {bnNum(strategy.wrong)}টি ভুল উত্তরে <b>{bnNum(strategy.marksLost)} নম্বর</b> গেছে — ছেড়ে
          দিলে স্কোর হতো <b>{bnNum(strategy.scoreIfWrongsSkipped)}</b>, {bnNum(strategy.score)} নয়
          {strategy.ranksGained > 0
            ? <>, আর <b>≈{bnNum(strategy.ranksGained)} র‍্যাঙ্ক</b> উপরে উঠতেন</>
            : null}।
        </Typography.Text>
      )}
    </Card>
  );
}

// Top-3 / bottom-3 across the non-low-sample topic rows of every subject.
export function StrengthsFocusCard({ filters }: { filters: AnalyticsFilters }) {
  const subjects = useStrength(filters);
  // Task 2 nests topic rows into the subject list, so the per-subject drill queries this card
  // used to fire (one useQueries entry per subject) are gone. The nesting is one level by
  // design, so the candidate pool is topic rows only — subtopics no longer compete, which is
  // the same pool WeakTopicsCard ranks. `r.nodeId &&` drops the topic-untagged bucket every
  // subject carries (nodeId AND name null, emitted for drill-endpoint parity): «অন্যান্য» is
  // neither a strength nor a focus area.
  const candidates = (subjects.data ?? []).flatMap((subject) =>
    subject.subtopics
      .filter((r) => r.nodeId && !r.lowSample)
      .map((r) => ({ ...r, subject: bilingualLabel(subject.name) })));

  if (candidates.length === 0) return null;
  const byAccuracy = [...candidates].sort((a, b) => b.accuracy - a.accuracy);
  const strengths = byAccuracy.slice(0, 3);
  const strengthKeys = new Set(strengths.map((r) => r.nodeId));
  const focus = byAccuracy.filter((r) => !strengthKeys.has(r.nodeId)).slice(-3).reverse();

  const Item = ({ r, good }: { r: (typeof candidates)[number]; good: boolean }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
      <Tag color={good ? "green" : "orange"} style={{ margin: 0 }}>{bnNum(r.accuracy)}%</Tag>
      <div style={{ fontSize: 13 }}>
        {r.subject} → {bilingualLabel(r.name)}
        <div style={{ fontSize: 11, color: "#8c8c8c" }}>{bnNum(r.attempted)}টি প্রশ্ন</div>
      </div>
    </div>
  );

  return (
    <Card title="শক্তি ও দুর্বলতা" size="small">
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Typography.Text strong type="success">শক্তির জায়গা</Typography.Text>
          {strengths.map((r) => <Item key={`s-${r.nodeId}`} r={r} good />)}
        </Col>
        <Col xs={24} md={12}>
          <Typography.Text strong>দুর্বল জায়গা</Typography.Text>
          {focus.map((r) => <Item key={`f-${r.nodeId}`} r={r} good={false} />)}
        </Col>
      </Row>
    </Card>
  );
}
