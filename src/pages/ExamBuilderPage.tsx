import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Button, Card, Col, DatePicker, Input, InputNumber, Popconfirm, Row, Space, Spin,
  Switch, Typography, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { CategoryTreeSelect } from "../features/categories/CategoryTreeSelect";
import { useExam, usePublishExam, useSaveExam, useUnpublishExam } from "../api/exams";
import { ExamPreview } from "../features/exams/ExamPreview";
import { QuestionPickerDrawer } from "../features/exams/QuestionPickerDrawer";
import { SectionCard } from "../features/exams/SectionCard";
import { SellingCard } from "../features/exams/SellingCard";
import { SeatsPanel } from "../features/commerce/SeatsPanel";
import { SortableList } from "../features/exams/SortableList";
import {
  allQuestionIds, draftQuestionCount, draftTotalMarks, emptyDraft, fromResponse,
  nextKey, toSaveRequest,
} from "../features/exams/examDraft";
import type { DraftQuestion, DraftSection, ExamDraft } from "../features/exams/examDraft";
import { bnNum } from "../lib/bn";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

export function ExamBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: exam, isPending, isError } = useExam(id);
  const save = useSaveExam();
  const publish = usePublishExam();
  const unpublish = useUnpublishExam();

  const [draft, setDraft] = useState<ExamDraft>(emptyDraft);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ sectionKey: string; tab: "browse" | "random" } | null>(null);
  // Load the fetched exam into local state exactly once per id — a react-query
  // window-focus refetch must never wipe unsaved edits (same guard as the question editor).
  const loadedForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (exam && loadedForIdRef.current !== exam.id) {
      loadedForIdRef.current = exam.id;
      setDraft(fromResponse(exam));
      setDirty(false);
    }
  }, [exam]);

  useEffect(() => {
    if (id && isError) {
      message.error("পরীক্ষা পাওয়া যায়নি");
      navigate("/exams", { replace: true });
    }
  }, [id, isError, navigate]);

  const readOnly = exam ? exam.status !== "draft" : false;

  const mutate = (patch: Partial<ExamDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const mutateSection = (key: string, section: DraftSection) =>
    mutate({ sections: draft.sections.map((s) => (s.key === key ? section : s)) });

  const addQuestions = (sectionKey: string, questions: DraftQuestion[]) => {
    setDraft((d) => {
      const existing = new Set(d.sections.flatMap((s) => s.questions.map((q) => q.questionId)));
      const fresh = questions.filter((q) => !existing.has(q.questionId));
      if (fresh.length === 0) return d;
      return {
        ...d,
        sections: d.sections.map((s) =>
          s.key === sectionKey ? { ...s, questions: [...s.questions, ...fresh] } : s,
        ),
      };
    });
    setDirty(true);
  };

  const onSaveDraft = async (): Promise<string | null> => {
    if (!draft.title.trim()) {
      message.error("শিরোনাম দিতে হবে");
      return null;
    }
    try {
      const saved = await save.mutateAsync({ id: exam?.id, body: toSaveRequest(draft) });
      setDirty(false);
      message.success("খসড়া সংরক্ষিত হয়েছে");
      if (!exam) {
        loadedForIdRef.current = saved.id; // fromResponse would reset local edits
        navigate(`/exams/${saved.id}`, { replace: true });
      }
      return saved.id;
    } catch (e) {
      message.error(serverError(e, "সংরক্ষণ করা যায়নি"));
      return null;
    }
  };

  const onPublish = async () => {
    setPublishError(null);
    const savedId = await onSaveDraft();
    if (!savedId) return;
    try {
      await publish.mutateAsync(savedId);
      loadedForIdRef.current = null; // reload the (now frozen) exam into local state
      message.success("পরীক্ষা প্রকাশিত হয়েছে");
    } catch (e) {
      setPublishError(serverError(e, "প্রকাশ করা যায়নি"));
    }
  };

  const onUnpublish = async () => {
    if (!exam) return;
    try {
      await unpublish.mutateAsync(exam.id);
      loadedForIdRef.current = null; // reload as editable draft
      message.success("আনপাবলিশ হয়েছে — এটি আবার খসড়া");
    } catch (e) {
      message.error(serverError(e, "আনপাবলিশ করা যায়নি"));
    }
  };

  if (id && isPending) return <Spin style={{ display: "block", marginTop: 80 }} />;

  const questionCount = draftQuestionCount(draft);
  const totalMarks = draftTotalMarks(draft);

  return (
    <div>
      {/* The action row lives once, in the PageHeader — the old copy was a `position: fixed`
          bar with a hardcoded `left: 220`, which the collapsible 56px rail (T1) would have
          left floating over the content. Counts move into the summary. `PillButton` carries
          no antd spinner, so in-flight saves read as `disabled` (T6 precedent). */}
      <PageHeader
        title={draft.title.trim() || "নতুন পরীক্ষা"}
        summary={
          <Space size={8} wrap>
            <span>
              {bnNum(questionCount)}টি প্রশ্ন · মোট {bnNum(totalMarks)} মার্ক
            </span>
            {dirty && (
              <span style={{ color: "var(--ex-amber)", fontWeight: 600 }}>
                · অসংরক্ষিত পরিবর্তন
              </span>
            )}
          </Space>
        }
        actions={
          <Space size={8} wrap>
            <PillButton variant="ghost" onClick={() => navigate("/exams")}>
              ফিরে যান
            </PillButton>
            {exam && (
              <PillButton variant="outline" onClick={() => setPreview((p) => !p)}>
                {preview ? "সম্পাদনায় ফিরুন" : "প্রিভিউ"}
              </PillButton>
            )}
            {!readOnly && (
              <PillButton
                variant="primary"
                disabled={save.isPending}
                onClick={() => void onSaveDraft()}
              >
                খসড়া সংরক্ষণ
              </PillButton>
            )}
            {!readOnly && exam?.modelTestId == null && (
              <PillButton
                variant="tonal"
                disabled={publish.isPending}
                onClick={() => void onPublish()}
              >
                প্রকাশ করুন
              </PillButton>
            )}
            {exam?.status === "published" && exam.modelTestId == null && (
              <Popconfirm
                title="আনপাবলিশ করবেন?"
                description="পরীক্ষাটি আবার সম্পাদনাযোগ্য খসড়া হয়ে যাবে।"
                okText="হ্যাঁ"
                cancelText="না"
                onConfirm={() => void onUnpublish()}
              >
                <PillButton variant="outline" disabled={unpublish.isPending}>
                  আনপাবলিশ
                </PillButton>
              </Popconfirm>
            )}
          </Space>
        }
      />

      {readOnly && exam && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={
            exam.status === "published"
              ? "এই পরীক্ষা প্রকাশিত ও ফ্রিজ করা। সম্পাদনা করতে আনপাবলিশ করুন — কোনো অ্যাটেম্পট না থাকলেই সম্ভব।"
              : "এই পরীক্ষা আর্কাইভ করা।"
          }
        />
      )}

      {publishError && (
        <Alert
          type="error"
          showIcon
          closable
          onClose={() => setPublishError(null)}
          style={{ marginBottom: 16 }}
          title="প্রকাশ করা যায়নি"
          // The description is the server's verbatim gate message — English until Task 10.
          description={<div style={{ whiteSpace: "pre-line" }}>{publishError}</div>}
        />
      )}

      {preview && exam ? (
        <>
          {dirty && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              title="প্রিভিউ সর্বশেষ সংরক্ষিত সংস্করণ দেখাচ্ছে — হালনাগাদ করতে খসড়া সংরক্ষণ করুন।"
            />
          )}
          <ExamPreview exam={exam} />
        </>
      ) : (
        <>
      <Card title="মূল তথ্য" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]}>
          <Col xs={24} md={12}>
            <Typography.Text strong>শিরোনাম</Typography.Text>
            <Input
              value={draft.title}
              disabled={readOnly}
              onChange={(e) => mutate({ title: e.target.value })}
              placeholder="যেমন: ৪৭তম বিসিএস — বাংলা"
            />
          </Col>
          <Col xs={24} md={12}>
            <Typography.Text strong>বিবরণ (ঐচ্ছিক)</Typography.Text>
            <Input
              value={draft.description}
              disabled={readOnly}
              onChange={(e) => mutate({ description: e.target.value })}
            />
          </Col>
          <Col xs={12} md={4}>
            <Typography.Text strong>সময় (মিনিট)</Typography.Text>
            <InputNumber
              min={0} style={{ width: "100%" }} value={draft.durationMinutes} disabled={readOnly}
              onChange={(v) => mutate({ durationMinutes: v ?? 0 })}
            />
          </Col>
          <Col xs={12} md={4}>
            <Typography.Text strong>প্রতি প্রশ্নে মার্ক</Typography.Text>
            <InputNumber
              min={0} step={0.25} style={{ width: "100%" }} value={draft.defaultMarks}
              disabled={readOnly} onChange={(v) => mutate({ defaultMarks: v ?? 0 })}
            />
          </Col>
          <Col xs={12} md={4}>
            <Typography.Text strong>নেগেটিভ মার্ক</Typography.Text>
            <InputNumber
              min={0} step={0.25} style={{ width: "100%" }} value={draft.negativeMarks}
              disabled={readOnly} onChange={(v) => mutate({ negativeMarks: v ?? 0 })}
            />
          </Col>
          <Col xs={24} md={12}>
            <Typography.Text strong>ক্যাটাগরি (ঐচ্ছিক)</Typography.Text>
            <CategoryTreeSelect
              value={draft.categoryId}
              onChange={(v) => mutate({ categoryId: v })}
              disabled={readOnly}
            />
          </Col>
          <Col xs={24} md={12}>
            <Typography.Text strong>নির্ধারিত সময়সীমা (ঐচ্ছিক — খালি রাখলে যেকোনো সময়)</Typography.Text>
            <br />
            <DatePicker.RangePicker
              showTime
              style={{ width: "100%" }}
              disabled={readOnly}
              value={
                draft.windowStartUtc && draft.windowEndUtc
                  ? [dayjs(draft.windowStartUtc), dayjs(draft.windowEndUtc)]
                  : null
              }
              onChange={(range) =>
                mutate({
                  windowStartUtc: range?.[0] ? range[0].toISOString() : null,
                  windowEndUtc: range?.[1] ? range[1].toISOString() : null,
                })
              }
            />
          </Col>
          <Col xs={12} md={6}>
            <Space>
              <Switch
                checked={draft.shufflePerStudent} disabled={readOnly}
                onChange={(v) => mutate({ shufflePerStudent: v })}
              />
              <Typography.Text>প্রতি শিক্ষার্থীর জন্য প্রশ্ন এলোমেলো</Typography.Text>
            </Space>
          </Col>
          <Col xs={12} md={6}>
            <Space>
              <Switch
                checked={draft.allowRetakes} disabled={readOnly}
                onChange={(v) => mutate({ allowRetakes: v })}
              />
              <Typography.Text>রিটেক অনুমোদন (প্র্যাকটিস)</Typography.Text>
            </Space>
          </Col>
        </Row>
      </Card>

      <SortableList
        items={draft.sections}
        getKey={(s) => s.key}
        disabled={readOnly}
        onReorder={(sections) => mutate({ sections })}
        renderItem={(section, index) => (
          <SectionCard
            section={section}
            index={index}
            sectionCount={draft.sections.length}
            readOnly={readOnly}
            defaultMarks={draft.defaultMarks}
            onChange={(s) => mutateSection(section.key, s)}
            onRemove={() =>
              mutate({ sections: draft.sections.filter((s) => s.key !== section.key) })}
            onAddQuestions={() => setPicker({ sectionKey: section.key, tab: "browse" })}
            onRandomFill={() => setPicker({ sectionKey: section.key, tab: "random" })}
          />
        )}
      />

      {!readOnly && (
        <Button
          icon={<PlusOutlined />}
          style={{ marginTop: 4 }}
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

      {exam ? (
        exam.modelTestId == null ? (
          <>
            <SellingCard
              productType="exam"
              productId={exam.id}
              hasWindowedContent={!!draft.windowStartUtc}
            />
            <SeatsPanel productType="exam" productId={exam.id} memberCount={1} />
          </>
        ) : (
          <Card title="বিক্রয়" style={{ marginTop: 16 }}>
            <Typography.Text type="secondary">
              এই পরীক্ষা তার মডেল টেস্টের মাধ্যমে বিক্রি হয়। বিক্রয় সেটিংস মডেল টেস্টে ঠিক করুন।
            </Typography.Text>
          </Card>
        )
      ) : (
        <Card title="বিক্রয়" style={{ marginTop: 16 }}>
          <Typography.Text type="secondary">
            বিক্রয় সেটিংস ঠিক করতে আগে খসড়া সংরক্ষণ করুন।
          </Typography.Text>
        </Card>
      )}
        </>
      )}

      {picker && (
        <QuestionPickerDrawer
          open
          initialTab={picker.tab}
          existingIds={allQuestionIds(draft)}
          onAdd={(questions) => addQuestions(picker.sectionKey, questions)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
