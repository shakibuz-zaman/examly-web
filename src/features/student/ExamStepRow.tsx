import type { ReactNode } from "react";

// Named so each page's row-state helper can annotate its return type; the union itself is
// unchanged. A type-only export leaves the file component-only for react-refresh (the
// FilterChipItem precedent in ui/FilterChips.tsx).
export type StepState = "done" | "running" | "pending" | "todo";

// §5.1: one row shape for bundle members AND lobby attempts, so the status vocabulary
// exists once. The two pages are one tap apart; duplicating these rows is what left the
// model-test page half-translated.
export function ExamStepRow({
  state, title, meta, action,
}: {
  state: StepState;
  title: ReactNode;
  meta: ReactNode;
  action?: ReactNode;
}) {
  const mark = { done: "✓", running: "▶", pending: "⏳", todo: "○" }[state];
  const markClass = state === "done" ? "is-done" : state === "running" ? "is-running" : "";
  return (
    <div className="ex-steprow">
      {/* The glyph is decoration: `meta` already states the status in words, so it stays
          out of the accessible name (the pre-flight glyph sweep's rule). Every state
          renders one — .ex-steprow-mark's default surface is --ex-stage on a card (1.21:1),
          so an empty mark would be an invisible hole rather than a quiet dot. */}
      <span className={`ex-steprow-mark ${markClass}`} aria-hidden>{mark}</span>
      <div className="ex-steprow-main">
        <div className="ex-steprow-title">{title}</div>
        <div className="ex-steprow-meta">{meta}</div>
      </div>
      {action}
    </div>
  );
}
