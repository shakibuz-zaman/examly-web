import { useState, type KeyboardEvent } from "react";
import { Tag } from "antd";
import { ChevronDown } from "lucide-react";
import { OptionRow } from "../../components/OptionRow";
import { QuestionContentView } from "../questions/QuestionContentView";
import { PillButton } from "../../ui/PillButton";
import { bnNum } from "../../lib/bn";
import type { QbankQuestion } from "../../api/types";

const BN_LETTERS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

// §7 paper page: collapsed stem card → 200ms expand revealing options with the
// correct one highlighted, «কেন সঠিক» box, 💡 takeaway and the notebook save action.
// Qbank is browse-with-answers — no per-student selection, so aria-checked stays
// false on every row (honest: nothing was picked); correctness is conveyed by the
// trailing tag, a text (non-color-only) cue (WCAG 1.4.1).
export function PaperQuestionCard({
  question,
  subjectLabel,
  defaultExpanded = false,
  saved,
  saving,
  disabled = false,
  onSave,
}: {
  question: QbankQuestion;
  subjectLabel: string | null;
  defaultExpanded?: boolean;
  saved: boolean;
  // THIS card's turn — drives the label only.
  saving: boolean;
  // List-wide "a save is in flight": the page guards on a single pending id, so
  // every other card's button must go dead too or the clicks are silently dropped.
  disabled?: boolean;
  onSave: () => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const toggle = () => setExpanded((v) => !v);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };
  return (
    <div className={expanded ? "ex-qcard is-expanded" : "ex-qcard"} id={`q-${question.id}`}>
      {/* div+role, not <button>: the stem HTML contains block elements. */}
      <div
        className="ex-qcard-head"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`q-${question.id}-body`}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        {/* div, not span: QuestionContentView renders block content — a span
            wrapper would be invalid nesting (.ex-qcard-stem is already flex, so
            no visual change). The order prefix stays inline. */}
        <div className="ex-qcard-stem">
          <span className="ex-qcard-order">{bnNum(question.order)}.</span>
          <QuestionContentView html={question.stemHtml} />
        </div>
        <ChevronDown size={16} strokeWidth={2} aria-hidden className="ex-qcard-caret" />
      </div>
      {subjectLabel && <div className="ex-qcard-subject">{subjectLabel}</div>}
      <div className="ex-qcard-body" id={`q-${question.id}-body`}>
        <div className="ex-qcard-bodyinner">
          <div className="ex-qcard-options">
            {question.options.map((o, i) => (
              <OptionRow
                key={o.id}
                optionKey={BN_LETTERS[i] ?? String(i + 1)}
                state={o.isCorrect ? "correct" : "default"}
                trailing={o.isCorrect ? <Tag color="green">সঠিক উত্তর</Tag> : undefined}
                multiple={question.multipleCorrect}
                disabled
              >
                <QuestionContentView html={o.html} />
              </OptionRow>
            ))}
          </div>
          {question.explanationHtml && (
            <div className="ex-qcard-why">
              <span className="ex-qcard-whylabel">কেন সঠিক:</span>
              <QuestionContentView html={question.explanationHtml} />
            </div>
          )}
          {question.takeawayText && <div className="ex-qcard-takeaway">💡 {question.takeawayText}</div>}
          <div className="ex-qcard-actions">
            <PillButton variant="tonal" size="sm" disabled={disabled || saved || saving} onClick={onSave}>
              {saved ? "ভুলের খাতায় আছে ✓" : saving ? "রাখা হচ্ছে…" : "ভুলের খাতায় রাখুন"}
            </PillButton>
          </div>
        </div>
      </div>
    </div>
  );
}
