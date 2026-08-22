import { App, Button, Card, Input, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useArchiveQuestion, useCloneQuestion, useQuestions, useQuestionTags, useRestoreQuestion,
} from "../api/questions";
import { useSubjects, useTopics } from "../api/taxonomy";
import type { QuestionListFilters, QuestionSummary } from "../api/types";
import { bnNum } from "../lib/bn";
import { formatDhakaShortBn } from "../lib/format";
import { bilingualLabel, CONTENT_STATUS, DIFFICULTY, LANGUAGE } from "../lib/labels";
import { FilterChips, type FilterChipItem } from "../ui/FilterChips";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";
import { ContentStatusChip, DifficultyDot } from "../ui/StatusChip";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
// «সব» is not a status — it is the absence of the filter, so it carries no wire key.
const STATUSES = ["draft", "active", "archived"] as const;

export function QuestionsListPage() {
  // The themed instance, not the `message` module static: AppShell mounts antd's `App` inside
  // the examiner ConfigProvider, and the plan's statics rule puts every page it touches on it.
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  // Seeded once from the URL (6b's weakest-topics links land here with subjectId/topicId).
  // Deliberately NOT synced back to the URL afterwards — that behaviour predates 7f.
  const [filters, setFilters] = useState<QuestionListFilters>(() => ({
    page: 1,
    pageSize: 20,
    subjectId: searchParams.get("subjectId") ?? undefined,
    topicId: searchParams.get("topicId") ?? undefined,
  }));
  const navigate = useNavigate();

  const { data, isPending } = useQuestions(filters);
  const { data: subjects } = useSubjects("examiner");
  const { data: topics } = useTopics("examiner", filters.subjectId ?? null);
  const { data: tagOptions } = useQuestionTags();
  const archive = useArchiveQuestion();
  const restore = useRestoreQuestion();
  const clone = useCloneQuestion();

  // `!= null` is the "answered" test, not truthiness: an org with no subjects answers `[]`,
  // which is a loaded taxonomy and must not keep the select in its loading state forever.
  const subjectsLoaded = subjects != null;
  const topicsLoaded = topics != null;

  const subjectNames = useMemo(
    () => new Map((subjects ?? []).map((s) => [s.id, bilingualLabel(s.name)])),
    [subjects],
  );

  const set = (patch: Partial<QuestionListFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));

  // No per-status counts on the chips: `QuestionListResponse` carries `total` for the CURRENT
  // filter only (types.ts:116), so counting all four states would cost three extra requests
  // per keystroke. Plain chips until the API offers a facet count.
  const statusChips: FilterChipItem[] = [
    {
      key: "all",
      label: "সব",
      selected: !filters.status,
      onClick: () => set({ status: undefined }),
    },
    ...STATUSES.map((s) => ({
      key: s,
      label: CONTENT_STATUS[s],
      selected: filters.status === s,
      // Re-clicking the active chip clears back to «সব» rather than being a no-op.
      onClick: () => set({ status: filters.status === s ? undefined : s }),
    })),
  ];

  const total = data?.total;
  const filtered = Boolean(
    filters.search || filters.subjectId || filters.topicId || filters.difficulty ||
    filters.language || filters.status || filters.tags?.length,
  );
  // `total` is the filtered total the server just answered, so the copy must say which one it
  // is — «মোট» on an unfiltered list would be a lie the moment any chip or select is set.
  const summary =
    total == null
      ? undefined
      : filtered
        ? `ফিল্টার অনুযায়ী ${bnNum(total)}টি প্রশ্ন`
        : `মোট ${bnNum(total)}টি প্রশ্ন`;

  const columns: ColumnsType<QuestionSummary> = [
    {
      title: "প্রশ্ন",
      dataIndex: "stemExcerpt",
      render: (text: string) => (
        <Typography.Text style={{ maxWidth: 380 }} ellipsis={{ tooltip: text }}>
          {text}
        </Typography.Text>
      ),
    },
    {
      title: "বিষয়",
      dataIndex: "subjectId",
      width: 170,
      render: (id: string | null) => (id ? subjectNames.get(id) ?? "—" : "—"),
    },
    {
      title: "কঠিনতা",
      dataIndex: "difficulty",
      width: 110,
      render: (d: QuestionSummary["difficulty"]) => <DifficultyDot difficulty={d} />,
    },
    {
      title: "ভাষা",
      dataIndex: "language",
      width: 90,
      render: (l: string) => <Tag>{LANGUAGE[l] ?? l}</Tag>,
    },
    {
      title: "স্ট্যাটাস",
      dataIndex: "status",
      width: 110,
      render: (s: QuestionSummary["status"]) => <ContentStatusChip status={s} />,
    },
    {
      title: "ট্যাগ",
      dataIndex: "tags",
      render: (tags: string[]) => tags.map((t) => <Tag key={t}>{t}</Tag>),
    },
    {
      title: "হালনাগাদ",
      dataIndex: "updatedAt",
      width: 150,
      // Dhaka-pinned Bengali prose, not `toLocaleString()`: the old call rendered in whatever
      // locale and timezone the examiner's browser happened to carry. D8 keeps Western digits
      // for dense numeric columns (scores, percentages, counts, money) — a datetime is prose.
      render: (d: string) => formatDhakaShortBn(d),
    },
    {
      title: "অ্যাকশন",
      key: "actions",
      width: 210,
      render: (_, row) =>
        row.status === "archived" ? (
          <Button
            type="link"
            size="small"
            onClick={() =>
              restore.mutate(row.id, {
                onSuccess: () => message.success("প্রশ্ন ফিরিয়ে আনা হয়েছে"),
                // Every one of these three mutations used to fail SILENTLY: the row simply
                // did not change and nothing said why. The server's own sentence leads
                // (Bengali since T7 for the examiner-reachable gates); the fallback is the
                // only half this page owns, and it names the action that failed.
                onError: (e) => message.error(serverError(e, "প্রশ্ন ফিরিয়ে আনা যায়নি")),
              })
            }
          >
            ফিরিয়ে আনুন
          </Button>
        ) : (
          <Space size={0}>
            <Button type="link" size="small" onClick={() => navigate(`/questions/${row.id}`)}>
              সম্পাদনা
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() =>
                clone.mutate(row.id, {
                  onSuccess: (q) => {
                    message.success("খসড়া হিসেবে কপি হয়েছে");
                    navigate(`/questions/${q.id}`);
                  },
                  onError: (e) => message.error(serverError(e, "প্রশ্ন কপি করা যায়নি")),
                })
              }
            >
              ক্লোন
            </Button>
            <Popconfirm
              title="আর্কাইভ করবেন?"
              okText="হ্যাঁ"
              cancelText="না"
              onConfirm={() =>
                archive.mutate(row.id, {
                  onSuccess: () => message.success("প্রশ্ন আর্কাইভ হয়েছে"),
                  onError: (e) => message.error(serverError(e, "আর্কাইভ করা যায়নি")),
                })
              }
            >
              <Button type="link" size="small" danger>
                আর্কাইভ
              </Button>
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="প্রশ্ন"
        summary={summary}
        actions={
          <PillButton variant="primary" onClick={() => navigate("/questions/new")}>
            নতুন প্রশ্ন
          </PillButton>
        }
      />

      <Card>
        <div className="ex-filterrow" style={{ marginTop: 0 }}>
          <FilterChips items={statusChips} />
        </div>

        <Space wrap style={{ margin: "12px 0 16px" }}>
          <Input.Search
            placeholder="প্রশ্নের লেখা খুঁজুন"
            allowClear
            style={{ width: 220 }}
            onSearch={(v) => set({ search: v || undefined })}
          />
          {/* A `placeholder` is not an accessible name — cleared, these five combo boxes
              announce as unlabelled and are indistinguishable from one another. `aria-label`
              is the lever the 7f OrgDashboard pass settled on: antd v6 forwards aria-* to the
              inner role="combobox" input rather than the wrapper div. */}
          <Select
            aria-label="বিষয় ফিল্টার"
            placeholder="বিষয়"
            allowClear
            style={{ width: 200 }}
            loading={!subjectsLoaded}
            options={(subjects ?? []).map((s) => ({ value: s.id, label: bilingualLabel(s.name) }))}
            // Withholding the value until the options land is the whole fix for the
            // raw-ObjectId flash on a URL-seeded prefilter: antd falls back to printing the
            // bare value when no option matches it, so `/questions?subjectId=<24-hex>` used to
            // show the ObjectId for one paint. The filter itself is untouched — `filters`
            // still carries the id and the query still sends it.
            value={subjectsLoaded ? filters.subjectId : undefined}
            onChange={(v) => set({ subjectId: v ?? undefined, topicId: undefined })}
          />
          <Select
            aria-label="টপিক ফিল্টার"
            placeholder="টপিক"
            allowClear
            disabled={!filters.subjectId}
            style={{ width: 200 }}
            loading={Boolean(filters.subjectId) && !topicsLoaded}
            options={(topics ?? []).map((t) => ({ value: t.id, label: bilingualLabel(t.name) }))}
            value={topicsLoaded ? filters.topicId : undefined}
            onChange={(v) => set({ topicId: v ?? undefined })}
          />
          <Select
            aria-label="কঠিনতা ফিল্টার"
            placeholder="কঠিনতা"
            allowClear
            style={{ width: 130 }}
            options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY[d] }))}
            value={filters.difficulty}
            onChange={(v) => set({ difficulty: v ?? undefined })}
          />
          <Select
            aria-label="ভাষা ফিল্টার"
            placeholder="ভাষা"
            allowClear
            style={{ width: 120 }}
            options={Object.entries(LANGUAGE).map(([value, label]) => ({ value, label }))}
            value={filters.language}
            onChange={(v) => set({ language: v ?? undefined })}
          />
          <Select
            mode="multiple"
            aria-label="ট্যাগ ফিল্টার"
            placeholder="ট্যাগ"
            allowClear
            style={{ minWidth: 160 }}
            options={(tagOptions ?? []).map((t) => ({ value: t, label: t }))}
            value={filters.tags}
            onChange={(v) => set({ tags: v.length ? v : undefined })}
          />
        </Space>

        <Table<QuestionSummary>
          rowKey="id"
          loading={isPending}
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
    </>
  );
}
