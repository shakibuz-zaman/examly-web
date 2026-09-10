import { useState } from "react";
import {
  Button, Drawer, Input, InputNumber, Select, Space, Table, Tabs, Tag, Typography, message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuestionTags, useQuestions, useSampleQuestions } from "../../api/questions";
import { useSubjects, useTopics } from "../../api/taxonomy";
import { bnNum } from "../../lib/bn";
import { bilingualLabel, DIFFICULTY, LANGUAGE } from "../../lib/labels";
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

// The drawer's own filter bar is a copy of the questions list's, so it reuses that page's
// vocabulary rather than a second one: `bilingualLabel` (Bengali-first, D17 — the old
// «bn — en» combo here was the half-translation D17 retired) and the shared DIFFICULTY /
// LANGUAGE maps. `item.slug` stays as the last resort: bilingualLabel's own fallback is «—»,
// which is unpickable in a Select, and a taxonomy node always has a slug.
function taxonomyLabel(item: SubjectResponse | TopicResponse): string {
  const label = bilingualLabel(item.name);
  return label === "—" ? item.slug : label;
}

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

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
        placeholder="প্রশ্নের লেখা খুঁজুন"
        allowClear
        style={{ width: 200 }}
        onSearch={(v) => onChange({ search: v || undefined })}
      />
      {/* Same rule the InputNumber below already records and the 7f OrgDashboard pass
          settled: a `placeholder` is not an accessible name, so these five combo boxes
          announced as unlabelled — five of them, side by side, in a drawer. antd v6 forwards
          aria-* to the inner role="combobox" input, so the attribute is the whole fix. */}
      <Select
        aria-label="বিষয় ফিল্টার"
        placeholder="বিষয়" allowClear style={{ width: 180 }} value={filters.subjectId}
        onChange={(v) => onChange({ subjectId: v ?? undefined, topicId: undefined })}
        options={subjects?.map((s) => ({ value: s.id, label: taxonomyLabel(s) }))}
      />
      <Select
        aria-label="টপিক ফিল্টার"
        placeholder="টপিক" allowClear style={{ width: 180 }} value={filters.topicId}
        disabled={!filters.subjectId}
        onChange={(v) => onChange({ topicId: v ?? undefined })}
        options={topics?.map((t) => ({ value: t.id, label: taxonomyLabel(t) }))}
      />
      <Select
        aria-label="কঠিনতা ফিল্টার"
        placeholder="কঠিনতা" allowClear style={{ width: 130 }} value={filters.difficulty}
        onChange={(v) => onChange({ difficulty: v ?? undefined })}
        options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY[d] }))}
      />
      <Select
        aria-label="ভাষা ফিল্টার"
        placeholder="ভাষা" allowClear style={{ width: 130 }} value={filters.language}
        onChange={(v) => onChange({ language: v ?? undefined })}
        options={Object.entries(LANGUAGE).map(([value, label]) => ({ value, label }))}
      />
      <Select
        mode="multiple" aria-label="ট্যাগ ফিল্টার" placeholder="ট্যাগ" allowClear style={{ minWidth: 160 }}
        value={filters.tags}
        onChange={(v) => onChange({ tags: v.length ? v : undefined })}
        options={tags?.map((t) => ({ value: t, label: t }))}
      />
    </Space>
  );
}

type BrowseTabProps = {
  existingIds: string[];
  onAdd: (questions: DraftQuestion[]) => void;
  // Spec A3: the "not in the bank yet" escape hatch. Rendered only when provided.
  onAuthor?: () => void;
};

function BrowseTab({ existingIds, onAdd, onAuthor }: BrowseTabProps) {
  const [filters, setFilters] = useState<PickerFilters>({});
  const [page, setPage] = useState(1);
  const listFilters: QuestionListFilters = {
    page, pageSize: 10, status: "active", ...filters,
  };
  const { data, isLoading } = useQuestions(listFilters);

  const columns: ColumnsType<QuestionSummary> = [
    {
      title: "প্রশ্ন",
      render: (_, r) => (
        <>
          <Typography.Text>{r.stemExcerpt}</Typography.Text>
          <br />
          <Space size="small" wrap>
            {/* Tags carry the same words the questions list prints, through the same maps —
                the raw wire keys («easy», «bn») were leaking to screen here. Free-form
                `r.tags` are the examiner's own strings and stay verbatim. */}
            <Tag color={DIFFICULTY_COLORS[r.difficulty]}>
              {DIFFICULTY[r.difficulty] ?? r.difficulty}
            </Tag>
            <Tag>{LANGUAGE[r.language] ?? r.language}</Tag>
            {r.multipleCorrect && <Tag>একাধিক সঠিক</Tag>}
            {r.tags.map((t) => <Tag key={t}>{t}</Tag>)}
          </Space>
        </>
      ),
    },
    {
      title: "", width: 90,
      render: (_, r) =>
        existingIds.includes(r.id) ? (
          <Tag color="blue">যোগ করা হয়েছে</Tag>
        ) : (
          <Button size="small" type="primary" ghost onClick={() => onAdd([toDraftQuestion(r)])}>
            যোগ করুন
          </Button>
        ),
    },
  ];

  return (
    <>
      {onAuthor && (
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          খুঁজে পাচ্ছেন না?{" "}
          <Typography.Link onClick={onAuthor}>নতুন প্রশ্ন লিখুন</Typography.Link>
        </Typography.Paragraph>
      )}
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
        message.warning("এই ফিল্টারে আর কোনো প্রশ্ন বাকি নেই");
        return;
      }
      onAdd(drawn.map(toDraftQuestion));
      if (drawn.length < count) {
        message.info(`এই ফিল্টারে ${bnNum(drawn.length)}টি প্রশ্নই পাওয়া গেছে`);
      } else {
        message.success(`${bnNum(drawn.length)}টি প্রশ্ন যোগ হয়েছে`);
      }
    } catch {
      message.error("এলোমেলো প্রশ্ন নেওয়া যায়নি");
    }
  };

  return (
    <>
      <FilterBar filters={filters} onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))} />
      <Space>
        {/* The number box is a control with no visible label of its own once the sentence
            around it is Bengali, so it carries one for AT. */}
        <InputNumber
          min={1} max={50} value={count} onChange={(v) => setCount(v ?? 10)}
          aria-label="কতটি প্রশ্ন নেওয়া হবে"
        />
        <Typography.Text>টি প্রশ্ন এলোমেলোভাবে নিন (যেগুলো যোগ করা আছে সেগুলো বাদ)</Typography.Text>
        <Button type="primary" loading={sample.isPending} onClick={() => void fill()}>
          এলোমেলো ভরাট
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
  // Spec A3: hosts that can author pass this; the browse tab links to it.
  onAuthor?: () => void;
};

export function QuestionPickerDrawer({
  open, initialTab, existingIds, onAdd, onClose, onAuthor,
}: QuestionPickerDrawerProps) {
  return (
    <Drawer
      title="প্রশ্ন যোগ করুন"
      size={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Tabs
        defaultActiveKey={initialTab}
        items={[
          {
            key: "browse",
            label: "ব্যাংক ঘাঁটুন",
            children: <BrowseTab existingIds={existingIds} onAdd={onAdd} onAuthor={onAuthor} />,
          },
          {
            key: "random",
            label: "এলোমেলো ভরাট",
            children: <RandomTab existingIds={existingIds} onAdd={onAdd} />,
          },
        ]}
      />
    </Drawer>
  );
}
