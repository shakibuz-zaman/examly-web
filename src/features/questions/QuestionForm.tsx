import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button, Card, Checkbox, Col, Divider, Form, Radio, Row, Select, Space, Switch, Tag, TreeSelect,
  Typography,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useQuestionTags } from "../../api/questions";
import { useSubjects, useTopics } from "../../api/taxonomy";
import type { QuestionResponse, SaveQuestionRequest } from "../../api/types";
import { bilingualLabel, DIFFICULTY, LANGUAGE } from "../../lib/labels";
import { QuestionContentView } from "./QuestionContentView";
import { RichTextEditor } from "./RichTextEditor";
import { htmlHasContent } from "./html";
import {
  BN_LETTERS, EN_LETTERS, emptyOption, formSchema, questionFormDefaults, toFormValues, toRequest,
  type QuestionFormValues,
} from "./questionFormModel";

// Re-exported so hosts can import the value type alongside the component. Type-only: the
// runtime symbols (`questionFormDefaults`, `stemExcerpt`, …) must be imported from
// `./questionFormModel` directly — `react-refresh/only-export-components` bars a component
// file from exporting values, re-exports included.
export type { QuestionFormValues } from "./questionFormModel";

export type QuestionFormHandle = {
  submit(status: "draft" | "active"): Promise<SaveQuestionRequest | null>;
  reset(values?: Partial<QuestionFormValues>): void;
  isDirty(): boolean;
  currentValues(): QuestionFormValues;
  focusStem(): void;
};

export type QuestionFormProps = {
  initial?: QuestionResponse;
  showPreview: boolean;
  previewSpan?: number; // antd 24-col span for the preview column; editor page keeps 10
};

// The question editor's form, lifted out of the page so the author drawer (spec A2) can host
// the SAME schema, messages and preview. Hosts own the buttons; this owns RHF state and
// exposes it through an imperative handle — `submit` resolves to the wire body or null after
// the resolver has surfaced field errors.
export const QuestionForm = forwardRef<QuestionFormHandle, QuestionFormProps>(function QuestionForm(
  { initial, showPreview, previewSpan = 10 }, ref,
) {
  const { data: subjects } = useSubjects("examiner");
  const { data: tagOptions } = useQuestionTags();
  const stemRef = useRef<HTMLDivElement>(null);

  const {
    control, handleSubmit, reset, setValue, getValues, watch,
    formState: { errors, isDirty },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: questionFormDefaults,
  });

  // keyName MUST NOT be the default "id": our options carry a real `id` (the
  // server's stable option id) and RHF's generated render key would clobber it.
  const { fields, append, remove } = useFieldArray({ control, name: "options", keyName: "key" });

  const subjectId = watch("subjectId");
  const multipleCorrect = watch("multipleCorrect");
  const watched = watch();
  const { data: topics } = useTopics("examiner", subjectId);

  // Initialize the form once per loaded question id. Without this guard a
  // background refetch (react-query refetches on window focus) produces a fresh
  // `initial` object identity that re-fires reset() and discards unsaved edits.
  const resetForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (initial && resetForIdRef.current !== initial.id) {
      resetForIdRef.current = initial.id;
      reset(toFormValues(initial));
    }
  }, [initial, reset]);

  useImperativeHandle(ref, () => ({
    submit: (status) =>
      new Promise<SaveQuestionRequest | null>((resolve) => {
        setValue("status", status, { shouldValidate: false });
        void handleSubmit(
          (values) => resolve(toRequest(values, status)),
          () => resolve(null),
        )();
      }),
    reset: (values) => reset({ ...questionFormDefaults, ...values }),
    isDirty: () => isDirty,
    currentValues: () => getValues(),
    focusStem: () => {
      stemRef.current?.querySelector<HTMLElement>(".ProseMirror")?.focus();
    },
  }), [handleSubmit, reset, setValue, getValues, isDirty]);

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

  const letters = watched.language === "bn" ? BN_LETTERS : EN_LETTERS;
  const previewOptions = watched.options.filter((o) => htmlHasContent(o.html));

  return (
    <Row gutter={24}>
      <Col span={showPreview ? 24 - previewSpan : 24}>
        <Form layout="vertical">
          <Space wrap>
            <Form.Item label="ভাষা">
              <Controller
                control={control}
                name="language"
                render={({ field }) => (
                  <Select
                    {...field}
                    style={{ width: 110 }}
                    options={Object.entries(LANGUAGE).map(([value, label]) => ({
                      value, label,
                    }))}
                  />
                )}
              />
            </Form.Item>
            <Form.Item
              label="বিষয়"
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
                    placeholder="বিষয়"
                    style={{ width: 200 }}
                    // `bilingualLabel`, not the old inline «bn — en» join: this is chrome on
                    // a Bengali surface, and the combo is exactly the half-translation D17
                    // retired. Same helper the list column now uses, so the two never drift.
                    options={(subjects ?? []).map((s) => ({
                      value: s.id,
                      label: bilingualLabel(s.name),
                    }))}
                    onChange={(v) => {
                      field.onChange(v ?? null);
                      setValue("topicId", null);
                    }}
                  />
                )}
              />
            </Form.Item>
            <Form.Item label="টপিক">
              <Controller
                control={control}
                name="topicId"
                render={({ field }) => (
                  <TreeSelect
                    value={field.value}
                    allowClear
                    disabled={!subjectId}
                    placeholder="টপিক"
                    style={{ width: 220 }}
                    treeDefaultExpandAll
                    treeData={(topics ?? [])
                      .filter((t) => !t.parentTopicId)
                      .map((t) => ({
                        value: t.id,
                        title: bilingualLabel(t.name),
                        children: (topics ?? [])
                          .filter((s) => s.parentTopicId === t.id)
                          .map((s) => ({
                            value: s.id,
                            title: bilingualLabel(s.name),
                          })),
                      }))}
                    onChange={(v) => field.onChange(v ?? null)}
                  />
                )}
              />
            </Form.Item>
            <Form.Item label="কঠিনতা">
              <Controller
                control={control}
                name="difficulty"
                render={({ field }) => (
                  <Select
                    {...field}
                    style={{ width: 130 }}
                    options={["easy", "medium", "hard"].map((d) => ({
                      value: d,
                      label: DIFFICULTY[d],
                    }))}
                  />
                )}
              />
            </Form.Item>
            <Form.Item label="ট্যাগ">
              <Controller
                control={control}
                name="tags"
                render={({ field }) => (
                  <Select
                    {...field}
                    mode="tags"
                    // The example stays Latin on purpose: tags are examiner-authored
                    // identifiers («BCS 10th»), the ratified Western-digit exception.
                    placeholder="যেমন BCS 10th"
                    style={{ minWidth: 220 }}
                    options={(tagOptions ?? []).map((t) => ({ value: t, label: t }))}
                  />
                )}
              />
            </Form.Item>
          </Space>

          <Space size="large" style={{ marginBottom: 16 }}>
            <Space>
              <Typography.Text>একাধিক সঠিক উত্তর</Typography.Text>
              <Switch checked={multipleCorrect} onChange={onMultipleCorrectChange} />
            </Space>
            <Controller
              control={control}
              name="lockOptionOrder"
              render={({ field }) => (
                <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)}>
                  অপশনের ক্রম লক করুন (যেমন «উপরের সবগুলো»)
                </Checkbox>
              )}
            />
          </Space>

          <Form.Item
            label="প্রশ্নের মূল অংশ"
            required
            validateStatus={errors.stemHtml ? "error" : undefined}
            help={errors.stemHtml?.message}
          >
            <div ref={stemRef}>
              <Controller
                control={control}
                name="stemHtml"
                render={({ field }) => (
                  <RichTextEditor value={field.value} onChange={field.onChange} minHeight={120} />
                )}
              />
            </div>
          </Form.Item>

          <Form.Item
            label="অপশন"
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
                    aria-label={`অপশন ${letters[index] ?? index + 1} মুছুন`}
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
                অপশন যোগ করুন
              </Button>
            </Space>
          </Form.Item>

          <Form.Item label="ব্যাখ্যা (উত্তরের যুক্তি)">
            <Controller
              control={control}
              name="explanationHtml"
              render={({ field }) => (
                <RichTextEditor value={field.value} onChange={field.onChange} minHeight={80} />
              )}
            />
          </Form.Item>
        </Form>
      </Col>

      {showPreview && (
        <Col span={previewSpan}>
          <Card size="small" title="শিক্ষার্থীর প্রিভিউ">
            <QuestionContentView html={watched.stemHtml} />
            <Divider style={{ margin: "12px 0" }} />
            <Space orientation="vertical" style={{ width: "100%" }}>
              {previewOptions.map((option, index) => (
                <Space key={index} align="start">
                  {multipleCorrect ? <Checkbox disabled /> : <Radio disabled />}
                  {/* The marker is a letter (ক…চ / A…F), never a digit — D8's Western-digit
                      rule has nothing to bite on here, so no `.ex-num`. */}
                  <Typography.Text strong>{letters[index]}.</Typography.Text>
                  <QuestionContentView html={option.html} />
                  {option.isCorrect && <Tag color="green">সঠিক</Tag>}
                </Space>
              ))}
            </Space>
            {htmlHasContent(watched.explanationHtml) && (
              <>
                <Divider style={{ margin: "12px 0" }}>ব্যাখ্যা</Divider>
                <QuestionContentView html={watched.explanationHtml} />
              </>
            )}
          </Card>
        </Col>
      )}
    </Row>
  );
});
