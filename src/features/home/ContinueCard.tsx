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
  // Both counts are null unless type === "resume". The positive-denominator clause is no
  // longer the NaN guard — MeterBar keeps its own now — it is the editorial one: a bar over
  // a zero-question paper measures nothing, so it does not ship. Resolved once so the
  // visible value row and the announced aria-valuetext are literally the same string.
  const { answeredCount, questionCount } = card;
  const progress =
    answeredCount != null && questionCount != null && questionCount > 0
      ? {
          percent: (answeredCount / questionCount) * 100,
          text: `${bnNum(answeredCount)}/${bnNum(questionCount)}`,
        }
      : null;

  return (
    <div className="ex-card ex-continuecard">
      {/* Not «চালিয়ে যান» — the SectionHeader directly above already says that. */}
      <div className="ex-continuecard-eyebrow">{isResume ? "অসমাপ্ত পরীক্ষা" : "পরের টেস্ট"}</div>
      <div className="ex-continuecard-title">{card.title}</div>
      {/* `name` because the only visible text here is «৩/১০», which says how far but not
          how far through WHAT; the progressbar needs the noun. valueText so AT reads the
          same «৩/১০» the eye does, instead of aria-valuenow's ASCII "30 percent". */}
      {progress && (
        <MeterBar
          percent={progress.percent}
          name="অগ্রগতি"
          valueText={progress.text}
          trailing={progress.text}
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
