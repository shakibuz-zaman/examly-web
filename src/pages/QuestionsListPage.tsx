import { PlusOutlined } from "@ant-design/icons";
import {
  Button, Card, Input, Popconfirm, Select, Space, Table, Tag, Typography, message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useArchiveQuestion, useCloneQuestion, useQuestions, useQuestionTags, useRestoreQuestion,
} from "../api/questions";
import { useSubjects, useTopics } from "../api/taxonomy";
import type { QuestionListFilters, QuestionSummary, SubjectResponse, TopicResponse } from "../api/types";
import { CONTENT_STATUS_COLORS } from "../theme/status";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "green", medium: "gold", hard: "red",
};

function taxonomyLabel(item: SubjectResponse | TopicResponse): string {
  const { bn, en } = item.name;
  if (bn && en) return `${bn} — ${en}`;
  return bn ?? en ?? item.slug;
}

export function QuestionsListPage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<QuestionListFilters>(() => ({
    page: 1,
    pageSize: 20,
    subjectId: searchParams.get("subjectId") ?? undefined,
    topicId: searchParams.get("topicId") ?? undefined,
  }));
  const navigate = useNavigate();

  const { data, isLoading } = useQuestions(filters);
  const { data: subjects } = useSubjects("examiner");
  const { data: topics } = useTopics("examiner", filters.subjectId ?? null);
  const { data: tagOptions } = useQuestionTags();
  const archive = useArchiveQuestion();
  const restore = useRestoreQuestion();
  const clone = useCloneQuestion();

  const subjectNames = useMemo(
    () => new Map((subjects ?? []).map((s) => [s.id, taxonomyLabel(s)])),
    [subjects],
  );

  const set = (patch: Partial<QuestionListFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const columns: ColumnsType<QuestionSummary> = [
    {
      title: "Question",
      dataIndex: "stemExcerpt",
      render: (text: string) => (
        <Typography.Text style={{ maxWidth: 380 }} ellipsis={{ tooltip: text }}>
          {text}
        </Typography.Text>
      ),
    },
    {
      title: "Subject",
      dataIndex: "subjectId",
      width: 180,
      render: (id: string | null) => (id ? subjectNames.get(id) ?? "—" : "—"),
    },
    {
      title: "Difficulty",
      dataIndex: "difficulty",
      width: 100,
      render: (d: string) => <Tag color={DIFFICULTY_COLORS[d]}>{d}</Tag>,
    },
    { title: "Lang", dataIndex: "language", width: 70, render: (l: string) => <Tag>{l}</Tag> },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (s: string) => <Tag color={CONTENT_STATUS_COLORS[s]}>{s}</Tag>,
    },
    {
      title: "Tags",
      dataIndex: "tags",
      render: (tags: string[]) => tags.map((t) => <Tag key={t}>{t}</Tag>),
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      width: 160,
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      render: (_, row) =>
        row.status === "archived" ? (
          <Button
            size="small"
            onClick={() =>
              restore.mutate(row.id, {
                onSuccess: () => message.success("Question restored"),
              })
            }
          >
            Restore
          </Button>
        ) : (
          <Space>
            <Button size="small" onClick={() => navigate(`/questions/${row.id}`)}>
              Edit
            </Button>
            <Button
              size="small"
              onClick={() =>
                clone.mutate(row.id, {
                  onSuccess: (q) => {
                    message.success("Cloned as draft");
                    navigate(`/questions/${q.id}`);
                  },
                })
              }
            >
              Clone
            </Button>
            <Popconfirm
              title="Archive this question?"
              onConfirm={() =>
                archive.mutate(row.id, {
                  onSuccess: () => message.success("Question archived"),
                })
              }
            >
              <Button size="small" danger>
                Archive
              </Button>
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <Card
      title="Question Bank"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/questions/new")}>
          New question
        </Button>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search stem text"
          allowClear
          style={{ width: 220 }}
          onSearch={(v) => set({ search: v || undefined })}
        />
        <Select
          placeholder="Subject"
          allowClear
          style={{ width: 200 }}
          options={(subjects ?? []).map((s) => ({ value: s.id, label: taxonomyLabel(s) }))}
          value={filters.subjectId}
          onChange={(v) => set({ subjectId: v ?? undefined, topicId: undefined })}
        />
        <Select
          placeholder="Topic"
          allowClear
          disabled={!filters.subjectId}
          style={{ width: 200 }}
          options={(topics ?? []).map((t) => ({ value: t.id, label: taxonomyLabel(t) }))}
          value={filters.topicId}
          onChange={(v) => set({ topicId: v ?? undefined })}
        />
        <Select
          placeholder="Difficulty"
          allowClear
          style={{ width: 120 }}
          options={["easy", "medium", "hard"].map((d) => ({ value: d, label: d }))}
          value={filters.difficulty}
          onChange={(v) => set({ difficulty: v ?? undefined })}
        />
        <Select
          placeholder="Language"
          allowClear
          style={{ width: 110 }}
          options={[{ value: "bn", label: "বাংলা" }, { value: "en", label: "English" }]}
          value={filters.language}
          onChange={(v) => set({ language: v ?? undefined })}
        />
        <Select
          placeholder="Status"
          allowClear
          style={{ width: 120 }}
          options={["draft", "active", "archived"].map((s) => ({ value: s, label: s }))}
          value={filters.status}
          onChange={(v) => set({ status: v ?? undefined })}
        />
        <Select
          mode="multiple"
          placeholder="Tags"
          allowClear
          style={{ minWidth: 160 }}
          options={(tagOptions ?? []).map((t) => ({ value: t, label: t }))}
          value={filters.tags}
          onChange={(v) => set({ tags: v.length ? v : undefined })}
        />
      </Space>

      <Table<QuestionSummary>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={data?.items ?? []}
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
