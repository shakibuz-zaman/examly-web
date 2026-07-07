import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Button, Card, Col, DatePicker, Input, InputNumber, Row, Space, Spin,
  Switch, Tag, Typography, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AxiosError } from "axios";
import { useExam, useSaveExam } from "../api/exams";
import { SectionCard } from "../features/exams/SectionCard";
import { SortableList } from "../features/exams/SortableList";
import {
  draftQuestionCount, draftTotalMarks, emptyDraft, fromResponse,
  nextKey, toSaveRequest,
} from "../features/exams/examDraft";
import type { DraftSection, ExamDraft } from "../features/exams/examDraft";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

export function ExamBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: exam, isLoading } = useExam(id);
  const save = useSaveExam();

  const [draft, setDraft] = useState<ExamDraft>(emptyDraft);
  const [dirty, setDirty] = useState(false);
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

  const readOnly = exam ? exam.status !== "draft" : false;

  const mutate = (patch: Partial<ExamDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const mutateSection = (key: string, section: DraftSection) =>
    mutate({ sections: draft.sections.map((s) => (s.key === key ? section : s)) });

  const onSaveDraft = async (): Promise<string | null> => {
    if (!draft.title.trim()) {
      message.error("Title is required");
      return null;
    }
    try {
      const saved = await save.mutateAsync({ id: exam?.id, body: toSaveRequest(draft) });
      setDirty(false);
      message.success("Draft saved");
      if (!exam) {
        loadedForIdRef.current = saved.id; // fromResponse would reset local edits
        navigate(`/exams/${saved.id}`, { replace: true });
      }
      return saved.id;
    } catch (e) {
      message.error(serverError(e, "Save failed"));
      return null;
    }
  };

  if (id && isLoading) return <Spin style={{ display: "block", marginTop: 80 }} />;

  const questionCount = draftQuestionCount(draft);
  const totalMarks = draftTotalMarks(draft);

  return (
    <div style={{ paddingBottom: 72 }}>
      {readOnly && exam && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            exam.status === "published"
              ? "This exam is published and frozen. Unpublish it to edit (only possible while it has no attempts)."
              : "This exam is archived."
          }
        />
      )}

      <Card title={exam ? (readOnly ? "Exam" : "Edit exam") : "New exam"} style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]}>
          <Col xs={24} md={12}>
            <Typography.Text strong>Title</Typography.Text>
            <Input
              value={draft.title}
              disabled={readOnly}
              onChange={(e) => mutate({ title: e.target.value })}
              placeholder="e.g. BCS 47th — Bangla"
            />
          </Col>
          <Col xs={24} md={12}>
            <Typography.Text strong>Description (optional)</Typography.Text>
            <Input
              value={draft.description}
              disabled={readOnly}
              onChange={(e) => mutate({ description: e.target.value })}
            />
          </Col>
          <Col xs={12} md={4}>
            <Typography.Text strong>Duration (minutes)</Typography.Text>
            <InputNumber
              min={0} style={{ width: "100%" }} value={draft.durationMinutes} disabled={readOnly}
              onChange={(v) => mutate({ durationMinutes: v ?? 0 })}
            />
          </Col>
          <Col xs={12} md={4}>
            <Typography.Text strong>Marks / question</Typography.Text>
            <InputNumber
              min={0} step={0.25} style={{ width: "100%" }} value={draft.defaultMarks}
              disabled={readOnly} onChange={(v) => mutate({ defaultMarks: v ?? 0 })}
            />
          </Col>
          <Col xs={12} md={4}>
            <Typography.Text strong>Negative marks</Typography.Text>
            <InputNumber
              min={0} step={0.25} style={{ width: "100%" }} value={draft.negativeMarks}
              disabled={readOnly} onChange={(v) => mutate({ negativeMarks: v ?? 0 })}
            />
          </Col>
          <Col xs={24} md={12}>
            <Typography.Text strong>Scheduled window (optional — empty = take anytime)</Typography.Text>
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
              <Typography.Text>Shuffle per student</Typography.Text>
            </Space>
          </Col>
          <Col xs={12} md={6}>
            <Space>
              <Switch
                checked={draft.allowRetakes} disabled={readOnly}
                onChange={(v) => mutate({ allowRetakes: v })}
              />
              <Typography.Text>Allow retakes (practice)</Typography.Text>
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
          Add section
        </Button>
      )}

      <div
        style={{
          position: "fixed", bottom: 0, left: 220, right: 0, zIndex: 10,
          background: "#fff", borderTop: "1px solid #f0f0f0",
          padding: "12px 24px", display: "flex", alignItems: "center", gap: 16,
        }}
      >
        <Space size="large" style={{ flex: 1 }}>
          <Typography.Text>
            <strong>{questionCount}</strong> questions
          </Typography.Text>
          <Typography.Text>
            <strong>{totalMarks}</strong> total marks
          </Typography.Text>
          {dirty && <Tag color="orange">unsaved changes</Tag>}
        </Space>
        <Space>
          <Button onClick={() => navigate("/exams")}>Back</Button>
          {!readOnly && (
            <Button type="primary" loading={save.isPending} onClick={() => void onSaveDraft()}>
              Save draft
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
}
