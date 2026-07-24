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
const FILTER_LABELS: Record<string, string> = {
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
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const groups = useMemo(() => groupCatalog(items, now), [items, now]);

  // Infinite scroll sentinel.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, tab]);

  const filtersActive =
    activeCollection !== null || activeFilterCount(filters) > 0 || q.length > 0;
  const resetFilters = () => {
    setCollectionId(null);
    setFilters(DEFAULT_STORE_FILTERS);
    setQ("");
    setSearchNonce((n) => n + 1);
  };

  const open = (item: CatalogItem) =>
    navigate(item.kind === "exam" ? `/student/exams/${item.id}` : `/student/model-tests/${item.id}`);

  // Collection chips + ✕-echoes of active sheet filters (§6).
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
    ...(filters.type !== "all"
      ? [
          {
            key: "x-type",
            label: FILTER_LABELS[filters.type],
            selected: true,
            removable: true,
            onClick: () => setFilters({ ...filters, type: "all" as const }),
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
            onClick: () => setFilters({ ...filters, price: "all" as const }),
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
            onClick: () => setFilters({ ...filters, liveOnly: false }),
          },
        ]
      : []),
  ];

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
        subtitle={
          first
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
                onSearch={setQ}
              />
            </div>

            <div className="ex-filterrow">
              <FilterChips items={chipItems} />
              <FilterSheet value={filters} onChange={setFilters} />
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
              <div className="ex-cardgrid" style={{ marginTop: 16 }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : items.length === 0 ? (
              filtersActive ? (
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
