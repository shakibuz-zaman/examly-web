import { Card, Typography } from "antd";
import { PillButton } from "./PillButton";

// The house "a fetch failed" control, in the two shapes the 6b ticket settled on.
// Lived inside OrgDashboard until Task 9 gave it a third and fourth caller (the results
// table and the exam analytics tab); it is the same sentence-plus-pill in all of them, so
// it moves here rather than being re-typed per surface.
//
//   tone="panel" — there is NOTHING to show. Replaces the content.
//   tone="strip" — a previous answer is still on screen and stays there; this rides above it
//                  and says the numbers below are the old ones.
//
// Choosing between them is the caller's job and the rule is `!data`, never `isError`:
// TanStack keeps `data` through a SAME-KEY refetch failure, so `isError || !data` would throw
// away numbers we still hold. See the branch comment in OrgDashboard for the full derivation.
//
// `framed` applies to tone="panel" only and defaults on. A caller that is ITSELF a Card —
// PositionCard, whose whole body is the panel — passes framed={false} so the notice does
// not draw a second bordered box inside the first. The copy, the pill and the busy guard
// are identical either way; only the outer Card is dropped.
export function RetryNotice({
  tone,
  busy,
  onRetry,
  framed = true,
}: { tone: "panel" | "strip"; busy: boolean; onRetry: () => void; framed?: boolean }) {
  const body = (
    <>
      <Typography.Text type="secondary" style={{ fontSize: tone === "strip" ? 12.5 : undefined }}>
        {tone === "panel"
          ? "ডেটা আনা যায়নি — একটু পরে আবার চেষ্টা করুন।"
          : "নতুন ডেটা আনা যায়নি — নিচের হিসাব আগের বারের।"}
      </Typography.Text>
      {/* A retry already in flight must not accept a second click — the pill gives no other
          feedback, so without this it reads as dead and invites a queue of refetches. The
          strip is where this is actually visible: refetching with NO data sends query-core's
          status back to "pending" (the fetch reducer only keeps the old status when data
          exists), so the panel swaps itself for the skeleton the instant it is clicked and its
          own disabled state never gets to render. Keep it on both anyway — the guard belongs
          to the control, not to whichever branch happens to out-race it. */}
      <PillButton
        variant="tonal"
        size={tone === "strip" ? "sm" : "md"}
        disabled={busy}
        onClick={onRetry}
      >
        আবার চেষ্টা করুন
      </PillButton>
    </>
  );
  const column = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
      {body}
    </div>
  );
  return tone === "panel" ? (
    framed ? <Card>{column}</Card> : column
  ) : (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
      {body}
    </div>
  );
}
