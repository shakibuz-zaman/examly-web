import { useEffect, useRef, useState } from "react";
import { Alert, Button, Skeleton, message } from "antd";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQbankPaper, useQbankSearch } from "../api/qbank";
import { useAddToNotebook } from "../api/notebook";
import { useStartPractice } from "../api/practice";
import { useActiveTrack } from "../features/tracks/TrackContext";
import { PaperQuestionCard } from "../features/qbank/PaperQuestionCard";
import { bnNum } from "../lib/bn";
import { HeroBand } from "../ui/HeroBand";
import { PageContainer } from "../ui/PageContainer";
import { SearchBar } from "../ui/SearchBar";
import { FilterChips, type FilterChipItem } from "../ui/FilterChips";
import { PillButton } from "../ui/PillButton";
import { EmptyState } from "../ui/EmptyState";
import type { QbankQuestion } from "../api/types";

type SubjectChip = { id: string; label: string };

// Distinct subjects across the loaded questions, in first-seen order (unchanged
// from the pre-7c page — the detail response carries subjectName inline).
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

export function StudentQbankPaperPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Search deep-link (§7): the matched question arrives auto-expanded + scrolled into view.
  const focusId = params.get("focus");
  const { activeTrackId } = useActiveTrack();
  const start = useStartPractice();
  const add = useAddToNotebook();
  const { data, isLoading, isError, refetch } = useQbankPaper(id);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const isSearching = query.trim().length >= 2;
  const search = useQbankSearch(query, { paperId: id });

  // One-shot scroll to the deep-linked card once the questions have rendered.
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (!focusId || !data || scrolledRef.current) return;
    scrolledRef.current = true;
    // rAF: let the expanded card lay out before measuring.
    requestAnimationFrame(() => {
      document.getElementById(`q-${focusId}`)?.scrollIntoView({ block: "center" });
    });
  }, [focusId, data]);

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
  const activeSubject = subjectId && subjects.some((s) => s.id === subjectId) ? subjectId : null;
  const subjectFiltered = activeSubject
    ? questions.filter((q) => q.subjectId === activeSubject)
    : questions;
  const searchResults = search.data?.items.map((h) => h.question) ?? [];
  const shown = isSearching ? searchResults : subjectFiltered;

  const chipItems: FilterChipItem[] = [
    { key: "all", label: "সব", selected: activeSubject === null, onClick: () => setSubjectId(null) },
    ...subjects.map((s) => ({
      key: s.id,
      label: s.label,
      selected: activeSubject === s.id,
      onClick: () => setSubjectId(s.id),
    })),
  ];

  const subjectLabelOf = (q: QbankQuestion) => q.subjectName?.bn ?? q.subjectName?.en ?? null;

  const save = (questionId: string) => {
    if (savingId) return;
    setSavingId(questionId);
    add.mutate(questionId, {
      onSuccess: (r) => {
        setSavedIds((prev) => new Set(prev).add(questionId));
        message.success(r.created ? "ভুলের খাতায় রাখা হয়েছে" : "আগে থেকেই ভুলের খাতায় আছে");
      },
      onError: () => message.error("রাখা যায়নি — আবার চেষ্টা করুন"),
      onSettled: () => setSavingId(null),
    });
  };

  return (
    <>
      <HeroBand
        back={{ to: "/student/qbank", label: "প্রশ্নব্যাংক" }}
        title={`${paper.title} — ${bnNum(paper.year)}`}
        subtitle={`${bnNum(paper.questionCount)} প্রশ্ন · উত্তরসহ`}
      />
      <PageContainer banded>
        <div>
          {/* Hidden while searching: same as the list page — D6 says search ignores
              the subject/collection filter, so active-looking chips would lie. */}
          {!isSearching && subjects.length > 0 && (
            <div className="ex-filterrow">
              <FilterChips items={chipItems} />
            </div>
          )}

          {/* Secondary SearchBar: own id + no `/` hotkey — the list page owns the
              compact-bar target; this one only filters within the paper. */}
          <div style={{ margin: "8px 0 16px" }}>
            <SearchBar id="ex-paper-search" hotkey={false} placeholder="এই সেটে খুঁজুন" onSearch={setQuery} />
          </div>

          {isSearching && search.isLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : isSearching && search.isError ? (
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
          ) : shown.length === 0 ? (
            <EmptyState variant="filtered" message="কোনো প্রশ্ন পাওয়া যায়নি।" />
          ) : (
            <div className="ex-qcard-list">
              {shown.map((q) => (
                <PaperQuestionCard
                  key={q.id}
                  question={q}
                  subjectLabel={subjectLabelOf(q)}
                  defaultExpanded={q.id === focusId}
                  saved={savedIds.has(q.id)}
                  saving={savingId === q.id}
                  onSave={() => save(q.id)}
                />
              ))}
            </div>
          )}

          <div className="ex-paper-cta">
            <PillButton
              variant="primary"
              disabled={!activeTrackId || start.isPending}
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
              {start.isPending ? "শুরু হচ্ছে…" : "এই সেট থেকে প্র্যাকটিস টেস্ট দিন"}
            </PillButton>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
