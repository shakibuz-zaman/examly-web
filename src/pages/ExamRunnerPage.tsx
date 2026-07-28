import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Drawer,
  Grid,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  AppstoreOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FlagOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import type { AxiosError } from "axios";
import { useStartAttempt, useSubmitAttempt } from "../api/student";
import { useAutosave } from "../features/student/useAutosave";
import { useCountdown } from "../features/student/useCountdown";
import { RunnerQuestionCard } from "../features/student/RunnerQuestionCard";
import { RunnerPalette, type PaletteState } from "../features/student/RunnerPalette";
import { PreSubmitSheet } from "../features/student/PreSubmitSheet";
import { formatClock } from "../lib/format";
import { bnNum } from "../lib/bn";
import type { AttemptTake } from "../api/types";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

// Flag/visited sets live client-side only (the Attempt API has no flag field —
// acceptable per spec §6.2), keyed per attempt in sessionStorage.
function loadSet(key: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return new Set(
      Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [],
    );
  } catch {
    return new Set();
  }
}

function saveSet(key: string, value: Set<string>) {
  try {
    sessionStorage.setItem(key, JSON.stringify([...value]));
  } catch {
    // Storage full/unavailable — flags are a convenience, never block the exam.
  }
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
        message.error(serverError(e, "পরীক্ষা শুরু করা যায়নি"));
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
      if (!auto) message.success("জমা হয়েছে");
      goToResult(status.id);
    } catch (e) {
      const code = (e as AxiosError).response?.status;
      if (code === 409) {
        // Already finished (double click / expiry race) — the result page tells the story.
        submittedRef.current = true;
        goToResult(take.attemptId);
        return;
      }
      message.error(serverError(e, "জমা হয়নি — ইন্টারনেট সংযোগ দেখুন"));
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

  // Continuous numbering across sections.
  const sectionOffsets = take.sections.reduce<number[]>((acc, _s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + take.sections[i - 1].questions.length);
    return acc;
  }, []);

  // The view mounts only once `take` exists, so its useState initializers can read
  // the per-attempt sessionStorage keys directly (attemptId is known at mount).
  return (
    <RunnerView
      take={take}
      answers={answers}
      autosave={autosave}
      remaining={remaining}
      submitting={submitting}
      totalQuestions={totalQuestions}
      answeredCount={answeredCount}
      sectionOffsets={sectionOffsets}
      onAnswerChange={handleChange}
      onSubmit={() => void doSubmit()}
    />
  );
}

type RunnerViewProps = {
  take: AttemptTake;
  answers: Map<string, string[]>;
  autosave: ReturnType<typeof useAutosave>;
  remaining: number | null;
  submitting: boolean;
  totalQuestions: number;
  answeredCount: number;
  sectionOffsets: number[];
  onAnswerChange: (questionId: string, selectedOptionIds: string[]) => void;
  onSubmit: () => void;
};

function RunnerView({
  take,
  answers,
  autosave,
  remaining,
  submitting,
  totalQuestions,
  answeredCount,
  sectionOffsets,
  onAnswerChange,
  onSubmit,
}: RunnerViewProps) {
  const isDesktop = Grid.useBreakpoint().md;
  const attemptId = take.attemptId;

  // Sections flattened in stable order — the runner shows one question at a time.
  const flatQuestions = useMemo(() => take.sections.flatMap((s) => s.questions), [take]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(() =>
    loadSet(`runner-flags-${attemptId}`),
  );
  // The first question counts as visited immediately (it is on screen). No need to
  // persist that here: every later mutation writes the full set, and a resume
  // re-adds it the same way.
  const [visited, setVisited] = useState<Set<string>>(() => {
    const stored = loadSet(`runner-visited-${attemptId}`);
    const first = take.sections[0]?.questions[0]?.questionId;
    if (first) stored.add(first);
    return stored;
  });
  const [timerHidden, setTimerHidden] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Every navigation goes through here so the destination is marked visited (and
  // persisted) at event time — no state-sync effects.
  function goTo(flatIndex: number) {
    const clamped = Math.max(0, Math.min(flatIndex, flatQuestions.length - 1));
    setCurrentIndex(clamped);
    setPaletteOpen(false);
    const questionId = flatQuestions[clamped]?.questionId;
    if (questionId && !visited.has(questionId)) {
      const next = new Set(visited);
      next.add(questionId);
      setVisited(next);
      saveSet(`runner-visited-${attemptId}`, next);
    }
  }

  function toggleFlag() {
    const question = flatQuestions[currentIndex];
    if (!question) return;
    const next = new Set(flagged);
    if (next.has(question.questionId)) next.delete(question.questionId);
    else next.add(question.questionId);
    setFlagged(next);
    saveSet(`runner-flags-${attemptId}`, next);
  }

  // Keyboard shortcuts. The handler is rebuilt every render (fresh closures over
  // state) behind a ref, so the window listener itself subscribes exactly once.
  const keydownRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keydownRef.current = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Skip keys already handled at the source: typing fields, buttons (Enter
      // activates them natively), and OptionRow's own Enter/Space (preventDefault).
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          tag === "BUTTON" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      const question = flatQuestions[currentIndex];
      if (!question) return;
      if (e.key >= "1" && e.key <= "9") {
        const option = question.options[Number(e.key) - 1];
        if (!option) return;
        const selected = answers.get(question.questionId) ?? [];
        const checked = selected.includes(option.id);
        if (question.multipleCorrect) {
          onAnswerChange(
            question.questionId,
            checked ? selected.filter((optId) => optId !== option.id) : [...selected, option.id],
          );
        } else {
          onAnswerChange(question.questionId, [option.id]);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentIndex > 0) goTo(currentIndex - 1);
      } else if (e.key === "ArrowRight") {
        if (currentIndex < flatQuestions.length - 1) goTo(currentIndex + 1);
      } else if (e.key === "Enter") {
        if (currentIndex < flatQuestions.length - 1) goTo(currentIndex + 1);
        else setSheetOpen(true);
      } else if (e.key === "m" || e.key === "M") {
        toggleFlag();
      }
    };
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keydownRef.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const currentQuestion = flatQuestions[currentIndex];
  const currentSectionIndex = sectionOffsets.reduce(
    (acc, offset, i) => (currentIndex >= offset ? i : acc),
    0,
  );
  const currentSection = take.sections[currentSectionIndex];
  const isLast = currentIndex >= totalQuestions - 1;
  const isFlagged = currentQuestion ? flagged.has(currentQuestion.questionId) : false;
  const unanswered = totalQuestions - answeredCount;

  // Palette precedence: marked wins the cell (purple + green dot when also answered),
  // but answered questions COUNT as answered in every displayed number (spec §1.3).
  const paletteStates = new Map<string, PaletteState>();
  for (const question of flatQuestions) {
    const answered = (answers.get(question.questionId)?.length ?? 0) > 0;
    if (flagged.has(question.questionId)) {
      paletteStates.set(question.questionId, {
        state: "marked",
        answeredWhileMarked: answered,
      });
    } else if (answered) {
      paletteStates.set(question.questionId, { state: "answered", answeredWhileMarked: false });
    } else if (visited.has(question.questionId)) {
      paletteStates.set(question.questionId, {
        state: "visitedUnanswered",
        answeredWhileMarked: false,
      });
    } else {
      paletteStates.set(question.questionId, {
        state: "notVisited",
        answeredWhileMarked: false,
      });
    }
  }

  // Calm timer (spec §6.2): never a danger color, never flashing. The eye toggle
  // hides it, but the clock force-shows for the final two minutes.
  const showClock = !timerHidden || (remaining !== null && remaining <= 120);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ex-bg)",
        display: "flex",
        flexDirection: "column",
        textAlign: "left",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--ex-card)",
          borderBottom: "1px solid var(--ex-line)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Text strong ellipsis style={{ display: "block", maxWidth: "100%" }}>
            {take.examTitle}
          </Typography.Text>
          <Typography.Text type="secondary" className="tnum" style={{ fontSize: 12 }}>
            {answeredCount}/{totalQuestions}
          </Typography.Text>
        </div>
        {autosave.state === "saved" && (
          <Tag color="green" style={{ marginInlineEnd: 0 }}>
            সেভড
          </Tag>
        )}
        {autosave.state === "saving" && <Tag style={{ marginInlineEnd: 0 }}>সেভ হচ্ছে…</Tag>}
        {autosave.state === "offline" && (
          <Tag color="orange" style={{ marginInlineEnd: 0 }}>
            অফলাইন
          </Tag>
        )}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          {/* Reserve the clock's width so hiding the timer never shifts the header. */}
          <span style={{ minWidth: 52, textAlign: "right" }}>
            {showClock && (
              <Typography.Text strong className="tnum" style={{ fontSize: 18 }}>
                {remaining === null ? "—" : formatClock(remaining)}
              </Typography.Text>
            )}
          </span>
          <Button
            type="text"
            size="small"
            icon={timerHidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            onClick={() => setTimerHidden((h) => !h)}
            aria-label={timerHidden ? "টাইমার দেখান" : "টাইমার লুকান"}
          />
        </span>
        {!isDesktop && (
          <Button
            icon={<AppstoreOutlined />}
            onClick={() => setPaletteOpen(true)}
            aria-label="প্রশ্ন তালিকা"
          />
        )}
        <Button loading={submitting} onClick={() => setSheetOpen(true)}>
          জমা দিন
        </Button>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          maxWidth: 1000,
          width: "100%",
          margin: "0 auto",
          padding: "16px 16px 120px",
        }}
      >
        <main style={{ flex: 1, minWidth: 0 }}>
          {autosave.state === "offline" && (
            <Alert
              style={{ marginBottom: 12 }}
              type="warning"
              showIcon
              title="সংযোগ বিচ্ছিন্ন — উত্তর আপনার ডিভাইসে রাখা আছে, সংযোগ ফিরলে নিজেই সেভ হবে।"
            />
          )}
          {currentSection && (currentSection.title || take.sections.length > 1) && (
            <Typography.Text
              type="secondary"
              style={{
                display: "block",
                maxWidth: 720,
                margin: "0 auto 8px",
                fontSize: 13,
              }}
            >
              {currentSection.title ?? `সেকশন ${bnNum(currentSectionIndex + 1)}`}
            </Typography.Text>
          )}
          {currentQuestion && (
            <RunnerQuestionCard
              question={currentQuestion}
              number={currentIndex + 1}
              selected={answers.get(currentQuestion.questionId) ?? []}
              onChange={(ids) => onAnswerChange(currentQuestion.questionId, ids)}
            />
          )}
        </main>
        {isDesktop && (
          <aside
            style={{
              width: 220,
              flexShrink: 0,
              position: "sticky",
              top: 76,
              background: "var(--ex-card)",
              border: "1px solid var(--ex-line)",
              borderRadius: 14,
              padding: 12,
            }}
          >
            <RunnerPalette
              sections={take.sections}
              states={paletteStates}
              currentIndex={currentIndex}
              onJump={goTo}
            />
          </aside>
        )}
      </div>

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          background: "var(--ex-card)",
          borderTop: "1px solid var(--ex-line)",
          padding: "10px 16px calc(10px + env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", gap: 8 }}>
          <Button
            size="large"
            icon={<FlagOutlined />}
            aria-label="পরে দেখব"
            type={isFlagged ? "primary" : "default"}
            style={
              isFlagged
                ? { background: "var(--ex-purple)", borderColor: "var(--ex-purple)" }
                : undefined
            }
            onClick={toggleFlag}
          />
          <Button size="large" disabled={currentIndex === 0} onClick={() => goTo(currentIndex - 1)}>
            পূর্ববর্তী
          </Button>
          {isLast ? (
            <Button
              type="primary"
              size="large"
              style={{ flex: 1 }}
              loading={submitting}
              onClick={() => setSheetOpen(true)}
            >
              রিভিউ ও জমা
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              style={{ flex: 1 }}
              onClick={() => goTo(currentIndex + 1)}
            >
              সেভ ও পরবর্তী
            </Button>
          )}
        </div>
      </div>

      {!isDesktop && (
        <Drawer
          placement="bottom"
          size="70%"
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          title="প্রশ্ন তালিকা"
        >
          <RunnerPalette
            sections={take.sections}
            states={paletteStates}
            currentIndex={currentIndex}
            onJump={goTo}
          />
        </Drawer>
      )}

      <PreSubmitSheet
        open={sheetOpen}
        counts={{ unanswered, flagged: flagged.size, answered: answeredCount }}
        sections={take.sections}
        states={paletteStates}
        onJump={goTo}
        onConfirm={onSubmit}
        onCancel={() => setSheetOpen(false)}
        loading={submitting}
      />
    </div>
  );
}
