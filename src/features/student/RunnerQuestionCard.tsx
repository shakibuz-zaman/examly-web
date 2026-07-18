import { Card, Tag, Typography } from "antd";
import { OptionRow } from "../../components/OptionRow";
import { QuestionContentView } from "../questions/QuestionContentView";
import type { TakeQuestion } from "../../api/types";

const BN_LETTERS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

type RunnerQuestionCardProps = {
  question: TakeQuestion;
  number: number; // continuous across sections
  selected: string[];
  onChange: (selectedOptionIds: string[]) => void;
};

export function RunnerQuestionCard({
  question,
  number,
  selected,
  onChange,
}: RunnerQuestionCardProps) {
  return (
    <Card style={{ maxWidth: 720, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Typography.Text strong className="tnum" style={{ color: "var(--ex-ink-soft)" }}>
          প্রশ্ন {number}
        </Typography.Text>
        <Tag className="tnum" style={{ marginInlineEnd: 0 }}>
          {question.effectiveMarks} নম্বর
        </Tag>
      </div>
      <div style={{ fontSize: 18, lineHeight: 1.8 }}>
        <QuestionContentView html={question.stemHtml} />
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {question.options.map((option, index) => {
          const checked = selected.includes(option.id);
          const toggle = () => {
            if (question.multipleCorrect) {
              onChange(
                checked
                  ? selected.filter((id) => id !== option.id)
                  : [...selected, option.id],
              );
            } else {
              onChange([option.id]);
            }
          };
          return (
            <OptionRow
              key={option.id}
              optionKey={BN_LETTERS[index] ?? String(index + 1)}
              state={checked ? "selected" : "default"}
              multiple={question.multipleCorrect}
              onSelect={toggle}
            >
              <QuestionContentView html={option.html} />
            </OptionRow>
          );
        })}
      </div>
      {question.multipleCorrect && (
        <Typography.Text
          type="secondary"
          style={{ display: "block", marginTop: 8, fontSize: 12 }}
        >
          একাধিক উত্তর নির্বাচন করা যায়
        </Typography.Text>
      )}
    </Card>
  );
}
