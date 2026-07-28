import { useState } from "react";
import { Card, List, Space, Tag, Typography } from "antd";
import { Link } from "react-router-dom";
import { useMyAttempts } from "../api/student";
import { formatDhakaShortBn } from "../lib/format";
import { ATTEMPT_STATUS } from "../lib/labels";
import { ATTEMPT_STATUS_COLORS } from "../theme/status";
import { PageContainer } from "../ui/PageContainer";

const PAGE_SIZE = 20;

export function MyAttemptsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyAttempts(page, PAGE_SIZE);

  return (
    <PageContainer>
      <div>
        <Typography.Title level={3}>আমার অ্যাটেম্পট</Typography.Title>
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
                      {ATTEMPT_STATUS[item.status]}
                    </Tag>
                    {item.attemptNumber > 1 && <Tag>প্র্যাকটিস #{item.attemptNumber}</Tag>}
                  </Space>
                  <Typography.Text type="secondary">
                    {item.orgName ? `${item.orgName} · ` : ""}
                    শুরু {formatDhakaShortBn(item.startedAt)}
                  </Typography.Text>
                  <Space wrap>
                    {item.status === "in_progress" ? (
                      <Link to={`/student/exams/${item.examId}/take`}>চালিয়ে যান</Link>
                    ) : item.revealed && item.score !== null ? (
                      <>
                        <Typography.Text strong>
                          {item.score} / {item.maxScore}
                        </Typography.Text>
                        <Link to={`/student/attempts/${item.attemptId}/result`}>ফলাফল</Link>
                      </>
                    ) : (
                      // Same expression as the স্টোর → আমার পরীক্ষা list (MyExamsList:93): a null
                      // reveal time names the wait rather than printing «ফলাফল » with a
                      // blank after it, which is what formatDhakaShortBn(null) would give.
                      <Typography.Text type="secondary">
                        {item.revealAtUtc
                          ? `ফলাফল ${formatDhakaShortBn(item.revealAtUtc)}`
                          : "ফলাফল অপেক্ষমাণ"}
                      </Typography.Text>
                    )}
                  </Space>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </div>
    </PageContainer>
  );
}
