import { Alert, Button, Card, Descriptions, Space, Spin, Tag, Typography } from "antd";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStudentExam } from "../api/student";
import { Illustration } from "../components/Illustration";
import { formatDateTime, formatDuration } from "../lib/format";

export function StudentExamLobbyPage() {
  const { id } = useParams();
  const { data: exam, isLoading, isError } = useStudentExam(id);
  const navigate = useNavigate();

  if (isLoading) return <Spin style={{ display: "block", marginTop: 80 }} />;
  if (isError || !exam) {
    return <Typography.Text type="danger">This exam is not available.</Typography.Text>;
  }

  const resumable = exam.myAttempts.some((a) => a.status === "in_progress");
  // Single time read for the whole render (keeps one impure call, not two).
  const notOpenedYet =
    exam.windowStartUtc != null && new Date(exam.windowStartUtc).getTime() > Date.now();

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 0 }}>
        {exam.title}
      </Typography.Title>
      {exam.orgName && <Typography.Text type="secondary">{exam.orgName}</Typography.Text>}
      {exam.modelTestId && exam.modelTestTitle && (
        <Typography.Paragraph style={{ marginTop: 4 }}>
          Part of <Link to={`/student/model-tests/${exam.modelTestId}`}>{exam.modelTestTitle}</Link>
        </Typography.Paragraph>
      )}
      {exam.description && <Typography.Paragraph>{exam.description}</Typography.Paragraph>}

      {notOpenedYet && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <Illustration name="lobby" />
        </div>
      )}

      <Descriptions
        size="small"
        column={1}
        bordered
        style={{ marginTop: 12 }}
        items={[
          { key: "q", label: "Questions", children: exam.questionCount },
          { key: "m", label: "Total marks", children: exam.totalMarks },
          { key: "d", label: "Duration", children: formatDuration(exam.durationMinutes) },
          {
            key: "n",
            label: "Negative marking",
            children: exam.negativeMarks > 0 ? `−${exam.negativeMarks} per wrong answer` : "None",
          },
          {
            key: "w",
            label: "Window",
            children: exam.windowStartUtc
              ? `${formatDateTime(exam.windowStartUtc)} → ${formatDateTime(exam.windowEndUtc)}`
              : "Take anytime",
          },
          { key: "r", label: "Retakes", children: exam.allowRetakes ? "Allowed (first attempt ranks)" : "Single attempt" },
        ]}
      />

      <div style={{ marginTop: 16 }}>
        <Button
          type="primary"
          size="large"
          block
          disabled={!exam.canStart}
          onClick={() => navigate(`/student/exams/${exam.id}/take`)}
        >
          {resumable ? "Resume exam" : "Start exam"}
        </Button>
        {!exam.canStart && exam.cannotStartReason && (
          <Alert
            style={{ marginTop: 8 }}
            type="info"
            showIcon
            message={exam.cannotStartReason}
            description={
              notOpenedYet && exam.windowStartUtc
                ? `Opens ${formatDateTime(exam.windowStartUtc)}`
                : undefined
            }
          />
        )}
      </div>

      {exam.myAttempts.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Typography.Title level={5}>My attempts</Typography.Title>
          {exam.myAttempts.map((attempt) => (
            <Card key={attempt.id} size="small" style={{ marginBottom: 8 }}>
              <Space wrap>
                <Tag>#{attempt.attemptNumber}</Tag>
                <Typography.Text>{attempt.status.replace("_", " ")}</Typography.Text>
                <Typography.Text type="secondary">
                  started {formatDateTime(attempt.startedAt)}
                </Typography.Text>
                {attempt.revealed && attempt.score !== null ? (
                  <>
                    <Typography.Text strong>
                      {attempt.score} / {attempt.maxScore}
                    </Typography.Text>
                    <Link to={`/student/attempts/${attempt.id}/result`}>Result</Link>
                  </>
                ) : attempt.status !== "in_progress" ? (
                  <Typography.Text type="secondary">
                    Results at {formatDateTime(exam.revealAtUtc)}
                  </Typography.Text>
                ) : null}
              </Space>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
