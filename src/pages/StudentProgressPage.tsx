import { Alert, Button } from "antd";
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
            fixes the bug — useAnalyticsOverview keys on `filters` and sets no placeholderData,
            so every chip tap flips isPending, and a row that lives inside a branch vanishes
            exactly when it is needed: for a blink on each tap, and for good on a slice with no
            attempts, where the empty state used to be the only thing left on the page. */}
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
            <div className="ex-stattiles">
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
                so consecutive cards would otherwise touch. */}
            <div className="ex-progress-stack">
              <WeakTopicsCard filters={filters} />
              <TrendChart points={d.trend} />
              <StrengthMap filters={filters} />
              <TopicProgressCard filters={filters} />
              <StrengthsFocusCard filters={filters} />
              <DifficultyCard rows={d.difficulty} />
              {d.strategy && <NegativeMarkingCard strategy={d.strategy} />}
            </div>
          </>
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
