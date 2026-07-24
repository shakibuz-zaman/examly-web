import { useState } from "react";
import { Alert, Button, Input, Skeleton, Space, Tag, Typography, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useQbankPaper, useQbankSearch } from "../api/qbank";
import { useStartPractice } from "../api/practice";
import { useActiveTrack } from "../features/tracks/TrackContext";
import { QuestionRevealCard } from "../features/qbank/QuestionRevealCard";
import { Chip } from "../components/Chip";
import { bnNum } from "../lib/bn";
import type { QbankQuestion } from "../api/types";
import { PageContainer } from "../ui/PageContainer";

type SubjectChip = { id: string; label: string };

// Distinct subjects across the loaded questions, in first-seen order. Chips are
// built client-side (spec) — the paper detail response carries subjectName inline.
function distinctSubjects(questions: QbankQuestion[]): SubjectChip[] {
  const seen = new Map<string, SubjectChip>();
  for (const q of questions) {
    if (q.subjectId && q.subjectName && !seen.has(q.subjectId)) {
      const label = q.subjectName.bn ?? q.subjectName.en;
      if (label) seen.set(q.subjectId, { id: q.subjectId, label });
    }
  }
  return [...seen.values()];
}

function QuestionHeader({ order, sectionLabel }: { order: number; sectionLabel: string | null }) {
  return (
    <Space size={8} style={{ marginBottom: 8 }}>
      <Typography.Text strong style={{ color: "var(--ex-ink)" }}>
        {bnNum(order)}
      </Typography.Text>
      {sectionLabel && <Tag>{sectionLabel}</Tag>}
    </Space>
  );
}

function QuestionList({ questions }: { questions: QbankQuestion[] }) {
  if (questions.length === 0) {
    return (
      <Typography.Paragraph style={{ padding: "24px 0", textAlign: "center", color: "var(--ex-ink-soft)" }}>
        কোনো প্রশ্ন পাওয়া যায়নি।
      </Typography.Paragraph>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {questions.map((q) => (
        <QuestionRevealCard
          key={q.id}
          stemHtml={q.stemHtml}
          multipleCorrect={q.multipleCorrect}
          options={q.options}
          explanationHtml={q.explanationHtml}
          takeawayText={q.takeawayText}
          header={<QuestionHeader order={q.order} sectionLabel={q.sectionLabel} />}
        />
      ))}
    </div>
  );
}

export function StudentQbankPaperPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeTrackId } = useActiveTrack();
  const start = useStartPractice();
  const { data, isLoading, isError, refetch } = useQbankPaper(id);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const isSearching = query.trim().length >= 2;
  const search = useQbankSearch(query, { paperId: id });

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton active paragraph={{ rows: 8 }} />
      </PageContainer>
    );
  }
  if (isError || !data) {
    return (
      <PageContainer>
        <Alert
          type="error"
          showIcon
          title="প্রশ্নব্যাংক লোড করা যায়নি"
          action={
            <Button size="small" onClick={() => refetch()}>
              আবার চেষ্টা করুন
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const { paper, questions } = data;
  const subjects = distinctSubjects(questions);

  // A stale subject selection (should not happen within one paper, but guard anyway)
  // falls back to all.
  const activeSubject =
    subjectId && subjects.some((s) => s.id === subjectId) ? subjectId : null;

  const subjectFiltered = activeSubject
    ? questions.filter((q) => q.subjectId === activeSubject)
    : questions;

  const searchResults = search.data?.items.map((h) => h.question) ?? [];

  return (
    <PageContainer>
      <div style={{ paddingBottom: 76 }}>
        <Typography.Title level={3} style={{ marginBottom: 0, color: "var(--ex-ink)" }}>
          {paper.title}
        </Typography.Title>
        <Typography.Text type="secondary">
          {bnNum(paper.year)} · {bnNum(paper.questionCount)}টি প্রশ্ন
        </Typography.Text>

        {subjects.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 8,
              marginTop: 12,
              marginBottom: 4,
            }}
          >
            <Chip label="সব" selected={activeSubject === null} onClick={() => setSubjectId(null)} />
            {subjects.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                selected={activeSubject === s.id}
                onClick={() => setSubjectId(s.id)}
              />
            ))}
          </div>
        )}

        <Input.Search
          placeholder="এই সেটে খুঁজুন"
          allowClear
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ margin: "8px 0 16px" }}
        />

        {isSearching ? (
          search.isLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : search.isError ? (
            <Alert
              type="error"
              showIcon
              title="খোঁজা যায়নি"
              action={
                <Button size="small" onClick={() => search.refetch()}>
                  আবার চেষ্টা করুন
                </Button>
              }
            />
          ) : (
            <QuestionList questions={searchResults} />
          )
        ) : (
          <QuestionList questions={subjectFiltered} />
        )}

        <div
          style={{
            position: "sticky",
            bottom: 0,
            marginTop: 16,
            padding: "12px 0",
            background: "var(--ex-bg)",
            borderTop: "1px solid var(--ex-line)",
          }}
        >
          <Button
            type="primary"
            block
            loading={start.isPending}
            disabled={!activeTrackId}
            onClick={() =>
              start.mutate(
                { source: "paper", sourceId: paper.id, trackId: activeTrackId! },
                {
                  onSuccess: (s) => navigate(`/student/practice/${s.id}`),
                  onError: () => message.error("প্র্যাকটিস শুরু করা যায়নি"),
                },
              )
            }
          >
            এই সেট থেকে প্র্যাকটিস টেস্ট দাও
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
