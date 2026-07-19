import { Button, Card, Space, Spin, Tag, Typography } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useStudentModelTest } from "../api/student";
import { formatDateTime, formatDuration } from "../lib/format";
import type { StudentBundleExam } from "../api/types";
import { ATTEMPT_STATUS_COLORS } from "../theme/status";

const STATUS_LABELS: Record<StudentBundleExam["myStatus"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  expired: "Time expired",
};

export function StudentModelTestPage() {
  const { id } = useParams();
  const { data: bundle, isLoading, isError } = useStudentModelTest(id);
  const navigate = useNavigate();

  if (isLoading) return <Spin style={{ display: "block", marginTop: 80 }} />;
  if (isError || !bundle) {
    return <Typography.Text type="danger">This model test is not available.</Typography.Text>;
  }

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 0 }}>
        {bundle.title}
      </Typography.Title>
      {bundle.orgName && <Typography.Text type="secondary">{bundle.orgName}</Typography.Text>}
      {bundle.description && (
        <Typography.Paragraph style={{ marginTop: 8 }}>{bundle.description}</Typography.Paragraph>
      )}

      <div style={{ marginTop: 16 }}>
        {bundle.exams.map((exam) => {
          const finalized = exam.myStatus === "submitted" || exam.myStatus === "expired";
          return (
            <Card key={exam.id} size="small" style={{ marginBottom: 12 }}>
              <Space orientation="vertical" size={4} style={{ width: "100%" }}>
                <Space wrap>
                  <Typography.Text strong>{exam.title}</Typography.Text>
                  <Tag color={ATTEMPT_STATUS_COLORS[exam.myStatus] ?? "default"}>
                    {STATUS_LABELS[exam.myStatus]}
                  </Tag>
                </Space>
                <Typography.Text type="secondary">
                  {exam.questionCount} questions · {formatDuration(exam.durationMinutes)} ·{" "}
                  {exam.totalMarks} marks
                  {exam.windowStartUtc ? ` · window ${formatDateTime(exam.windowStartUtc)} → ${formatDateTime(exam.windowEndUtc)}` : ""}
                </Typography.Text>
                {finalized && exam.myRevealed && exam.myScore !== null && (
                  <Typography.Text strong>
                    Score: {exam.myScore} / {exam.myMaxScore}
                  </Typography.Text>
                )}
                {finalized && !exam.myRevealed && (
                  <Typography.Text type="secondary">
                    Results at {formatDateTime(exam.revealAtUtc)}
                  </Typography.Text>
                )}
                <Space wrap>
                  <Button onClick={() => navigate(`/student/exams/${exam.id}`)}>Open</Button>
                  {exam.myStatus === "in_progress" && (
                    <Button type="primary" onClick={() => navigate(`/student/exams/${exam.id}/take`)}>
                      Resume
                    </Button>
                  )}
                  {finalized && exam.myRevealed && exam.myAttemptId && (
                    <Button onClick={() => navigate(`/student/attempts/${exam.myAttemptId}/result`)}>
                      Review
                    </Button>
                  )}
                </Space>
              </Space>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
