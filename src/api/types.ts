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
