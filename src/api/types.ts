export type OrgResponse = {
  id: string;
  name: string;
  description?: string | null;
  contactEmail: string;
  logoMediaId?: string | null;
  status: "active" | "suspended";
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrgRequest = {
  name: string;
  contactEmail: string;
  description?: string;
};

export type UpdateOrgRequest = Partial<CreateOrgRequest> & {
  logoMediaId?: string;
};

export type BilingualText = { bn?: string; en?: string };

export type SubjectResponse = {
  id: string;
  name: BilingualText;
  slug: string;
  scope: "global" | "org";
  orgId?: string | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type TopicResponse = {
  id: string;
  subjectId: string;
  name: BilingualText;
  slug: string;
  scope: "global" | "org";
  orgId?: string | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type CreateSubjectRequest = { name: BilingualText; slug?: string };
export type UpdateSubjectRequest = { name?: BilingualText; slug?: string; status?: "active" | "archived" };

export type CreateTopicRequest = { name: BilingualText; slug?: string };
export type UpdateTopicRequest = { name?: BilingualText; slug?: string; status?: "active" | "archived" };

export type MediaItemResponse = {
  id: string;
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

// ---- Questions (Plan 4) ----

export type QuestionOption = {
  id: string;
  html: string;
  isCorrect: boolean;
};

export type QuestionOptionInput = {
  id?: string | null;
  html: string;
  isCorrect: boolean;
};

export type QuestionResponse = {
  id: string;
  type: string;
  language: "bn" | "en";
  status: "draft" | "active" | "archived";
  stemHtml: string;
  multipleCorrect: boolean;
  lockOptionOrder: boolean;
  options: QuestionOption[];
  explanationHtml: string | null;
  difficulty: "easy" | "medium" | "hard";
  subjectId: string | null;
  topicId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type QuestionSummary = {
  id: string;
  type: string;
  language: "bn" | "en";
  status: "draft" | "active" | "archived";
  stemExcerpt: string;
  multipleCorrect: boolean;
  optionCount: number;
  difficulty: "easy" | "medium" | "hard";
  subjectId: string | null;
  topicId: string | null;
  tags: string[];
  updatedAt: string;
};

export type QuestionListResponse = {
  items: QuestionSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type SaveQuestionRequest = {
  language: "bn" | "en";
  status: "draft" | "active";
  stemHtml: string;
  multipleCorrect: boolean;
  lockOptionOrder: boolean;
  options: QuestionOptionInput[];
  explanationHtml: string | null;
  difficulty: "easy" | "medium" | "hard";
  subjectId: string | null;
  topicId: string | null;
  tags: string[];
};

export type QuestionListFilters = {
  page: number;
  pageSize: number;
  search?: string;
  subjectId?: string;
  topicId?: string;
  difficulty?: string;
  language?: string;
  status?: string;
  tags?: string[];
};

// ---- Exams & Model Tests (Plan 5a) ----

export type ExamStatus = "draft" | "published" | "archived";
export type BankStatus = "active" | "draft" | "archived" | "missing";

export type ExamOption = { id: string; html: string; isCorrect: boolean };

export type ExamQuestionDetail = {
  questionId: string;
  marksOverride: number | null;
  effectiveMarks: number;
  bankStatus: BankStatus;
  stemHtml: string;
  options: ExamOption[];
  explanationHtml: string | null;
  multipleCorrect: boolean;
  lockOptionOrder: boolean;
};

export type ExamSectionDetail = {
  id: string;
  title: string | null;
  questions: ExamQuestionDetail[];
};

export type ExamResponse = {
  id: string;
  modelTestId: string | null;
  title: string;
  description: string | null;
  status: ExamStatus;
  sections: ExamSectionDetail[];
  defaultMarks: number;
  negativeMarks: number;
  durationMinutes: number;
  windowStartUtc: string | null;
  windowEndUtc: string | null;
  shufflePerStudent: boolean;
  allowRetakes: boolean;
  publishedAt: string | null;
  questionCount: number;
  totalMarks: number;
  createdAt: string;
  updatedAt: string;
};

export type ExamSummary = {
  id: string;
  title: string;
  status: ExamStatus;
  modelTestId: string | null;
  modelTestTitle: string | null;
  questionCount: number;
  totalMarks: number;
  durationMinutes: number;
  windowStartUtc: string | null;
  windowEndUtc: string | null;
  shufflePerStudent: boolean;
  allowRetakes: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

export type ExamListResponse = {
  items: ExamSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type ExamQuestionInput = { questionId: string; marksOverride: number | null };
export type ExamSectionInput = {
  id: string | null;
  title: string | null;
  questions: ExamQuestionInput[];
};

export type SaveExamRequest = {
  title: string;
  description: string | null;
  sections: ExamSectionInput[];
  defaultMarks: number;
  negativeMarks: number;
  durationMinutes: number;
  windowStartUtc: string | null;
  windowEndUtc: string | null;
  shufflePerStudent: boolean;
  allowRetakes: boolean;
};

export type ExamListFilters = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  modelTestId?: string;
  standalone?: boolean;
};

export type SampleQuestionsRequest = {
  count: number;
  subjectId?: string | null;
  topicId?: string | null;
  difficulty?: string | null;
  language?: string | null;
  tags?: string[];
  excludeIds: string[];
};

export type ModelTestExamItem = {
  id: string;
  title: string;
  status: ExamStatus;
  questionCount: number;
  totalMarks: number;
  durationMinutes: number;
  isArchived: boolean;
};

export type ModelTestResponse = {
  id: string;
  title: string;
  description: string | null;
  status: ExamStatus;
  exams: ModelTestExamItem[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ModelTestSummary = {
  id: string;
  title: string;
  status: ExamStatus;
  examCount: number;
  publishedAt: string | null;
  updatedAt: string;
};

export type ModelTestListResponse = {
  items: ModelTestSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type SaveModelTestRequest = {
  title: string;
  description: string | null;
  examIds: string[];
};

export type ModelTestListFilters = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
};
