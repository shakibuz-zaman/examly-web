import { Card, Collapse, Space, Tag, Typography } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import { QuestionContentView } from "../questions/QuestionContentView";
import type { ExamResponse } from "../../api/types";

const BN_LETTERS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

type ExamPreviewProps = { exam: ExamResponse };

// Renders the assembled paper the way a student will see it (order as authored;
// shuffle happens per-student at runtime). Correct answers and explanations are
// visible because this is the EXAMINER's preview.
export function ExamPreview({ exam }: ExamPreviewProps) {
  let number = 0;
  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 0 }}>{exam.title}</Typography.Title>
      {exam.description && <Typography.Paragraph type="secondary">{exam.description}</Typography.Paragraph>}
      <Space size="large" style={{ marginBottom: 16 }}>
        <Typography.Text>Duration: <strong>{exam.durationMinutes} min</strong></Typography.Text>
        <Typography.Text>Total marks: <strong>{exam.totalMarks}</strong></Typography.Text>
        {exam.negativeMarks > 0 && (
          <Typography.Text type="danger">−{exam.negativeMarks} per wrong answer</Typography.Text>
        )}
      </Space>

      {exam.sections.map((section, sIndex) => (
        <div key={section.id} style={{ marginBottom: 24 }}>
          {(section.title || exam.sections.length > 1) && (
            <Typography.Title level={4}>
              {section.title ?? `Section ${sIndex + 1}`}
            </Typography.Title>
          )}
          {section.questions.map((q) => {
            number += 1;
            return (
              <Card key={q.questionId} size="small" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <Typography.Text strong>{number}.</Typography.Text>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <QuestionContentView html={q.stemHtml} />
                    <div style={{ marginTop: 8 }}>
                      {q.options.map((option, oIndex) => (
                        <div
                          key={option.id}
                          style={{
                            display: "flex", gap: 8, alignItems: "flex-start",
                            padding: "4px 8px", borderRadius: 4,
                            background: option.isCorrect ? "#f6ffed" : undefined,
                          }}
                        >
                          <Typography.Text>{BN_LETTERS[oIndex] ?? oIndex + 1}.</Typography.Text>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <QuestionContentView html={option.html} />
                          </div>
                          {option.isCorrect && <CheckCircleFilled style={{ color: "#52c41a", marginTop: 4 }} />}
                        </div>
                      ))}
                    </div>
                    {q.explanationHtml && (
                      <Collapse
                        ghost
                        size="small"
                        items={[{
                          key: "explanation",
                          label: "Explanation",
                          children: <QuestionContentView html={q.explanationHtml} />,
                        }]}
                      />
                    )}
                  </div>
                  <Tag>{q.effectiveMarks} marks</Tag>
                </div>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
