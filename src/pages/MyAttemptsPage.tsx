import { useState } from "react";
import { Card, List, Space, Tag, Typography } from "antd";
import { Link } from "react-router-dom";
import { useMyAttempts } from "../api/student";
import { formatDateTime } from "../lib/format";
import { ATTEMPT_STATUS_COLORS } from "../theme/status";

const PAGE_SIZE = 20;

export function MyAttemptsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyAttempts(page, PAGE_SIZE);

  return (
    <div>
      <Typography.Title level={3}>My exams</Typography.Title>
      <List
        loading={isLoading}
        dataSource={data?.items ?? []}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.total ?? 0,
          onChange: setPage,
          hideOnSinglePage: true,
        }}
        renderItem={(item) => (
          <List.Item style={{ padding: 0, marginBottom: 8, border: "none" }}>
            <Card size="small" style={{ width: "100%" }}>
              <Space orientation="vertical" size={2} style={{ width: "100%" }}>
                <Space wrap>
                  <Typography.Text strong>{item.examTitle}</Typography.Text>
                  <Tag color={ATTEMPT_STATUS_COLORS[item.status] ?? "default"}>
                    {item.status.replace("_", " ")}
                  </Tag>
                  {item.attemptNumber > 1 && <Tag>practice #{item.attemptNumber}</Tag>}
                </Space>
                <Typography.Text type="secondary">
                  {item.orgName ? `${item.orgName} · ` : ""}
                  started {formatDateTime(item.startedAt)}
                </Typography.Text>
                <Space wrap>
                  {item.status === "in_progress" ? (
                    <Link to={`/student/exams/${item.examId}/take`}>Resume</Link>
                  ) : item.revealed && item.score !== null ? (
                    <>
                      <Typography.Text strong>
                        {item.score} / {item.maxScore}
                      </Typography.Text>
                      <Link to={`/student/attempts/${item.attemptId}/result`}>Result</Link>
                    </>
                  ) : (
                    <Typography.Text type="secondary">
                      Results at {formatDateTime(item.revealAtUtc)}
                    </Typography.Text>
                  )}
                </Space>
              </Space>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
}
