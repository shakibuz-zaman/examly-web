import type { ExamResponse, SaveExamRequest } from "../../api/types";

export type DraftQuestion = {
  questionId: string;
  marksOverride: number | null;
  // Display data. stemHtml comes from a loaded exam (full content); stemExcerpt comes
  // from the picker (plain text). Rows render whichever they have.
  stemHtml: string | null;
  stemExcerpt: string | null;
  bankStatus: string;
  multipleCorrect: boolean;
  optionCount: number;
  difficulty: string | null;
};

export type DraftSection = {
  key: string; // local list key (sections have no server id until saved)
  id: string | null;
  title: string | null;
  questions: DraftQuestion[];
};

export type ExamDraft = {
  title: string;
  description: string;
  categoryId: string | null;
  durationMinutes: number;
  windowStartUtc: string | null;
  windowEndUtc: string | null;
  defaultMarks: number;
  negativeMarks: number;
  shufflePerStudent: boolean;
  allowRetakes: boolean;
  sections: DraftSection[];
};

let keyCounter = 0;
export function nextKey(): string {
  keyCounter += 1;
  return `k${keyCounter}`;
}

export function emptyDraft(): ExamDraft {
  return {
    title: "",
    description: "",
    categoryId: null,
    durationMinutes: 60,
    windowStartUtc: null,
    windowEndUtc: null,
    defaultMarks: 1,
    negativeMarks: 0.25,
    shufflePerStudent: false,
    allowRetakes: false,
    sections: [{ key: nextKey(), id: null, title: null, questions: [] }],
  };
}

export function fromResponse(exam: ExamResponse): ExamDraft {
  return {
    title: exam.title,
    description: exam.description ?? "",
    categoryId: exam.categoryId,
    durationMinutes: exam.durationMinutes,
    windowStartUtc: exam.windowStartUtc,
    windowEndUtc: exam.windowEndUtc,
    defaultMarks: exam.defaultMarks,
    negativeMarks: exam.negativeMarks,
    shufflePerStudent: exam.shufflePerStudent,
    allowRetakes: exam.allowRetakes,
    sections: exam.sections.map((s) => ({
      key: nextKey(),
      id: s.id,
      title: s.title,
      questions: s.questions.map((q) => ({
        questionId: q.questionId,
        marksOverride: q.marksOverride,
        stemHtml: q.stemHtml,
        stemExcerpt: null,
        bankStatus: q.bankStatus,
        multipleCorrect: q.multipleCorrect,
        optionCount: q.options.length,
        difficulty: null,
      })),
    })),
  };
}

export function toSaveRequest(draft: ExamDraft): SaveExamRequest {
  return {
    title: draft.title,
    description: draft.description.trim() ? draft.description : null,
    categoryId: draft.categoryId,
    sections: draft.sections.map((s) => ({
      id: s.id,
      title: s.title && s.title.trim() ? s.title : null,
      questions: s.questions.map((q) => ({
        questionId: q.questionId,
        marksOverride: q.marksOverride,
      })),
    })),
    defaultMarks: draft.defaultMarks,
    negativeMarks: draft.negativeMarks,
    durationMinutes: draft.durationMinutes,
    windowStartUtc: draft.windowStartUtc,
    windowEndUtc: draft.windowEndUtc,
    shufflePerStudent: draft.shufflePerStudent,
    allowRetakes: draft.allowRetakes,
  };
}

export function draftQuestionCount(draft: ExamDraft): number {
  return draft.sections.reduce((n, s) => n + s.questions.length, 0);
}

export function draftTotalMarks(draft: ExamDraft): number {
  return draft.sections.reduce(
    (sum, s) =>
      sum + s.questions.reduce((m, q) => m + (q.marksOverride ?? draft.defaultMarks), 0),
    0,
  );
}

export function allQuestionIds(draft: ExamDraft): string[] {
  return draft.sections.flatMap((s) => s.questions.map((q) => q.questionId));
}
