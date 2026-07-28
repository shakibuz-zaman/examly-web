import { Link } from "react-router-dom";
import { useStrength } from "../../api/analytics";
import { MeterBar } from "../../ui/MeterBar";
import { bnNum } from "../../lib/bn";
import { bilingualLabel } from "../../lib/labels";
import type { AnalyticsFilters } from "./filters";

// §8: the five weakest topic rows across every subject. Task 2's nesting is what makes this
// one request instead of one per subject.
export function WeakTopicsCard({ filters }: { filters: AnalyticsFilters }) {
  const strength = useStrength(filters);
  // `t.nodeId &&` is not a belt-and-braces null check: every subject's children carry a row
  // with nodeId AND name null for its topic-untagged facts — the drill endpoint emits the
  // same bucket, so the API cannot drop it — and «অন্যান্য» is not a topic anyone can go
  // practise. lowSample rows are excluded for the older reason: 3 questions is not a verdict.
  const rows = (strength.data ?? [])
    .flatMap((subject) =>
      subject.subtopics
        .filter((t) => t.nodeId && !t.lowSample)
        .map((t) => ({ ...t, subject: bilingualLabel(subject.name) })),
    )
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  if (rows.length === 0) return null;

  return (
    <div className="ex-card ex-weakcard">
      <div className="ex-cardhead">দুর্বল জায়গা</div>
      {rows.map((r) => {
        const topic = `${r.subject} → ${bilingualLabel(r.name)}`;
        return (
          <MeterBar
            key={r.nodeId}
            percent={r.accuracy}
            tone={r.accuracy < 50 ? "coral" : r.accuracy < 70 ? "amber" : "teal"}
            label={topic}
            // `name` is REQUIRED and cannot be satisfied by `label`: label is ReactNode and
            // may resolve to null off a BilingualText, which is exactly the bug the pre-flight
            // batch fixed by making this prop a required string. Same text, one expression —
            // the two must never drift apart.
            name={topic}
            trailing={`${bnNum(r.accuracy)}%`}
            valueText={`${bnNum(r.accuracy)} শতাংশ`}
          />
        );
      })}
      {/* PillButton renders a <button>, so the brief's <PillButton><Link/></PillButton> would
          nest an anchor inside a button. EmptyState's cross-link pattern instead: a real <a>
          wearing the pill classes, which keeps middle-click and copy-link working too. */}
      <Link className="ex-btn ex-btn--tonal ex-btn--sm ex-weakcard-cta" to="/student/qbank">
        এই টপিকে প্র্যাকটিস করুন
      </Link>
    </div>
  );
}
