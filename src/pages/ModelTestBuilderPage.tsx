import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Card, Input, Popconfirm, Select, Space, Spin, Typography, message,
} from "antd";
import type { AxiosError } from "axios";
import { CategoryTreeSelect } from "../features/categories/CategoryTreeSelect";
import { useExams, useSaveExam } from "../api/exams";
import {
  useCreateBundleExam, useModelTest, usePublishModelTest, useSaveModelTest,
  useUnpublishModelTest,
} from "../api/modelTests";
import { BundleExamCard, type ExamDraftState } from "../features/exams/BundleExamCard";
import { NewBundleExamModal } from "../features/exams/NewBundleExamModal";
import { QuestionPickerDrawer } from "../features/exams/QuestionPickerDrawer";
import { QuestionAuthorDrawer } from "../features/questions/QuestionAuthorDrawer";
import { SellingCard } from "../features/exams/SellingCard";
import { SeatsPanel } from "../features/commerce/SeatsPanel";
import { SortableList } from "../features/exams/SortableList";
import {
  allQuestionIds, draftQuestionCount, emptyDraft, fromResponse, toSaveRequest,
  type DraftQuestion, type ExamDraft,
} from "../features/exams/examDraft";
import type { ExamResponse, ModelTestExamItem } from "../api/types";
import { bnNum } from "../lib/bn";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

type BundleDraft = {
  title: string;
  description: string;
  categoryId: string | null;
  exams: ModelTestExamItem[]; // ordered
};

export function ModelTestBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // `isPending`, not `isLoading` (house rule). The spinner guard below keeps its `id &&`
  // half, so `/model-tests/new` — where `useModelTest(undefined)` is `enabled: false` and
  // therefore permanently pending — still renders the empty form.
  const { data: modelTest, isPending, isError } = useModelTest(id);
  const save = useSaveModelTest();
  const publish = usePublishModelTest();
  const unpublish = useUnpublishModelTest();

  const [draft, setDraft] = useState<BundleDraft>({
    title: "", description: "", categoryId: null, exams: [],
  });
  const [dirty, setDirty] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const loadedForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (modelTest && loadedForIdRef.current !== modelTest.id) {
      loadedForIdRef.current = modelTest.id;
      setDraft({
        title: modelTest.title,
        description: modelTest.description ?? "",
        categoryId: modelTest.categoryId,
        exams: modelTest.exams,
      });
      setDirty(false);
    }
  }, [modelTest]);

  useEffect(() => {
    if (id && isError) {
      message.error("মডেল টেস্ট পাওয়া যায়নি");
      navigate("/model-tests", { replace: true });
    }
  }, [id, isError, navigate]);

  const readOnly = modelTest ? modelTest.status !== "draft" : false;

  // Addable = the org's DRAFT STANDALONE exams (server enforces the same rule).
  const { data: addable } = useExams({ page: 1, pageSize: 100, status: "draft", standalone: true });
  const addableOptions = (addable?.items ?? [])
    .filter((e) => !draft.exams.some((x) => x.id === e.id))
    .map((e) => ({
      value: e.id,
      // The counts are prose inside a sentence-shaped option label, so Bengali digits (D8);
      // `optionFilterProp="label"` still matches on the title the examiner types.
      label: `${e.title} (${bnNum(e.questionCount)}টি প্রশ্ন · ${bnNum(e.totalMarks)} মার্ক)`,
    }));

  const mutate = (patch: Partial<BundleDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const addExam = (examId: string) => {
    const summary = addable?.items.find((e) => e.id === examId);
    if (!summary) return;
    mutate({
      exams: [
        ...draft.exams,
        {
          id: summary.id,
          title: summary.title,
          status: summary.status,
          questionCount: summary.questionCount,
          totalMarks: summary.totalMarks,
          durationMinutes: summary.durationMinutes,
          isArchived: false,
        },
      ],
    });
  };

  // ---- nested exam state (spec C2) ----
  const [examDrafts, setExamDrafts] = useState<Record<string, ExamDraftState>>({});
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [picker, setPicker] =
    useState<{ examId: string; sectionKey: string; tab: "browse" | "random" | "author" } | null>(
      null,
    );
  const [newExamOpen, setNewExamOpen] = useState(false);
  const createExam = useCreateBundleExam();
  const saveExam = useSaveExam();

  const anyExamDirty = Object.values(examDrafts).some((s) => s.dirty);
  const totalQuestions = draft.exams.reduce(
    (n, e) => n + (examDrafts[e.id] ? draftQuestionCount(examDrafts[e.id].draft) : e.questionCount),
    0,
  );

  // Seed once per id: a card's `onLoaded` fires on every fresh `useExam` payload, and a
  // card created through the modal is already seeded — neither may clobber live edits.
  const onExamLoaded = useCallback(
    (examId: string, loaded: ExamDraft) =>
      setExamDrafts((m) => (m[examId] ? m : { ...m, [examId]: { draft: loaded, dirty: false, error: null } })),
    [],
  );
  const onExamChange = (examId: string, next: ExamDraft) =>
    setExamDrafts((m) => ({ ...m, [examId]: { draft: next, dirty: true, error: null } }));
  const toggle = (examId: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(examId)) n.delete(examId); else n.add(examId);
      return n;
    });

  // D8: removal is a bundle edit only — the exam document is untouched and becomes standalone
  // again when the bundle saves. Dropping the draft entry also drops any unsaved edits to it.
  const removeExam = (examId: string) => {
    mutate({ exams: draft.exams.filter((x) => x.id !== examId) });
    setExamDrafts((m) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== examId)));
    setExpanded((s) => {
      const n = new Set(s);
      n.delete(examId);
      return n;
    });
  };

  const addQuestionsTo = (examId: string, sectionKey: string, questions: DraftQuestion[]) => {
    const st = examDrafts[examId];
    if (!st) return;
    const existing = new Set(allQuestionIds(st.draft));
    const fresh = questions.filter((q) => !existing.has(q.questionId));
    if (fresh.length === 0) return;
    onExamChange(examId, {
      ...st.draft,
      sections: st.draft.sections.map((s) =>
        s.key === sectionKey ? { ...s, questions: [...s.questions, ...fresh] } : s),
    });
  };

  // Row-summary refresh that must NOT flip the bundle dirty flag (it is a server echo).
  const mutateExamItem = (examId: string, patch: Partial<ModelTestExamItem>) =>
    setDraft((d) => ({ ...d, exams: d.exams.map((e) => (e.id === examId ? { ...e, ...patch } : e)) }));

  // Bundle first, then each loaded-and-dirty exam in bundle order, one PUT each. A failed
  // exam keeps its error on the card and stays dirty; the bundle save is not rolled back
  // (independent documents, D9). Resolves to the bundle id ONLY when everything succeeded,
  // so publish (below) can never run over a half-saved bundle.
  const onSave = async (): Promise<string | null> => {
    if (!draft.title.trim()) {
      message.error("শিরোনাম দিতে হবে");
      return null;
    }
    let bundleId: string;
    try {
      const saved = await save.mutateAsync({
        id: modelTest?.id,
        body: {
          title: draft.title,
          description: draft.description.trim() ? draft.description : null,
          categoryId: draft.categoryId,
          examIds: draft.exams.map((e) => e.id),
        },
      });
      bundleId = saved.id;
      setDirty(false);
      if (!modelTest) {
        loadedForIdRef.current = saved.id;
        navigate(`/model-tests/${saved.id}`, { replace: true });
      }
    } catch (e) {
      message.error(serverError(e, "সংরক্ষণ করা যায়নি"));
      return null;
    }

    let failures = 0;
    for (const item of draft.exams) {
      const st = examDrafts[item.id];
      if (!st?.dirty) continue;
      try {
        const saved: ExamResponse = await saveExam.mutateAsync({
          id: item.id, body: toSaveRequest(st.draft),
        });
        setExamDrafts((m) => ({
          ...m,
          [item.id]: { draft: m[item.id]?.draft ?? st.draft, dirty: false, error: null },
        }));
        mutateExamItem(item.id, {
          title: saved.title, questionCount: saved.questionCount,
          totalMarks: saved.totalMarks, durationMinutes: saved.durationMinutes,
        });
      } catch (e) {
        failures += 1;
        const err = serverError(e, "সংরক্ষণ করা যায়নি");
        setExamDrafts((m) => ({ ...m, [item.id]: { ...(m[item.id] ?? st), error: err } }));
      }
    }
    if (failures === 0) {
      message.success("খসড়া সংরক্ষিত হয়েছে");
      return bundleId;
    }
    message.error("কিছু পরীক্ষা সংরক্ষণ হয়নি — কার্ডে দেখুন");
    return null;
  };

  // Spec C4: a never-saved bundle is saved first (it needs an id to hang the exam on).
  const onCreateExam = async ({ title, durationMinutes }: {
    title: string; durationMinutes: number;
  }) => {
    let bundleId = modelTest?.id ?? null;
    if (!bundleId) {
      bundleId = await onSave();
      if (!bundleId) return;
    }
    try {
      const created = await createExam.mutateAsync({
        modelTestId: bundleId,
        body: toSaveRequest({ ...emptyDraft(), title, durationMinutes }),
      });
      // Membership is already persisted server-side (D11), so the bundle is NOT marked dirty.
      setDraft((d) => ({
        ...d,
        exams: [...d.exams, {
          id: created.id, title: created.title, status: created.status,
          questionCount: created.questionCount, totalMarks: created.totalMarks,
          durationMinutes: created.durationMinutes, isArchived: false,
        }],
      }));
      setExamDrafts((m) => ({
        ...m, [created.id]: { draft: fromResponse(created), dirty: false, error: null },
      }));
      setExpanded((s) => new Set(s).add(created.id));
      setNewExamOpen(false);
      message.success("পরীক্ষা তৈরি হয়েছে — এবার প্রশ্ন যোগ করুন");
      requestAnimationFrame(() =>
        document.getElementById(`bundle-exam-${created.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      message.error(serverError(e, "পরীক্ষা তৈরি করা যায়নি"));
    }
  };

  const onPublish = async () => {
    setPublishError(null);
    const savedId = await onSave();
    if (!savedId) return;
    try {
      await publish.mutateAsync(savedId);
      loadedForIdRef.current = null;
      message.success("মডেল টেস্ট প্রকাশিত হয়েছে — সব পরীক্ষা লাইভ");
    } catch (e) {
      setPublishError(serverError(e, "প্রকাশ করা যায়নি"));
    }
  };

  const onUnpublish = async () => {
    if (!modelTest) return;
    try {
      await unpublish.mutateAsync(modelTest.id);
      loadedForIdRef.current = null;
      message.success("আনপাবলিশ হয়েছে — বান্ডেলের সব পরীক্ষা আবার খসড়া");
    } catch (e) {
      message.error(serverError(e, "আনপাবলিশ করা যায়নি"));
    }
  };

  if (id && isPending) return <Spin style={{ display: "block", marginTop: 80 }} />;

  return (
    <div>
      {/* Actions live once, in the PageHeader (T6/T7 precedent). `PillButton` carries no antd
          spinner, so an in-flight save/publish reads as `disabled`. */}
      <PageHeader
        title={draft.title.trim() || "নতুন মডেল টেস্ট"}
        summary={
          <Space size={8} wrap>
            <span>{bnNum(draft.exams.length)}টি পরীক্ষা · {bnNum(totalQuestions)}টি প্রশ্ন</span>
            {(dirty || anyExamDirty) && (
              <span style={{ color: "var(--ex-amber)", fontWeight: 600 }}>
                · অসংরক্ষিত পরিবর্তন
              </span>
            )}
          </Space>
        }
        actions={
          <Space size={8} wrap>
            <PillButton variant="ghost" onClick={() => navigate("/model-tests")}>
              ফিরে যান
            </PillButton>
            {!readOnly && (
              <PillButton
                variant="primary"
                disabled={save.isPending || saveExam.isPending}
                onClick={() => void onSave()}
              >
                খসড়া সংরক্ষণ
              </PillButton>
            )}
            {!readOnly && (
              <Popconfirm
                // The bundle rule IS the confirm: publishing is all-or-nothing across every
                // exam in it, so the copy states that before the question.
                title="বান্ডেলের সব পরীক্ষা একসাথে প্রকাশ হবে। প্রকাশ করবেন?"
                okText="হ্যাঁ"
                cancelText="না"
                onConfirm={() => void onPublish()}
              >
                <PillButton variant="tonal" disabled={publish.isPending}>
                  বান্ডেল প্রকাশ করুন
                </PillButton>
              </Popconfirm>
            )}
            {modelTest?.status === "published" && (
              <Popconfirm
                title="আনপাবলিশ করবেন?"
                description="বান্ডেলের সব পরীক্ষা আবার সম্পাদনাযোগ্য খসড়া হয়ে যাবে।"
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

      {readOnly && modelTest && (
        <Alert
          type="info" showIcon style={{ marginBottom: 16 }}
          title={
            modelTest.status === "published"
              ? "এই মডেল টেস্ট প্রকাশিত ও ফ্রিজ করা। সম্পাদনা করতে আনপাবলিশ করুন — বান্ডেলের কোনো পরীক্ষায় অ্যাটেম্পট না থাকলেই সম্ভব।"
              : "এই মডেল টেস্ট আর্কাইভ করা।"
          }
        />
      )}
      {publishError && (
        <Alert
          type="error" showIcon closable style={{ marginBottom: 16 }}
          onClose={() => setPublishError(null)}
          title="প্রকাশ করা যায়নি — প্রতিটি পরীক্ষা বৈধ হতে হবে (কিছুই প্রকাশ হয়নি)"
          // The description is the server's verbatim gate message — English until Task 10.
          description={<div style={{ whiteSpace: "pre-line" }}>{publishError}</div>}
        />
      )}

      <Card title="মূল তথ্য">
        <Space orientation="vertical" style={{ width: "100%" }} size="middle">
          <div>
            <Typography.Text strong>শিরোনাম</Typography.Text>
            <Input
              value={draft.title} disabled={readOnly}
              onChange={(e) => mutate({ title: e.target.value })}
              placeholder="যেমন: ৪৭তম বিসিএস — ফুল মডেল টেস্ট"
            />
          </div>
          <div>
            <Typography.Text strong>বিবরণ (ঐচ্ছিক)</Typography.Text>
            <Input.TextArea
              rows={2} value={draft.description} disabled={readOnly}
              onChange={(e) => mutate({ description: e.target.value })}
            />
          </div>
          <div>
            <Typography.Text strong>ক্যাটাগরি (ঐচ্ছিক)</Typography.Text>
            <CategoryTreeSelect
              value={draft.categoryId}
              onChange={(v) => mutate({ categoryId: v })}
              disabled={readOnly}
            />
          </div>

          <div>
            <Typography.Text strong>পরীক্ষা (ক্রমানুসারে)</Typography.Text>
            {draft.exams.length === 0 && (
              <Typography.Paragraph type="secondary" style={{ marginTop: 4 }}>
                এখনো কোনো পরীক্ষা নেই। «নতুন পরীক্ষা» দিয়ে এখানেই তৈরি করুন, অথবা খসড়া
                স্ট্যান্ডঅ্যালোন পরীক্ষা যোগ করুন — প্রকাশিত পরীক্ষা আগে আনপাবলিশ করতে হবে।
              </Typography.Paragraph>
            )}
            <SortableList
              items={draft.exams}
              getKey={(e) => e.id}
              disabled={readOnly}
              onReorder={(exams) => mutate({ exams })}
              renderItem={(e, index) => (
                <div id={`bundle-exam-${e.id}`} style={{ scrollMarginTop: 80 }}>
                  <BundleExamCard
                    item={e}
                    index={index}
                    readOnly={readOnly}
                    expanded={expanded.has(e.id)}
                    onToggle={() => toggle(e.id)}
                    state={examDrafts[e.id]}
                    onLoaded={(d) => onExamLoaded(e.id, d)}
                    onChange={(d) => onExamChange(e.id, d)}
                    onClearError={() =>
                      setExamDrafts((m) =>
                        m[e.id] ? { ...m, [e.id]: { ...m[e.id], error: null } } : m)}
                    onRemove={() => removeExam(e.id)}
                    onOpenPicker={(sectionKey, tab) => setPicker({ examId: e.id, sectionKey, tab })}
                  />
                </div>
              )}
            />
            {!readOnly && (
              <Space wrap style={{ marginTop: 12 }}>
                {/* tonal, not primary: «খসড়া সংরক্ষণ» in the PageHeader is the page's ONE
                    primary pill */}
                <PillButton variant="tonal" onClick={() => setNewExamOpen(true)}>
                  নতুন পরীক্ষা
                </PillButton>
                <Select
                  showSearch
                  placeholder="অথবা খসড়া স্ট্যান্ডঅ্যালোন পরীক্ষা যোগ করুন…"
                  style={{ width: 420 }}
                  value={null}
                  onChange={(v) => { if (v) addExam(v); }}
                  options={addableOptions}
                  optionFilterProp="label"
                  notFoundContent="যোগ করার মতো খসড়া স্ট্যান্ডঅ্যালোন পরীক্ষা নেই"
                />
              </Space>
            )}
          </div>
        </Space>
      </Card>

      {modelTest ? (
        <>
          <SellingCard
            productType="model_test"
            productId={modelTest.id}
            hasWindowedContent
          />
          <SeatsPanel
            productType="model_test"
            productId={modelTest.id}
            memberCount={draft.exams.length}
          />
        </>
      ) : (
        <Card title="বিক্রয়" style={{ marginTop: 16 }}>
          <Typography.Text type="secondary">
            বিক্রয় সেটিংস ঠিক করতে আগে খসড়া সংরক্ষণ করুন।
          </Typography.Text>
        </Card>
      )}

      <NewBundleExamModal
        open={newExamOpen}
        busy={createExam.isPending || save.isPending}
        onCancel={() => setNewExamOpen(false)}
        onCreate={(v) => void onCreateExam(v)}
      />
      {/* One drawer at a time, keyed by { examId, sectionKey, tab } — same discipline as
          ExamBuilderPage, extended with the exam the section belongs to. */}
      {picker && picker.tab !== "author" && examDrafts[picker.examId] && (
        <QuestionPickerDrawer
          open
          initialTab={picker.tab}
          existingIds={allQuestionIds(examDrafts[picker.examId].draft)}
          onAdd={(qs) => addQuestionsTo(picker.examId, picker.sectionKey, qs)}
          onAuthor={() => setPicker({ ...picker, tab: "author" })}
          onClose={() => setPicker(null)}
        />
      )}
      {picker?.tab === "author" && (
        <QuestionAuthorDrawer
          open
          onCreated={(q) => addQuestionsTo(picker.examId, picker.sectionKey, [q])}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
