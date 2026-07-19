import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button, Card, Checkbox, Col, Divider, Form, Radio, Row, Select, Space, Spin,
  Switch, Tag, TreeSelect, Typography, message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useQuestion, useQuestionTags, useSaveQuestion } from "../api/questions";
import { useSubjects, useTopics } from "../api/taxonomy";
import type { QuestionResponse, SaveQuestionRequest } from "../api/types";
import { QuestionContentView } from "../features/questions/QuestionContentView";
import { RichTextEditor } from "../features/questions/RichTextEditor";
import { htmlHasContent } from "../features/questions/html";

const BN_LETTERS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ"];
const EN_LETTERS = ["A", "B", "C", "D", "E", "F"];

const optionSchema = z.object({
  id: z.string().nullish(),
  html: z.string(),
  isCorrect: z.boolean(),
});

const formSchema = z
  .object({
    language: z.enum(["bn", "en"]),
    status: z.enum(["draft", "active"]),
    stemHtml: z.string(),
    multipleCorrect: z.boolean(),
    lockOptionOrder: z.boolean(),
    options: z.array(optionSchema).max(6),
    explanationHtml: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    subjectId: z.string().nullable(),
    topicId: z.string().nullable(),
    tags: z.array(z.string().trim().min(1).max(40)).max(10),
  })
  .superRefine((data, ctx) => {
    // Mirrors the server: draft needs only a stem; active gets the full contract.
    if (!htmlHasContent(data.stemHtml)) {
      ctx.addIssue({ code: "custom", path: ["stemHtml"], message: "Stem cannot be empty" });
    }
    if (data.status === "active") {
      const filled = data.options.filter((o) => htmlHasContent(o.html));
      if (filled.length < 2) {
        ctx.addIssue({
          code: "custom", path: ["options"],
          message: "An active question needs at least 2 non-empty options",
        });
      }
      const correct = filled.filter((o) => o.isCorrect).length;
      if (!data.multipleCorrect && correct !== 1) {
        ctx.addIssue({
          code: "custom", path: ["options"],
          message: "Exactly one option must be marked correct",
        });
      }
      if (data.multipleCorrect && correct < 1) {
        ctx.addIssue({
          code: "custom", path: ["options"],
          message: "Mark at least one option correct",
        });
      }
      if (!data.subjectId) {
        ctx.addIssue({
          code: "custom", path: ["subjectId"],
          message: "Subject is required to activate",
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

const emptyOption = (): FormValues["options"][number] => ({
  id: null, html: "", isCorrect: false,
});

const defaultValues: FormValues = {
  language: "bn",
  status: "draft",
  stemHtml: "",
  multipleCorrect: false,
  lockOptionOrder: false,
  options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
  explanationHtml: "",
  difficulty: "medium",
  subjectId: null,
  topicId: null,
  tags: [],
};

function toFormValues(q: QuestionResponse): FormValues {
  return {
    language: q.language,
    status: q.status === "archived" ? "draft" : q.status,
    stemHtml: q.stemHtml,
    multipleCorrect: q.multipleCorrect,
    lockOptionOrder: q.lockOptionOrder,
    options: q.options.map((o) => ({ id: o.id, html: o.html, isCorrect: o.isCorrect })),
    explanationHtml: q.explanationHtml ?? "",
    difficulty: q.difficulty,
    subjectId: q.subjectId,
    topicId: q.topicId,
    tags: q.tags,
  };
}

function toRequest(values: FormValues, status: "draft" | "active"): SaveQuestionRequest {
  const options = values.options
    .filter((o) => htmlHasContent(o.html)) // silently drop never-filled option rows
    .map((o) => ({ id: o.id ?? null, html: o.html, isCorrect: o.isCorrect }));
  return {
    language: values.language,
    status,
    stemHtml: values.stemHtml,
    multipleCorrect: values.multipleCorrect,
    lockOptionOrder: values.lockOptionOrder,
    options,
    explanationHtml: htmlHasContent(values.explanationHtml) ? values.explanationHtml : null,
    difficulty: values.difficulty,
    subjectId: values.subjectId,
    topicId: values.topicId,
    tags: values.tags,
  };
}

export function QuestionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(true);

  const { data: existing, isLoading, isError } = useQuestion(id);
  const save = useSaveQuestion();
  const { data: subjects } = useSubjects("examiner");
  const { data: tagOptions } = useQuestionTags();

  const {
    control, handleSubmit, reset, setValue, getValues, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues });

  // keyName MUST NOT be the default "id": our options carry a real `id` (the
  // server's stable option id) and RHF's generated render key would clobber it.
  const { fields, append, remove } = useFieldArray({ control, name: "options", keyName: "key" });

  const subjectId = watch("subjectId");
  const multipleCorrect = watch("multipleCorrect");
  const watched = watch();
  const { data: topics } = useTopics("examiner", subjectId);

  // Initialize the form once per loaded question id. Without this guard a
  // background refetch (react-query refetches on window focus) produces a fresh
  // `existing` object identity that re-fires reset() and discards unsaved edits.
  const resetForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (existing && resetForIdRef.current !== existing.id) {
      resetForIdRef.current = existing.id;
      reset(toFormValues(existing));
    }
  }, [existing, reset]);

  useEffect(() => {
    if (isError) {
      message.error("Question not found");
      navigate("/questions");
    }
  }, [isError, navigate]);

  const setCorrect = (index: number, checked: boolean) => {
    if (multipleCorrect) {
      setValue(`options.${index}.isCorrect`, checked, { shouldDirty: true });
      return;
    }
    getValues("options").forEach((_, i) =>
      setValue(`options.${i}.isCorrect`, i === index && checked, { shouldDirty: true }),
    );
  };

  const onMultipleCorrectChange = (checked: boolean) => {
    setValue("multipleCorrect", checked, { shouldDirty: true });
    if (!checked) {
      const options = getValues("options");
      const firstCorrect = options.findIndex((o) => o.isCorrect);
      options.forEach((_, i) =>
        setValue(`options.${i}.isCorrect`, i === firstCorrect, { shouldDirty: true }),
      );
    }
  };

  const onSave = (status: "draft" | "active") => {
    setValue("status", status, { shouldValidate: false });
    void handleSubmit(async (values) => {
      try {
        await save.mutateAsync({ id, body: toRequest(values, status) });
        message.success(status === "draft" ? "Draft saved" : "Question saved and activated");
        navigate("/questions");
      } catch (e) {
        const serverError = (e as AxiosError<{ error?: string }>).response?.data?.error;
        message.error(serverError ?? "Save failed");
      }
    })();
  };

  if (id && isLoading) return <Spin style={{ display: "block", margin: "80px auto" }} />;

  const letters = watched.language === "bn" ? BN_LETTERS : EN_LETTERS;
  const previewOptions = watched.options.filter((o) => htmlHasContent(o.html));

  return (
    <Card
      title={id ? "Edit question" : "New question"}
      extra={
        <Space>
          <Typography.Text>Preview</Typography.Text>
          <Switch checked={showPreview} onChange={setShowPreview} />
        </Space>
      }
    >
      <Row gutter={24}>
        <Col span={showPreview ? 14 : 24}>
          <Form layout="vertical">
            <Space wrap>
              <Form.Item label="Language">
                <Controller
                  control={control}
                  name="language"
                  render={({ field }) => (
                    <Select
                      {...field}
                      style={{ width: 110 }}
                      options={[
                        { value: "bn", label: "বাংলা" },
                        { value: "en", label: "English" },
                      ]}
                    />
                  )}
                />
              </Form.Item>
              <Form.Item
                label="Subject"
                validateStatus={errors.subjectId ? "error" : undefined}
                help={errors.subjectId?.message}
              >
                <Controller
                  control={control}
                  name="subjectId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      allowClear
                      placeholder="Subject"
                      style={{ width: 200 }}
                      options={(subjects ?? []).map((s) => ({
                        value: s.id,
                        label: s.name.bn && s.name.en ? `${s.name.bn} — ${s.name.en}` : s.name.bn ?? s.name.en ?? s.slug,
                      }))}
                      onChange={(v) => {
                        field.onChange(v ?? null);
                        setValue("topicId", null);
                      }}
                    />
                  )}
                />
              </Form.Item>
              <Form.Item label="Topic">
                <Controller
                  control={control}
                  name="topicId"
                  render={({ field }) => (
                    <TreeSelect
                      value={field.value}
                      allowClear
                      disabled={!subjectId}
                      placeholder="Topic"
                      style={{ width: 220 }}
                      treeDefaultExpandAll
                      treeData={(topics ?? [])
                        .filter((t) => !t.parentTopicId)
                        .map((t) => ({
                          value: t.id,
                          title: t.name.bn && t.name.en ? `${t.name.bn} — ${t.name.en}` : t.name.bn ?? t.name.en ?? t.slug,
                          children: (topics ?? [])
                            .filter((s) => s.parentTopicId === t.id)
                            .map((s) => ({
                              value: s.id,
                              title: s.name.bn && s.name.en ? `${s.name.bn} — ${s.name.en}` : s.name.bn ?? s.name.en ?? s.slug,
                            })),
                        }))}
                      onChange={(v) => field.onChange(v ?? null)}
                    />
                  )}
                />
              </Form.Item>
              <Form.Item label="Difficulty">
                <Controller
                  control={control}
                  name="difficulty"
                  render={({ field }) => (
                    <Select
                      {...field}
                      style={{ width: 120 }}
                      options={["easy", "medium", "hard"].map((d) => ({ value: d, label: d }))}
                    />
                  )}
                />
              </Form.Item>
              <Form.Item label="Tags">
                <Controller
                  control={control}
                  name="tags"
                  render={({ field }) => (
                    <Select
                      {...field}
                      mode="tags"
                      placeholder="e.g. BCS 10th"
                      style={{ minWidth: 220 }}
                      options={(tagOptions ?? []).map((t) => ({ value: t, label: t }))}
                    />
                  )}
                />
              </Form.Item>
            </Space>

            <Space size="large" style={{ marginBottom: 16 }}>
              <Space>
                <Typography.Text>Multiple correct</Typography.Text>
                <Switch checked={multipleCorrect} onChange={onMultipleCorrectChange} />
              </Space>
              <Controller
                control={control}
                name="lockOptionOrder"
                render={({ field }) => (
                  <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)}>
                    Lock option order (e.g. “All of the above”)
                  </Checkbox>
                )}
              />
            </Space>

            <Form.Item
              label="Stem"
              required
              validateStatus={errors.stemHtml ? "error" : undefined}
              help={errors.stemHtml?.message}
            >
              <Controller
                control={control}
                name="stemHtml"
                render={({ field }) => (
                  <RichTextEditor value={field.value} onChange={field.onChange} minHeight={120} />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Options"
              validateStatus={errors.options ? "error" : undefined}
              help={errors.options?.message ?? errors.options?.root?.message}
            >
              <Space orientation="vertical" style={{ width: "100%" }}>
                {fields.map((field, index) => (
                  <Space key={field.key} align="start" style={{ width: "100%" }}>
                    {multipleCorrect ? (
                      <Checkbox
                        checked={watched.options[index]?.isCorrect ?? false}
                        onChange={(e) => setCorrect(index, e.target.checked)}
                        style={{ marginTop: 10 }}
                      />
                    ) : (
                      <Radio
                        checked={watched.options[index]?.isCorrect ?? false}
                        onChange={() => setCorrect(index, true)}
                        style={{ marginTop: 10 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 320 }}>
                      <Controller
                        control={control}
                        name={`options.${index}.html`}
                        render={({ field: f }) => (
                          <RichTextEditor value={f.value} onChange={f.onChange} minHeight={40} />
                        )}
                      />
                    </div>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(index)}
                      style={{ marginTop: 4 }}
                    />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  disabled={fields.length >= 6}
                  onClick={() => append(emptyOption())}
                >
                  Add option
                </Button>
              </Space>
            </Form.Item>

            <Form.Item label="Explanation (answer rationale)">
              <Controller
                control={control}
                name="explanationHtml"
                render={({ field }) => (
                  <RichTextEditor value={field.value} onChange={field.onChange} minHeight={80} />
                )}
              />
            </Form.Item>

            <Space>
              <Button loading={isSubmitting} onClick={() => onSave("draft")}>
                Save as draft
              </Button>
              <Button type="primary" loading={isSubmitting} onClick={() => onSave("active")}>
                Save & activate
              </Button>
              <Button onClick={() => navigate("/questions")}>Cancel</Button>
            </Space>
          </Form>
        </Col>

        {showPreview && (
          <Col span={10}>
            <Card size="small" title="Student preview">
              <QuestionContentView html={watched.stemHtml} />
              <Divider style={{ margin: "12px 0" }} />
              <Space orientation="vertical" style={{ width: "100%" }}>
                {previewOptions.map((option, index) => (
                  <Space key={index} align="start">
                    {multipleCorrect ? <Checkbox disabled /> : <Radio disabled />}
                    <Typography.Text strong>{letters[index]}.</Typography.Text>
                    <QuestionContentView html={option.html} />
                    {option.isCorrect && <Tag color="green">correct</Tag>}
                  </Space>
                ))}
              </Space>
              {htmlHasContent(watched.explanationHtml) && (
                <>
                  <Divider style={{ margin: "12px 0" }}>Explanation</Divider>
                  <QuestionContentView html={watched.explanationHtml} />
                </>
              )}
            </Card>
          </Col>
        )}
      </Row>
    </Card>
  );
}
