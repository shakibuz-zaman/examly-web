import { Button, Card, Empty, Input, InputNumber, Popconfirm, Space, Tag, Typography } from "antd";
import { DeleteOutlined, PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { QuestionContentView } from "../questions/QuestionContentView";
import { SortableList } from "./SortableList";
import type { DraftQuestion, DraftSection } from "./examDraft";

const DIFFICULTY_COLORS: Record<string, string> = { easy: "green", medium: "gold", hard: "red" };

type SectionCardProps = {
  section: DraftSection;
  index: number;
  sectionCount: number;
  readOnly: boolean;
  defaultMarks: number;
  onChange: (section: DraftSection) => void;
  onRemove: () => void;
  // Wired in Task 12 (question picker). Buttons render only when provided.
  onAddQuestions?: () => void;
  onRandomFill?: () => void;
};

export function SectionCard({
  section, index, sectionCount, readOnly, defaultMarks,
  onChange, onRemove, onAddQuestions, onRandomFill,
}: SectionCardProps) {
  const updateQuestion = (questionId: string, patch: Partial<DraftQuestion>) =>
    onChange({
      ...section,
      questions: section.questions.map((q) =>
        q.questionId === questionId ? { ...q, ...patch } : q,
      ),
    });

  const removeQuestion = (questionId: string) =>
    onChange({
      ...section,
      questions: section.questions.filter((q) => q.questionId !== questionId),
    });

  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      title={
        readOnly ? (
          section.title ?? `Section ${index + 1}`
        ) : (
          <Input
            placeholder={`Section ${index + 1} title (optional)`}
            variant="borderless"
            value={section.title ?? ""}
            onChange={(e) => onChange({ ...section, title: e.target.value || null })}
            style={{ fontWeight: 600, paddingLeft: 0 }}
          />
        )
      }
      extra={
        !readOnly && (
          <Space>
            {onAddQuestions && (
              <Button size="small" icon={<PlusOutlined />} onClick={onAddQuestions}>
                Add questions
              </Button>
            )}
            {onRandomFill && (
              <Button size="small" icon={<ThunderboltOutlined />} onClick={onRandomFill}>
                Random fill
              </Button>
            )}
            {sectionCount > 1 && (
              <Popconfirm
                title="Remove this section and its questions?"
                onConfirm={onRemove}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        )
      }
    >
      {section.questions.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No questions yet" />
      ) : (
        <SortableList
          items={section.questions}
          getKey={(q) => q.questionId}
          disabled={readOnly}
          onReorder={(questions) => onChange({ ...section, questions })}
          renderItem={(q, qIndex) => (
            <div
              style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                padding: "8px 0", borderBottom: "1px solid #f0f0f0",
              }}
            >
              <span style={{ color: "#999", minWidth: 24, paddingTop: 2 }}>{qIndex + 1}.</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {q.stemHtml ? (
                  <QuestionContentView html={q.stemHtml} />
                ) : (
                  <Typography.Text>{q.stemExcerpt ?? q.questionId}</Typography.Text>
                )}
                <Space size="small" style={{ marginTop: 4 }} wrap>
                  {q.difficulty && (
                    <Tag color={DIFFICULTY_COLORS[q.difficulty]}>{q.difficulty}</Tag>
                  )}
                  {q.multipleCorrect && <Tag>multi-correct</Tag>}
                  {q.bankStatus !== "active" && (
                    <Tag color="red">{q.bankStatus} in bank — fix before publish</Tag>
                  )}
                </Space>
              </div>
              <Space size="small" align="center">
                <InputNumber
                  size="small"
                  min={0}
                  step={0.25}
                  style={{ width: 90 }}
                  placeholder={String(defaultMarks)}
                  value={q.marksOverride}
                  disabled={readOnly}
                  onChange={(v) => updateQuestion(q.questionId, { marksOverride: v ?? null })}
                  aria-label="Marks override"
                />
                {!readOnly && (
                  <Button
                    size="small" type="text" danger icon={<DeleteOutlined />}
                    onClick={() => removeQuestion(q.questionId)}
                  />
                )}
              </Space>
            </div>
          )}
        />
      )}
    </Card>
  );
}
