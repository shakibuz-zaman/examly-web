import { zodResolver } from "@hookform/resolvers/zod";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button, Card, Checkbox, Collapse, Descriptions, Drawer, Form, Input, InputNumber, Modal,
  Popconfirm, Radio, Select, Space, Spin, Table, Tag, TreeSelect, Typography, message,
} from "antd";
import type { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { categoryLabel, useExamCategories } from "../api/categories";
import {
  useAdminPaper, useAdminPaperQuestions, useDeleteQbankQuestion, useImportQuestions,
  useSaveQbankQuestion, useSetPaperStatus, useUpdatePaper,
} from "../api/qbankAdmin";
import { useSubjects, useTopics } from "../api/taxonomy";
import type {
  AdminPaper, BilingualText, QbankQuestion, SaveQbankQuestionRequest,
} from "../api/types";
import { CategoryTreeSelect } from "../features/categories/CategoryTreeSelect";
import { htmlHasContent } from "../features/questions/html";
import { RichTextEditor } from "../features/questions/RichTextEditor";
import { formatDateTime } from "../lib/format";
import { CONTENT_STATUS_COLORS } from "../theme/status";

// ---- helpers ----

function plainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

function bilingualLabel(b: BilingualText | null | undefined, fallback = "—"): string {
  if (!b) return fallback;
  if (b.bn && b.en) return `${b.bn} — ${b.en}`;
  return b.bn ?? b.en ?? fallback;
}

// ---- question editor form schema (mirrors PastPaperService validation) ----

const optionSchema = z.object({
  id: z.string().nullish(),
  html: z.string(),
  isCorrect: z.boolean(),
});

const formSchema = z
  .object({
    order: z.number().nullish(),
    sectionLabel: z.string(),
    stemHtml: z.string(),
    multipleCorrect: z.boolean(),
    options: z.array(optionSchema).max(8),
    explanationHtml: z.string(),
    takeawayText: z.string().max(300),
    subjectId: z.string().nullable(),
    topicId: z.string().nullable(),
    language: z.enum(["bn", "en"]),
  })
  .superRefine((data, ctx) => {
    if (!htmlHasContent(data.stemHtml)) {
      ctx.addIssue({ code: "custom", path: ["stemHtml"], message: "Stem cannot be empty" });
    }
    const filled = data.options.filter((o) => htmlHasContent(o.html));
    if (filled.length < 2) {
      ctx.addIssue({
        code: "custom", path: ["options"],
        message: "At least 2 non-empty options are required",
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
  });

type FormValues = z.infer<typeof formSchema>;

const emptyOption = (): FormValues["options"][number] => ({ id: null, html: "", isCorrect: false });

const defaultValues: FormValues = {
  order: undefined,
  sectionLabel: "",
  stemHtml: "",
  multipleCorrect: false,
  options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
  explanationHtml: "",
  takeawayText: "",
  subjectId: null,
  topicId: null,
  language: "bn",
};

function toFormValues(q: QbankQuestion): FormValues {
  return {
    order: q.order,
    sectionLabel: q.sectionLabel ?? "",
    stemHtml: q.stemHtml,
    multipleCorrect: q.multipleCorrect,
    options: q.options.map((o) => ({ id: o.id, html: o.html, isCorrect: o.isCorrect })),
    explanationHtml: q.explanationHtml ?? "",
    takeawayText: q.takeawayText ?? "",
    subjectId: q.subjectId,
    topicId: q.topicId,
    language: q.language === "en" ? "en" : "bn",
  };
}

function toRequest(values: FormValues): SaveQbankQuestionRequest {
  const options = values.options
    .filter((o) => htmlHasContent(o.html)) // silently drop never-filled rows
    .map((o) => ({ id: o.id ?? null, html: o.html, isCorrect: o.isCorrect }));
  return {
    order: values.order ?? undefined,
    sectionLabel: values.sectionLabel.trim() ? values.sectionLabel.trim() : null,
    stemHtml: values.stemHtml,
    multipleCorrect: values.multipleCorrect,
    options,
    explanationHtml: htmlHasContent(values.explanationHtml) ? values.explanationHtml : null,
    takeawayText: values.takeawayText.trim() ? values.takeawayText.trim() : null,
    subjectId: values.subjectId,
    topicId: values.topicId,
    language: values.language,
  };
}

// ---- question editor Drawer ----

function QuestionEditorDrawer({
  open, paperId, editing, onClose,
}: {
  open: boolean;
  paperId: string;
  editing: QbankQuestion | null;
  onClose: () => void;
}) {
  const save = useSaveQbankQuestion();
  const { data: subjects } = useSubjects("admin");

  const {
    control, handleSubmit, reset, setValue, getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues });

  // keyName MUST NOT be the default "id": options carry the server's stable option
  // id and RHF's generated render key would clobber it on the edit round-trip.
  const { fields, append, remove } = useFieldArray({ control, name: "options", keyName: "key" });

  const multipleCorrect = useWatch({ control, name: "multipleCorrect" });
  const subjectId = useWatch({ control, name: "subjectId" });
  const options = useWatch({ control, name: "options" });
  const { data: topics } = useTopics("admin", subjectId ?? null);

  // Re-seed the form each time the drawer opens (for the current question or blank).
  useEffect(() => {
    if (open) reset(editing ? toFormValues(editing) : defaultValues);
  }, [open, editing, reset]);

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
      const opts = getValues("options");
      const firstCorrect = opts.findIndex((o) => o.isCorrect);
      opts.forEach((_, i) =>
        setValue(`options.${i}.isCorrect`, i === firstCorrect, { shouldDirty: true }),
      );
    }
  };

  const onSave = () =>
    void handleSubmit(async (values) => {
      try {
        await save.mutateAsync({ paperId, qid: editing?.id, body: toRequest(values) });
        message.success(editing ? "Question updated" : "Question added");
        onClose();
      } catch (e) {
        const serverError = (e as AxiosError<{ error?: string }>).response?.data?.error;
        message.error(serverError ?? "Save failed");
      }
    })();

  return (
    <Drawer
      open={open}
      size="large"
      title={editing ? "Edit question" : "Add question"}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={isSubmitting} onClick={onSave}>Save</Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Space wrap>
          <Form.Item label="Language">
            <Controller
              control={control}
              name="language"
              render={({ field }) => (
                <Select
                  {...field}
                  style={{ width: 120 }}
                  options={[
                    { value: "bn", label: "বাংলা" },
                    { value: "en", label: "English" },
                  ]}
                />
              )}
            />
          </Form.Item>
          <Form.Item label="Order">
            <Controller
              control={control}
              name="order"
              render={({ field }) => (
                <InputNumber
                  min={0}
                  style={{ width: 120 }}
                  value={field.value ?? undefined}
                  onChange={(v) => field.onChange(v ?? undefined)}
                />
              )}
            />
          </Form.Item>
          <Form.Item label="Section label">
            <Controller
              control={control}
              name="sectionLabel"
              render={({ field }) => (
                <Input {...field} placeholder="e.g. General Knowledge" style={{ width: 220 }} />
              )}
            />
          </Form.Item>
        </Space>

        <Space wrap>
          <Form.Item label="Subject">
            <Controller
              control={control}
              name="subjectId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  allowClear
                  placeholder="Subject"
                  style={{ width: 220 }}
                  options={(subjects ?? []).map((s) => ({
                    value: s.id,
                    label: bilingualLabel(s.name, s.slug),
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
                  style={{ width: 260 }}
                  treeDefaultExpandAll
                  treeData={(topics ?? [])
                    .filter((t) => !t.parentTopicId)
                    .map((t) => ({
                      value: t.id,
                      title: bilingualLabel(t.name, t.slug),
                      children: (topics ?? [])
                        .filter((s) => s.parentTopicId === t.id)
                        .map((s) => ({ value: s.id, title: bilingualLabel(s.name, s.slug) })),
                    }))}
                  onChange={(v) => field.onChange(v ?? null)}
                />
              )}
            />
          </Form.Item>
        </Space>

        <Space size="large" style={{ marginBottom: 16 }}>
          <Typography.Text>Multiple correct</Typography.Text>
          <Checkbox
            checked={multipleCorrect}
            onChange={(e) => onMultipleCorrectChange(e.target.checked)}
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
          required
          validateStatus={errors.options ? "error" : undefined}
          help={errors.options?.message ?? errors.options?.root?.message}
        >
          <Space orientation="vertical" style={{ width: "100%" }}>
            {fields.map((field, index) => (
              <Space key={field.key} align="start" style={{ width: "100%" }}>
                {multipleCorrect ? (
                  <Checkbox
                    checked={options?.[index]?.isCorrect ?? false}
                    onChange={(e) => setCorrect(index, e.target.checked)}
                    style={{ marginTop: 10 }}
                  />
                ) : (
                  <Radio
                    checked={options?.[index]?.isCorrect ?? false}
                    onChange={() => setCorrect(index, true)}
                    style={{ marginTop: 10 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 280 }}>
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
                  disabled={fields.length <= 2}
                  onClick={() => remove(index)}
                  style={{ marginTop: 4 }}
                />
              </Space>
            ))}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              disabled={fields.length >= 8}
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

        <Form.Item
          label="Takeaway (one-line recall, max 300)"
          validateStatus={errors.takeawayText ? "error" : undefined}
          help={errors.takeawayText?.message}
        >
          <Controller
            control={control}
            name="takeawayText"
            render={({ field }) => (
              <Input.TextArea {...field} maxLength={300} rows={2} placeholder="Key fact to remember" />
            )}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

// ---- metadata edit modal ----

type MetaFormValues = { title?: string; year?: number; categoryId?: string };

function MetadataModal({
  open, paper, onClose,
}: {
  open: boolean;
  paper: AdminPaper;
  onClose: () => void;
}) {
  const update = useUpdatePaper();
  const [form] = Form.useForm<MetaFormValues>();

  useEffect(() => {
    if (open) form.setFieldsValue({ title: paper.title, year: paper.year, categoryId: paper.categoryId });
  }, [open, paper, form]);

  async function onSubmit(values: MetaFormValues) {
    try {
      await update.mutateAsync({
        id: paper.id,
        body: { title: values.title?.trim(), year: values.year, categoryId: values.categoryId },
      });
      message.success("Paper updated");
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error ?? "Save failed");
    }
  }

  return (
    <Modal
      open={open}
      title="Edit paper"
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={update.isPending}
    >
      <Form<MetaFormValues> form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title is required" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="year" label="Year" rules={[{ required: true, message: "Year is required" }]}>
          <InputNumber min={1970} max={2100} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="categoryId" label="Category" rules={[{ required: true, message: "Category is required" }]}>
          <CategoryTreeSelect placeholder="Select a category" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ---- import card ----

const SAMPLE_ROW = `[
  {
    "order": 1,
    "sectionLabel": "General Knowledge",
    "stemHtml": "<p>Capital of Bangladesh?</p>",
    "multipleCorrect": false,
    "options": [
      { "html": "<p>Dhaka</p>", "isCorrect": true },
      { "html": "<p>Chittagong</p>", "isCorrect": false }
    ],
    "explanationHtml": "<p>Dhaka is the capital.</p>",
    "takeawayText": "Dhaka is the capital of Bangladesh",
    "subjectId": null,
    "topicId": null,
    "language": "bn"
  }
]`;

function ImportCard({ paperId }: { paperId: string }) {
  const importQuestions = useImportQuestions(paperId);
  const [text, setText] = useState("");

  function onImport() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      message.error("Invalid JSON — check for syntax errors");
      return;
    }
    if (!Array.isArray(parsed)) {
      message.error("Import payload must be a JSON array of rows");
      return;
    }
    importQuestions.mutate(parsed as SaveQbankQuestionRequest[], {
      onError: (e) => {
        const serverError = (e as AxiosError<{ error?: string }>).response?.data?.error;
        message.error(serverError ?? "Import failed");
      },
    });
  }

  const report = importQuestions.data;

  return (
    <Card title="Import questions (JSON)">
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Input.TextArea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a JSON array of question rows…"
          style={{ fontFamily: "monospace" }}
        />
        <Button type="primary" loading={importQuestions.isPending} onClick={onImport}>
          Import
        </Button>

        {report && (
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Space>
              <Typography.Text type="success" strong>
                Accepted: <span className="tnum">{report.accepted}</span>
              </Typography.Text>
              <Typography.Text type="danger" strong>
                Rejected: <span className="tnum">{report.rejected}</span>
              </Typography.Text>
            </Space>
            {report.errors.length > 0 && (
              <Table
                size="small"
                rowKey="index"
                pagination={false}
                dataSource={report.errors}
                columns={[
                  {
                    title: "Row", dataIndex: "index", width: 80,
                    render: (i: number) => <span className="tnum">{i + 1}</span>,
                  },
                  { title: "Error", dataIndex: "error" },
                ]}
              />
            )}
          </Space>
        )}

        <Collapse
          ghost
          items={[
            {
              key: "format",
              label: "Format",
              children: (
                <pre style={{ margin: 0, overflowX: "auto", fontSize: 12 }}>{SAMPLE_ROW}</pre>
              ),
            },
          ]}
        />
      </Space>
    </Card>
  );
}

// ---- page ----

export function AdminQbankPaperPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const paperQ = useAdminPaper(id);
  const questionsQ = useAdminPaperQuestions(id);
  const setStatus = useSetPaperStatus();
  const deleteQuestion = useDeleteQbankQuestion();
  const { data: categories } = useExamCategories();

  const [metaOpen, setMetaOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<QbankQuestion | null>(null);

  useEffect(() => {
    if (paperQ.isError) {
      message.error("Paper not found");
      navigate("/admin/qbank");
    }
  }, [paperQ.isError, navigate]);

  if (paperQ.isLoading || !paperQ.data) {
    return <Spin style={{ display: "block", margin: "80px auto" }} />;
  }

  const paper = paperQ.data;
  const category = categories?.find((c) => c.id === paper.categoryId);

  async function changeStatus(action: "activate" | "archive") {
    try {
      await setStatus.mutateAsync({ id: paper.id, action });
      message.success(action === "activate" ? "Paper activated" : "Paper archived");
    } catch (e) {
      const serverError = (e as AxiosError<{ error?: string }>).response?.data?.error;
      message.error(serverError ?? "Status change failed");
    }
  }

  async function onDelete(qid: string) {
    try {
      await deleteQuestion.mutateAsync({ qid });
      message.success("Question deleted");
    } catch {
      message.error("Delete failed");
    }
  }

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(q: QbankQuestion) {
    setEditing(q);
    setDrawerOpen(true);
  }

  const statusActions = paper.status === "active" ? (
    <Popconfirm title="Archive this paper?" onConfirm={() => changeStatus("archive")}>
      <Button danger>Archive</Button>
    </Popconfirm>
  ) : (
    <Popconfirm title="Activate this paper?" onConfirm={() => changeStatus("activate")}>
      <Button type="primary">Activate</Button>
    </Popconfirm>
  );

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title={
          <Space>
            <Button onClick={() => navigate("/admin/qbank")}>← Papers</Button>
            <Typography.Title level={4} style={{ margin: 0 }}>{paper.title}</Typography.Title>
            <Tag color={CONTENT_STATUS_COLORS[paper.status] ?? "default"}>{paper.status}</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button onClick={() => setMetaOpen(true)}>Edit</Button>
            {statusActions}
          </Space>
        }
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Year">
            <span className="tnum">{paper.year}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Category">
            {category ? categoryLabel(category) : paper.categoryId}
          </Descriptions.Item>
          <Descriptions.Item label="Questions">
            <span className="tnum">{paper.questionCount}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Updated">{formatDateTime(paper.updatedAt)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="Questions"
        extra={<Button type="primary" onClick={openCreate}>Add question</Button>}
      >
        <Table<QbankQuestion>
          rowKey="id"
          loading={questionsQ.isLoading}
          dataSource={questionsQ.data ?? []}
          pagination={false}
          columns={[
            {
              title: "Order", dataIndex: "order", width: 80,
              render: (n: number) => <span className="tnum">{n}</span>,
            },
            {
              title: "Stem", key: "stem",
              render: (_, q) => {
                const text = plainText(q.stemHtml);
                return text.length > 80 ? `${text.slice(0, 80)}…` : text || "—";
              },
            },
            {
              title: "Section", dataIndex: "sectionLabel", width: 140,
              render: (s: string | null) => s ?? "—",
            },
            {
              title: "Subject", key: "subject", width: 160,
              render: (_, q) => bilingualLabel(q.subjectName),
            },
            {
              title: "Correct", key: "correct", width: 90,
              render: (_, q) => (
                <span className="tnum">{q.options.filter((o) => o.isCorrect).length}</span>
              ),
            },
            {
              title: "Actions", key: "actions", width: 150,
              render: (_, q) => (
                <Space>
                  <Button size="small" onClick={() => openEdit(q)}>Edit</Button>
                  <Popconfirm title="Delete this question?" onConfirm={() => onDelete(q.id)}>
                    <Button size="small" danger>Delete</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <ImportCard paperId={paper.id} />

      <MetadataModal open={metaOpen} paper={paper} onClose={() => setMetaOpen(false)} />
      <QuestionEditorDrawer
        open={drawerOpen}
        paperId={paper.id}
        editing={editing}
        onClose={() => setDrawerOpen(false)}
      />
    </Space>
  );
}
