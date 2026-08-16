// LEGACY antd `Tag` colour map, kept alive for exactly two remaining consumers — the ADMIN
// surfaces `AdminQbankPage` and `AdminQbankPaperPage`, which stay English/antd until Plan 7g.
// Every examiner surface now renders status through `ui/StatusChip`'s `ContentStatusChip`
// (tint + Bengali label from `lib/labels`.CONTENT_STATUS). 7g deletes this file's first export
// when it converts those two pages; do not add new consumers.
export const CONTENT_STATUS_COLORS: Record<string, string> = {
  draft: "gold", active: "green", published: "green", archived: "default",
};
export const ATTEMPT_STATUS_COLORS: Record<string, string> = {
  in_progress: "processing", submitted: "green", expired: "orange",
};
