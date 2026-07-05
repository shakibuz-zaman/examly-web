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
