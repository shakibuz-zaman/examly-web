import type { AttemptState, BilingualText } from "../api/types";
import type { AnalyticsMode } from "../features/analytics/filters";

// Repeated enum→label maps only (D17). Prose stays inline where it renders; these are the
// maps that were duplicated across pages and drifted into half-translation.

// Keyed to the real union, not `string`, so a new attempt state fails the build here (naming
// the missing key) instead of leaking `undefined` into the UI. `"not_started" | AttemptState`
// is the widest of the two consumers' key types: the bundle row's `myStatus` (types.ts:369)
// adds "not_started" to the plain `AttemptState` (types.ts:315) that `MyAttemptItem.status`
// and `MyAttemptSummary.status` carry, so both index this map safely.
export const ATTEMPT_STATUS: Record<"not_started" | AttemptState, string> = {
  not_started: "শুরু হয়নি",
  in_progress: "চলমান",
  submitted: "জমা হয়েছে",
  expired: "সময় শেষ",
};

// `string`-keyed on purpose: the student-side consumer is `DifficultyRow.difficulty`
// (api/analytics.ts:10), a bare string on the wire. No union to key to.
export const DIFFICULTY: Record<string, string> = {
  easy: "সহজ",
  medium: "মাঝারি",
  hard: "কঠিন",
};

export const ANALYTICS_MODE: Record<AnalyticsMode, string> = {
  all: "সব",
  live: "লাইভ",
  open: "ওপেন",
};

// `string`-keyed on purpose: the wire's `sourceKind` union ("exam" | "qbank" | null,
// types.ts:824) cannot key this map, because `practice` has no sender yet. Keep that key —
// it is forward-looking, not dead: an open ticket backfills the source from the stored ids
// (sourcePaperId ⇒ qbank, sourceAttemptId ⇒ exam, neither ⇒ practice-born), and the
// practice fallback already renders today off a null sourceLabel (D5).
export const NOTEBOOK_SOURCE: Record<string, string> = {
  exam: "পরীক্ষা",
  qbank: "প্রশ্নব্যাংক",
  practice: "প্র্যাকটিস",
};

// Bengali-first taxonomy label. The server sends both halves for every taxonomy node; the
// old EN-first join lives in StrengthMap and is replaced by this in Task 9.
// `||` over `??` deliberately: the API's taxonomy validator requires only one half to be
// non-blank and never normalises the other, so `{ bn: "", en: "History" }` is a shape some
// other API client can write. `??` would keep the `""` and render an empty label; this must
// never print `"null"` *or* nothing.
export function bilingualLabel(name: BilingualText | null): string {
  if (!name) return "অন্যান্য";
  return name.bn?.trim() || name.en?.trim() || "—";
}
