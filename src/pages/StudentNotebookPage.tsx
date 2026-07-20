import { useState } from "react";
import { Alert, Button, Pagination, Segmented, Skeleton, Space, Tag, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { NOTEBOOK_PAGE_SIZE, useNotebook } from "../api/notebook";
import { useStartPractice } from "../api/practice";
import { useActiveTrack } from "../features/tracks/TrackContext";
import { QuestionRevealCard } from "../features/qbank/QuestionRevealCard";
import { Illustration } from "../components/Illustration";
import { bnNum } from "../lib/bn";
import type { NotebookEntry } from "../api/types";

type SubjectChip = { id: string; label: string };

// Distinct subjects across the loaded entries, first-seen order. Chips are built
// client-side (spec): entries carry subjectName inline, and deriving chips from the
// loaded set means the whole status bucket loads at once so the chip row stays stable
// regardless of which subject is selected.
function distinctSubjects(entries: NotebookEntry[]): SubjectChip[] {
  const seen = new Map<string, SubjectChip>();
  for (const e of entries) {
    if (e.subjectId && e.subjectName && !seen.has(e.subjectId)) {
      const label = e.subjectName.bn || e.subjectName.en;
      if (label) seen.set(e.subjectId, { id: e.subjectId, label });
    }
  }
  return [...seen.values()];
}

// Group by topic in first-seen order; entries without a topic collapse into "অন্যান্য".
function groupByTopic(entries: NotebookEntry[]): { key: string; label: string; entries: NotebookEntry[] }[] {
  const groups = new Map<string, { label: string; entries: NotebookEntry[] }>();
  for (const e of entries) {
    const key = e.topicId ?? "__other__";
    const label = e.topicName?.bn || e.topicName?.en || "অন্যান্য";
    const bucket = groups.get(key);
    if (bucket) bucket.entries.push(e);
    else groups.set(key, { label, entries: [e] });
  }
  return [...groups.entries()].map(([key, g]) => ({ key, ...g }));
}

// Chip idiom mirrors the qbank pages (Task 10); a third local copy is acceptable per brief.
function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={{
        flex: "0 0 auto",
        border: "1.5px solid",
        borderRadius: 999,
        padding: "5px 14px",
        fontSize: 14,
        cursor: "pointer",
        background: selected ? "var(--ex-teal-tint)" : "var(--ex-card)",
        borderColor: selected ? "var(--ex-teal)" : "var(--ex-line-strong)",
        color: selected ? "var(--ex-teal-ink)" : "var(--ex-ink)",
        fontWeight: selected ? 600 : 400,
        transition: "background .15s, border-color .15s",
      }}
    >
      {label}
    </button>
  );
}

function EntryHeader({ entry }: { entry: NotebookEntry }) {
  const subjectLabel = entry.subjectName?.bn || entry.subjectName?.en;
  return (
    <Space size={8} wrap style={{ marginBottom: 8 }}>
      <Tag color="red">{bnNum(entry.wrongCount)} বার ভুল</Tag>
      {entry.due && <Tag color="gold">ডিউ</Tag>}
      {subjectLabel && <Typography.Text type="secondary">{subjectLabel}</Typography.Text>}
    </Space>
  );
}

export function StudentNotebookPage() {
  const navigate = useNavigate();
  const { activeTrackId } = useActiveTrack();
  const start = useStartPractice();
  const [status, setStatus] = useState<"active" | "resolved">("active");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Server now paginates (20/page); subject narrowing stays client-side (subjectId not
  // sent to the server) but only sees the current page's entries — see the grouping note.
  const { data, isLoading, isError, refetch } = useNotebook({
    status,
    subjectId: null,
    trackId: activeTrackId,
    page,
  });

  // activeTrackId null = tracks still resolving; the query is disabled, so show a skeleton.
  const loading = activeTrackId == null || isLoading;

  const activeCount = data?.activeCount ?? 0;
  const dueCount = data?.dueCount ?? 0;
  const total = data?.total ?? 0;
  const entries = data?.entries ?? [];
  const subjects = distinctSubjects(entries);

  // A stale subject selection (after toggling status) falls back to all rather than
  // filtering everything away.
  const activeSubject = subjectId && subjects.some((s) => s.id === subjectId) ? subjectId : null;
  const filtered = activeSubject ? entries.filter((e) => e.subjectId === activeSubject) : entries;
  const groups = groupByTopic(filtered);

  return (
    <div style={{ paddingBottom: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Typography.Title level={3} style={{ marginBottom: 0, color: "var(--ex-ink)" }}>
            ভুলের খাতা
          </Typography.Title>
          {dueCount > 0 && (
            <Typography.Text type="secondary">{bnNum(dueCount)}টি প্রশ্ন ডিউ</Typography.Text>
          )}
        </div>
        <Button
          type="primary"
          loading={start.isPending}
          disabled={activeCount === 0 || !activeTrackId}
          onClick={() =>
            start.mutate(
              { source: "notebook", trackId: activeTrackId! },
              {
                onSuccess: (s) => navigate(`/student/practice/${s.id}`),
                onError: () => message.error("প্র্যাকটিস শুরু করা যায়নি"),
              },
            )
          }
        >
          এগুলো প্র্যাকটিস করি
        </Button>
      </div>

      <Segmented
        style={{ margin: "12px 0" }}
        value={status}
        onChange={(v) => {
          setStatus(v as "active" | "resolved");
          setPage(1); // new bucket → back to the first page
        }}
        options={[
          { label: "সক্রিয়", value: "active" },
          { label: "সমাধান হয়েছে", value: "resolved" },
        ]}
      />

      {subjects.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 8,
            marginBottom: 8,
          }}
        >
          <Chip
            label="সব"
            selected={activeSubject === null}
            onClick={() => {
              setSubjectId(null);
              setPage(1); // new subject filter → back to the first page
            }}
          />
          {subjects.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              selected={activeSubject === s.id}
              onClick={() => {
                setSubjectId(s.id);
                setPage(1); // new subject filter → back to the first page
              }}
            />
          ))}
        </div>
      )}

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : isError ? (
        <Alert
          type="error"
          showIcon
          title="ভুলের খাতা লোড করা যায়নি"
          action={
            <Button size="small" onClick={() => refetch()}>
              আবার চেষ্টা করুন
            </Button>
          }
        />
      ) : entries.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center" }}>
          <Illustration name={status === "active" ? "success" : "empty"} />
          <Typography.Paragraph style={{ marginTop: 12, color: "var(--ex-ink-soft)" }}>
            {status === "active" ? "কোনো ভুল জমা নেই — চালিয়ে যান!" : "এখনো কিছু সমাধান হয়নি"}
          </Typography.Paragraph>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {groups.map((group) => (
            <div key={group.key}>
              <Typography.Title level={5} style={{ marginTop: 0, color: "var(--ex-ink)" }}>
                {group.label}
              </Typography.Title>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {group.entries.map((entry) => (
                  <QuestionRevealCard
                    key={entry.id}
                    stemHtml={entry.stemHtml}
                    multipleCorrect={entry.multipleCorrect}
                    options={entry.options}
                    explanationHtml={entry.explanationHtml}
                    takeawayText={entry.takeawayText}
                    header={<EntryHeader entry={entry} />}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !isError && total > NOTEBOOK_PAGE_SIZE && (
        <Pagination
          style={{ marginTop: 20, textAlign: "center" }}
          align="center"
          current={page}
          pageSize={NOTEBOOK_PAGE_SIZE}
          total={total}
          showSizeChanger={false}
          onChange={(p) => setPage(p)}
        />
      )}
    </div>
  );
}
