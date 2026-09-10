import { Card, Space, Spin, Switch, Typography, message } from "antd";
import type { AxiosError } from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuestion, useSaveQuestion } from "../api/questions";
import { QuestionForm, type QuestionFormHandle } from "../features/questions/QuestionForm";
import { stemExcerpt } from "../features/questions/questionFormModel";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";

export function QuestionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(true);

  const { data: existing, isPending, isError } = useQuestion(id);
  const save = useSaveQuestion();
  const formRef = useRef<QuestionFormHandle>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isError) {
      message.error("প্রশ্নটি পাওয়া যায়নি");
      navigate("/questions");
    }
  }, [isError, navigate]);

  const onSave = async (status: "draft" | "active") => {
    const body = await formRef.current?.submit(status);
    if (!body) return;
    setSubmitting(true);
    try {
      await save.mutateAsync({ id, body });
      message.success(
        status === "draft" ? "খসড়া সংরক্ষণ হয়েছে" : "প্রশ্ন সংরক্ষণ করে সক্রিয় করা হয়েছে",
      );
      navigate("/questions");
    } catch (e) {
      // The server half of this message is still English — Task 10 translates the API's
      // examiner-facing errors; the fallback below is ours and is Bengali today.
      const serverError = (e as AxiosError<{ error?: string }>).response?.data?.error;
      message.error(serverError ?? "সংরক্ষণ করা যায়নি");
    } finally {
      setSubmitting(false);
    }
  };

  if (id && isPending) return <Spin style={{ display: "block", margin: "80px auto" }} />;

  // Named off the SERVER's stem, not the watched one: a title that rewrote itself on every
  // keystroke would turn the page header into a second, jittering copy of the editor.
  const heading = id ? stemExcerpt(existing?.stemHtml) || "প্রশ্ন সম্পাদনা" : "নতুন প্রশ্ন";

  return (
    <>
      <PageHeader
        title={heading}
        actions={
          <>
            <Space size={8}>
              <Typography.Text style={{ fontSize: 13 }}>প্রিভিউ</Typography.Text>
              <Switch
                checked={showPreview}
                onChange={setShowPreview}
                aria-label="শিক্ষার্থীর প্রিভিউ দেখান"
              />
            </Space>
            {/* PillButton is a bare <button> with no antd spinner, so an in-flight save shows
                as disabled rather than as a spinner. `disabled` is the honest half of what
                `loading` used to do — it still blocks the double-submit. */}
            <PillButton variant="ghost" onClick={() => navigate("/questions")}>
              বাতিল
            </PillButton>
            <PillButton variant="outline" disabled={submitting} onClick={() => void onSave("draft")}>
              খসড়া সংরক্ষণ
            </PillButton>
            <PillButton variant="primary" disabled={submitting} onClick={() => void onSave("active")}>
              সংরক্ষণ ও সক্রিয়
            </PillButton>
          </>
        }
      />

      <Card>
        <QuestionForm ref={formRef} initial={existing} showPreview={showPreview} />
      </Card>
    </>
  );
}
