import { useState, type KeyboardEvent } from "react";
import { Tag } from "antd";
import { ChevronDown } from "lucide-react";
import { QuestionContentView } from "../questions/QuestionContentView";
import { QuestionRevealCard } from "./QuestionRevealCard";
import { bnNum } from "../../lib/bn";
import type { NotebookEntry } from "../../api/types";

// ভুলের খাতা entry (spec §8): collapsed stem preview + «N বার ভুল» badge +
// «subject · source · আজ ডিউ» meta, expanding to the reveal flow. Reuses the qbank
// .ex-qcard classes — they already carry the grid-rows expand, the visibility rule that
// keeps a collapsed body out of the tab order AND the a11y tree, and the reduced-motion
// kill. What it does NOT reuse is qbank's browse-with-answers body: revision is
// recall-then-reveal, so the options stay behind উত্তর দেখুন until the student asks (D7).
export function NotebookEntryCard({ entry }: { entry: NotebookEntry }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  const subjectLabel = entry.subjectName?.bn || entry.subjectName?.en;
  // Deliberately NOT a plain null-check on sourceLabel: an exam-born entry whose title
  // lookup resolved nothing must render NO source, while a practice-born one (kind
  // "qbank", no paper id — D5) is the «প্র্যাকটিস» case. sourceKind is never null on the
  // wire (the domain defaults it to "exam"), so this only ever splits exam vs qbank.
  const sourceLabel = entry.sourceLabel ?? (entry.sourceKind === "qbank" ? "প্র্যাকটিস" : null);
  const textMeta = [subjectLabel, sourceLabel].filter((v): v is string => !!v).join(" · ");

  return (
    <div className={expanded ? "ex-qcard is-expanded" : "ex-qcard"}>
      {/* div+role, not <button>: the stem HTML contains block elements. The head has no
          interactive children, so role="button" is the correct pattern here and Enter/Space
          needs no click-target guard — same reasoning as PaperQuestionCard. */}
      <div
        className="ex-qcard-head"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`nb-${entry.id}-body`}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        <div className="ex-qcard-stem">
          <QuestionContentView html={entry.stemHtml} />
        </div>
        <span className="ex-nb-headside">
          {/* Manual qbank saves are neutral (wrongCount 0) — no red badge for them. */}
          {entry.wrongCount > 0 && <Tag color="red">{bnNum(entry.wrongCount)} বার ভুল</Tag>}
          <ChevronDown size={16} strokeWidth={2} aria-hidden className="ex-qcard-caret" />
        </span>
      </div>
      {(textMeta || entry.due) && (
        <div className="ex-nb-meta">
          {textMeta}
          {textMeta && entry.due && " · "}
          {entry.due && <span className="ex-nb-due">আজ ডিউ</span>}
        </div>
      )}
      <div className="ex-qcard-body" id={`nb-${entry.id}-body`}>
        <div className="ex-qcard-bodyinner">
          {/* The reveal body carries no stem and no shell of its own — the head above
              already prints the question, and this .ex-qcard is the card. */}
          <QuestionRevealCard
            multipleCorrect={entry.multipleCorrect}
            options={entry.options}
            explanationHtml={entry.explanationHtml}
            takeawayText={entry.takeawayText}
          />
        </div>
      </div>
    </div>
  );
}
