import { Button, Card, Empty, Input, InputNumber, Popconfirm, Space, Tag, Typography } from "antd";
import { DeleteOutlined, PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { QuestionContentView } from "../questions/QuestionContentView";
import { SortableList } from "./SortableList";
import type { DraftQuestion, DraftSection } from "./examDraft";
import { bnNum } from "../../lib/bn";
import { DifficultyDot, type Difficulty } from "../../ui/StatusChip";

// Local, not `lib/labels.ts`'s CONTENT_STATUS: `BankStatus` (types.ts:152) carries "missing",
// which is not a content state at all — it is the bank row being gone — and CONTENT_STATUS has
// no business learning it. "active" is absent on purpose: the tag this feeds renders only when
// the status is NOT active. A second consumer is the cue to promote the map.
const BANK_STATUS: Record<string, string> = {
  draft: "খসড়া",
  archived: "আর্কাইভড",
  missing: "অনুপস্থিত",
};

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
          section.title ?? `সেকশন ${bnNum(index + 1)}`
        ) : (
          <Input
            placeholder={`সেকশন ${bnNum(index + 1)}-এর শিরোনাম (ঐচ্ছিক)`}
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
                প্রশ্ন যোগ করুন
              </Button>
            )}
            {onRandomFill && (
              <Button size="small" icon={<ThunderboltOutlined />} onClick={onRandomFill}>
                র‍্যান্ডম ফিল
              </Button>
            )}
            {sectionCount > 1 && (
              <Popconfirm
                title="এই সেকশন ও এর প্রশ্নগুলো সরাবেন?"
                okText="হ্যাঁ"
                cancelText="না"
                onConfirm={onRemove}
              >
                <Button size="small" danger icon={<DeleteOutlined />} aria-label="সেকশন সরান" />
              </Popconfirm>
            )}
          </Space>
        )
      }
    >
      {section.questions.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="এখনো কোনো প্রশ্ন নেই" />
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
                padding: "8px 0", borderBottom: "1px solid var(--ex-line)",
              }}
            >
              {/* The row index stays Western: it is a positional identifier in a dense list,
                  the ratified «অ্যাটেম্পট #2» exception, and it matches ExamPreview's
                  numbering of the same paper. */}
              <span className="ex-num" style={{ color: "var(--ex-ink-soft)", minWidth: 24, paddingTop: 2 }}>
                {qIndex + 1}.
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {q.stemHtml ? (
                  <QuestionContentView html={q.stemHtml} />
                ) : (
                  <Typography.Text>{q.stemExcerpt ?? q.questionId}</Typography.Text>
                )}
                <Space size="small" style={{ marginTop: 4 }} wrap>
                  {q.difficulty && (
                    <DifficultyDot difficulty={q.difficulty as Difficulty} />
                  )}
                  {q.multipleCorrect && <Tag>একাধিক সঠিক</Tag>}
                  {q.bankStatus !== "active" && (
                    <span className="ex-chipstat ex-chipstat--danger">
                      ব্যাংকে {BANK_STATUS[q.bankStatus] ?? q.bankStatus} — প্রকাশের আগে ঠিক করুন
                    </span>
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
                  aria-label="মার্ক ওভাররাইড"
                />
                {!readOnly && (
                  <Button
                    size="small" type="text" danger icon={<DeleteOutlined />}
                    aria-label="প্রশ্ন সরান"
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
