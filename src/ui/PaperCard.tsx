import type { MouseEvent } from "react";
import { PillButton } from "./PillButton";
import { bnNum } from "../lib/bn";

// Qbank compact card (§4 PaperCard, §7): title, count + উত্তরসহ tag, tonal practice
// CTA. The title is the card's real control — a <button> — and the CTA is its
// sibling, so the card offers exactly two named stops. The container is a plain
// div: its onClick is mouse convenience only, NOT a role="button", because ARIA
// 1.2 makes role="button" children-presentational and would risk flattening the
// practice CTA (a primary conversion action) out of the accessibility tree. Both
// inner buttons stopPropagation, so one press is always one navigation.
//
// `practicing` is THIS card's turn (it drives the label only); `disabled` is the
// list-wide "a start is in flight" signal. They are separate because stopPropagation
// means a tap on a still-enabled sibling CTA is swallowed entirely — the parent's
// early-return guard drops it and the first mutation then navigates into the WRONG
// paper. Every CTA must go dead while any start is pending.
export function PaperCard({
  title,
  questionCount,
  onOpen,
  onPractice,
  practicing = false,
  disabled = false,
}: {
  title: string;
  questionCount: number;
  onOpen: () => void;
  onPractice: () => void;
  practicing?: boolean;
  disabled?: boolean;
}) {
  const open = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // the container's onClick would otherwise push the route twice
    onOpen();
  };
  const practice = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onPractice();
  };
  return (
    <div className="ex-papercard ex-hover-lift" onClick={onOpen}>
      <button type="button" className="ex-papercard-title ex-cardtitle-btn" onClick={open}>
        {title}
      </button>
      <div className="ex-papercard-meta">
        <span>{bnNum(questionCount)} প্রশ্ন</span>
        <span className="ex-papercard-ans">উত্তরসহ</span>
      </div>
      <PillButton
        variant="tonal"
        size="sm"
        className="ex-papercard-cta"
        disabled={disabled || practicing}
        onClick={practice}
      >
        {practicing ? "শুরু হচ্ছে…" : "প্র্যাকটিস টেস্ট দিন"}
      </PillButton>
    </div>
  );
}
