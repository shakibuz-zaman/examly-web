import { useState } from "react";
import { Button, Typography } from "antd";
import { OptionRow } from "../../components/OptionRow";
import { QuestionContentView } from "../questions/QuestionContentView";
import type { QbankOption } from "../../api/types";

const BN_LETTERS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

type Props = {
  stemHtml: string;
  multipleCorrect: boolean;
  options: QbankOption[];
  explanationHtml: string | null;
  takeawayText: string | null;
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

export function QuestionRevealCard({ stemHtml, multipleCorrect, options, explanationHtml, takeawayText, header, footer }: Props) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={{ border: "1px solid var(--ex-line)", borderRadius: 12, background: "var(--ex-card)", padding: 16 }}>
      {header}
      <QuestionContentView html={stemHtml} />
      {revealed ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {options.map((o, i) => (
              <OptionRow key={o.id} optionKey={BN_LETTERS[i] ?? String(i + 1)}
                state={o.isCorrect ? "correct" : "default"}
                // No per-student selection on this browse/reveal card — the revealed
                // answer is the correct option, so it carries aria-checked (was always
                // false because the "correct" state never maps to selected).
                checked={o.isCorrect}
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
