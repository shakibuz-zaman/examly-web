import { useMemo, useState } from "react";
import { Alert, Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import { NOTEBOOK_PAGE_SIZE, useInfiniteNotebook } from "../api/notebook";
import { useStartPractice } from "../api/practice";
import { useActiveTrack } from "../features/tracks/TrackContext";
import { NotebookEntryCard } from "../features/notebook/NotebookEntryCard";
import { bnNum } from "../lib/bn";
import { useInfiniteSentinel } from "../lib/useInfiniteSentinel";
import { HeroBand } from "../ui/HeroBand";
import { PageContainer } from "../ui/PageContainer";
import { FilterChips, type FilterChipItem } from "../ui/FilterChips";
import { SectionHeader } from "../ui/SectionHeader";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonRow } from "../ui/Skeletons";
import { PillButton } from "../ui/PillButton";
import type { NotebookEntry } from "../api/types";

type SubjectChip = { id: string; label: string };

// Distinct subjects across the loaded entries, first-seen order. Chips are built
// client-side (D6): entries carry subjectName inline, and since 7d the derivation sees
// ALL loaded pages rather than one — the old one-page-chips caveat is gone. Chips still
// only describe what is loaded, which is honest: the list itself is what they narrow.
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

export function StudentNotebookPage() {
  const navigate = useNavigate();
  const { activeTrackId } = useActiveTrack();
  const start = useStartPractice();
  const [status, setStatus] = useState<"active" | "resolved">("active");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [dueOnly, setDueOnly] = useState(false);

  // One infinite query per status tab; the ডিউ and subject chips are client-side (D6),
  // so they are deliberately NOT query parameters — picking one must not refetch or
  // reset the scroll budget.
  const query = useInfiniteNotebook({
    status,
    trackId: activeTrackId,
    pageSize: NOTEBOOK_PAGE_SIZE,
  });

  const entries: NotebookEntry[] = useMemo(
    () => query.data?.pages.flatMap((p) => p.entries) ?? [],
    [query.data],
  );
  // Band counts ride page 1 and are tab-agnostic on the server (whole-track summary),
  // so the subtitle holds still across a tab flip — keepPreviousData keeps page 1 on
  // screen while the new tab loads, so it never blanks either.
  const first = query.data?.pages[0];
  const activeCount = first?.activeCount ?? 0;
  const dueCount = first?.dueCount ?? 0;

  // isPending, NOT isLoading (= `isPending && isFetching`): a query with no data that is not
  // fetching at this instant — an offline fetch is PAUSED, not failed — reports isLoading
  // false, and «কোনো ভুল জমা নেই» would stand in for a load that never finished (the same
  // swap is on হোম, where the offline case was reproduced). The null-track clause is
  // load-bearing on top of it: the query is disabled then, and keepPreviousData would
  // otherwise hand back the previous track's pages — data, so not pending — as this one's answer.
  const loading = activeTrackId == null || query.isPending;

  const subjects = useMemo(() => distinctSubjects(entries), [entries]);
  // A stale subject selection (its entries no longer loaded) falls back to all rather
  // than filtering everything away.
  const activeSubject = subjectId && subjects.some((s) => s.id === subjectId) ? subjectId : null;
  const filtered = useMemo(
    () =>
      entries.filter(
        (e) => (!dueOnly || e.due) && (activeSubject === null || e.subjectId === activeSubject),
      ),
    [entries, dueOnly, activeSubject],
  );
  const groups = useMemo(() => groupByTopic(filtered), [filtered]);

  const { fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData } = query;
  const sentinelRef = useInfiniteSentinel({
    // Chips are client-side and must NOT reset the scroll budget — only the tab and the
    // track change what the server is paging through. hasNextPage is undefined during the
    // placeholder window, so `?? false` (plus the hook's own isPlaceholderData guard)
    // keeps a tab flip from paging the outgoing tab's list.
    queryIdentity: JSON.stringify([status, activeTrackId]),
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isPlaceholderData,
    fetchNextPage,
  });

  const resetChips = () => {
    setSubjectId(null);
    setDueOnly(false);
  };

  const selectStatus = (next: "active" | "resolved") => {
    if (next === status) return;
    setStatus(next);
    resetChips(); // handlers, not effects (react-hooks/set-state-in-effect)
    // keepPreviousData on an INFINITE query keeps the outgoing tab's whole accumulated
    // page list on screen until the new page 1 lands, then collapses it to one page. A
    // reader parked deep in that list would have the ground pulled out from under them,
    // so a tab switch explicitly goes back to the top — which is also where a freshly
    // chosen tab should start.
    window.scrollTo(0, 0);
  };

  const chipItems: FilterChipItem[] = [
    {
      key: "all",
      label: "সব",
      selected: !dueOnly && activeSubject === null,
      onClick: resetChips,
    },
    // Resolved entries are never due (the server computes due as active ∧ past its next
    // date), so the chip only exists where it can match something.
    ...(status === "active"
      ? [
          {
            key: "due",
            label: "ডিউ",
            selected: dueOnly,
            onClick: () => setDueOnly((v) => !v),
          },
        ]
      : []),
    ...subjects.map((s) => ({
      key: s.id,
      label: s.label,
      selected: activeSubject === s.id,
      // Re-picking the selected chip clears it — the chips are aria-pressed toggles, and
      // with two independent filter dimensions «সব» is the only other way back.
      onClick: () => setSubjectId(activeSubject === s.id ? null : s.id),
    })),
  ];

  const skeletonList = (
    <div className="ex-qcard-list" style={{ marginTop: 16 }}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );

  // The band reserves its extra bottom room only where something actually floats into it,
  // and the pull-up class must follow the SAME flag or the reserved 44px shows as an empty
  // teal gap (the store page's conditional-overlap pattern). Two conditions:
  //   • the active tab only — সমাধান হয়েছে has nothing to practise, so the card goes;
  //   • and only once we know the notebook is non-empty. On an empty active notebook the
  //     card would be a dead CTA sitting on top of «কোনো ভুল জমা নেই — চালিয়ে যান!».
  // `loading ||` keeps the room (and its skeleton) while the count is still unknown, so the
  // card resolves in place instead of popping in and shoving the page down.
  const overlapping = status === "active" && (loading || activeCount > 0);

  const revisionCard = (
    <div className="ex-card ex-nb-revision">
      <div className="ex-nb-revision-main">
        <div className="ex-nb-revision-title">আজকের রিভিশন</div>
        {/* The CTA below starts a `source: "notebook"` session, and the server builds that
            from the ACTIVE entries (sorted by next-due date, so the due ones lead) — not
            from the due ones alone. So the line counts what the session draws from, which
            is also the number the button's own disabled condition keys on. `থেকে` (from a
            pool), never `দিয়ে` (using all of them): the server caps the session at 20.
            The due count is not repeated here — the band subtitle one line above already
            carries it, and quoting it beside this CTA is what made the old copy read as a
            promise of a due-only session. */}
        <div className="ex-nb-revision-sub">
          জমে থাকা {bnNum(activeCount)}টি প্রশ্ন থেকে প্র্যাকটিস
        </div>
      </div>
      <PillButton
        variant="primary"
        // The old header button's antd `loading` both spun and blocked the second click;
        // PillButton has no loading state, so the pending flag joins the disabled set
        // (the label carries the progress) — the plan's two conditions are untouched.
        disabled={start.isPending || activeCount === 0 || !activeTrackId}
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
        {start.isPending ? "শুরু হচ্ছে…" : "শুরু করুন"}
      </PillButton>
    </div>
  );

  const list = loading ? (
    skeletonList
  ) : entries.length === 0 ? (
    // An empty *stale* result (the outgoing tab was empty too) must not flash an empty
    // state at the incoming one — wait for the settled answer.
    isPlaceholderData ? (
      skeletonList
    ) : status === "active" ? (
      // "success", not "empty": an empty সক্রিয় pile is the goal state, not a missing one —
      // the check reads as «done», where the open folder reads as «nothing here».
      <EmptyState variant="success" message="কোনো ভুল জমা নেই — চালিয়ে যান!" />
    ) : (
      <EmptyState variant="empty" message="এখনো কিছু সমাধান হয়নি" />
    )
  ) : filtered.length === 0 ? (
    <EmptyState
      variant="filtered"
      message="এই ফিল্টারে কিছু নেই"
      actionLabel="সব দেখুন"
      onAction={resetChips}
    />
  ) : (
    // While the other tab's query is in flight the rows on screen are the PREVIOUS
    // result set (keepPreviousData) — dim them so they read as stale rather than as the
    // answer to the tab that was just pressed.
    <div className={isPlaceholderData ? "ex-results is-stale" : "ex-results"} aria-busy={isPlaceholderData}>
      {groups.map((group) => (
        <div key={group.key}>
          <SectionHeader label={group.label} trailing={`${bnNum(group.entries.length)}টি`} />
          <div className="ex-qcard-list">
            {group.entries.map((entry) => (
              <NotebookEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
      {isFetchingNextPage && (
        <div className="ex-qcard-list" style={{ marginTop: 12 }}>
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}
    </div>
  );

  return (
    <>
      <HeroBand
        title="ভুলের খাতা ✎"
        subtitle={first ? `${bnNum(activeCount)}টি প্রশ্ন · ${bnNum(dueCount)}টি আজ ডিউ` : "—"}
        overlap={overlapping}
        tabs={
          <>
            <button
              type="button"
              className={status === "active" ? "ex-bandtab is-active" : "ex-bandtab"}
              aria-pressed={status === "active"}
              onClick={() => selectStatus("active")}
            >
              সক্রিয়
            </button>
            <button
              type="button"
              className={status === "resolved" ? "ex-bandtab is-active" : "ex-bandtab"}
              aria-pressed={status === "resolved"}
              onClick={() => selectStatus("resolved")}
            >
              সমাধান হয়েছে
            </button>
          </>
        }
      />
      <PageContainer banded>
        {query.isError ? (
          <div className={overlapping ? "ex-band-overlap" : undefined}>
            <Alert
              type="error"
              showIcon
              title="ভুলের খাতা লোড করা যায়নি"
              action={
                <Button size="small" onClick={() => void query.refetch()}>
                  আবার চেষ্টা করুন
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Same `overlapping` flag as the band's `overlap` and as the error branch's
                wrapper above — the card and the room it floats into are never out of step.
                Note the interlock with the sub-line: the card itself renders only when
                `!loading && activeCount > 0`, so it can never print «০টি». */}
            {overlapping && (
              <div className="ex-band-overlap">{loading ? <SkeletonRow /> : revisionCard}</div>
            )}

            {/* Kept mounted while a filter matches nothing, so «সব» stays reachable. */}
            {entries.length > 0 && (
              <div className="ex-filterrow">
                <FilterChips items={chipItems} />
              </div>
            )}

            {list}
            <div ref={sentinelRef} aria-hidden />
          </>
        )}
      </PageContainer>
    </>
  );
}
