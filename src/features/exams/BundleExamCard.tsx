import { useEffect, useRef } from "react";
import {
  Alert, Button, Card, Col, Input, InputNumber, Popconfirm, Row, Space, Typography,
} from "antd";
import { DeleteOutlined, DownOutlined, PlusOutlined, UpOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useExam } from "../../api/exams";
import type { ModelTestExamItem } from "../../api/types";
import { bnNum } from "../../lib/bn";
import { RetryNotice } from "../../ui/RetryNotice";
import { SkeletonRow } from "../../ui/Skeletons";
import { ContentStatusChip } from "../../ui/StatusChip";
import { SectionCard } from "./SectionCard";
import { SortableList } from "./SortableList";
import {
  draftQuestionCount, draftTotalMarks, fromResponse, nextKey,
  type DraftSection, type ExamDraft,
} from "./examDraft";

export type ExamDraftState = { draft: ExamDraft; dirty: boolean; error: string | null };

export type BundleExamCardProps = {
  item: ModelTestExamItem;
  index: number;
  readOnly: boolean;
  expanded: boolean;
  onToggle: () => void;
  state: ExamDraftState | undefined;
  onLoaded: (draft: ExamDraft) => void;
  onChange: (draft: ExamDraft) => void;
  onClearError: () => void;
  onRemove: () => void;
  onOpenPicker: (sectionKey: string, tab: "browse" | "random" | "author") => void;
};

// One exam inside a bundle (spec C3). Collapsed it renders from the bundle's summary item;
// expanded it loads the exam once (D9) and edits the SAME ExamDraft shape the exam builder
// uses, so SectionCard + the drawers are reused unchanged. Window/shuffle/retakes/category/
// description/selling stay in the full builder (D10).
export function BundleExamCard({
  item, index, readOnly, expanded, onToggle, state, onLoaded, onChange, onClearError, onRemove,
  onOpenPicker,
}: BundleExamCardProps) {
  // `useExam(undefined)` is `enabled: false`, so a collapsed never-opened card fetches
  // nothing (D9). Once a draft exists the query stays enabled: collapsing must not throw
  // away edits, and a same-key refetch is harmless (the seed guard below).
  const { data: exam, isError, refetch, isFetching } =
    useExam(expanded || state ? item.id : undefined);

  // Seed exactly once per exam id; a later refetch must never wipe edits (builder guard).
  const loadedForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (exam && loadedForIdRef.current !== exam.id) {
      loadedForIdRef.current = exam.id;
      onLoaded(fromResponse(exam));
    }
  }, [exam, onLoaded]);

  const draft = state?.draft;
  const questionCount = draft ? draftQuestionCount(draft) : item.questionCount;
  const totalMarks = draft ? draftTotalMarks(draft) : item.totalMarks;
  const duration = draft ? draft.durationMinutes : item.durationMinutes;
  const title = draft?.title ?? item.title;

  const mutate = (patch: Partial<ExamDraft>) => {
    if (draft) onChange({ ...draft, ...patch });
  };
  const mutateSection = (key: string, section: DraftSection) => {
    if (!draft) return;
    mutate({ sections: draft.sections.map((s) => (s.key === key ? section : s)) });
  };

  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      styles={{ body: { padding: expanded ? 12 : 0 } }}
      title={
        <Space size={12} wrap>
          {/* Positional identifier in a dense ordered list — Western digits (ratified). */}
          <span className="ex-num" style={{ color: "var(--ex-ink-soft)" }}>{index + 1}.</span>
          <span style={{ fontWeight: 600 }}>{title.trim() || "শিরোনামহীন পরীক্ষা"}</span>
          <ContentStatusChip status={item.status} />
          {item.isArchived && (
            <span className="ex-chipstat ex-chipstat--danger">
              আর্কাইভড — শিক্ষার্থীরা দেখবে না
            </span>
          )}
          <Typography.Text type="secondary">
            {bnNum(questionCount)}টি প্রশ্ন · {bnNum(totalMarks)} মার্ক · {bnNum(duration)} মিনিট
          </Typography.Text>
          {state?.dirty && (
            <span style={{ color: "var(--ex-amber)", fontWeight: 600 }}>· অসংরক্ষিত</span>
          )}
        </Space>
      }
      extra={
        <Space size={4}>
          <Link to={`/exams/${item.id}`}>বিল্ডারে খুলুন</Link>
          <Button
            size="small" type="text" icon={expanded ? <UpOutlined /> : <DownOutlined />}
            aria-expanded={expanded} aria-label={expanded ? "সংকুচিত করুন" : "বিস্তারিত দেখুন"}
            onClick={onToggle}
          />
          {!readOnly && (state?.dirty ? (
            <Popconfirm
              title="অসংরক্ষিত পরিবর্তনসহ সরাবেন?"
              okText="হ্যাঁ" cancelText="না" onConfirm={onRemove}
            >
              <Button
                size="small" type="text" danger icon={<DeleteOutlined />}
                aria-label="বান্ডেল থেকে সরান"
              />
            </Popconfirm>
          ) : (
            <Button
              size="small" type="text" danger icon={<DeleteOutlined />}
              aria-label="বান্ডেল থেকে সরান" onClick={onRemove}
            />
          ))}
        </Space>
      }
    >
      {expanded && (
        !draft ? (
          // `!exam`, not `isError` alone: a same-key refetch failure keeps the data we hold.
          isError && !exam ? (
            <RetryNotice tone="panel" framed={false} busy={isFetching} onRetry={() => void refetch()} />
          ) : (
            <>
              <SkeletonRow />
              <SkeletonRow />
            </>
          )
        ) : (
          <>
            {state?.error && (
              <Alert
                type="error" showIcon closable onClose={onClearError} style={{ marginBottom: 12 }}
                title="এই পরীক্ষা সংরক্ষণ হয়নি"
                description={<div style={{ whiteSpace: "pre-line" }}>{state.error}</div>}
              />
            )}
            <Row gutter={[12, 8]} style={{ marginBottom: 8 }}>
              <Col xs={24} md={12}>
                <Typography.Text strong>শিরোনাম</Typography.Text>
                <Input
                  value={draft.title} disabled={readOnly}
                  onChange={(e) => mutate({ title: e.target.value })}
                />
              </Col>
              <Col xs={8} md={4}>
                <Typography.Text strong>সময় (মিনিট)</Typography.Text>
                <InputNumber
                  min={0} style={{ width: "100%" }} value={draft.durationMinutes}
                  disabled={readOnly} onChange={(v) => mutate({ durationMinutes: v ?? 0 })}
                />
              </Col>
              <Col xs={8} md={4}>
                <Typography.Text strong>প্রতি প্রশ্নে মার্ক</Typography.Text>
                <InputNumber
                  min={0} step={0.25} style={{ width: "100%" }} value={draft.defaultMarks}
                  disabled={readOnly} onChange={(v) => mutate({ defaultMarks: v ?? 0 })}
                />
              </Col>
              <Col xs={8} md={4}>
                <Typography.Text strong>নেগেটিভ মার্ক</Typography.Text>
                <InputNumber
                  min={0} step={0.25} style={{ width: "100%" }} value={draft.negativeMarks}
                  disabled={readOnly} onChange={(v) => mutate({ negativeMarks: v ?? 0 })}
                />
              </Col>
            </Row>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              বিবরণ, ক্যাটাগরি, সময়সীমা, এলোমেলো ও রিটেক সেটিংস বিল্ডারে ঠিক করুন।
            </Typography.Paragraph>
            <SortableList
              items={draft.sections}
              getKey={(s) => s.key}
              disabled={readOnly}
              onReorder={(sections) => mutate({ sections })}
              renderItem={(section, sIndex) => (
                <SectionCard
                  section={section}
                  index={sIndex}
                  sectionCount={draft.sections.length}
                  readOnly={readOnly}
                  defaultMarks={draft.defaultMarks}
                  onChange={(s) => mutateSection(section.key, s)}
                  onRemove={() =>
                    mutate({ sections: draft.sections.filter((s) => s.key !== section.key) })}
                  onAddQuestions={() => onOpenPicker(section.key, "browse")}
                  onRandomFill={() => onOpenPicker(section.key, "random")}
                  onAuthorQuestion={() => onOpenPicker(section.key, "author")}
                />
              )}
            />
            {!readOnly && (
              <Button
                icon={<PlusOutlined />} style={{ marginTop: 4 }}
                onClick={() =>
                  mutate({
                    sections: [
                      ...draft.sections,
                      { key: nextKey(), id: null, title: null, questions: [] },
                    ],
                  })}
              >
                সেকশন যোগ করুন
              </Button>
            )}
          </>
        )
      )}
    </Card>
  );
}
