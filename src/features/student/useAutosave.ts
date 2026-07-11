import { useCallback, useEffect, useRef, useState } from "react";
import type { AxiosError } from "axios";
import { useSaveAnswers } from "../../api/student";
import type { SavedAnswer } from "../../api/types";

const DEBOUNCE_MS = 800;
const INITIAL_RETRY_MS = 1000;
const MAX_RETRY_MS = 10_000;

export type SaveState = "idle" | "saving" | "saved" | "offline";

// Queues answer changes per question, debounces a batched PUT, retries with backoff
// while offline (or on server errors), and reports the server-synced remaining time.
// A 409 means the attempt is finished (time up / already submitted) → onFinished.
export function useAutosave(args: {
  attemptId: string;
  onRemainingSeconds: (seconds: number) => void;
  onFinished: () => void;
}) {
  const { attemptId, onRemainingSeconds, onFinished } = args;
  const save = useSaveAnswers();
  const pendingRef = useRef(new Map<string, string[]>());
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayRef = useRef(INITIAL_RETRY_MS);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const [state, setState] = useState<SaveState>("idle");
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set());

  const schedule = useCallback((delayMs: number) => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flushRef.current(), delayMs);
  }, []);

  // Kept in a ref so schedule() always calls the latest closure.
  flushRef.current = async () => {
    // At most one PUT in flight: a stale earlier request landing after a newer
    // one would silently overwrite the newer answers server-side. Anything queued
    // mid-flight stays pending; the in-flight flush's completion path reschedules
    // (success → schedule(0) when pending remains, failure → backoff schedule).
    if (inFlightRef.current) return;
    if (pendingRef.current.size === 0) return;
    const batch: SavedAnswer[] = Array.from(
      pendingRef.current,
      ([questionId, selectedOptionIds]) => ({ questionId, selectedOptionIds }),
    );
    inFlightRef.current = true;
    setState("saving");
    try {
      const result = await save.mutateAsync({ attemptId, body: { answers: batch } });
      for (const answer of batch) {
        // Only clear entries the student hasn't changed again mid-flight.
        if (pendingRef.current.get(answer.questionId) === answer.selectedOptionIds) {
          pendingRef.current.delete(answer.questionId);
        }
      }
      setSavedIds((prev) => {
        const next = new Set(prev);
        batch.forEach((answer) => next.add(answer.questionId));
        return next;
      });
      retryDelayRef.current = INITIAL_RETRY_MS;
      onRemainingSeconds(result.remainingSeconds);
      if (pendingRef.current.size > 0) {
        schedule(0);
      } else {
        setState("saved");
      }
    } catch (error) {
      const status = (error as AxiosError).response?.status;
      if (status === 409) {
        // Time is up or the attempt is already finished — stop saving.
        pendingRef.current.clear();
        onFinished();
        return;
      }
      // Network failure / 5xx: keep the batch pending and retry with backoff.
      setState("offline");
      const delay = retryDelayRef.current;
      retryDelayRef.current = Math.min(delay * 2, MAX_RETRY_MS);
      schedule(delay);
    } finally {
      inFlightRef.current = false;
    }
  };

  const queueAnswer = useCallback(
    (questionId: string, selectedOptionIds: string[]) => {
      pendingRef.current.set(questionId, selectedOptionIds);
      setSavedIds((prev) => {
        if (!prev.has(questionId)) return prev;
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
      setState("saving");
      schedule(DEBOUNCE_MS);
    },
    [schedule],
  );

  // Resumed answers are already persisted server-side — mark them saved.
  const markSaved = useCallback((questionIds: string[]) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      questionIds.forEach((questionId) => next.add(questionId));
      return next;
    });
  }, []);

  const flushNow = useCallback(async () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    await flushRef.current();
  }, []);

  useEffect(() => {
    const onOnline = () => {
      retryDelayRef.current = INITIAL_RETRY_MS;
      schedule(0);
    };
    const onOffline = () => setState("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [schedule]);

  return { state, savedIds, queueAnswer, markSaved, flushNow };
}
