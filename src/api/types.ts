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
