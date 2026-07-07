import { useState } from "react";
import {
  Button, Drawer, Input, InputNumber, Select, Space, Table, Tabs, Tag, Typography, message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuestionTags, useQuestions, useSampleQuestions } from "../../api/questions";
import { useSubjects, useTopics } from "../../api/taxonomy";
import type { QuestionListFilters, QuestionSummary, SubjectResponse, TopicResponse } from "../../api/types";
import type { DraftQuestion } from "./examDraft";

const DIFFICULTY_COLORS: Record<string, string> = { easy: "green", medium: "gold", hard: "red" };

export function toDraftQuestion(summary: QuestionSummary): DraftQuestion {
  return {
    questionId: summary.id,
    marksOverride: null,
    stemHtml: null,
    stemExcerpt: summary.stemExcerpt,
    bankStatus: "active", // pickers only surface active questions
    multipleCorrect: summary.multipleCorrect,
    optionCount: summary.optionCount,
    difficulty: summary.difficulty,
  };
}

function taxonomyLabel(item: SubjectResponse | TopicResponse): string {
  const { bn, en } = item.name;
  return bn && en ? `${bn} — ${en}` : bn ?? en ?? item.slug;
}

type PickerFilters = {
  search?: string;
  subjectId?: string;
  topicId?: string;
  difficulty?: string;
  language?: string;
  tags?: string[];
};

type FilterBarProps = {
  filters: PickerFilters;
  onChange: (patch: PickerFilters) => void;
};

function FilterBar({ filters, onChange }: FilterBarProps) {
  const { data: subjects } = useSubjects("examiner");
  const { data: topics } = useTopics("examiner", filters.subjectId ?? null);
  const { data: tags } = useQuestionTags();

  return (
    <Space wrap style={{ marginBottom: 12 }}>
      <Input.Search
        placeholder="Search stem"
        allowClear
        style={{ width: 200 }}
        onSearch={(v) => onChange({ search: v || undefined })}
      />
      <Select
        placeholder="Subject" allowClear style={{ width: 180 }} value={filters.subjectId}
        onChange={(v) => onChange({ subjectId: v ?? undefined, topicId: undefined })}
        options={subjects?.map((s) => ({ value: s.id, label: taxonomyLabel(s) }))}
      />
      <Select
        placeholder="Topic" allowClear style={{ width: 180 }} value={filters.topicId}
        disabled={!filters.subjectId}
        onChange={(v) => onChange({ topicId: v ?? undefined })}
        options={topics?.map((t) => ({ value: t.id, label: taxonomyLabel(t) }))}
      />
      <Select
        placeholder="Difficulty" allowClear style={{ width: 130 }} value={filters.difficulty}
        onChange={(v) => onChange({ difficulty: v ?? undefined })}
        options={[
          { value: "easy", label: "Easy" },
          { value: "medium", label: "Medium" },
          { value: "hard", label: "Hard" },
        ]}
      />
      <Select
        placeholder="Language" allowClear style={{ width: 130 }} value={filters.language}
        onChange={(v) => onChange({ language: v ?? undefined })}
        options={[
          { value: "bn", label: "বাংলা" },
          { value: "en", label: "English" },
        ]}
      />
      <Select
        mode="multiple" placeholder="Tags" allowClear style={{ minWidth: 160 }}
        value={filters.tags}
        onChange={(v) => onChange({ tags: v.length ? v : undefined })}
        options={tags?.map((t) => ({ value: t, label: t }))}
      />
    </Space>
  );
}

type BrowseTabProps = { existingIds: string[]; onAdd: (questions: DraftQuestion[]) => void };

function BrowseTab({ existingIds, onAdd }: BrowseTabProps) {
  const [filters, setFilters] = useState<PickerFilters>({});
  const [page, setPage] = useState(1);
  const listFilters: QuestionListFilters = {
    page, pageSize: 10, status: "active", ...filters,
  };
  const { data, isLoading } = useQuestions(listFilters);

  const columns: ColumnsType<QuestionSummary> = [
    {
      title: "Question",
      render: (_, r) => (
        <>
          <Typography.Text>{r.stemExcerpt}</Typography.Text>
          <br />
          <Space size="small" wrap>
            <Tag color={DIFFICULTY_COLORS[r.difficulty]}>{r.difficulty}</Tag>
            <Tag>{r.language}</Tag>
            {r.multipleCorrect && <Tag>multi-correct</Tag>}
            {r.tags.map((t) => <Tag key={t}>{t}</Tag>)}
          </Space>
        </>
      ),
    },
    {
      title: "", width: 90,
      render: (_, r) =>
        existingIds.includes(r.id) ? (
          <Tag color="blue">added</Tag>
        ) : (
          <Button size="small" type="primary" ghost onClick={() => onAdd([toDraftQuestion(r)])}>
            Add
          </Button>
        ),
    },
  ];

  return (
    <>
      <FilterBar
        filters={filters}
        onChange={(patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); }}
      />
      <Table<QuestionSummary>
        rowKey="id"
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={data?.items}
        pagination={{
          current: data?.page ?? page,
          pageSize: 10,
          total: data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />
    </>
  );
}

type RandomTabProps = { existingIds: string[]; onAdd: (questions: DraftQuestion[]) => void };

function RandomTab({ existingIds, onAdd }: RandomTabProps) {
  const [filters, setFilters] = useState<PickerFilters>({});
  const [count, setCount] = useState(10);
  const sample = useSampleQuestions();

  const fill = async () => {
    try {
      const drawn = await sample.mutateAsync({
        count,
        subjectId: filters.subjectId ?? null,
        topicId: filters.topicId ?? null,
        difficulty: filters.difficulty ?? null,
        language: filters.language ?? null,
        tags: filters.tags ?? [],
        excludeIds: existingIds,
      });
      if (drawn.length === 0) {
        message.warning("No matching questions left to draw from");
        return;
      }
      onAdd(drawn.map(toDraftQuestion));
      if (drawn.length < count) {
        message.info(`Only ${drawn.length} matching questions were available`);
      } else {
        message.success(`${drawn.length} questions added`);
      }
    } catch {
      message.error("Random fill failed");
    }
  };

  return (
    <>
      <FilterBar filters={filters} onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))} />
      <Space>
        <Typography.Text>Draw</Typography.Text>
        <InputNumber min={1} max={50} value={count} onChange={(v) => setCount(v ?? 10)} />
        <Typography.Text>random matching questions (already-added ones are excluded)</Typography.Text>
        <Button type="primary" loading={sample.isPending} onClick={() => void fill()}>
          Random fill
        </Button>
      </Space>
    </>
  );
}

type QuestionPickerDrawerProps = {
  open: boolean;
  initialTab: "browse" | "random";
  existingIds: string[];
  onAdd: (questions: DraftQuestion[]) => void;
  onClose: () => void;
};

export function QuestionPickerDrawer({
  open, initialTab, existingIds, onAdd, onClose,
}: QuestionPickerDrawerProps) {
  return (
    <Drawer
      title="Add questions"
      width={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Tabs
        defaultActiveKey={initialTab}
        items={[
          {
            key: "browse",
            label: "Browse bank",
            children: <BrowseTab existingIds={existingIds} onAdd={onAdd} />,
          },
          {
            key: "random",
            label: "Random fill",
            children: <RandomTab existingIds={existingIds} onAdd={onAdd} />,
          },
        ]}
      />
    </Drawer>
  );
}
