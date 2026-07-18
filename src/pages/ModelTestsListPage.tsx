import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input, Popconfirm, Select, Space, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useArchiveModelTest, useModelTests, useRestoreModelTest,
} from "../api/modelTests";
import type { ModelTestListFilters, ModelTestSummary } from "../api/types";
import { CONTENT_STATUS_COLORS } from "../theme/status";

export function ModelTestsListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ModelTestListFilters>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useModelTests(filters);
  const archive = useArchiveModelTest();
  const restore = useRestoreModelTest();

  const set = (patch: Partial<ModelTestListFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const columns: ColumnsType<ModelTestSummary> = [
    { title: "Title", dataIndex: "title" },
    {
      title: "Status", dataIndex: "status", width: 110,
      render: (s: string) => <Tag color={CONTENT_STATUS_COLORS[s]}>{s}</Tag>,
    },
    { title: "Exams", dataIndex: "examCount", width: 90 },
    {
      title: "Published", dataIndex: "publishedAt", width: 170,
      render: (d: string | null) => (d ? new Date(d).toLocaleString() : "—"),
    },
    {
      title: "Updated", dataIndex: "updatedAt", width: 170,
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: "Actions", width: 200,
      render: (_, r) => (
        <Space size="small">
          {r.status !== "archived" && (
            <Button size="small" onClick={() => navigate(`/model-tests/${r.id}`)}>
              {r.status === "draft" ? "Edit" : "View"}
            </Button>
          )}
          {r.status !== "archived" ? (
            <Popconfirm title="Archive this model test?"
              onConfirm={() =>
                archive.mutate(r.id, { onSuccess: () => message.success("Model test archived") })}>
              <Button size="small" danger>Archive</Button>
            </Popconfirm>
          ) : (
            <Button size="small"
              onClick={() =>
                restore.mutate(r.id, { onSuccess: () => message.success("Model test restored") })}>
              Restore
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Model Tests"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/model-tests/new")}>
          New model test
        </Button>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search title" allowClear style={{ width: 240 }}
          onSearch={(v) => set({ search: v || undefined })}
        />
        <Select
          placeholder="Status" allowClear style={{ width: 140 }} value={filters.status}
          onChange={(v) => set({ status: v ?? undefined })}
          options={[
            { value: "draft", label: "Draft" },
            { value: "published", label: "Published" },
            { value: "archived", label: "Archived" },
          ]}
        />
      </Space>
      <Table<ModelTestSummary>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={data?.items}
        pagination={{
          current: data?.page ?? filters.page,
          pageSize: data?.pageSize ?? filters.pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          onChange: (page, pageSize) => setFilters((f) => ({ ...f, page, pageSize })),
        }}
      />
    </Card>
  );
}
