import { lazy, Suspense, useState } from "react";
import { Skeleton, Table, Tabs, Tag, Typography } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { useExam, useExamResults } from "../api/exams";
import { formatClock, formatDhakaShortBn } from "../lib/format";
import { bnNum } from "../lib/bn";
import { ATTEMPT_STATUS } from "../lib/labels";
import type { AttemptState, ExamResultRow } from "../api/types";
import { AttemptBreakdownDrawer } from "../features/analytics/examiner/AttemptBreakdownDrawer";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";
import { RetryNotice } from "../ui/RetryNotice";
import { StatTile } from "../ui/StatTile";
import { ATTEMPT_STATUS_COLORS } from "../theme/status";

// Keeps recharts out of the main bundle — the tab's chunk loads on first open.
const ExamAnalyticsTab = lazy(() =>
  import("../features/analytics/examiner/ExamAnalyticsTab").then((m) => ({
    default: m.ExamAnalyticsTab,
  })));

const PAGE_SIZE = 20;

type ResultsTab = "ranked" | "practice" | "analytics";

// What each tab's cohort actually is, said once under the tab strip. The old English labels
// carried it inline («Ranked (first attempts)»); the spec's labels are the bare words, so the
// qualifier moves here rather than being dropped — «প্র্যাকটিস» is NOT just retakes (the
// server also files post-window first starts here, AttemptService.cs:894) and a reader who
// assumes otherwise will read a short practice list as "nobody retook it".
// Keyed to the two TABLE tabs only, not to ResultsTab — the analytics tab renders its own
// component and never reads this. TS narrows `tab` inside the non-analytics branch below, so
// the map needs no dead third entry to type-check.
const TAB_NOTE: Record<Exclude<ResultsTab, "analytics">, string> = {
  ranked: "প্রতিটি শিক্ষার্থীর প্রথম অ্যাটেম্পট — র‍্যাঙ্ক এখান থেকেই হিসাব হয়।",
  practice: "রিটেক আর উইন্ডো শেষ হওয়ার পরে শুরু করা অ্যাটেম্পট — কোনোটিই র‍্যাঙ্কে গোনা হয় না।",
};

export function ExamResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ResultsTab>("ranked");
  const [page, setPage] = useState(1);
  const [drawerRow, setDrawerRow] = useState<ExamResultRow | null>(null);

  const { data: exam } = useExam(id);
  const results = useExamResults(id, page, PAGE_SIZE, tab === "practice");
  const data = results.data;
  // `useExamResults` keeps the previous slice mounted across a page step or a tab flip, so
  // `data` is not always this tab's answer. Everything that makes a CLAIM about the current
  // cohort — the three tiles, the header count, the table's empty text — is gated on this;
  // the rows themselves stay on screen under the house saturate(.35)+aria-busy stale cue,
  // which is the same bargain OrgDashboard struck with its filter row.
  const stale = results.isPlaceholderData;

  const columns: ColumnsType<ExamResultRow> = [
    // Kept as the glyph, not a word: «#» is the rank column on the ranked tab only (practice
    // rows carry rank === null), and D8's Western digits apply to the value under it.
    ...(tab === "ranked"
      ? [{
          title: "#", dataIndex: "rank", width: 60, className: "ex-num",
        } as ColumnsType<ExamResultRow>[number]]
      : []),
    {
      title: "শিক্ষার্থী",
      dataIndex: "studentName",
      // The attempt ordinal only earns a line when it is not the first one — on the ranked
      // tab it is always 1, and on practice it is the fact that distinguishes two rows with
      // the same name. Western digits after «#» is the ratified identifier exception.
      render: (name: string, row) =>
        row.attemptNumber > 1 ? (
          <>
            {name}
            <div style={{ fontSize: 11, color: "var(--ex-ink-soft)" }}>
              অ্যাটেম্পট #<span className="ex-num">{row.attemptNumber}</span>
            </div>
          </>
        ) : (
          name
        ),
    },
    {
      title: "স্ট্যাটাস",
      dataIndex: "status",
      width: 110,
      // antd `Tag` rather than the house `ContentStatusChip`: that chip's four tints are the
      // CONTENT vocabulary (খসড়া/সক্রিয়/প্রকাশিত/আর্কাইভড) and an attempt state is a different
      // axis — borrowing the tints would make a re-tint of exam status silently re-tint this.
      // The label is the shared ATTEMPT_STATUS map, so it never drifts from the student side.
      // `typeof === "string"` and not truthiness, the same guard ContentStatusChip carries:
      // both maps are plain object literals, so an unexpected wire value like "constructor"
      // resolves through Object.prototype to a FUNCTION — truthy, and handing React a
      // function as a child throws. The raw key is the honest fallback.
      render: (s: AttemptState) => {
        const label = ATTEMPT_STATUS[s];
        const color = ATTEMPT_STATUS_COLORS[s];
        return (
          <Tag color={typeof color === "string" ? color : "default"}>
            {typeof label === "string" ? label : s}
          </Tag>
        );
      },
    },
    {
      title: "স্কোর",
      dataIndex: "score",
      width: 110,
      className: "ex-num",
      render: (_, row) => (row.score === null ? "—" : `${row.score} / ${row.maxScore}`),
    },
    {
      // The ratified tally header — Western digits, middle dots, no per-part column.
      title: "সঠিক · ভুল · খালি",
      key: "cwb",
      width: 130,
      className: "ex-num",
      render: (_, row) =>
        row.correct === null ? "—" : `${row.correct} · ${row.wrong} · ${row.unanswered}`,
    },
    {
      title: "সময়",
      dataIndex: "timeTakenSeconds",
      width: 90,
      className: "ex-num",
      render: (s: number | null) => (s === null ? "—" : formatClock(s)),
    },
    {
      title: "জমা",
      dataIndex: "submittedAt",
      width: 150,
      // Was `formatDateTime` — the browser's own locale AND timezone, so an examiner abroad
      // read a different submission time than the student who sat the exam. Dhaka-pinned
      // Bengali now, the same formatter every other examiner table uses (T7 precedent).
      render: (d: string | null) => (
        <span style={{ whiteSpace: "nowrap" }}>{d ? formatDhakaShortBn(d) : "—"}</span>
      ),
    },
  ];

  // The count is per-tab (the server answers a different total for practice), so the summary
  // names which one it is instead of printing a bare number that changes under the reader.
  // …and it is dropped while stale rather than desaturated: `tab` flips instantly while the
  // total lags a fetch behind, so a placeholder would print «প্র্যাকটিস ৪২টি» with the ranked
  // 42 — a sentence that names the wrong cohort is worse than no sentence.
  const total = data?.total;
  const summary =
    total == null || stale
      ? undefined
      : `${tab === "practice" ? "প্র্যাকটিস" : "র‍্যাঙ্কড"} ${bnNum(total)}টি অ্যাটেম্পট`;

  return (
    <>
      <PageHeader
        title={exam?.title ?? "ফলাফল"}
        summary={summary}
        actions={
          <PillButton variant="ghost" onClick={() => navigate("/exams")}>
            ফিরে যান
          </PillButton>
        }
      />

      {/* Ranked only, and not out of taste: the practice branch of GetExamResultsAsync sends
          participants 0 and both aggregates null (AttemptService.cs:926), so a tile row on
          that tab would assert «০ জন অংশগ্রহণকারী» over a table with rows in it. `!stale` for
          the same reason one step further out: flipping প্র্যাকটিস → র‍্যাঙ্কড satisfies
          `tab === "ranked"` immediately while `data` is still the practice slice, whose
          participants IS 0 and whose aggregates ARE null by construction. */}
      {tab === "ranked" && data && !stale && (
        <div className="ex-stattiles ex-stattiles--3">
          <StatTile label="অংশগ্রহণকারী" value={bnNum(data.participants)} />
          <StatTile
            label="গড় স্কোর"
            value={data.averageScore === null ? "—" : bnNum(data.averageScore)}
          />
          <StatTile
            label="সর্বোচ্চ স্কোর"
            value={data.topScore === null ? "—" : bnNum(data.topScore)}
          />
        </div>
      )}

      <Tabs
        activeKey={tab}
        onChange={(key) => {
          setTab(key as ResultsTab);
          setPage(1);
        }}
        items={[
          { key: "ranked", label: "র‍্যাঙ্কড" },
          { key: "practice", label: "প্র্যাকটিস" },
          { key: "analytics", label: "অ্যানালাইসিস" },
        ]}
      />

      {tab === "analytics" ? (
        <Suspense fallback={<Skeleton active paragraph={{ rows: 6 }} />}>
          <ExamAnalyticsTab examId={id!} />
        </Suspense>
      ) : (
        <>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: -4 }}>
            {TAB_NOTE[tab]}
          </Typography.Paragraph>
          {/* Three states, not two — the same shape OrgDashboard settled on. `loading` on the
              Table alone left a failed fetch sitting on an empty grid that reads as "nobody
              sat this exam", which is the one thing a results page must never say by accident.
              The branch keys on `!data`, never `isError`: a same-key refetch failure keeps the
              rows we already hold, and those stay on screen under the strip. */}
          {results.isPending ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : !data ? (
            <RetryNotice
              tone="panel"
              busy={results.isFetching}
              onRetry={() => void results.refetch()}
            />
          ) : (
            <>
              {results.isError && (
                <RetryNotice
                  tone="strip"
                  busy={results.isFetching}
                  onRetry={() => void results.refetch()}
                />
              )}
              {/* The stale cue wraps the table rather than riding on it: `saturate`, never
                  opacity (house rule), and aria-busy so the same fact reaches AT. Because the
                  slice is held, the pagination control stays MOUNTED across a page step —
                  before keepPreviousData the whole block unmounted behind a skeleton and the
                  pager disappeared out from under the click that moved it. */}
              <div
                style={{ filter: stale ? "saturate(0.35)" : undefined, transition: "filter .2s" }}
                aria-busy={stale}
              >
                <Table
                  size="small"
                  rowKey="attemptId"
                  columns={columns}
                  dataSource={data.items}
                  // antd's own empty text is a generic «no data», which on this page reads as
                  // "nobody sat this exam" — and on placeholder data it would be reporting the
                  // OTHER tab's emptiness. Named per state instead.
                  locale={{ emptyText: stale ? "লোড হচ্ছে…" : "এই তালিকায় কোনো অ্যাটেম্পট নেই।" }}
                  onRow={(record) => ({
                    onClick: () => setDrawerRow(record),
                    style: { cursor: "pointer" },
                  })}
                  pagination={{
                    current: page,
                    pageSize: PAGE_SIZE,
                    total: data.total,
                    onChange: setPage,
                    showSizeChanger: false,
                  }}
                  scroll={{ x: true }}
                />
              </div>
            </>
          )}
        </>
      )}

      <AttemptBreakdownDrawer
        examId={id!}
        row={drawerRow}
        onClose={() => setDrawerRow(null)}
      />
    </>
  );
}
