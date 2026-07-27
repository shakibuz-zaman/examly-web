import { useState } from "react";
import { Button, Tag, Typography } from "antd";
import { OptionRow } from "../../components/OptionRow";
import { QuestionContentView } from "../questions/QuestionContentView";
import type { QbankOption } from "../../api/types";

const BN_LETTERS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

// Recall-then-reveal body for a ভুলের খাতা entry (D7): options stay behind উত্তর দেখুন
// until the student asks for them. Moved out of features/qbank in the 7e pre-flight —
// qbank browses with the answers already on screen (PaperQuestionCard), so NotebookEntryCard
// has been the only caller since 7d, and the props that served the old standalone qbank
// usage (stemHtml, header, footer, and the shell-drawing `bare={false}`) went with it:
// the notebook prints the stem in its own collapsed head and supplies the card around this.
// Still antd Button/Typography inside a 7d card — that re-skin rides with plan 7e's
// notebook work so the expanded body gets designed once, against a real spec.
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
              <Typography.Text strong>ব্যাখ্যা</Typography.Text>
              <QuestionContentView html={explanationHtml} />
            </div>
          )}
          {takeawayText && (
            <Typography.Paragraph strong style={{ marginTop: 8, marginBottom: 0, color: "var(--ex-teal-ink)" }}>
              {takeawayText}
            </Typography.Paragraph>
          )}
        </>
      ) : (
        <Button size="small" style={{ marginTop: 12 }} onClick={() => setRevealed(true)}>
          উত্তর দেখুন
        </Button>
      )}
    </div>
  );
}
