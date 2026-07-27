import { useState } from "react";
import { Button, Tag, Typography } from "antd";
import { OptionRow } from "../../components/OptionRow";
import { QuestionContentView } from "../questions/QuestionContentView";
import type { QbankOption } from "../../api/types";

const BN_LETTERS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

type Props = {
  // Optional (7d): a host that already prints the stem in its own head — the notebook's
  // collapsed entry card — passes none, so the question is not shown twice.
  stemHtml?: string;
  multipleCorrect: boolean;
  options: QbankOption[];
  explanationHtml: string | null;
  takeawayText: string | null;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  // 7d: drop the outer shell (border/background/padding) so the reveal flow can live
  // inside another card's body. Default false keeps every standalone usage unchanged.
  bare?: boolean;
};

export function QuestionRevealCard({ stemHtml, multipleCorrect, options, explanationHtml, takeawayText, header, footer, bare = false }: Props) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={bare ? undefined : { border: "1px solid var(--ex-line)", borderRadius: 12, background: "var(--ex-card)", padding: 16 }}>
      {header}
      {stemHtml && <QuestionContentView html={stemHtml} />}
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
      {footer}
    </div>
  );
}
