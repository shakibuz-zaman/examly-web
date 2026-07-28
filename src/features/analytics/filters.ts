import { useSearchParams } from "react-router-dom";

export type AnalyticsMode = "all" | "live" | "open";
export type AnalyticsFilters = {
  categoryId: string | null;
  mode: AnalyticsMode;
  lastN: number | null;
};

export function analyticsQueryString(
  f: AnalyticsFilters, overrides?: Partial<AnalyticsFilters>,
): string {
  const merged = { ...f, ...overrides };
  const p = new URLSearchParams();
  if (merged.categoryId) p.set("categoryId", merged.categoryId);
  if (merged.mode !== "all") p.set("mode", merged.mode);
  if (merged.lastN) p.set("lastN", String(merged.lastN));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// URL-backed so links are shareable (spec §7).
export function useAnalyticsFilters() {
  const [params, setParams] = useSearchParams();
  // Number("abc") is NaN and NaN !== null, so without the isFinite guard a junk ?lastN counts
  // as an active filter and paints a «শেষ NaN» ✕-chip. The presence check stays in front of
  // it: Number(null) and Number("") are 0, which IS finite, and the clamp would turn an
  // absent param into 1. Any finite value still clamps into 1–200, so D10 holds — a
  // bookmarked ?lastN=37 applies and shows as its own chip.
  const rawLastN = Number(params.get("lastN"));
  const filters: AnalyticsFilters = {
    categoryId: params.get("category"),
    mode: (["all", "live", "open"] as const).find((m) => m === params.get("mode")) ?? "all",
    lastN: params.get("lastN") && Number.isFinite(rawLastN)
      ? Math.max(1, Math.min(200, rawLastN)) : null,
  };
  function update(patch: Partial<AnalyticsFilters>) {
    const next = new URLSearchParams(params);
    const set = (key: string, value: string | null) =>
      value === null ? next.delete(key) : next.set(key, value);
    if ("categoryId" in patch) set("category", patch.categoryId ?? null);
    if ("mode" in patch) set("mode", patch.mode === "all" ? null : patch.mode!);
    if ("lastN" in patch) set("lastN", patch.lastN ? String(patch.lastN) : null);
    setParams(next, { replace: true });
  }
  return { filters, update };
}
