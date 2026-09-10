import { useRef, useState } from "react";
import { App, Drawer, Space, Switch, Typography } from "antd";
import type { AxiosError } from "axios";
import { useSaveQuestion } from "../../api/questions";
import { toDraftQuestionFromResponse, type DraftQuestion } from "../exams/examDraft";
import { PillButton } from "../../ui/PillButton";
import { QuestionForm, type QuestionFormHandle } from "./QuestionForm";

export type QuestionAuthorDrawerProps = {
  open: boolean;
  onCreated: (q: DraftQuestion) => void; // once per saved question
  onClose: () => void;
};

// Writes a NEW bank question from inside an exam section (spec A2). It saves `active` only:
// ExamService.ApplyAsync refuses any other status, so a draft would be unplaceable (D2).
// The exam's reference to the new question is still the host's «খসড়া সংরক্ষণ» (D4).
export function QuestionAuthorDrawer({ open, onCreated, onClose }: QuestionAuthorDrawerProps) {
  const { message, modal } = App.useApp();
  const save = useSaveQuestion();
  const formRef = useRef<QuestionFormHandle>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);

  const saveActive = async (): Promise<DraftQuestion | null> => {
    // `saving` goes up BEFORE validation, not after: validating a long stem is not free, and
    // the footer must be dead for the whole validate-and-save span or a second click enqueues
    // a second POST of the same question.
    setSaving(true);
    try {
      const body = await formRef.current?.submit("active");
      if (!body) return null;
      const created = await save.mutateAsync({ body });
      return toDraftQuestionFromResponse(created);
    } catch (e) {
      const serverError = (e as AxiosError<{ error?: string }>).response?.data?.error;
      message.error(serverError ?? "সংরক্ষণ করা যায়নি");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const onSaveAndClose = async () => {
    const q = await saveActive();
    if (!q) return;
    onCreated(q);
    message.success("প্রশ্ন যোগ হয়েছে");
    onClose();
  };

  // «পরেরটি»: keep the run's context (language, subject, topic, difficulty, tags — a run of
  // questions is usually one paper), clear the content (D3).
  const onSaveAndNext = async () => {
    const q = await saveActive();
    if (!q) return;
    onCreated(q);
    const v = formRef.current?.currentValues();
    formRef.current?.reset(v && {
      language: v.language, subjectId: v.subjectId, topicId: v.topicId,
      difficulty: v.difficulty, tags: v.tags,
    });
    message.success("প্রশ্ন যোগ হয়েছে — পরেরটি লিখুন");
    formRef.current?.focusStem();
  };

  const requestClose = () => {
    if (saving) return;
    if (!formRef.current?.isDirty()) { onClose(); return; }
    modal.confirm({
      title: "অসংরক্ষিত প্রশ্ন বাতিল হবে?",
      okText: "হ্যাঁ", cancelText: "না", okButtonProps: { danger: true },
      onOk: onClose,
    });
  };

  return (
    <Drawer
      title="নতুন প্রশ্ন লিখুন"
      size={960}
      open={open}
      onClose={requestClose}
      destroyOnHidden
      extra={
        <Space size={8}>
          <Typography.Text style={{ fontSize: 13 }}>প্রিভিউ</Typography.Text>
          <Switch checked={showPreview} onChange={setShowPreview} aria-label="শিক্ষার্থীর প্রিভিউ দেখান" />
        </Space>
      }
      footer={
        <Space size={8} style={{ justifyContent: "flex-end", width: "100%" }}>
          <PillButton variant="ghost" onClick={requestClose}>বাতিল</PillButton>
          <PillButton variant="outline" disabled={saving} onClick={() => void onSaveAndNext()}>
            সংরক্ষণ ও পরেরটি
          </PillButton>
          <PillButton variant="primary" disabled={saving} onClick={() => void onSaveAndClose()}>
            সংরক্ষণ ও যোগ করুন
          </PillButton>
        </Space>
      }
    >
      <QuestionForm ref={formRef} showPreview={showPreview} previewSpan={9} />
    </Drawer>
  );
}
