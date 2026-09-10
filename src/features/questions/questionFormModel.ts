import { z } from "zod";
import type { QuestionResponse, SaveQuestionRequest } from "../../api/types";
import { htmlHasContent } from "./html";

// The schema, defaults and wire mapping behind `QuestionForm`. They live beside the component
// rather than inside it because `react-refresh/only-export-components` forbids a component file
// from also exporting constants and helpers — and both the editor page and the author drawer
// need these symbols.

export const BN_LETTERS = ["ক", "খ", "গ", "ঘ", "ঙ", "চ"];
export const EN_LETTERS = ["A", "B", "C", "D", "E", "F"];

const optionSchema = z.object({
  id: z.string().nullish(),
  html: z.string(),
  isCorrect: z.boolean(),
});

export const formSchema = z
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
    // Validation prose counts use Bengali numerals («২টি») — D8's Western-digit exception is
    // scoped to dense numeric table columns, not to sentences.
    if (!htmlHasContent(data.stemHtml)) {
      ctx.addIssue({
        code: "custom", path: ["stemHtml"],
        message: "প্রশ্নের মূল অংশ খালি রাখা যাবে না",
      });
    }
    if (data.status === "active") {
      const filled = data.options.filter((o) => htmlHasContent(o.html));
      if (filled.length < 2) {
        ctx.addIssue({
          code: "custom", path: ["options"],
          message: "সক্রিয় প্রশ্নে অন্তত ২টি অপশন লেখা থাকতে হবে",
        });
      }
      const correct = filled.filter((o) => o.isCorrect).length;
      if (!data.multipleCorrect && correct !== 1) {
        ctx.addIssue({
          code: "custom", path: ["options"],
          message: "ঠিক একটি অপশন সঠিক হিসেবে চিহ্নিত করতে হবে",
        });
      }
      if (data.multipleCorrect && correct < 1) {
        ctx.addIssue({
          code: "custom", path: ["options"],
          message: "অন্তত একটি অপশন সঠিক হিসেবে চিহ্নিত করুন",
        });
      }
      if (!data.subjectId) {
        ctx.addIssue({
          code: "custom", path: ["subjectId"],
          message: "সক্রিয় করতে বিষয় নির্বাচন করতে হবে",
        });
      }
    }
  });

export type QuestionFormValues = z.infer<typeof formSchema>;

export const emptyOption = (): QuestionFormValues["options"][number] => ({
  id: null, html: "", isCorrect: false,
});

export const questionFormDefaults: QuestionFormValues = {
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

export function toFormValues(q: QuestionResponse): QuestionFormValues {
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

// Page-header heading for an existing question. The list's `stemExcerpt` is a server field on
// QuestionSummary only — the detail response carries the full sanitized HTML — so the editor
// derives its own. textContent, never innerHTML: this string lands in a plain text node.
export function stemExcerpt(html: string | null | undefined): string {
  if (!html) return "";
  const text = (new DOMParser().parseFromString(html, "text/html").body.textContent ?? "").trim();
  return text.length > 64 ? `${text.slice(0, 64)}…` : text;
}

export function toRequest(
  values: QuestionFormValues,
  status: "draft" | "active",
): SaveQuestionRequest {
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
