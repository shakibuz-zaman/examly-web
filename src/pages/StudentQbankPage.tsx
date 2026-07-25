import { useMemo, useState } from "react";
import { Alert, Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import {
  QBANK_PAPERS_PAGE_SIZE,
  useInfiniteQbankPapers,
  useInfiniteQbankSearch,
} from "../api/qbank";
import { useStartPractice } from "../api/practice";
import { useActiveTrack } from "../features/tracks/TrackContext";
import { QuestionContentView } from "../features/questions/QuestionContentView";
import { categoryShortLabel } from "../api/categories";
import { bnNum } from "../lib/bn";
import { useInfiniteSentinel } from "../lib/useInfiniteSentinel";
import { HeroBand } from "../ui/HeroBand";
import { PageContainer } from "../ui/PageContainer";
import { SearchBar } from "../ui/SearchBar";
import { FilterChips, type FilterChipItem } from "../ui/FilterChips";
import { SectionHeader } from "../ui/SectionHeader";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonCard, SkeletonRow } from "../ui/Skeletons";
import { PaperCard } from "../ui/PaperCard";
import type { QbankPaperSummary, QbankSearchHit } from "../api/types";

// Papers grouped by year, newest first, so the list reads like a shelf of past
// papers. Counts are of LOADED papers (D3): sort is year-desc so shelves fill
// contiguously; only the boundary year can under-count until the next page loads.
function groupByYear(papers: QbankPaperSummary[]): [number, QbankPaperSummary[]][] {
  const byYear = new Map<number, QbankPaperSummary[]>();
  for (const p of papers) {
    const bucket = byYear.get(p.year);
    if (bucket) bucket.push(p);
    else byYear.set(p.year, [p]);
  }
  return [...byYear.entries()].sort((a, b) => b[0] - a[0]);
}

function SearchHitCard({ hit, onOpen }: { hit: QbankSearchHit; onOpen: () => void }) {
  return (
    <div
      className="ex-qhit ex-hover-lift ex-ring"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <QuestionContentView html={hit.question.stemHtml} />
      <div className="ex-qhit-meta">
        {hit.paperTitle} · {bnNum(hit.paperYear)}
      </div>
    </div>
  );
}

export function StudentQbankPage() {
  const { activeTrackId, collections } = useActiveTrack();
  const navigate = useNavigate();
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  // Remount nonce clears the (uncontrolled) SearchBar on reset — same pattern as
  // the store page.
  const [searchNonce, setSearchNonce] = useState(0);
  const [practicingId, setPracticingId] = useState<string | null>(null);
  const start = useStartPractice();

  // Stale collection selection (after a track switch) falls back to সব.
  const activeCollection =
    collectionId && collections.some((c) => c.id === collectionId) ? collectionId : null;

  const searching = q.trim().length >= 2;

  const papersQuery = useInfiniteQbankPapers({
    trackId: activeTrackId ?? "",
    categoryId: activeCollection,
    pageSize: QBANK_PAPERS_PAGE_SIZE,
  });
  const searchQuery = useInfiniteQbankSearch(q, activeTrackId, QBANK_PAPERS_PAGE_SIZE);

  const papers: QbankPaperSummary[] = useMemo(
    () => papersQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [papersQuery.data],
  );
  const hits: QbankSearchHit[] = useMemo(
    () => searchQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [searchQuery.data],
  );
  const groups = useMemo(() => groupByYear(papers), [papers]);
  // Band subtitle always describes the track funnel — even while a search is active.
  const first = papersQuery.data?.pages[0];

  // One sentinel serves both modes; the active query drives it.
  const active = searching ? searchQuery : papersQuery;
  const sentinelRef = useInfiniteSentinel({
    queryIdentity: JSON.stringify([searching, activeCollection, q, activeTrackId]),
    hasNextPage: active.hasNextPage ?? false,
    isFetchingNextPage: active.isFetchingNextPage,
    isPlaceholderData: active.isPlaceholderData,
    fetchNextPage: active.fetchNextPage,
  });

  const resetSearch = () => {
    setQ("");
    setSearchNonce((n) => n + 1);
  };

  const practiceFrom = (paperId: string) => {
    if (!activeTrackId || practicingId) return;
    setPracticingId(paperId);
    start.mutate(
      { source: "paper", sourceId: paperId, trackId: activeTrackId },
      {
        onSuccess: (s) => navigate(`/student/practice/${s.id}`),
        onError: () => message.error("প্র্যাকটিস শুরু করা যায়নি"),
        onSettled: () => setPracticingId(null),
      },
    );
  };

  const chipItems: FilterChipItem[] = [
    {
      key: "all",
      label: "সব",
      selected: activeCollection === null,
      onClick: () => setCollectionId(null),
    },
    ...collections.map((c) => ({
      key: c.id,
      label: categoryShortLabel(c),
      selected: activeCollection === c.id,
      onClick: () => setCollectionId(c.id),
    })),
  ];

  const skeletonGrid = (
    <div className="ex-papergrid" style={{ marginTop: 16 }}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );

  const paperGrid = (list: QbankPaperSummary[]) => (
    <div className="ex-papergrid">
      {list.map((paper) => (
        <PaperCard
          key={paper.id}
          title={paper.title}
          questionCount={paper.questionCount}
          practicing={practicingId === paper.id}
          onOpen={() => navigate(`/student/qbank/papers/${paper.id}`)}
          onPractice={() => practiceFrom(paper.id)}
        />
      ))}
    </div>
  );

  const browse = papersQuery.isError ? (
    <Alert
      type="error"
      showIcon
      title="প্রশ্নব্যাংক লোড করা যায়নি"
      action={
        <Button size="small" onClick={() => void papersQuery.refetch()}>
          আবার চেষ্টা করুন
        </Button>
      }
    />
  ) : papersQuery.isLoading || activeTrackId == null ? (
    skeletonGrid
  ) : papers.length === 0 ? (
    papersQuery.isPlaceholderData ? (
      skeletonGrid
    ) : activeCollection !== null ? (
      <EmptyState
        variant="filtered"
        message="এই ফিল্টারে কিছু পাওয়া যায়নি।"
        actionLabel="সব দেখুন"
        onAction={() => setCollectionId(null)}
      />
    ) : (
      <EmptyState
        variant="empty"
        message="এই ট্র্যাকে এখনো কোনো প্রশ্নব্যাংক নেই"
        actionLabel="মডেল টেস্ট দেখুন"
        onAction={() => navigate("/student/tests")}
      />
    )
  ) : (
    <div
      className={papersQuery.isPlaceholderData ? "ex-results is-stale" : "ex-results"}
      aria-busy={papersQuery.isPlaceholderData}
    >
      {groups.map(([year, yearPapers]) => (
        <div key={year}>
          <SectionHeader label={bnNum(year)} trailing={`${bnNum(yearPapers.length)}টি পেপার`} />
          {paperGrid(yearPapers)}
        </div>
      ))}
      {papersQuery.isFetchingNextPage && (
        <div className="ex-papergrid" style={{ marginTop: 12 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
    </div>
  );

  const searchResults = searchQuery.isError ? (
    <Alert
      type="error"
      showIcon
      title="খোঁজা যায়নি"
      action={
        <Button size="small" onClick={() => void searchQuery.refetch()}>
          আবার চেষ্টা করুন
        </Button>
      }
    />
  ) : searchQuery.isLoading || activeTrackId == null ? (
    <div className="ex-qhit-list" style={{ marginTop: 16 }}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  ) : hits.length === 0 ? (
    searchQuery.isPlaceholderData ? (
      <div className="ex-qhit-list" style={{ marginTop: 16 }}>
        <SkeletonRow />
        <SkeletonRow />
      </div>
    ) : (
      <EmptyState
        variant="filtered"
        message="এই খোঁজে কিছু পাওয়া যায়নি।"
        actionLabel="খোঁজা মুছুন"
        onAction={resetSearch}
      />
    )
  ) : (
    <div
      className={
        searchQuery.isPlaceholderData ? "ex-results is-stale ex-qhit-list" : "ex-results ex-qhit-list"
      }
      aria-busy={searchQuery.isPlaceholderData}
    >
      {hits.map((hit) => (
        <SearchHitCard
          key={hit.question.id}
          hit={hit}
          onOpen={() =>
            // Deep-link: paper page auto-expands + scrolls to the matched question (§7).
            navigate(`/student/qbank/papers/${hit.question.paperId}?focus=${hit.question.id}`)
          }
        />
      ))}
      {searchQuery.isFetchingNextPage && <SkeletonRow />}
    </div>
  );

  return (
    <>
      <HeroBand
        title="প্রশ্নব্যাংক"
        subtitle={
          first
            ? `${bnNum(first.trackTotal)}টি বিগত সালের প্রশ্নপত্র — সম্পূর্ণ ফ্রি, উত্তরসহ`
            : "—"
        }
        overlap
      />
      <PageContainer banded>
        <div>
          <div className="ex-band-overlap">
            <SearchBar
              key={searchNonce}
              placeholder="প্রশ্ন খুঁজুন — যেমন: মুক্তিযুদ্ধ, সন্ধি…"
              onSearch={setQ}
              defaultValue={q}
            />
          </div>

          {/* Chips hide while searching (D6): the search is track-wide and ignores
              the collection filter. */}
          {!searching && collections.length > 0 && (
            <div className="ex-filterrow">
              <FilterChips items={chipItems} />
            </div>
          )}

          {searching ? searchResults : browse}
          <div ref={sentinelRef} aria-hidden />
        </div>
      </PageContainer>
    </>
  );
}
