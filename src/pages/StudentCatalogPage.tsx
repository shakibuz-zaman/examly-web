import { useEffect, useMemo, useState } from "react";
import { Alert, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useInfiniteCatalog } from "../api/student";
import { useActiveTrack } from "../features/tracks/TrackContext";
import { categoryShortLabel } from "../api/categories";
import { bnNum } from "../lib/bn";
import { groupCatalog } from "../lib/catalogStatus";
import { useInfiniteSentinel } from "../lib/useInfiniteSentinel";
import { HeroBand } from "../ui/HeroBand";
import { PageContainer } from "../ui/PageContainer";
import { SearchBar } from "../ui/SearchBar";
import { FilterChips, type FilterChipItem } from "../ui/FilterChips";
import {
  FilterSheet,
  DEFAULT_STORE_FILTERS,
  activeFilterCount,
  type StoreFilters,
} from "../ui/FilterSheet";
import { SectionHeader } from "../ui/SectionHeader";
import { TestCard } from "../ui/TestCard";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonCard } from "../ui/Skeletons";
import { PillButton } from "../ui/PillButton";
import { MyExamsList } from "./student/MyExamsList";
import type { CatalogItem } from "../api/types";

const PAGE_SIZE = 20;
// Keyed on the non-"all" members of the sheet's unions, so adding a type/price
// option without a Bengali label is a compile error rather than an `undefined` chip.
const FILTER_LABELS: Record<
  Exclude<StoreFilters["type"] | StoreFilters["price"], "all">,
  string
> = {
  model_test: "মডেল টেস্ট",
  exam: "একক পরীক্ষা",
  free: "ফ্রি",
  paid: "পেইড",
};

export function StudentCatalogPage() {
  const [tab, setTab] = useState<"store" | "mine">("store");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [filters, setFilters] = useState<StoreFilters>(DEFAULT_STORE_FILTERS);
  const [q, setQ] = useState("");
  // SearchBar owns its input text (uncontrolled by design — it debounces internally),
  // so clearing `q` from the outside would leave stale text in the box. Bumping this
  // remounts it with an empty field; the mount debounce re-emits "" which is a no-op
  // against an already-empty `q`.
  const [searchNonce, setSearchNonce] = useState(0);
  // শেষ expansion is keyed to the track it was opened on, so a track switch —
  // which has no local handler to reset in — derives back to collapsed instead
  // of needing a setState-in-effect. Deliberately sticky per track (A→B→A
  // restores A's expansion), matching how filters survive a track round-trip.
  const [endedOpenFor, setEndedOpenFor] = useState<string | null>(null);
  const { collections, activeTrackId } = useActiveTrack();
  const navigate = useNavigate();
  const endedOpen = endedOpenFor !== null && endedOpenFor === activeTrackId;

  // Stale collection selection (after a track switch) falls back to সব.
  const activeCollection =
    collectionId && collections.some((c) => c.id === collectionId) ? collectionId : null;

  const query = useInfiniteCatalog({
    trackId: activeTrackId ?? "",
    collectionId: activeCollection,
    type: filters.type === "all" ? null : filters.type,
    price: filters.price === "all" ? null : filters.price,
    live: filters.liveOnly || undefined,
    q: q || null,
    pageSize: PAGE_SIZE,
  });

  const items: CatalogItem[] = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const first = query.data?.pages[0];

  // One clock for the whole page so grouping, accents and CTAs all agree, and it
  // holds still within a render pass. `Date.now()` in the render body is an impure
  // render-time read (react-hooks/purity) — a lazy state seed is the compliant
  // form. The 30s ticker keeps windows honest (a test that opens while the page is
  // parked slides into «আজ লাইভ» without a reload); setState lives in the timer
  // callback rather than the effect body, so it doesn't cascade renders
  // (react-hooks/set-state-in-effect).
  const [now, setNow] = useState(() => Date.now());
  const groups = useMemo(() => groupCatalog(items, now), [items, now]);

  // Only time-sensitive cards need the ticker: a live/starting-today card is the one
  // thing that can change section or CTA on its own. An all-anytime track, an empty
  // result and the আমার-পরীক্ষা tab all park the timer instead of re-rendering the
  // whole grid every 30s. (Boolean dep, so the effect re-arms only on the edges.)
  const needsClock = tab === "store" && groups.liveToday.length > 0;
  useEffect(() => {
    if (!needsClock) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [needsClock]);

  const { fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData } = query;
  // Serialized query identity — a new filter/search/track starts a fresh budget.
  const queryIdentity = JSON.stringify([activeCollection, filters, q, activeTrackId]);
  const sentinelRef = useInfiniteSentinel({
    queryIdentity,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isPlaceholderData,
    fetchNextPage,
    resetKey: tab,
  });

  const filtersActive =
    activeCollection !== null || activeFilterCount(filters) > 0 || q.length > 0;

  // isPending, NOT isLoading (= `isPending && isFetching`): a query with no data that is not
  // fetching at this instant — an offline fetch is PAUSED, not failed — reports isLoading
  // false, and the store would render «এই ট্র্যাকে এখনো কিছু নেই» over a load that never
  // finished (reproduced offline on হোম). The null-track clause is load-bearing on top of it:
  // the query is disabled while the track resolves (trackId ?? ""), and keepPreviousData
  // would otherwise serve the previous track's rows — data, so not pending — as this one's.
  const loading = query.isPending || activeTrackId == null;

  // Every query-changing control also re-collapses শেষ: the old "N টি দেখুন" count
  // belongs to the old result set. Done in the handlers, not an effect
  // (react-hooks/set-state-in-effect).
  const selectCollection = (id: string | null) => {
    setCollectionId(id);
    setEndedOpenFor(null);
  };
  const applyFilters = (v: StoreFilters) => {
    setFilters(v);
    setEndedOpenFor(null);
  };
  const applySearch = (value: string) => {
    setQ(value);
    setEndedOpenFor(null);
  };
  const resetFilters = () => {
    setCollectionId(null);
    setFilters(DEFAULT_STORE_FILTERS);
    setQ("");
    setSearchNonce((n) => n + 1);
    setEndedOpenFor(null);
  };

  const open = (item: CatalogItem) =>
    navigate(item.kind === "exam" ? `/student/exams/${item.id}` : `/student/model-tests/${item.id}`);

  // Collection chips + ✕-echoes of active sheet filters (§6).
  const chipItems: FilterChipItem[] = [
    {
      key: "all",
      label: "সব",
      selected: activeCollection === null,
      onClick: () => selectCollection(null),
    },
    ...collections.map((c) => ({
      key: c.id,
      label: categoryShortLabel(c),
      selected: activeCollection === c.id,
      onClick: () => selectCollection(c.id),
    })),
    ...(filters.type !== "all"
      ? [
          {
            key: "x-type",
            label: FILTER_LABELS[filters.type],
            selected: true,
            removable: true,
            onClick: () => applyFilters({ ...filters, type: "all" as const }),
          },
        ]
      : []),
    ...(filters.price !== "all"
      ? [
          {
            key: "x-price",
            label: FILTER_LABELS[filters.price],
            selected: true,
            removable: true,
            onClick: () => applyFilters({ ...filters, price: "all" as const }),
          },
        ]
      : []),
    ...(filters.liveOnly
      ? [
          {
            key: "x-live",
            label: "শুধু লাইভ",
            selected: true,
            removable: true,
            onClick: () => applyFilters({ ...filters, liveOnly: false }),
          },
        ]
      : []),
  ];

  const skeletonGrid = (
    <div className="ex-cardgrid" style={{ marginTop: 16 }}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );

  const grid = (list: CatalogItem[]) => (
    <div className="ex-cardgrid">
      {list.map((item) => (
        <TestCard key={item.listingId} item={item} now={now} highlight={q} onOpen={() => open(item)} />
      ))}
    </div>
  );

  return (
    <>
      <HeroBand
        title="মডেল টেস্ট"
        // Counts describe the store; the আমার-পরীক্ষা tab has no equivalent, so it
        // gets no subtitle rather than a store number that doesn't match its list.
        subtitle={
          tab !== "store"
            ? undefined
            : first
              ? `${bnNum(first.trackTotal)}টি টেস্ট · ${bnNum(first.liveTodayCount)}টি আজ লাইভ`
              : "—"
        }
        overlap={tab === "store"}
        tabs={
          <>
            <button
              type="button"
              className={tab === "store" ? "ex-bandtab is-active" : "ex-bandtab"}
              aria-pressed={tab === "store"}
              onClick={() => setTab("store")}
            >
              স্টোর
            </button>
            <button
              type="button"
              className={tab === "mine" ? "ex-bandtab is-active" : "ex-bandtab"}
              aria-pressed={tab === "mine"}
              onClick={() => setTab("mine")}
            >
              আমার পরীক্ষা
            </button>
          </>
        }
      />
      <PageContainer banded>
        {tab === "mine" ? (
          <MyExamsList />
        ) : (
          <div>
            <div className="ex-band-overlap">
              <SearchBar
                key={searchNonce}
                placeholder="টেস্ট বা প্রতিষ্ঠান খুঁজুন…"
                onSearch={applySearch}
                // Remount after a store↔mine tab switch restores the active query
                // (user decision: search persists across tabs).
                defaultValue={q}
              />
            </div>

            <div className="ex-filterrow">
              <FilterChips items={chipItems} />
              <FilterSheet value={filters} onChange={applyFilters} />
            </div>

            {query.isError ? (
              <Alert
                type="error"
                showIcon
                title="স্টোর লোড করা যায়নি"
                action={
                  <Button size="small" onClick={() => void query.refetch()}>
                    আবার চেষ্টা করুন
                  </Button>
                }
              />
            ) : loading ? (
              skeletonGrid
            ) : items.length === 0 ? (
              // An empty *stale* result (previous query also had no rows) must not flash
              // the empty state at the incoming one — wait for the settled answer.
              query.isPlaceholderData ? (
                skeletonGrid
              ) : filtersActive ? (
                <EmptyState
                  variant="filtered"
                  message="এই ফিল্টারে কিছু পাওয়া যায়নি।"
                  actionLabel="সব দেখুন"
                  onAction={resetFilters}
                />
              ) : (
                <EmptyState
                  variant="empty"
                  message="এই ট্র্যাকে এখনো কিছু নেই"
                  actionLabel="প্রশ্নব্যাংক দেখুন"
                  actionTo="/student/qbank"
                />
              )
            ) : (
              // While a new query is in flight the rows on screen are the PREVIOUS
              // result set (keepPreviousData) — dim them so they read as stale
              // rather than as the answer to the new filter/search.
              <div
                className={query.isPlaceholderData ? "ex-results is-stale" : "ex-results"}
                aria-busy={query.isPlaceholderData}
              >
                {groups.liveToday.length > 0 && (
                  <>
                    <SectionHeader
                      label="🔴 আজ লাইভ"
                      trailing={`${bnNum(groups.liveToday.length)}টি`}
                    />
                    {grid(groups.liveToday)}
                  </>
                )}
                {groups.anytime.length > 0 && (
                  <>
                    <SectionHeader
                      label="যেকোনো সময়"
                      trailing={`${bnNum(groups.anytime.length)}টি`}
                    />
                    {grid(groups.anytime)}
                  </>
                )}
                {groups.ended.length > 0 && (
                  <>
                    <SectionHeader
                      label="শেষ"
                      trailing={
                        <PillButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setEndedOpenFor(endedOpen ? null : activeTrackId)}
                        >
                          {endedOpen ? "লুকান" : `${bnNum(groups.ended.length)}টি দেখুন`}
                        </PillButton>
                      }
                    />
                    {endedOpen && grid(groups.ended)}
                  </>
                )}
                {isFetchingNextPage && (
                  <div className="ex-cardgrid" style={{ marginTop: 12 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                )}
                <div ref={sentinelRef} aria-hidden />
              </div>
            )}
          </div>
        )}
      </PageContainer>
    </>
  );
}
