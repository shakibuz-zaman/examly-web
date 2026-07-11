import { Card, Checkbox, Radio, Tag, Typography } from "antd";
import { QuestionContentView } from "../questions/QuestionContentView";
import type { TakeQuestion } from "../../api/types";

const BN_LETTERS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

type RunnerQuestionCardProps = {
  question: TakeQuestion;
  number: number;             // continuous across sections, like ExamPreview
  selected: string[];
  saved: boolean;
  onChange: (selectedOptionIds: string[]) => void;
};

export function RunnerQuestionCard({
  question,
  number,
  selected,
  saved,
  onChange,
}: RunnerQuestionCardProps) {
  return (
    <Card size="small" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Typography.Text strong>{number}.</Typography.Text>
        <div style={{ flex: 1, minWidth: 0 }}>
          <QuestionContentView html={question.stemHtml} />
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
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
                <div
                  key={option.id}
                  onClick={toggle}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                    padding: "6px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: checked ? "#e6f4ff" : undefined,
                  }}
                >
                  {/* The row handles clicks; the input is display-only. */}
                  <span style={{ pointerEvents: "none" }}>
                    {question.multipleCorrect ? (
                      <Checkbox checked={checked} />
                    ) : (
                      <Radio checked={checked} />
                    )}
                  </span>
                  <Typography.Text>{BN_LETTERS[index] ?? index + 1}.</Typography.Text>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <QuestionContentView html={option.html} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 56 }}>
          <Tag>{question.effectiveMarks}</Tag>
          {saved && (
            <Typography.Text type="success" style={{ fontSize: 12, display: "block" }}>
              saved ✓
            </Typography.Text>
          )}
        </div>
      </div>
    </Card>
  );
}
