// LEGACY antd `Tag` colour map, kept alive for exactly two remaining consumers — the ADMIN
// surfaces `AdminQbankPage` and `AdminQbankPaperPage`, which stay English/antd until Plan 7g.
// Every examiner surface now renders status through `ui/StatusChip`'s `ContentStatusChip`
// (tint + Bengali label from `lib/labels`.CONTENT_STATUS). 7g deletes this file's first export
// when it converts those two pages; do not add new consumers.
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
