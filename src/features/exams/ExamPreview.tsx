import { Card, Collapse, Space, Tag, Typography } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import { QuestionContentView } from "../questions/QuestionContentView";
import { bnNum } from "../../lib/bn";
import { formatDurationBn } from "../../lib/format";
import type { ExamResponse } from "../../api/types";

const BN_LETTERS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

type ExamPreviewProps = { exam: ExamResponse };

// Renders the assembled paper the way a student will see it (order as authored;
// shuffle happens per-student at runtime). Correct answers and explanations are
// visible because this is the EXAMINER's preview.
export function ExamPreview({ exam }: ExamPreviewProps) {
  const sectionOffsets = exam.sections.reduce<number[]>((acc, _s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + exam.sections[i - 1].questions.length);
    return acc;
  }, []);
  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 0 }}>{exam.title}</Typography.Title>
      {exam.description && <Typography.Paragraph type="secondary">{exam.description}</Typography.Paragraph>}
      {/* Same three facts, same formatters as the student lobby's facts card — the point of a
          preview is that the examiner reads what the student will read. */}
      <Space size="large" style={{ marginBottom: 16 }}>
        <Typography.Text>সময়: <strong>{formatDurationBn(exam.durationMinutes)}</strong></Typography.Text>
        <Typography.Text>মোট নম্বর: <strong>{bnNum(exam.totalMarks)}</strong></Typography.Text>
        {exam.negativeMarks > 0 && (
          <Typography.Text type="danger">প্রতি ভুলে −{bnNum(exam.negativeMarks)}</Typography.Text>
        )}
      </Space>

      {exam.sections.map((section, sIndex) => (
        <div key={section.id} style={{ marginBottom: 24 }}>
          {(section.title || exam.sections.length > 1) && (
            <Typography.Title level={4}>
              {section.title ?? `সেকশন ${bnNum(sIndex + 1)}`}
            </Typography.Title>
          )}
          {section.questions.map((q, qIndex) => {
            return (
              <Card key={q.questionId} size="small" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <Typography.Text strong>{sectionOffsets[sIndex] + qIndex + 1}.</Typography.Text>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <QuestionContentView html={q.stemHtml} />
                    <div style={{ marginTop: 8 }}>
                      {q.options.map((option, oIndex) => (
                        <div
                          key={option.id}
                          style={{
                            display: "flex", gap: 8, alignItems: "flex-start",
                            padding: "4px 8px", borderRadius: 4,
                            // House tokens, not the antd-green pair this was built with:
                            // #f6ffed on a dark card was an unreadable near-white band, and
                            // the tint/solid pair is theme-aware in both modes.
                            background: option.isCorrect ? "var(--ex-green-tint)" : undefined,
                          }}
                        >
                          <Typography.Text>{BN_LETTERS[oIndex] ?? oIndex + 1}.</Typography.Text>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <QuestionContentView html={option.html} />
                          </div>
                          {option.isCorrect && (
                            <CheckCircleFilled
                              aria-label="সঠিক উত্তর"
                              style={{ color: "var(--ex-green)", marginTop: 4 }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    {q.explanationHtml && (
                      <Collapse
                        ghost
                        size="small"
                        items={[{
                          key: "explanation",
                          label: "ব্যাখ্যা",
                          children: <QuestionContentView html={q.explanationHtml} />,
                        }]}
                      />
                    )}
                  </div>
                  <Tag>{bnNum(q.effectiveMarks)} নম্বর</Tag>
                </div>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
