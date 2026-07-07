import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Button, Card, Input, Popconfirm, Select, Space, Spin, Tag, Typography, message,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { useExams } from "../api/exams";
import {
  useModelTest, usePublishModelTest, useSaveModelTest, useUnpublishModelTest,
} from "../api/modelTests";
import { SortableList } from "../features/exams/SortableList";
import type { ModelTestExamItem } from "../api/types";

const STATUS_COLORS: Record<string, string> = {
  draft: "gold",
  published: "green",
  archived: "red",
};

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

type BundleDraft = {
  title: string;
  description: string;
  exams: ModelTestExamItem[]; // ordered
};

export function ModelTestBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: modelTest, isLoading } = useModelTest(id);
  const save = useSaveModelTest();
  const publish = usePublishModelTest();
  const unpublish = useUnpublishModelTest();

  const [draft, setDraft] = useState<BundleDraft>({ title: "", description: "", exams: [] });
  const [dirty, setDirty] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const loadedForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (modelTest && loadedForIdRef.current !== modelTest.id) {
      loadedForIdRef.current = modelTest.id;
      setDraft({
        title: modelTest.title,
        description: modelTest.description ?? "",
        exams: modelTest.exams,
      });
      setDirty(false);
    }
  }, [modelTest]);

  const readOnly = modelTest ? modelTest.status !== "draft" : false;

  // Addable = the org's DRAFT STANDALONE exams (server enforces the same rule).
  const { data: addable } = useExams({ page: 1, pageSize: 100, status: "draft", standalone: true });
  const addableOptions = (addable?.items ?? [])
    .filter((e) => !draft.exams.some((x) => x.id === e.id))
    .map((e) => ({
      value: e.id,
      label: `${e.title} (${e.questionCount} questions, ${e.totalMarks} marks)`,
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
      message.error("Title is required");
      return null;
    }
    try {
      const saved = await save.mutateAsync({
        id: modelTest?.id,
        body: {
          title: draft.title,
          description: draft.description.trim() ? draft.description : null,
          examIds: draft.exams.map((e) => e.id),
        },
      });
      setDirty(false);
      message.success("Model test saved");
      if (!modelTest) {
        loadedForIdRef.current = saved.id;
        navigate(`/model-tests/${saved.id}`, { replace: true });
      }
      return saved.id;
    } catch (e) {
      message.error(serverError(e, "Save failed"));
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
      message.success("Model test published — all exams are live");
    } catch (e) {
      setPublishError(serverError(e, "Publish failed"));
    }
  };

  const onUnpublish = async () => {
    if (!modelTest) return;
    try {
      await unpublish.mutateAsync(modelTest.id);
      loadedForIdRef.current = null;
      message.success("Model test unpublished — all exams are drafts again");
    } catch (e) {
      message.error(serverError(e, "Unpublish failed"));
    }
  };

  if (id && isLoading) return <Spin style={{ display: "block", marginTop: 80 }} />;

  return (
    <div>
      {readOnly && modelTest && (
        <Alert
          type="info" showIcon style={{ marginBottom: 16 }}
          message="This model test is published and frozen. Unpublish it to edit (only possible while no exam in it has attempts)."
        />
      )}
      {publishError && (
        <Alert
          type="error" showIcon closable style={{ marginBottom: 16 }}
          onClose={() => setPublishError(null)}
          message="Cannot publish — every exam must pass validation (nothing was published)"
          description={<div style={{ whiteSpace: "pre-line" }}>{publishError}</div>}
        />
      )}

      <Card title={modelTest ? (readOnly ? "Model test" : "Edit model test") : "New model test"}>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div>
            <Typography.Text strong>Title</Typography.Text>
            <Input
              value={draft.title} disabled={readOnly}
              onChange={(e) => mutate({ title: e.target.value })}
              placeholder="e.g. BCS 47th Full Model Test"
            />
          </div>
          <div>
            <Typography.Text strong>Description (optional)</Typography.Text>
            <Input.TextArea
              rows={2} value={draft.description} disabled={readOnly}
              onChange={(e) => mutate({ description: e.target.value })}
            />
          </div>

          <div>
            <Typography.Text strong>Exams (ordered)</Typography.Text>
            {draft.exams.length === 0 && (
              <Typography.Paragraph type="secondary" style={{ marginTop: 4 }}>
                No exams yet. Only draft standalone exams can be added; a published exam
                must be unpublished first.
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
                    padding: "8px 0", borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <span style={{ color: "#999", minWidth: 24 }}>{index + 1}.</span>
                  <Typography.Link onClick={() => navigate(`/exams/${e.id}`)} style={{ flex: 1 }}>
                    {e.title}
                  </Typography.Link>
                  <Tag color={STATUS_COLORS[e.status]}>{e.status}</Tag>
                  <Typography.Text type="secondary">
                    {e.questionCount} questions · {e.totalMarks} marks · {e.durationMinutes} min
                  </Typography.Text>
                  {!readOnly && (
                    <Button
                      size="small" type="text" danger icon={<DeleteOutlined />}
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
                placeholder="Add a draft standalone exam…"
                style={{ width: 420, marginTop: 12 }}
                value={null}
                onChange={(v) => { if (v) addExam(v); }}
                options={addableOptions}
                optionFilterProp="label"
              />
            )}
          </div>

          <Space>
            <Button onClick={() => navigate("/model-tests")}>Back</Button>
            {!readOnly && (
              <Button type="primary" loading={save.isPending} onClick={() => void onSave()}>
                Save
              </Button>
            )}
            {!readOnly && (
              <Popconfirm
                title="Publish this model test? All its exams freeze and go live together."
                onConfirm={() => void onPublish()}
              >
                <Button type="primary" ghost loading={publish.isPending}>Publish bundle</Button>
              </Popconfirm>
            )}
            {modelTest?.status === "published" && (
              <Popconfirm
                title="Unpublish? All exams in the bundle become editable drafts."
                onConfirm={() => void onUnpublish()}
              >
                <Button loading={unpublish.isPending}>Unpublish</Button>
              </Popconfirm>
            )}
            {dirty && <Tag color="orange">unsaved changes</Tag>}
          </Space>
        </Space>
      </Card>
    </div>
  );
}
