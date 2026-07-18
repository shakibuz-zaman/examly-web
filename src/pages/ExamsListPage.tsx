import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button, Card, Input, Modal, Popconfirm, Select, Space, Table, Tag, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
  useArchiveExam, useExams, usePublishExam, useRestoreExam, useUnpublishExam,
} from "../api/exams";
import type { ExamListFilters, ExamSummary } from "../api/types";
import { CONTENT_STATUS_COLORS } from "../theme/status";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

export function ExamsListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ExamListFilters>({ page: 1, pageSize: 20 });
  const { data, isLoading } = useExams(filters);
  const publish = usePublishExam();
  const unpublish = useUnpublishExam();
  const archive = useArchiveExam();
  const restore = useRestoreExam();

  const set = (patch: Partial<ExamListFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const onPublish = async (id: string) => {
    try {
      await publish.mutateAsync(id);
      message.success("Exam published");
    } catch (e) {
      Modal.error({
        title: "Cannot publish",
        content: <div style={{ whiteSpace: "pre-line" }}>{serverError(e, "Publish failed")}</div>,
      });
    }
  };

  const onUnpublish = async (id: string) => {
    try {
      await unpublish.mutateAsync(id);
      message.success("Exam unpublished — it is a draft again");
    } catch (e) {
      message.error(serverError(e, "Unpublish failed"));
    }
  };

  const columns: ColumnsType<ExamSummary> = [
    { title: "Title", dataIndex: "title" },
    {
      title: "Status", dataIndex: "status", width: 110,
      render: (s: string) => <Tag color={CONTENT_STATUS_COLORS[s]}>{s}</Tag>,
    },
    {
      title: "Bundle", width: 180,
      render: (_, r) =>
        r.modelTestTitle ?? <span style={{ color: "#999" }}>standalone</span>,
    },
    { title: "Questions", dataIndex: "questionCount", width: 100 },
    { title: "Marks", dataIndex: "totalMarks", width: 90 },
    {
      title: "Window", width: 230,
      render: (_, r) =>
        r.windowStartUtc && r.windowEndUtc
          ? `${new Date(r.windowStartUtc).toLocaleString()} → ${new Date(r.windowEndUtc).toLocaleString()}`
          : "—",
    },
    {
      title: "Updated", dataIndex: "updatedAt", width: 170,
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: "Actions", width: 340,
      render: (_, r) => (
        <Space size="small" wrap>
          {r.status !== "archived" && (
            <Button size="small" onClick={() => navigate(`/exams/${r.id}`)}>
              {r.status === "draft" ? "Edit" : "View"}
            </Button>
          )}
          {(r.status === "published" || r.status === "archived") && (
            <Button size="small" onClick={() => navigate(`/exams/${r.id}/results`)}>
              Results
            </Button>
          )}
          {r.status === "draft" && !r.modelTestId && (
            <Button size="small" type="primary" ghost loading={publish.isPending}
              onClick={() => void onPublish(r.id)}>
              Publish
            </Button>
          )}
          {r.status === "published" && !r.modelTestId && (
            <Popconfirm title="Unpublish this exam? It becomes an editable draft."
              onConfirm={() => void onUnpublish(r.id)}>
              <Button size="small">Unpublish</Button>
            </Popconfirm>
          )}
          {r.status !== "archived" ? (
            <Popconfirm title="Archive this exam?"
              onConfirm={() =>
                archive.mutate(r.id, { onSuccess: () => message.success("Exam archived") })}>
              <Button size="small" danger>Archive</Button>
            </Popconfirm>
          ) : (
            <Button size="small"
              onClick={() =>
                restore.mutate(r.id, { onSuccess: () => message.success("Exam restored") })}>
              Restore
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Exams"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/exams/new")}>
          New exam
        </Button>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search title"
          allowClear
          style={{ width: 240 }}
          onSearch={(v) => set({ search: v || undefined })}
        />
        <Select
          placeholder="Status"
          allowClear
          style={{ width: 140 }}
          value={filters.status}
          onChange={(v) => set({ status: v ?? undefined })}
          options={[
            { value: "draft", label: "Draft" },
            { value: "published", label: "Published" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <Select
          placeholder="Type"
          allowClear
          style={{ width: 160 }}
          value={filters.standalone ? "standalone" : undefined}
          onChange={(v) => set({ standalone: v === "standalone" || undefined })}
          options={[{ value: "standalone", label: "Standalone only" }]}
        />
      </Space>
      <Table<ExamSummary>
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
