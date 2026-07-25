import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useInfiniteCatalog } from "../api/student";
import { useActiveTrack } from "../features/tracks/TrackContext";
import { categoryShortLabel } from "../api/categories";
import { bnNum } from "../lib/bn";
import { groupCatalog } from "../lib/catalogStatus";
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
  const [endedOpen, setEndedOpen] = useState(false);
  const { collections, activeTrackId } = useActiveTrack();
  const navigate = useNavigate();

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

  // Infinite scroll sentinel, scroll-intent gated. Most ended tests sit behind the
  // collapsed শেষ section, so the visible cards often don't fill the viewport and the
  // sentinel stays intersecting — an ungated observer then chain-fetches the entire
  // catalog on load. Allow exactly ONE observer-driven auto-advance per query (so wide
  // desktop viewports still fill), after which a real scroll gesture is required.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const autoAdvanced = useRef(false);
  const userScrolled = useRef(false);
  const { fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData } = query;

  // Serialized query identity — a new filter/search/track starts a fresh budget.
  const queryIdentity = JSON.stringify([activeCollection, filters, q, activeTrackId]);
  useEffect(() => {
    autoAdvanced.current = false;
    userScrolled.current = false;
  }, [queryIdentity]);

  // Set by the observer effect: re-observes the sentinel so its CURRENT intersection
  // is re-delivered. An IntersectionObserver only calls back when the ratio crosses a
  // threshold, so a sentinel that was already in view when the auto-advance budget ran
  // out would never fire again — the first scroll gesture has to poke it.
  const pokeSentinel = useRef<(() => void) | null>(null);

  // Registered once. `scroll` is capture-phase because scroll events don't bubble
  // (an inner scroll container would otherwise never reach window); wheel/touchmove
  // cover trackpad and touch drags that haven't moved the scrollport yet.
  useEffect(() => {
    const mark = () => {
      if (userScrolled.current) return;
      userScrolled.current = true;
      pokeSentinel.current?.();
    };
    window.addEventListener("wheel", mark, { passive: true });
    window.addEventListener("touchmove", mark, { passive: true });
    window.addEventListener("scroll", mark, { passive: true, capture: true });
    return () => {
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", mark);
      window.removeEventListener("scroll", mark, { capture: true });
    };
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        // isPlaceholderData: the rows on screen belong to the PREVIOUS query while the
        // new one is in flight — paging them would append the wrong result set.
        if (!entries[0].isIntersecting || !hasNextPage || isFetchingNextPage) return;
        if (isPlaceholderData) return;
        if (!userScrolled.current) {
          if (autoAdvanced.current) return;
          autoAdvanced.current = true;
        }
        void fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    pokeSentinel.current = () => {
      io.unobserve(el);
      io.observe(el);
    };
    return () => {
      pokeSentinel.current = null;
      io.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData, tab]);

  const filtersActive =
    activeCollection !== null || activeFilterCount(filters) > 0 || q.length > 0;

  // Every query-changing control also re-collapses শেষ: the old "N টি দেখুন" count
  // belongs to the old result set. Done in the handlers, not an effect
  // (react-hooks/set-state-in-effect).
  const selectCollection = (id: string | null) => {
    setCollectionId(id);
    setEndedOpen(false);
  };
  const applyFilters = (v: StoreFilters) => {
    setFilters(v);
    setEndedOpen(false);
  };
  const applySearch = (value: string) => {
    setQ(value);
    setEndedOpen(false);
  };
  const resetFilters = () => {
    setCollectionId(null);
    setFilters(DEFAULT_STORE_FILTERS);
    setQ("");
    setSearchNonce((n) => n + 1);
    setEndedOpen(false);
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
            ) : query.isLoading || activeTrackId == null ? (
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
                  onAction={() => navigate("/student/qbank")}
                />
              )
            ) : (
              <>
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
                        <PillButton variant="ghost" size="sm" onClick={() => setEndedOpen((o) => !o)}>
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
              </>
            )}
          </div>
        )}
      </PageContainer>
    </>
  );
}
