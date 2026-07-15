import { lazy, Suspense, useState } from "react";
import { Button, Card, Col, Row, Spin, Statistic, Table, Tabs, Tag, Typography } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { useExam, useExamResults } from "../api/exams";
import { formatClock, formatDateTime } from "../lib/format";
import type { ExamResultRow } from "../api/types";
import { AttemptBreakdownDrawer } from "../features/analytics/examiner/AttemptBreakdownDrawer";

// Keeps recharts out of the main bundle — the tab's chunk loads on first open.
const ExamAnalyticsTab = lazy(() =>
  import("../features/analytics/examiner/ExamAnalyticsTab").then((m) => ({
    default: m.ExamAnalyticsTab,
  })));

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
  in_progress: "processing",
  submitted: "green",
  expired: "orange",
};

export function ExamResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"ranked" | "practice" | "analytics">("ranked");
  const [page, setPage] = useState(1);
  const [drawerRow, setDrawerRow] = useState<ExamResultRow | null>(null);

  const { data: exam, isError: examError } = useExam(id);
  const { data, isLoading } = useExamResults(id, page, PAGE_SIZE, tab === "practice");

  const columns: ColumnsType<ExamResultRow> = [
    ...(tab === "ranked"
      ? [{ title: "#", dataIndex: "rank", width: 60 } as ColumnsType<ExamResultRow>[number]]
      : []),
    { title: "Student", dataIndex: "studentName" },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{s.replace("_", " ")}</Tag>,
    },
    {
      title: "Score",
      dataIndex: "score",
      width: 110,
      render: (_, row) => (row.score === null ? "—" : `${row.score} / ${row.maxScore}`),
    },
    {
      title: "C · W · B",
      key: "cwb",
      width: 110,
      render: (_, row) =>
        row.correct === null ? "—" : `${row.correct} · ${row.wrong} · ${row.unanswered}`,
    },
    {
      title: "Time",
      dataIndex: "timeTakenSeconds",
      width: 90,
      render: (s: number | null) => (s === null ? "—" : formatClock(s)),
    },
    {
      title: "Submitted",
      dataIndex: "submittedAt",
      width: 170,
      render: (d: string | null) => formatDateTime(d),
    },
  ];

  return (
    <div>
      <Button onClick={() => navigate("/exams")} style={{ marginBottom: 12 }}>
        ← Exams
      </Button>
      <Typography.Title level={3} style={{ marginBottom: 12 }}>
        {examError ? "Results" : `Results — ${exam?.title ?? "…"}`}
      </Typography.Title>

      {tab === "ranked" && data && (
        <Card style={{ marginBottom: 12 }}>
          <Row gutter={[16, 16]}>
            <Col xs={8}>
              <Statistic title="Participants" value={data.participants} />
            </Col>
            <Col xs={8}>
              <Statistic title="Average" value={data.averageScore ?? "—"} />
            </Col>
            <Col xs={8}>
              <Statistic title="Top score" value={data.topScore ?? "—"} />
            </Col>
          </Row>
        </Card>
      )}

      <Tabs
        activeKey={tab}
        onChange={(key) => {
          setTab(key as "ranked" | "practice" | "analytics");
          setPage(1);
        }}
        items={[
          { key: "ranked", label: "Ranked (first attempts)" },
          { key: "practice", label: "Practice (retakes)" },
          { key: "analytics", label: "Analytics" },
        ]}
      />

      {tab === "analytics" ? (
        <Suspense fallback={<Spin style={{ display: "block", margin: "48px auto" }} />}>
          <ExamAnalyticsTab examId={id!} />
        </Suspense>
      ) : (
        <Table
          size="small"
          rowKey="attemptId"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          onRow={(record) => ({
            onClick: () => setDrawerRow(record),
            style: { cursor: "pointer" },
          })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: data?.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
          }}
          scroll={{ x: true }}
        />
      )}

      <AttemptBreakdownDrawer
        examId={id!}
        row={drawerRow}
        onClose={() => setDrawerRow(null)}
      />
    </div>
  );
}
