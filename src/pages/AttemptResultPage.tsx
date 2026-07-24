import { useState } from "react";
import {
  Alert, Button, Card, Col, Collapse, Row, Space, Spin, Statistic, Table, Tabs, Tag, Typography,
} from "antd";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { useAttemptReview, useAttemptStatus, useLeaderboard } from "../api/student";
import { QuestionContentView } from "../features/questions/QuestionContentView";
import { AttemptTopicStrip } from "../features/student/AttemptTopicStrip";
import { OptionRow } from "../components/OptionRow";
import { formatClock, formatDateTime } from "../lib/format";
import type { LeaderboardRow, ReviewQuestion } from "../api/types";
import { PageContainer } from "../ui/PageContainer";

const BN_LETTERS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];
const LEADERBOARD_PAGE_SIZE = 20;

function ReviewQuestionCard({ question, number }: { question: ReviewQuestion; number: number }) {
  const outcomeTag =
    question.outcome === "correct" ? (
      <Tag color="green">+{question.marksEarned}</Tag>
    ) : question.outcome === "wrong" ? (
      <Tag color="red">{question.marksEarned}</Tag>
    ) : (
      <Tag>0</Tag>
    );
  return (
    <Card size="small" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Typography.Text strong>{number}.</Typography.Text>
        <div style={{ flex: 1, minWidth: 0 }}>
          <QuestionContentView html={question.stemHtml} />
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {question.options.map((option, index) => (
              <OptionRow
                key={option.id}
                optionKey={BN_LETTERS[index] ?? String(index + 1)}
                state={option.isCorrect ? "correct" : option.selected ? "wrong" : "default"}
                multiple={question.multipleCorrect}
                checked={option.selected}
                trailing={option.selected ? <Tag color="blue">আপনার উত্তর</Tag> : undefined}
                disabled
              >
                <QuestionContentView html={option.html} />
              </OptionRow>
            ))}
          </div>
          {question.explanationHtml && (
            <Collapse
              ghost
              size="small"
              style={{ marginTop: 8 }}
              items={[
                {
                  key: "explanation",
                  label: "Explanation",
                  children: <QuestionContentView html={question.explanationHtml} />,
                },
              ]}
            />
          )}
        </div>
        {outcomeTag}
      </div>
    </Card>
  );
}

export function AttemptResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leaderboardPage, setLeaderboardPage] = useState(1);

  const statusQuery = useAttemptStatus(id, { refetchInterval: 15000 });
  const status = statusQuery.data;
  const revealed = status?.revealed ?? false;
  const finalized = status !== undefined && status.status !== "in_progress";
  const unlocked = revealed && finalized;

  const reviewQuery = useAttemptReview(id, unlocked);
  const leaderboardQuery = useLeaderboard(
    status?.examId, unlocked, leaderboardPage, LEADERBOARD_PAGE_SIZE);

  if (statusQuery.isLoading) {
    return (
      <PageContainer>
        <Spin style={{ display: "block", marginTop: 80 }} />
      </PageContainer>
    );
  }
  if (statusQuery.isError || !status) {
    return (
      <PageContainer>
        <Typography.Text type="danger">This attempt is not available.</Typography.Text>
      </PageContainer>
    );
  }

  if (status.status === "in_progress") {
    return (
      <PageContainer>
        <Card>
          <Typography.Paragraph>This attempt is still in progress.</Typography.Paragraph>
          <Button type="primary" onClick={() => navigate(`/student/exams/${status.examId}/take`)}>
            Resume exam
          </Button>
        </Card>
      </PageContainer>
    );
  }

  if (!revealed) {
    return (
      <PageContainer>
        <Card>
          <Typography.Title level={4}>{status.examTitle}</Typography.Title>
          <Alert
            type="info"
            showIcon
            title="Submitted"
            description={`Score, correct answers, and the leaderboard unlock at ${formatDateTime(status.revealAtUtc)}.`}
          />
        </Card>
      </PageContainer>
    );
  }

  const review = reviewQuery.data;
  const board = leaderboardQuery.data;
  const me = board?.me ?? null;

  const leaderboardColumns: ColumnsType<LeaderboardRow> = [
    { title: "#", dataIndex: "rank", width: 60 },
    {
      title: "Student",
      dataIndex: "studentName",
      render: (name: string, row) => (
        <span>
          {name} {row.isMe && <Tag color="blue">you</Tag>}
        </span>
      ),
    },
    { title: "Score", dataIndex: "score", width: 90 },
    {
      title: "Time",
      dataIndex: "timeTakenSeconds",
      width: 90,
      render: (s: number) => formatClock(s),
    },
  ];

  return (
    <PageContainer>
      <div>
        <Typography.Title level={3} style={{ marginBottom: 4 }}>
          {status.examTitle}
        </Typography.Title>
        <Typography.Text type="secondary">
          Attempt #{status.attemptNumber}
          {status.status === "expired" ? " · time expired (auto-submitted)" : ""}
          {status.attemptNumber > 1 ? " · practice attempts don't rank" : ""}
        </Typography.Text>

        <Tabs
          style={{ marginTop: 12 }}
          defaultActiveKey="analysis"
          items={[
            {
              key: "analysis",
              label: "অ্যানালাইসিস",
              children: (
                <div>
                  <Card>
                    {me && status.attemptNumber === 1 && (
                      <div style={{ marginBottom: 16 }}>
                        <div
                          className="tnum"
                          style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.1 }}
                        >
                          পার্সেন্টাইল {me.percentile}
                        </div>
                        <Typography.Text type="secondary">
                          র‍্যাঙ্ক {me.rank}/{board?.participants}
                        </Typography.Text>
                      </div>
                    )}
                    <Row gutter={[16, 16]}>
                      <Col xs={12} md={6}>
                        <Statistic title="Score" value={`${status.score} / ${status.maxScore}`} />
                      </Col>
                      {board && (
                        <Col xs={12} md={6}>
                          <Statistic title="গড় স্কোর" value={board.averageScore ?? "—"} />
                        </Col>
                      )}
                      <Col xs={12} md={6}>
                        <Statistic title="Correct · Wrong · Blank"
                          value={`${status.correct} · ${status.wrong} · ${status.unanswered}`} />
                      </Col>
                    </Row>
                  </Card>
                  <AttemptTopicStrip attemptId={status.id} enabled={unlocked} />
                </div>
              ),
            },
            {
              key: "review",
              label: "রিভিউ",
              children: reviewQuery.isLoading ? (
                <Spin />
              ) : review ? (
                <div>
                  {review.sections.map((section, sIndex) => {
                    const offset = review.sections
                      .slice(0, sIndex)
                      .reduce((n, s) => n + s.questions.length, 0);
                    return (
                      <div key={sIndex} style={{ marginBottom: 16 }}>
                        {(section.title || review.sections.length > 1) && (
                          <Typography.Title level={5}>
                            {section.title ?? `Section ${sIndex + 1}`}
                          </Typography.Title>
                        )}
                        {section.questions.map((question, qIndex) => (
                          <ReviewQuestionCard
                            key={question.questionId}
                            question={question}
                            number={offset + qIndex + 1}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Typography.Text type="secondary">Review unavailable.</Typography.Text>
              ),
            },
            {
              key: "leaderboard",
              label: "লিডারবোর্ড",
              children: (
                <Table
                  size="small"
                  rowKey={(row) => `${row.rank}-${row.studentName}`}
                  loading={leaderboardQuery.isLoading}
                  columns={leaderboardColumns}
                  dataSource={board?.items ?? []}
                  pagination={{
                    current: leaderboardPage,
                    pageSize: LEADERBOARD_PAGE_SIZE,
                    total: board?.total ?? 0,
                    onChange: setLeaderboardPage,
                    hideOnSinglePage: true,
                  }}
                  scroll={{ x: true }}
                />
              ),
            },
          ]}
        />

        <Space style={{ marginTop: 16 }} wrap>
          <Link to="/student/me">← My exams</Link>
          <Button onClick={() => navigate("/student/progress")}>See your progress</Button>
        </Space>
      </div>
    </PageContainer>
  );
}
