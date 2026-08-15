import { Alert, Button } from "antd";
import type { ReactNode } from "react";
import { useAnalyticsOverview } from "../api/analytics";
import { useExamCategories } from "../api/categories";
import { useAnalyticsFilters } from "../features/analytics/filters";
import { ProgressFilterChips, ProgressFilterSheet } from "../features/analytics/ProgressFilters";
import { TrendChart } from "../features/analytics/TrendChart";
import { PositionCard } from "../features/analytics/PositionCard";
import { StrengthMap } from "../features/analytics/StrengthMap";
import { TopicProgressCard } from "../features/analytics/TopicProgressCard";
import { WeakTopicsCard } from "../features/analytics/WeakTopicsCard";
import { DifficultyCard, NegativeMarkingCard, StrengthsFocusCard } from "../features/analytics/StrategyCards";
import { HeroBand } from "../ui/HeroBand";
import { PageContainer } from "../ui/PageContainer";
import { StatTile } from "../ui/StatTile";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonCard } from "../ui/Skeletons";
import { bnNum } from "../lib/bn";
import { bilingualLabel } from "../lib/labels";

// The house stale cue (saturate, never opacity) for children that hold data belonging to a
// query they do not run themselves — here, the three cards fed from useAnalyticsOverview. Cards
// that own their query wear the cue internally instead, so that exactly one cue sits over any
// pixel: nested cues multiply their filters and stop reading as "stale".
function StaleCue({ stale, children }: { stale: boolean; children: ReactNode }) {
  return (
    <div
      aria-busy={stale}
      style={{ filter: stale ? "saturate(0.35)" : undefined, transition: "filter .2s" }}
    >
      {children}
    </div>
  );
}

export function StudentProgressPage() {
  const { filters, update } = useAnalyticsFilters();
  const categories = useExamCategories();
  const overview = useAnalyticsOverview(filters);
  const d = overview.data;

  // All THREE filters, not the sheet's two: the category lives on the chip row rather than
  // behind the sheet, so activeProgressFilterCount deliberately leaves it out — but it is the
  // filter most likely to land on a slice the student has no attempts in, which is exactly
  // the state this flag has to recognise.
  const filtersActive =
    filters.categoryId !== null || filters.mode !== "all" || filters.lastN !== null;
  // One update() call, not three: every call patches the CURRENT search-param snapshot, so
  // three in a row would each start from the same snapshot and only the last would stick.
  const resetFilters = () => update({ categoryId: null, mode: "all", lastN: null });

  return (
    <>
      <HeroBand
        title="প্রোগ্রেস"
        // "—" is the placeholder হোম, মডেল টেস্ট and ভুলের খাতা already use, and it has to be
        // non-empty: HeroBand renders `{subtitle && …}`, so undefined would drop the line and
        // jump the band height once the counts land.
        subtitle={
          d
            ? `${bnNum(d.examsTaken)}টি পরীক্ষা${
                // !== null, never truthiness: percentile 0 is the top of the cohort, and a
                // bare `d.avgPercentile &&` would silently drop the line for exactly the
                // students it flatters most.
                d.avgPercentile !== null ? ` · গড়ে টপ ${bnNum(100 - d.avgPercentile)}%` : ""
              }`
            : "—"
        }
        overlap
      />
      <PageContainer banded>
        {/* Order is স্টোর's (StudentCatalogPage): the .ex-band-overlap card, then the filter
            row, then the state branch — so the band's extra bottom room is filled in every
            state and the controls outlive whatever is under them. The row cannot be hoisted
            ABOVE the overlap card: .ex-filterrow's 4px bottom margin collapses with
            .ex-band-overlap's -26px top margin (max positive + min negative = -22px) and the
            floating card would land on top of the chips. Outside the branch is the part that
            fixes the bug — the row must survive every state of the query, and one that lives
            inside a branch vanishes exactly when it is needed: on a slice with no attempts the
            empty state would be the only thing left on the page, with no way back. (The other
            half of that bug was the tap-blink itself; useAnalyticsOverview now sets
            placeholderData, so isPending fires on first load only.) */}
        <div className="ex-band-overlap">
          {overview.isPending ? (
            <SkeletonCard />
          ) : overview.isError ? (
            <Alert
              type="error"
              showIcon
              title="প্রোগ্রেস লোড করা যায়নি"
              action={
                <Button size="small" onClick={() => void overview.refetch()}>
                  আবার চেষ্টা করুন
                </Button>
              }
            />
          ) : (
            <PositionCard filters={filters} />
          )}
        </div>

        <div className="ex-filterrow">
          <ProgressFilterChips filters={filters} update={update}
            categories={categories.data ?? []} />
          <ProgressFilterSheet filters={filters} update={update} />
        </div>

        {overview.isPending || overview.isError ? null : d && d.examsTaken > 0 ? (
          <>
            {/* House stale cue (saturate, never opacity — .ex-results.is-stale is the same
                filter), inline rather than that class because these containers carry their own
                layout and .ex-results would drag its grid in with the filter.
                One চিপ tap starts SEVERAL independent requests, so a cue may only be keyed on
                the query that owns the pixels beneath it and may only wrap those pixels: these
                tiles are overview's, and the সময়কাল/মোড cards below own theirs. A stack-wide
                cue off one query looks tidier and is wrong twice — it clears when its own query
                lands while its neighbours are still on the previous slice, and it multiplies
                with the cards' own cues (.35 × .35 ≈ .12, which reads as broken, not stale). */}
            <div
              className="ex-stattiles"
              aria-busy={overview.isPlaceholderData}
              style={{
                filter: overview.isPlaceholderData ? "saturate(0.35)" : undefined,
                transition: "filter .2s",
              }}
            >
              <StatTile label="পরীক্ষা" value={bnNum(d.examsTaken)}
                suffix={d.practiceRetakes > 0 ? `+${bnNum(d.practiceRetakes)} প্র্যাকটিস` : undefined} />
              <StatTile label="সঠিকতা" value={bnNum(d.overallAccuracy)} suffix="%" />
              <StatTile label="গড় পার্সেন্টাইল"
                value={d.avgPercentile === null ? "—" : `টপ ${bnNum(100 - d.avgPercentile)}%`} />
              <StatTile label="দুর্বল জায়গা"
                value={d.focusArea
                  ? `${bilingualLabel(d.focusArea.subject)} → ${bilingualLabel(d.focusArea.node)}`
                  : "—"} />
            </div>

            {/* The stack owns the rhythm the old antd flex wrapper supplied: the analytics
                cards below are still antd Cards (Task 9) and carry no margin of their own,
                so consecutive cards would otherwise touch. It carries NO cue of its own —
                see the tiles above. The three cards taking overview data as props are cued
                here because the data is the page's; the four that run their own queries are
                cued inside themselves, each off the query it reads. */}
            <div className="ex-progress-stack">
              <WeakTopicsCard filters={filters} />
              <StaleCue stale={overview.isPlaceholderData}><TrendChart points={d.trend} /></StaleCue>
              <StrengthMap filters={filters} />
              <TopicProgressCard filters={filters} />
              <StrengthsFocusCard filters={filters} />
              <StaleCue stale={overview.isPlaceholderData}><DifficultyCard rows={d.difficulty} /></StaleCue>
              {d.strategy && (
                <StaleCue stale={overview.isPlaceholderData}>
                  <NegativeMarkingCard strategy={d.strategy} />
                </StaleCue>
              )}
            </div>
          </>
        ) : overview.isPlaceholderData ? (
          // The one place placeholder data would turn into a lie, so it gets the প্রশ্নব্যাংক
          // list's guard: `d.examsTaken === 0` describes the PREVIOUS slice while
          // `filtersActive` already describes the tapped one. Clearing filters off an empty
          // slice would therefore flash «এখনো কোনো প্রকাশিত ফলাফল নেই» — plus a "go take an
          // exam" CTA — at a student who has results and is one fetch away from seeing them.
          // Cards stay stale-but-true; an empty state cannot, so it waits.
          <SkeletonCard />
        ) : filtersActive ? (
          // Not «এখনো কোনো ফলাফল নেই»: this student HAS results, just none in this slice, and
          // telling them otherwise under a filter they set is a lie with a CTA on it. The
          // ✕-chips above undo one filter each; this clears all three at once and is the one
          // control guaranteed to be in view — the chip row scrolls horizontally and the
          // sheet's two live behind a tap.
          <EmptyState
            variant="filtered"
            message="এই ফিল্টারে কোনো ফলাফল নেই।"
            actionLabel="সব দেখুন"
            onAction={resetFilters}
          />
        ) : (
          <EmptyState
            variant="empty"
            message="এখনো কোনো প্রকাশিত ফলাফল নেই — একটি পরীক্ষা দিয়ে ফিরে আসুন।"
            actionLabel="পরীক্ষা দেখুন"
            actionTo="/student/tests"
          />
        )}
      </PageContainer>
    </>
  );
}
