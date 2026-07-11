import { useState } from "react";
import { Card, List, Space, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { useCatalog } from "../api/student";
import { formatDateTime, formatDuration } from "../lib/format";
import type { CatalogItem } from "../api/types";

const PAGE_SIZE = 20;

function windowTag(item: CatalogItem) {
  if (!item.windowStartUtc || !item.windowEndUtc) {
    return <Tag color="green">Take anytime</Tag>;
  }
  const now = Date.now();
  if (now < new Date(item.windowStartUtc).getTime()) {
    return <Tag color="blue">Starts {formatDateTime(item.windowStartUtc)}</Tag>;
  }
  if (now < new Date(item.windowEndUtc).getTime()) {
    return <Tag color="gold">Live until {formatDateTime(item.windowEndUtc)}</Tag>;
  }
  return <Tag>Closed</Tag>;
}

export function StudentCatalogPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCatalog(page, PAGE_SIZE);
  const navigate = useNavigate();

  return (
    <div>
      <Typography.Title level={3}>Catalog</Typography.Title>
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
          <List.Item style={{ padding: 0, marginBottom: 12, border: "none" }}>
            <Card
              hoverable
              style={{ width: "100%" }}
              onClick={() =>
                navigate(
                  item.kind === "exam"
                    ? `/student/exams/${item.id}`
                    : `/student/model-tests/${item.id}`,
                )
              }
            >
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Space wrap>
                  <Typography.Text strong>{item.title}</Typography.Text>
                  {item.kind === "model_test" && <Tag color="purple">Model test</Tag>}
                  {windowTag(item)}
                </Space>
                {item.orgName && (
                  <Typography.Text type="secondary">{item.orgName}</Typography.Text>
                )}
                <Typography.Text type="secondary">
                  {item.kind === "model_test" ? `${item.examCount} exams · ` : ""}
                  {item.questionCount} questions · {formatDuration(item.durationMinutes)} ·{" "}
                  {item.totalMarks} marks
                </Typography.Text>
              </Space>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
}
