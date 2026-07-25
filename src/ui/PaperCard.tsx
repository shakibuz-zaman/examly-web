import type { KeyboardEvent, MouseEvent } from "react";
import { PillButton } from "./PillButton";
import { bnNum } from "../lib/bn";

// Qbank compact card (§4 PaperCard, §7): title, count + উত্তরসহ tag, tonal practice
// CTA. Whole card opens the paper page; the CTA goes straight to the practice runner
// (stopPropagation so it doesn't also navigate).
export function PaperCard({
  title,
  questionCount,
  onOpen,
  onPractice,
  practicing = false,
}: {
  title: string;
  questionCount: number;
  onOpen: () => void;
  onPractice: () => void;
  practicing?: boolean;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Only card-originated keys open the paper — Enter on the nested CTA would
    // otherwise bubble here AND synthesize the button's click (two navigations).
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };
  const practice = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onPractice();
  };
  return (
    <div className="ex-papercard ex-hover-lift ex-ring" role="button" tabIndex={0} onClick={onOpen} onKeyDown={onKeyDown}>
      <div className="ex-papercard-title">{title}</div>
      <div className="ex-papercard-meta">
        <span>{bnNum(questionCount)} প্রশ্ন</span>
        <span className="ex-papercard-ans">উত্তরসহ</span>
      </div>
      <PillButton variant="tonal" size="sm" className="ex-papercard-cta" disabled={practicing} onClick={practice}>
        {practicing ? "শুরু হচ্ছে…" : "প্র্যাকটিস টেস্ট দিন"}
      </PillButton>
    </div>
  );
}
