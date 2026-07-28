import { Chip } from "../../components/Chip";
import { FilterChips, type FilterChipItem } from "../../ui/FilterChips";
import { FilterSheet } from "../../ui/FilterSheet";
import { categoryShortLabel, type ExamCategoryResponse } from "../../api/categories";
import { ANALYTICS_MODE } from "../../lib/labels";
import { bnNum } from "../../lib/bn";
import type { AnalyticsFilters, AnalyticsMode } from "./filters";

// D10: three window chips plus সব সময়, no free-text N. useAnalyticsFilters still parses ANY
// lastN from the URL, so a bookmarked ?lastN=37 keeps working and simply shows as its own
// ✕-chip — no preset selected in the sheet, which is the honest reading of that URL.
const WINDOW_PRESETS = [10, 20, 50] as const;

// Both of these stay module-private: the page needs neither, and a non-component export from
// a .tsx file is what react-refresh/only-export-components fires on — StoreFilterSheet pays
// for its two with eslint-disables, and this file has nothing to pay for.
function activeProgressFilterCount(f: AnalyticsFilters): number {
  return (f.mode !== "all" ? 1 : 0) + (f.lastN !== null ? 1 : 0);
}

// One spelling for both surfaces, so the ✕-echo reads back exactly the chip that was picked.
function windowLabel(n: number): string {
  return `শেষ ${bnNum(n)}`;
}

export function ProgressFilterChips({
  filters,
  update,
  categories,
}: {
  filters: AnalyticsFilters;
  update: (patch: Partial<AnalyticsFilters>) => void;
  categories: ExamCategoryResponse[];
}) {
  // Category chips + ✕-echoes of the sheet's two filters (§6), the স্টোর row's pattern:
  // an active filter that only exists behind the sheet is one the reader cannot see or
  // undo without reopening it.
  const items: FilterChipItem[] = [
    {
      key: "all",
      label: "সব",
      selected: filters.categoryId === null,
      onClick: () => update({ categoryId: null }),
    },
    ...categories.map((c) => ({
      key: c.id,
      label: categoryShortLabel(c),
      selected: filters.categoryId === c.id,
      onClick: () => update({ categoryId: c.id }),
    })),
    ...(filters.mode !== "all"
      ? [
          {
            key: "x-mode",
            label: ANALYTICS_MODE[filters.mode],
            selected: true,
            removable: true,
            onClick: () => update({ mode: "all" }),
          },
        ]
      : []),
    ...(filters.lastN !== null
      ? [
          {
            key: "x-window",
            label: windowLabel(filters.lastN),
            selected: true,
            removable: true,
            onClick: () => update({ lastN: null }),
          },
        ]
      : []),
  ];

  return <FilterChips items={items} />;
}

export function ProgressFilterSheet({
  filters,
  update,
}: {
  filters: AnalyticsFilters;
  update: (patch: Partial<AnalyticsFilters>) => void;
}) {
  return (
    <FilterSheet count={activeProgressFilterCount(filters)}>
      <div style={{ minWidth: 240 }}>
        <div className="ex-sheet-group">
          <div className="ex-sheet-label">মোড</div>
          <div className="ex-sheet-row">
            {(["all", "live", "open"] as AnalyticsMode[]).map((m) => (
              <Chip
                key={m}
                label={ANALYTICS_MODE[m]}
                selected={filters.mode === m}
                onClick={() => update({ mode: m })}
              />
            ))}
          </div>
        </div>
        <div className="ex-sheet-group">
          <div className="ex-sheet-label">সময়কাল</div>
          <div className="ex-sheet-row">
            {WINDOW_PRESETS.map((n) => (
              <Chip
                key={n}
                label={windowLabel(n)}
                selected={filters.lastN === n}
                onClick={() => update({ lastN: n })}
              />
            ))}
            <Chip
              label="সব সময়"
              selected={filters.lastN === null}
              onClick={() => update({ lastN: null })}
            />
          </div>
        </div>
      </div>
    </FilterSheet>
  );
}
