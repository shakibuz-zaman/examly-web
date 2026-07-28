import { useState } from "react";
import { Tag } from "antd";
import { OptionRow } from "../../components/OptionRow";
import { QuestionContentView } from "../questions/QuestionContentView";
import { PillButton } from "../../ui/PillButton";
import type { QbankOption } from "../../api/types";

const BN_LETTERS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

// Recall-then-reveal body for a ভুলের খাতা entry (D7): options stay behind উত্তর দেখুন
// until the student asks for them. Moved out of features/qbank in the 7e pre-flight —
// qbank browses with the answers already on screen (PaperQuestionCard), so NotebookEntryCard
// has been the only caller since 7d, and the props that served the old standalone qbank
// usage (stemHtml, header, footer, and the shell-drawing `bare={false}`) went with it:
// the notebook prints the stem in its own collapsed head and supplies the card around this.
// Re-skinned onto PillButton + tokened divs in 7e (D21) — the state machine is untouched:
// `revealed` still starts false on every mount, so expanding the card shows the CTA, never
// the answers.
type Props = {
  multipleCorrect: boolean;
  options: QbankOption[];
  explanationHtml: string | null;
  takeawayText: string | null;
};

export function QuestionRevealCard({ multipleCorrect, options, explanationHtml, takeawayText }: Props) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div>
      {revealed ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {options.map((o, i) => (
              <OptionRow key={o.id} optionKey={BN_LETTERS[i] ?? String(i + 1)}
                state={o.isCorrect ? "correct" : "default"}
                // Browse/reveal card has no per-student selection, so aria-checked stays
                // false for every row (honest: nothing was picked). Correctness is conveyed
                // by the trailing tag below, not by aria-checked — that also gives a text
                // (non-color-only) correctness cue (WCAG 1.4.1).
                trailing={o.isCorrect ? <Tag color="green">সঠিক উত্তর</Tag> : undefined}
                multiple={multipleCorrect} disabled>
                <QuestionContentView html={o.html} />
              </OptionRow>
            ))}
          </div>
          {explanationHtml && (
            <div style={{ marginTop: 12 }}>
              <div className="ex-reveal-explain">ব্যাখ্যা</div>
              <QuestionContentView html={explanationHtml} />
            </div>
          )}
          {takeawayText && <div className="ex-reveal-takeaway">{takeawayText}</div>}
        </>
      ) : (
        <PillButton
          variant="outline"
          size="sm"
          style={{ marginTop: 12 }}
          onClick={() => setRevealed(true)}
        >
          উত্তর দেখুন
        </PillButton>
      )}
    </div>
  );
}
