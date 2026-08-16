import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Button, Card, Input, Popconfirm, Select, Space, Spin, Tag, Typography, message,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { CategoryTreeSelect } from "../features/categories/CategoryTreeSelect";
import { useExams } from "../api/exams";
import {
  useModelTest, usePublishModelTest, useSaveModelTest, useUnpublishModelTest,
} from "../api/modelTests";
import { SellingCard } from "../features/exams/SellingCard";
import { SeatsPanel } from "../features/commerce/SeatsPanel";
import { SortableList } from "../features/exams/SortableList";
import type { ModelTestExamItem } from "../api/types";
import { bnNum } from "../lib/bn";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";
import { ContentStatusChip } from "../ui/StatusChip";

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

  const onSave = async (): Promise<string | null> => {
    if (!draft.title.trim()) {
      message.error("শিরোনাম দিতে হবে");
      return null;
    }
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
      setDirty(false);
      message.success("খসড়া সংরক্ষিত হয়েছে");
      if (!modelTest) {
        loadedForIdRef.current = saved.id;
        navigate(`/model-tests/${saved.id}`, { replace: true });
      }
      return saved.id;
    } catch (e) {
      message.error(serverError(e, "সংরক্ষণ করা যায়নি"));
      return null;
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
            <span>{bnNum(draft.exams.length)}টি পরীক্ষা</span>
            {dirty && (
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
                disabled={save.isPending}
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
                এখনো কোনো পরীক্ষা নেই। শুধু খসড়া স্ট্যান্ডঅ্যালোন পরীক্ষা যোগ করা যায় — প্রকাশিত
                পরীক্ষা আগে আনপাবলিশ করতে হবে।
              </Typography.Paragraph>
            )}
            <SortableList
              items={draft.exams}
              getKey={(e) => e.id}
              disabled={readOnly}
              onReorder={(exams) => mutate({ exams })}
              renderItem={(e, index) => (
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "8px 0", borderBottom: "1px solid var(--ex-line)",
                  }}
                >
                  {/* Positional identifier in a dense ordered list — Western digits, the
                      ratified exception, matching the exam builder's question rows. */}
                  <span className="ex-num" style={{ color: "var(--ex-ink-soft)", minWidth: 24 }}>
                    {index + 1}.
                  </span>
                  <Typography.Link onClick={() => navigate(`/exams/${e.id}`)} style={{ flex: 1 }}>
                    {e.title}
                  </Typography.Link>
                  <ContentStatusChip status={e.status} />
                  {e.isArchived && <Tag color="red">আর্কাইভড — শিক্ষার্থীরা দেখবে না</Tag>}
                  <Typography.Text type="secondary">
                    {bnNum(e.questionCount)}টি প্রশ্ন · {bnNum(e.totalMarks)} মার্ক ·{" "}
                    {bnNum(e.durationMinutes)} মিনিট
                  </Typography.Text>
                  {!readOnly && (
                    <Button
                      size="small" type="text" danger icon={<DeleteOutlined />}
                      aria-label="বান্ডেল থেকে সরান"
                      onClick={() =>
                        mutate({ exams: draft.exams.filter((x) => x.id !== e.id) })}
                    />
                  )}
                </div>
              )}
            />
            {!readOnly && (
              <Select
                showSearch
                placeholder="খসড়া স্ট্যান্ডঅ্যালোন পরীক্ষা যোগ করুন…"
                style={{ width: 420, marginTop: 12 }}
                value={null}
                onChange={(v) => { if (v) addExam(v); }}
                options={addableOptions}
                optionFilterProp="label"
                notFoundContent="যোগ করার মতো খসড়া স্ট্যান্ডঅ্যালোন পরীক্ষা নেই"
              />
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
    </div>
  );
}
