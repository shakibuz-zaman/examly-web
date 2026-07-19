import { useEffect, useRef, useState } from "react";
import { Alert, Button, Spin, Typography } from "antd";
import { AxiosError } from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { OptionRow } from "../components/OptionRow";
import { QuestionContentView } from "../features/questions/QuestionContentView";
import { Illustration } from "../components/Illustration";
import {
  useAnswerPractice,
  useCompletePractice,
  usePracticeSession,
} from "../api/practice";
import { bnNum } from "../lib/bn";
import type { CompletePracticeResponse, PracticeItem } from "../api/types";

// BN_LETTERS is duplicated across QuestionRevealCard / RunnerQuestionCard (known
// duplication, spec allows one more local copy here).
const BN_LETTERS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ"];

type Reveal = {
  correctOptionIds: string[];
  selectedOptionIds: string[];
  isCorrect: boolean;
  explanationHtml: string | null;
  takeawayText: string | null;
};

// An item the server already marked answered carries its own reveal: option
// isCorrect flags flip non-null once answered, and selectedOptionIds is set.
function serverReveal(item: PracticeItem): Reveal | null {
  if (item.selectedOptionIds == null) return null;
  return {
    correctOptionIds: item.options.filter((o) => o.isCorrect === true).map((o) => o.id),
    selectedOptionIds: item.selectedOptionIds,
    isCorrect: item.isCorrect ?? false,
    explanationHtml: item.explanationHtml,
    takeawayText: item.takeawayText,
  };
}

export function PracticeRunnerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = usePracticeSession(id);
  const answer = useAnswerPractice(id ?? "");
  const complete = useCompletePractice(id ?? "");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [positioned, setPositioned] = useState(false);
  const [viewSummary, setViewSummary] = useState(false);
  // Local selection (pre-answer) and instant reveals, keyed by itemId.
  const [selectedByItem, setSelectedByItem] = useState<Record<string, string[]>>({});
  const [localReveals, setLocalReveals] = useState<Record<string, Reveal>>({});
  const [completed, setCompleted] = useState<CompletePracticeResponse | null>(null);
  // A session loaded with every item answered but completedAt == null (student
  // answered the last question then left without tapping "শেষ করুন") would be
  // permanently uncompletable — the summary has no complete affordance — so the
  // runner completes it automatically on load and the streak gets credited.
  const [needsAutoComplete, setNeedsAutoComplete] = useState(false);
  const autoCompleteFired = useRef(false);

  const data = session.data;

  function fireAutoComplete() {
    complete.mutate(undefined, {
      onSuccess: (res) => setCompleted(res),
      onError: (err) => {
        // 409 = already completed elsewhere: reconcile from the server, no toast.
        if (err instanceof AxiosError && err.response?.status === 409) session.refetch();
      },
    });
  }

  // Fire-once-on-condition: the ref guards StrictMode double effects and
  // re-renders/refetches; retry (on non-409 failure) calls fireAutoComplete
  // directly, bypassing the guard.
  useEffect(() => {
    if (!needsAutoComplete || autoCompleteFired.current) return;
    autoCompleteFired.current = true;
    fireAutoComplete();
  });

  // One-time positioning once the session lands (adjust-state-during-render, no
  // effect): an already-complete or fully-answered session opens on the summary;
  // otherwise land on the first unanswered item. Guarded by `positioned` so it
  // runs once and never drifts as later refetches mark items answered.
  if (data && !positioned) {
    setPositioned(true);
    const allAnswered =
      data.items.length > 0 && data.items.every((it) => it.selectedOptionIds != null);
    if (data.completedAt != null || allAnswered) {
      setViewSummary(true);
      if (allAnswered && data.completedAt == null) setNeedsAutoComplete(true);
    } else {
      const idx = data.items.findIndex((it) => it.selectedOptionIds == null);
      setCurrentIndex(idx === -1 ? data.items.length - 1 : idx);
    }
  }

  // Error before loading: on a failed load data stays undefined, so the
  // loading branch would otherwise swallow the error into an endless Spin.
  if (session.isError) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 16px", minHeight: "100vh", background: "var(--ex-bg)" }}>
        <Alert
          type="error"
          showIcon
          title="প্র্যাকটিস লোড করা যায়নি"
          action={
            <Button size="small" onClick={() => session.refetch()}>
              আবার চেষ্টা করুন
            </Button>
          }
        />
      </div>
    );
  }

  if (session.isLoading || !data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0", minHeight: "100vh", background: "var(--ex-bg)" }}>
        <Spin />
      </div>
    );
  }

  const items = data.items;
  const total = items.length;

  // Defensive: a zero-item session has nothing to run and no valid index.
  if (total === 0) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 16px", minHeight: "100vh", background: "var(--ex-bg)" }}>
        <Alert
          type="error"
          showIcon
          title="প্র্যাকটিস লোড করা যায়নি"
          action={
            <Button size="small" onClick={() => navigate("/student/home")}>
              হোমে ফিরুন
            </Button>
          }
        />
      </div>
    );
  }
  const answeredCount = items.filter(
    (it) => localReveals[it.itemId] != null || it.selectedOptionIds != null,
  ).length;

  const revealFor = (item: PracticeItem): Reveal | null =>
    localReveals[item.itemId] ?? serverReveal(item);

  const showSummary = viewSummary || completed != null || data.completedAt != null;

  if (showSummary) {
    // Auto-complete pending: hold the loading state instead of flashing a
    // streak-less summary. A 409 keeps the Spin too — its refetch is about to
    // land completedAt. Only a hard failure surfaces a retry.
    const awaitingAutoComplete =
      needsAutoComplete && completed == null && data.completedAt == null;
    if (awaitingAutoComplete) {
      const err = complete.error;
      const is409 = err instanceof AxiosError && err.response?.status === 409;
      if (complete.isError && !is409) {
        return (
          <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 16px", minHeight: "100vh", background: "var(--ex-bg)" }}>
            <Alert
              type="error"
              showIcon
              title="প্র্যাকটিস শেষ করা যায়নি"
              action={
                <Button size="small" onClick={fireAutoComplete}>
                  আবার চেষ্টা করুন
                </Button>
              }
            />
          </div>
        );
      }
      return (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0", minHeight: "100vh", background: "var(--ex-bg)" }}>
          <Spin />
        </div>
      );
    }
    const correct = completed?.correct ?? data.correctCount;
    const scoreTotal = completed?.total ?? total;
    const streakCurrent = completed?.streak.current;
    return (
      <div style={{ minHeight: "100vh", background: "var(--ex-bg)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 16px", textAlign: "center" }}>
          <Illustration name="success" />
          <Typography.Title level={3} style={{ margin: "16px 0 4px", color: "var(--ex-ink)" }}>
            {bnNum(correct)} / {bnNum(scoreTotal)} সঠিক
          </Typography.Title>
          {streakCurrent != null && (
            <Typography.Paragraph style={{ color: "var(--ex-teal-ink)", fontWeight: 600 }}>
              🔥 {bnNum(streakCurrent)} দিনের স্ট্রিক
            </Typography.Paragraph>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
            <Button type="primary" block onClick={() => navigate("/student/home")}>
              হোমে ফিরুন
            </Button>
            <Button block onClick={() => navigate("/student/notebook")}>
              ভুলের খাতা দেখুন
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const index = Math.min(currentIndex, total - 1);
  const item = items[index];
  const reveal = revealFor(item);
  const selected = selectedByItem[item.itemId] ?? [];
  const isLast = index === total - 1;

  function toggle(optionId: string) {
    setSelectedByItem((m) => {
      const cur = m[item.itemId] ?? [];
      if (item.multipleCorrect) {
        return {
          ...m,
          [item.itemId]: cur.includes(optionId)
            ? cur.filter((x) => x !== optionId)
            : [...cur, optionId],
        };
      }
      return { ...m, [item.itemId]: [optionId] };
    });
  }

  function onAnswer() {
    const sel = selectedByItem[item.itemId] ?? [];
    answer.mutate(
      { itemId: item.itemId, selectedOptionIds: sel },
      {
        onSuccess: (res) =>
          setLocalReveals((m) => ({
            ...m,
            [item.itemId]: {
              correctOptionIds: res.correctOptionIds,
              selectedOptionIds: sel,
              isCorrect: res.isCorrect,
              explanationHtml: res.explanationHtml,
              takeawayText: res.takeawayText,
            },
          })),
        onError: (err) => {
          // 409 double-answer: the item is already answered server-side. Refetch
          // and let serverReveal drive the answered view — no error toast.
          if (err instanceof AxiosError && err.response?.status === 409) session.refetch();
        },
      },
    );
  }

  function onNext() {
    if (isLast) {
      complete.mutate(undefined, {
        onSuccess: (res) => setCompleted(res),
        onError: () => {
          // 409: already completed OR unanswered remain — reconcile from server.
          session.refetch().then((r) => {
            const next = r.data;
            if (next && next.completedAt == null) {
              const idx = next.items.findIndex((it) => it.selectedOptionIds == null);
              if (idx >= 0) setCurrentIndex(idx);
            }
          });
        },
      });
    } else {
      setCurrentIndex(index + 1);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--ex-bg)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
        {/* Quiet header: title, progress count, progress dots */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Typography.Text strong style={{ color: "var(--ex-ink)", fontSize: 16 }}>
            প্র্যাকটিস
          </Typography.Text>
          <Typography.Text style={{ color: "var(--ex-ink-soft)" }}>
            {bnNum(answeredCount)} / {bnNum(total)}
          </Typography.Text>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            margin: "12px 2px 20px",
          }}
        >
          {items.map((it, i) => {
            const r = revealFor(it);
            const bg = r
              ? r.isCorrect
                ? "var(--ex-green)"
                : "var(--ex-red)"
              : "var(--ex-line-strong)";
            return (
              <button
                key={it.itemId}
                type="button"
                aria-label={`প্রশ্ন ${bnNum(i + 1)}`}
                aria-current={i === index || undefined}
                onClick={() => setCurrentIndex(i)}
                style={{
                  width: 10,
                  height: 10,
                  padding: 0,
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  background: bg,
                  boxShadow: i === index ? "0 0 0 2px var(--ex-teal)" : "none",
                }}
              />
            );
          })}
        </div>

        {/* Question card */}
        <div
          style={{
            border: "1px solid var(--ex-line)",
            borderRadius: 12,
            background: "var(--ex-card)",
            padding: 16,
          }}
        >
          <div style={{ fontSize: 18, lineHeight: 1.8 }}>
            <QuestionContentView html={item.stemHtml} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            {item.options.map((o, i) => {
              const key = BN_LETTERS[i] ?? String(i + 1);
              if (reveal) {
                const state = reveal.correctOptionIds.includes(o.id)
                  ? "correct"
                  : reveal.selectedOptionIds.includes(o.id)
                    ? "wrong"
                    : "default";
                return (
                  <OptionRow key={o.id} optionKey={key} state={state} multiple={item.multipleCorrect} disabled>
                    <QuestionContentView html={o.html} />
                  </OptionRow>
                );
              }
              return (
                <OptionRow
                  key={o.id}
                  optionKey={key}
                  state={selected.includes(o.id) ? "selected" : "default"}
                  multiple={item.multipleCorrect}
                  onSelect={() => toggle(o.id)}
                >
                  <QuestionContentView html={o.html} />
                </OptionRow>
              );
            })}
          </div>

          {item.multipleCorrect && !reveal && (
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 8, fontSize: 12 }}>
              একাধিক উত্তর নির্বাচন করা যায়
            </Typography.Text>
          )}

          {reveal && (
            <>
              <Typography.Paragraph
                strong
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  color: reveal.isCorrect ? "var(--ex-green)" : "var(--ex-red)",
                }}
              >
                {reveal.isCorrect ? "সঠিক! 🎉" : "ভুল হয়েছে"}
              </Typography.Paragraph>
              {reveal.explanationHtml && (
                <div style={{ marginTop: 12 }}>
                  <Typography.Text strong>ব্যাখ্যা</Typography.Text>
                  <QuestionContentView html={reveal.explanationHtml} />
                </div>
              )}
              {reveal.takeawayText && (
                <Typography.Paragraph strong style={{ marginTop: 8, marginBottom: 0, color: "var(--ex-teal-ink)" }}>
                  {reveal.takeawayText}
                </Typography.Paragraph>
              )}
            </>
          )}
        </div>

        {/* Primary action */}
        <div style={{ marginTop: 16 }}>
          {reveal ? (
            <Button type="primary" block loading={complete.isPending} onClick={onNext}>
              {isLast ? "শেষ করুন" : "পরবর্তী"}
            </Button>
          ) : (
            <Button
              type="primary"
              block
              disabled={selected.length === 0}
              loading={answer.isPending}
              onClick={onAnswer}
            >
              উত্তর দিন
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
