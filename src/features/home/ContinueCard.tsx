import { useNavigate } from "react-router-dom";
import { bnNum } from "../../lib/bn";
import { MeterBar } from "../../ui/MeterBar";
import { PillButton } from "../../ui/PillButton";
import type { HomeContinue } from "../../api/types";

// resume attempts always live on an exam lobby; "next" can be either kind.
function lobbyPath(card: HomeContinue): string {
  if (card.type === "resume") return `/student/exams/${card.id}`;
  return card.kind === "exam"
    ? `/student/exams/${card.id}`
    : `/student/model-tests/${card.id}`;
}

export function ContinueCard({ card }: { card: HomeContinue | null }) {
  const navigate = useNavigate();
  if (!card) return null;

  const isResume = card.type === "resume";
  return (
    <div className="ex-card ex-continuecard">
      {/* Not «চালিয়ে যান» — the SectionHeader directly above already says that. */}
      <div className="ex-continuecard-eyebrow">{isResume ? "অসমাপ্ত পরীক্ষা" : "পরের টেস্ট"}</div>
      <div className="ex-continuecard-title">{card.title}</div>
      {/* Both counts are null unless type === "resume". The positive-denominator clause
          is no longer the NaN guard — MeterBar keeps its own now — it is the editorial
          one: a bar over a zero-question paper measures nothing, so it does not ship.
          `name` because the only visible text here is «৩/১০», which says how far but not
          how far through WHAT; the progressbar needs the noun. */}
      {card.answeredCount != null && card.questionCount != null && card.questionCount > 0 && (
        <MeterBar
          percent={(card.answeredCount / card.questionCount) * 100}
          name="অগ্রগতি"
          trailing={`${bnNum(card.answeredCount)}/${bnNum(card.questionCount)}`}
        />
      )}
      <PillButton
        className="ex-continuecard-cta"
        variant="primary"
        onClick={() => navigate(lobbyPath(card))}
      >
        {isResume ? "চালান" : "শুরু করি"}
      </PillButton>
    </div>
  );
}
