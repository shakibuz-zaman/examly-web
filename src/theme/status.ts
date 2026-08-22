// LEGACY antd `Tag` colour map, still on exactly two consumers — the ADMIN surfaces
// `AdminQbankPage` and `AdminQbankPaperPage`. Every examiner surface renders status through
// `ui/StatusChip`'s `ContentStatusChip` (tint + Bengali label from `lib/labels`.CONTENT_STATUS)
// instead. 7g Task 6 rebuilt both admin pages' chrome and DELIBERATELY left the Tag: those
// bodies are English (7g D1) and ContentStatusChip's labels are Bengali by design, so swapping
// would have printed «খসড়া» in the middle of an English admin table. Each call site now goes
// through `lib/lookup`.lookup and pairs the tint with its own English word. The map dies when
// the admin area gets an English chip of its own (7g D7, post-series) — not before, and not by
// growing a third consumer.
export const CONTENT_STATUS_COLORS: Record<string, string> = {
  draft: "gold", active: "green", published: "green", archived: "default",
};
// NOT legacy, and NOT English any more: both consumers — the examiner results table
// (`ExamResultsPage`) and the student's `MyAttemptsPage` — now render the Bengali word from
// `lib/labels`.ATTEMPT_STATUS and take only the antd `Tag` tint from here. An attempt STATE is
// a different axis from content status, so it deliberately does not borrow `ui/StatusChip`'s
// `--draft/--active/--published/--archived` tints: re-colouring exam status must not silently
// re-colour this. Keep the two maps keyed alike — a new attempt state needs an entry in both.
export const ATTEMPT_STATUS_COLORS: Record<string, string> = {
  in_progress: "processing", submitted: "green", expired: "orange",
};
