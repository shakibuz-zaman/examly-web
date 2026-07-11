import { useEffect, useRef, useState } from "react";
import { Alert, Button, Popconfirm, Space, Spin, Typography, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import type { AxiosError } from "axios";
import { useStartAttempt, useSubmitAttempt } from "../api/student";
import { useAutosave } from "../features/student/useAutosave";
import { useCountdown } from "../features/student/useCountdown";
import { RunnerQuestionCard } from "../features/student/RunnerQuestionCard";
import { formatClock } from "../lib/format";
import type { AttemptTake } from "../api/types";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

// Remount on exam-id change so all per-attempt state resets — React Router reuses
// the element on a param-only change, which would otherwise strand exam A's state
// under exam B's URL (autosaving B's answers to A).
export function ExamRunnerPage() {
  const { id } = useParams();
  return <ExamRunner key={id} id={id} />;
}

function ExamRunner({ id }: { id: string | undefined }) {
  const navigate = useNavigate();
  const start = useStartAttempt();
  const submitMutation = useSubmitAttempt();

  const [take, setTake] = useState<AttemptTake | null>(null);
  const [answers, setAnswers] = useState<Map<string, string[]>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const startedRef = useRef(false);
  const submittedRef = useRef(false);

  const { remaining, resync } = useCountdown(() => {
    void doSubmit(true); // auto-submit at zero
  });

  function goToResult(attemptId: string) {
    navigate(`/student/attempts/${attemptId}/result`, { replace: true });
  }

  const autosave = useAutosave({
    attemptId: take?.attemptId ?? "",
    onRemainingSeconds: resync,
    onFinished: () => {
      if (take && !submittedRef.current) {
        submittedRef.current = true;
        goToResult(take.attemptId);
      }
    },
  });

  // Start (or resume) exactly once. StrictMode's double effect is guarded by the ref.
  useEffect(() => {
    if (startedRef.current || !id) return;
    startedRef.current = true;
    start
      .mutateAsync(id)
      .then((t) => {
        setTake(t);
        setAnswers(new Map(t.answers.map((a) => [a.questionId, a.selectedOptionIds])));
        autosave.markSaved(t.answers.map((a) => a.questionId));
        resync(t.remainingSeconds);
      })
      .catch((e) => {
        message.error(serverError(e, "Could not start the exam"));
        navigate(`/student/exams/${id}`, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function doSubmit(auto = false) {
    if (!take || submitting || submittedRef.current) return;
    setSubmitting(true);
    try {
      await autosave.flushNow(); // best effort — the server scores saved answers anyway
      const status = await submitMutation.mutateAsync(take.attemptId);
      submittedRef.current = true;
      if (!auto) message.success("Submitted");
      goToResult(status.id);
    } catch (e) {
      const code = (e as AxiosError).response?.status;
      if (code === 409) {
        // Already finished (double click / expiry race) — the result page tells the story.
        submittedRef.current = true;
        goToResult(take.attemptId);
        return;
      }
      message.error(serverError(e, "Submit failed — check your connection"));
      setSubmitting(false);
    }
  }

  function handleChange(questionId: string, selectedOptionIds: string[]) {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionId, selectedOptionIds);
      return next;
    });
    autosave.queueAnswer(questionId, selectedOptionIds);
  }

  if (!take) return <Spin style={{ display: "block", marginTop: 80 }} />;

  const totalQuestions = take.sections.reduce((n, s) => n + s.questions.length, 0);
  const answeredCount = Array.from(answers.values()).filter((ids) => ids.length > 0).length;
  const low = remaining !== null && remaining <= 60;

  // Continuous numbering across sections.
  const sectionOffsets = take.sections.reduce<number[]>((acc, _s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + take.sections[i - 1].questions.length);
    return acc;
  }, []);

  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "white",
          padding: "8px 12px",
          marginBottom: 12,
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Space direction="vertical" size={0}>
          <Typography.Text strong ellipsis style={{ maxWidth: 320 }}>
            {take.examTitle}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {answeredCount}/{totalQuestions} answered
            {autosave.state === "saving" ? " · saving…" : ""}
            {autosave.state === "saved" ? " · all changes saved" : ""}
          </Typography.Text>
        </Space>
        <Space>
          <Typography.Text
            strong
            style={{ fontSize: 20, fontVariantNumeric: "tabular-nums" }}
            type={low ? "danger" : undefined}
          >
            {remaining === null ? "—" : formatClock(remaining)}
          </Typography.Text>
          <Popconfirm
            title="Submit your answers?"
            description={`${totalQuestions - answeredCount} unanswered`}
            onConfirm={() => void doSubmit()}
            okText="Submit"
            placement="bottomRight"
          >
            <Button type="primary" loading={submitting}>
              Submit
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {autosave.state === "offline" && (
        <Alert
          style={{ marginBottom: 12 }}
          type="warning"
          showIcon
          message="Connection lost — your answers are kept locally and will retry automatically."
        />
      )}

      {take.sections.map((section, sIndex) => (
        <div key={sIndex} style={{ marginBottom: 16 }}>
          {(section.title || take.sections.length > 1) && (
            <Typography.Title level={5}>
              {section.title ?? `Section ${sIndex + 1}`}
            </Typography.Title>
          )}
          {section.questions.map((question, qIndex) => (
            <RunnerQuestionCard
              key={question.questionId}
              question={question}
              number={sectionOffsets[sIndex] + qIndex + 1}
              selected={answers.get(question.questionId) ?? []}
              saved={autosave.savedIds.has(question.questionId)}
              onChange={(ids) => handleChange(question.questionId, ids)}
            />
          ))}
        </div>
      ))}

      <Popconfirm
        title="Submit your answers?"
        description={`${totalQuestions - answeredCount} unanswered`}
        onConfirm={() => void doSubmit()}
        okText="Submit"
      >
        <Button type="primary" size="large" block loading={submitting}>
          Submit exam
        </Button>
      </Popconfirm>
    </div>
  );
}
