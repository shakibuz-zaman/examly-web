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
  parentTopicId: string | null;
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

export type CreateTopicRequest = { name: BilingualText; slug?: string; parentTopicId?: string | null };
// parentTopicId sentinel: null/absent = unchanged, "" = clear (make top-level), id = set as subtopic.
export type UpdateTopicRequest = {
  name?: BilingualText;
  slug?: string;
  status?: "active" | "archived";
  parentTopicId?: string | null;
};

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
  categoryId: string | null;
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
  categoryId: string | null;
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
  categoryId: string | null;
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
  categoryId: string | null;
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
  categoryId: string | null;
  examIds: string[];
};

export type ModelTestListFilters = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
};

// ---- Student runtime (Plan 5b) ----

export type AttemptState = "in_progress" | "submitted" | "expired";

export type CatalogItem = {
  kind: "exam" | "model_test";
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  orgName: string | null;
  examCount: number;
  questionCount: number;
  totalMarks: number;
  durationMinutes: number;
  windowStartUtc: string | null;
  windowEndUtc: string | null;
  publishedAt: string | null;
  // Phase 8 storefront: listing + entitlement facts (Task 7 DTO delta).
  listingId: string;
  priceBdt: number; // 0 = free
  mode: string; // open | live | archive
  owned: boolean; // this student holds a live entitlement
  registeredCount: number; // live entitlements across all students
};

// Commercial block attached to a lobby / bundle detail (spec §2). canBuy drives the
// storefront's Buy button; owned drives Start/Resume access.
export type ListingInfo = {
  listingId: string;
  priceBdt: number;
  mode: string;
  status: string;
  owned: boolean;
  canBuy: boolean;
};

export type CatalogResponse = {
  items: CatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  // 7b band subtitle counts — track-scoped, filter-independent.
  trackTotal: number;
  liveTodayCount: number;
};

export type StudentBundleExam = {
  id: string;
  title: string;
  questionCount: number;
  totalMarks: number;
  durationMinutes: number;
  windowStartUtc: string | null;
  windowEndUtc: string | null;
  revealAtUtc: string | null;
  myStatus: "not_started" | AttemptState;
  myRevealed: boolean;
  myAttemptId: string | null;
  myScore: number | null;
  myMaxScore: number | null;
};

export type StudentModelTest = {
  id: string;
  title: string;
  description: string | null;
  orgName: string | null;
  exams: StudentBundleExam[];
  listing: ListingInfo;
};

export type MyAttemptSummary = {
  id: string;
  attemptNumber: number;
  status: AttemptState;
  startedAt: string;
  deadlineUtc: string;
  submittedAt: string | null;
  revealed: boolean;
  score: number | null;
  maxScore: number | null;
};

export type StudentExam = {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  orgName: string | null;
  modelTestId: string | null;
  modelTestTitle: string | null;
  questionCount: number;
  totalMarks: number;
  durationMinutes: number;
  negativeMarks: number;
  allowRetakes: boolean;
  shufflePerStudent: boolean;
  windowStartUtc: string | null;
  windowEndUtc: string | null;
  revealAtUtc: string | null;
  myAttempts: MyAttemptSummary[];
  canStart: boolean;
  cannotStartReason: string | null;
  listing: ListingInfo;
};

export type TakeOption = { id: string; html: string };

export type TakeQuestion = {
  questionId: string;
  stemHtml: string;
  multipleCorrect: boolean;
  effectiveMarks: number;
  options: TakeOption[];
};

export type TakeSection = { title: string | null; questions: TakeQuestion[] };

export type SavedAnswer = { questionId: string; selectedOptionIds: string[] };

export type AttemptTake = {
  attemptId: string;
  examId: string;
  examTitle: string;
  attemptNumber: number;
  durationMinutes: number;
  negativeMarks: number;
  totalMarks: number;
  deadlineUtc: string;
  remainingSeconds: number;
  sections: TakeSection[];
  answers: SavedAnswer[];
};

export type SaveAnswersRequest = { answers: SavedAnswer[] };
export type SaveAnswersResponse = { savedAt: string; remainingSeconds: number };

export type AttemptStatusResponse = {
  id: string;
  examId: string;
  examTitle: string;
  attemptNumber: number;
  status: AttemptState;
  startedAt: string;
  deadlineUtc: string;
  submittedAt: string | null;
  revealAtUtc: string | null;
  revealed: boolean;
  score: number | null;
  maxScore: number | null;
  correct: number | null;
  wrong: number | null;
  unanswered: number | null;
};

export type ReviewOption = { id: string; html: string; isCorrect: boolean; selected: boolean };

export type ReviewQuestion = {
  questionId: string;
  stemHtml: string;
  multipleCorrect: boolean;
  effectiveMarks: number;
  marksEarned: number;
  outcome: "correct" | "wrong" | "unanswered";
  options: ReviewOption[];
  explanationHtml: string | null;
};

export type ReviewSection = { title: string | null; questions: ReviewQuestion[] };

export type AttemptReview = {
  attemptId: string;
  examId: string;
  examTitle: string;
  attemptNumber: number;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  unanswered: number;
  timeTakenSeconds: number;
  sections: ReviewSection[];
};

export type LeaderboardRow = {
  rank: number;
  studentName: string;
  score: number;
  timeTakenSeconds: number;
  isMe: boolean;
};

export type LeaderboardMe = { rank: number; score: number; percentile: number };

export type LeaderboardResponse = {
  items: LeaderboardRow[];
  total: number;
  page: number;
  pageSize: number;
  participants: number;
  averageScore: number | null;
  topScore: number | null;
  me: LeaderboardMe | null;
};

export type MyAttemptItem = {
  attemptId: string;
  examId: string;
  examTitle: string;
  orgName: string | null;
  attemptNumber: number;
  status: AttemptState;
  startedAt: string;
  revealAtUtc: string | null;
  revealed: boolean;
  score: number | null;
  maxScore: number | null;
};

export type MyAttemptsResponse = {
  items: MyAttemptItem[];
  total: number;
  page: number;
  pageSize: number;
};

// ---- My exams (GET /student/my-exams, Plan 8) — the student's owned library ----
// One row per live entitlement (newest grant first). latestAttempt* is populated only for
// single-exam products; bundle rows leave it null.
export type MyExamItem = {
  listingId: string;
  productType: string;
  productId: string;
  title: string;
  orgName: string | null;
  priceBdt: number;
  mode: string;
  examCount: number;
  source: string;
  grantedAt: string;
  latestAttemptId: string | null;
  latestAttemptStatus: string | null;
  // 7b: listing window + latest-attempt reveal state (single exams; bundles null/false).
  windowStartUtc: string | null;
  windowEndUtc: string | null;
  revealAtUtc: string | null;
  revealed: boolean;
  score: number | null;
  maxScore: number | null;
};

export type MyExamsResponse = {
  items: MyExamItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ExamResultRow = {
  rank: number | null;
  attemptId: string;
  studentId: string;
  studentName: string;
  attemptNumber: number;
  status: AttemptState;
  score: number | null;
  maxScore: number | null;
  correct: number | null;
  wrong: number | null;
  unanswered: number | null;
  startedAt: string;
  submittedAt: string | null;
  timeTakenSeconds: number | null;
};

export type ExamResultsResponse = {
  items: ExamResultRow[];
  total: number;
  page: number;
  pageSize: number;
  participants: number;
  averageScore: number | null;
  topScore: number | null;
};

// ---- Student home (Plan 7a) ----

export type HomeLiveItem = {
  kind: "exam" | "model_test";
  id: string;
  title: string;
  orgName: string | null;
  windowStartUtc: string;
  windowEndUtc: string | null;
  state: "live" | "upcoming";
  registeredCount: number; // live entitlements across all students
  registered: boolean; // this student holds a live entitlement
  listingId: string | null; // null when the product has no listing (public-default item)
  priceBdt: number | null; // null when unlisted; 0 = free (register), else price (buy)
};

export type HomeContinue = {
  type: "resume" | "next";
  attemptId: string | null;
  kind: "exam" | "model_test";
  id: string;
  title: string;
  answeredCount: number | null; // resume progress — both null when type === "next"
  questionCount: number | null;
};

// Server always sends this block in 7b; the type stays nullable for the frozen seam.
export type HomeStreak = {
  current: number;
  longest: number;
  freezesBanked: number;
  repairableUntilUtc: string | null;
  repairable: boolean;
  last7: boolean[]; // oldest→newest, exactly 7 Dhaka days ending today; true = any activity
};

// Server always sends this block in 7b; the type stays nullable for the frozen seam.
export type HomePractice = {
  todayDone: boolean;
  dueNotebookCount: number;
};

export type StudentHomeResponse = {
  liveRail: HomeLiveItem[];
  continueCard: HomeContinue | null;
  streak: HomeStreak | null;
  practice: HomePractice | null;
};

// ---- Question bank (Plan 7b) ----

export type QbankOption = { id: string; html: string; isCorrect: boolean };

export type QbankPaperSummary = {
  id: string;
  title: string;
  year: number;
  categoryId: string;
  questionCount: number;
};

export type QbankPapersResponse = {
  items: QbankPaperSummary[];
  total: number;
  page: number;
  pageSize: number;
  trackTotal: number; // band subtitle count — ignores categoryId/year (plan 7c)
};

export type QbankQuestion = {
  id: string;
  paperId: string;
  order: number;
  sectionLabel: string | null;
  stemHtml: string;
  multipleCorrect: boolean;
  options: QbankOption[];
  explanationHtml: string | null;
  takeawayText: string | null;
  subjectId: string | null;
  subjectName: BilingualText | null;
  topicId: string | null;
  topicName: BilingualText | null;
  language: string;
};

export type QbankPaperDetail = { paper: QbankPaperSummary; questions: QbankQuestion[] };

// created: a new entry was inserted. reactivated: an entry the student had already
// resolved was put back into the revision pile. Both false = it was already active.
export type AddToNotebookResponse = { created: boolean; reactivated: boolean };

// ---- Admin question bank (Plan 7b, platform_admin) ----

export type AdminPaperStatus = "draft" | "active" | "archived";

export type AdminPaper = {
  id: string;
  title: string;
  year: number;
  categoryId: string;
  status: AdminPaperStatus;
  questionCount: number;
  updatedAt: string;
};

export type AdminPaperList = {
  items: AdminPaper[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminPaperFilters = {
  status?: string;
  year?: number;
  categoryId?: string;
  page: number;
  pageSize: number;
};

export type CreatePaperRequest = { title: string; year: number; categoryId: string };
export type UpdatePaperRequest = { title?: string; year?: number; categoryId?: string };

export type SaveQbankOptionInput = { id?: string | null; html: string; isCorrect: boolean };

export type SaveQbankQuestionRequest = {
  order?: number;
  sectionLabel?: string | null;
  stemHtml: string;
  multipleCorrect: boolean;
  options: SaveQbankOptionInput[];
  explanationHtml?: string | null;
  takeawayText?: string | null;
  subjectId?: string | null;
  topicId?: string | null;
  language: "bn" | "en";
};

export type ImportReport = {
  accepted: number;
  rejected: number;
  errors: { index: number; error: string }[];
};

export type QbankSearchHit = { question: QbankQuestion; paperTitle: string; paperYear: number };

export type QbankSearchResponse = {
  items: QbankSearchHit[];
  total: number;
  page: number;
  pageSize: number;
};

// ---- Practice sessions (Plan 7b) ----

export type PracticeOption = { id: string; html: string; isCorrect: boolean | null };

export type PracticeItem = {
  itemId: string;
  stemHtml: string;
  multipleCorrect: boolean;
  options: PracticeOption[];
  selectedOptionIds: string[] | null;
  isCorrect: boolean | null;
  explanationHtml: string | null;
  takeawayText: string | null;
};

export type PracticeSession = {
  id: string;
  source: string;
  sourceId: string | null;
  trackId: string;
  items: PracticeItem[];
  answeredCount: number;
  correctCount: number;
  completedAt: string | null;
};

export type StartPracticeRequest = {
  source: "daily" | "paper" | "notebook" | "topic";
  sourceId?: string;
  trackId: string;
  count?: number;
};

export type AnswerPracticeResponse = {
  isCorrect: boolean;
  correctOptionIds: string[];
  explanationHtml: string | null;
  takeawayText: string | null;
};

export type CompletePracticeResponse = { total: number; correct: number; streak: HomeStreak };

// ---- Mistake notebook / ভুলের খাতা (Plan 7b) ----

export type NotebookEntry = {
  id: string;
  stemHtml: string;
  multipleCorrect: boolean;
  options: QbankOption[];
  explanationHtml: string | null;
  takeawayText: string | null;
  subjectId: string | null;
  subjectName: BilingualText | null;
  topicId: string | null;
  topicName: BilingualText | null;
  wrongCount: number;
  lastWrongAt: string;
  nextDueAt: string;
  due: boolean;
  status: "active" | "resolved";
  // «subject · source» meta (7d). sourceLabel is the exam title, the paper title, or null
  // when the entry has no resolvable source — practice-born entries never stored a paper id
  // (D5), and those render the «প্র্যাকটিস» fallback. Discriminate the fallback on
  // sourceLabel, not sourceKind: the server defaults sourceKind to "exam" even for legacy
  // rows, so it is never null on the wire — the nullable type just mirrors the DTO.
  sourceKind: "exam" | "qbank" | null;
  sourceLabel: string | null;
};

export type NotebookResponse = {
  entries: NotebookEntry[];
  activeCount: number;
  dueCount: number;
  total: number;
  page: number;
  pageSize: number;
};
