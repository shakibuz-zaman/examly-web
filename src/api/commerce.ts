import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { ExamResponse } from "./types";
import type { MyExamsResponse } from "./types";

// ---- Wire types (mirror Examly.Api Features/Commerce/CommerceDtos.cs, camelCase) ----

// One price cell of the seat×exam matrix (business plan §3.1).
export type MatrixCell = { seatSlot: number; examSlot: number; priceBdt: number };

// GET /api/v1/pricing (anon) + GET/PUT /api/v1/admin/platform-config body.
export type Pricing = {
  modelTestMatrix: MatrixCell[];
  standalonePrices: MatrixCell[];
  commissionRate: number;
  priceFloorBdt: number;
  withdrawalMinBdt: number;
};

// POST /student/checkout + POST /slot-purchases response. checkoutToken is the payment
// provider's session token (dev stub: the order id) handed to the gateway / stub route.
export type CheckoutResponse = { orderId: string; checkoutToken: string; amountBdt: number };

// The slot upgrade route returns a checkout OR { appliedFree: true } when the delta is zero.
export type UpgradeResult = CheckoutResponse | { appliedFree: true };

export type OrderItem = {
  id: string;
  kind: string;
  listingId: string;
  productTitle: string;
  amountBdt: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
};
export type OrdersResponse = { items: OrderItem[]; total: number; page: number; pageSize: number };

// An examiner's B2B slot purchase (seat×exam grant + its invite code).
export type SlotPurchase = {
  id: string;
  listingId: string;
  productTitle: string;
  seatSlot: number;
  examSlot: number;
  totalPaidBdt: number;
  inviteCode: string;
  seatsUsed: number;
};

export type RosterMember = {
  id: string;
  phone: string | null;
  name: string | null;
  claimedByStudentId: string | null;
  claimedAt: string | null;
  source: string;
};
export type RosterResponse = { members: RosterMember[]; seatsUsed: number; seatSlot: number };

export type AllowlistRow = { phone: string; name: string | null };
export type AllowlistReport = { added: number; skipped: number; errors: string[] };

// Examiner wallet ledger. Entry amountBdt is SIGNED (credits +, debits −).
export type WalletEntry = {
  id: string;
  kind: string;
  amountBdt: number;
  orderId: string | null;
  withdrawalId: string | null;
  createdAt: string;
};
export type WalletResponse = {
  balance: number;
  entries: WalletEntry[];
  total: number;
  page: number;
  pageSize: number;
};

export type Withdrawal = {
  id: string;
  amountBdt: number;
  destination: string;
  status: string;
  requestedAt: string;
  rejectReason: string | null;
};

// GET/PUT /api/v1/listings/{productType}/{productId} response (examiner sell settings).
export type Listing = {
  id: string;
  productType: string;
  productId: string;
  priceBdt: number;
  visibility: string;
  mode: string;
  status: string;
  categoryId: string | null;
  windowStartUtc: string | null;
  windowEndUtc: string | null;
  publishedAtUtc: string | null;
};

// ---- Request bodies ----

export type SaveListingRequest = {
  priceBdt: number;
  visibility: string;
  mode: string;
  status: string;
};
export type SlotPurchaseRequest = { listingId: string; seatSlot: number; examSlot: number };
export type UpgradeRequest = { seatSlot: number; examSlot: number };
export type WithdrawalRequest = { amountBdt: number; destination: string };
export type RescheduleRequest = { windowStartUtc: string; windowEndUtc: string };

// Query keys that reflect *ownership* — a completed purchase / claim / free-register flips
// `owned` on the catalog and adds a row to the library + lobbies. Invalidate all of them.
const OWNERSHIP_KEYS = [
  ["student", "catalog"],
  ["student", "my-exams"],
  ["student", "home"],
  ["student", "exam"],
  ["student", "model-test"],
] as const;

function invalidateOwnership(qc: ReturnType<typeof useQueryClient>) {
  for (const key of OWNERSHIP_KEYS) void qc.invalidateQueries({ queryKey: key });
  void qc.invalidateQueries({ queryKey: ["commerce", "orders"] });
}

// ---- Pricing (anonymous storefront) + admin platform-config ----

export function usePricing() {
  return useQuery<Pricing>({
    queryKey: ["commerce", "pricing"],
    queryFn: async () => (await apiClient.get<Pricing>("/api/v1/pricing")).data,
  });
}

export function usePlatformConfig() {
  return useQuery<Pricing>({
    queryKey: ["commerce", "platform-config"],
    queryFn: async () =>
      (await apiClient.get<Pricing>("/api/v1/admin/platform-config")).data,
  });
}

export function useSavePlatformConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Pricing) =>
      (await apiClient.put<Pricing>("/api/v1/admin/platform-config", body)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["commerce", "platform-config"] });
      void qc.invalidateQueries({ queryKey: ["commerce", "pricing"] });
    },
  });
}

// ---- B2C checkout + payment stub + free register + seat claim ----

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) =>
      (await apiClient.post<CheckoutResponse>("/api/v1/student/checkout", { listingId })).data,
    // The order is created pending; ownership flips only when the stub-pay callback fulfils it.
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["commerce", "orders"] }),
  });
}

// Dev-only payment stub: complete/fail a checkout session by its token. Completing grants the
// entitlement, so this is where ownership actually flips.
export function useStubPay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ token, outcome }: { token: string; outcome: "complete" | "fail" }) =>
      (await apiClient.post<{ orderId: string; status: string }>(
        `/api/v1/payments/stub/${token}/${outcome}`)).data,
    onSuccess: () => {
      invalidateOwnership(qc);
      void qc.invalidateQueries({ queryKey: ["commerce", "slot-purchases"] });
      void qc.invalidateQueries({ queryKey: ["commerce", "wallet"] });
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) =>
      (await apiClient.post<{ registered: boolean }>("/api/v1/student/register", { listingId }))
        .data,
    onSuccess: () => invalidateOwnership(qc),
  });
}

export function useClaimSeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) =>
      (await apiClient.post<{ listingId: string }>("/api/v1/student/seats/claim", { code })).data,
    onSuccess: () => invalidateOwnership(qc),
  });
}

// ---- Student library + orders ----

export function useMyExams(page = 1, pageSize = 20) {
  return useQuery<MyExamsResponse>({
    queryKey: ["student", "my-exams", page, pageSize],
    queryFn: async () =>
      (await apiClient.get<MyExamsResponse>(
        `/api/v1/student/my-exams?page=${page}&pageSize=${pageSize}`)).data,
  });
}

export function useMyOrders(page = 1, pageSize = 20) {
  return useQuery<OrdersResponse>({
    queryKey: ["commerce", "orders", page, pageSize],
    queryFn: async () =>
      (await apiClient.get<OrdersResponse>(
        `/api/v1/student/orders?page=${page}&pageSize=${pageSize}`)).data,
  });
}

// ---- Examiner listing (sell settings) + reschedule ----

export function useListing(productType: string | undefined, productId: string | undefined) {
  return useQuery<Listing>({
    queryKey: ["commerce", "listing", productType, productId],
    enabled: !!productType && !!productId,
    retry: false, // 404 = no listing yet (never published); don't retry-spam.
    queryFn: async () =>
      (await apiClient.get<Listing>(`/api/v1/listings/${productType}/${productId}`)).data,
  });
}

export function useSaveListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productType,
      productId,
      body,
    }: {
      productType: string;
      productId: string;
      body: SaveListingRequest;
    }) =>
      (await apiClient.put<Listing>(`/api/v1/listings/${productType}/${productId}`, body)).data,
    onSuccess: (_data, { productType, productId }) =>
      void qc.invalidateQueries({ queryKey: ["commerce", "listing", productType, productId] }),
  });
}

export function useReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ examId, body }: { examId: string; body: RescheduleRequest }) =>
      (await apiClient.post<ExamResponse>(`/api/v1/exams/${examId}/reschedule`, body)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["exams"] });
      // Window/publishedAt are denormalized onto the listing at reschedule.
      void qc.invalidateQueries({ queryKey: ["commerce", "listing"] });
    },
  });
}

// ---- B2B slot purchases + roster ----

export function useSlotPurchases() {
  return useQuery<SlotPurchase[]>({
    queryKey: ["commerce", "slot-purchases"],
    queryFn: async () =>
      (await apiClient.get<SlotPurchase[]>("/api/v1/slot-purchases")).data,
  });
}

export function useBuySlots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: SlotPurchaseRequest) =>
      (await apiClient.post<CheckoutResponse>("/api/v1/slot-purchases", body)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["commerce", "slot-purchases"] }),
  });
}

export function useUpgradeSlots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpgradeRequest }) =>
      (await apiClient.post<UpgradeResult>(`/api/v1/slot-purchases/${id}/upgrade`, body)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["commerce", "slot-purchases"] });
      void qc.invalidateQueries({ queryKey: ["commerce", "wallet"] });
    },
  });
}

export function useRoster(id: string | undefined) {
  return useQuery<RosterResponse>({
    queryKey: ["commerce", "roster", id],
    enabled: !!id,
    retry: false, // 404 = foreign/unknown slot purchase; don't retry-spam before the error Alert.
    queryFn: async () =>
      (await apiClient.get<RosterResponse>(`/api/v1/slot-purchases/${id}/roster`)).data,
  });
}

export function useAddAllowlist(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: AllowlistRow[]) =>
      (await apiClient.post<AllowlistReport>(`/api/v1/slot-purchases/${id}/roster`, { rows }))
        .data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["commerce", "roster", id] });
      void qc.invalidateQueries({ queryKey: ["commerce", "slot-purchases"] });
    },
  });
}

export function useRevokeMember(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      await apiClient.delete(`/api/v1/slot-purchases/${id}/roster/${memberId}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["commerce", "roster", id] });
      void qc.invalidateQueries({ queryKey: ["commerce", "slot-purchases"] });
    },
  });
}

export function useRotateCode(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await apiClient.post<{ inviteCode: string }>(`/api/v1/slot-purchases/${id}/rotate-code`))
        .data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["commerce", "roster", id] });
      void qc.invalidateQueries({ queryKey: ["commerce", "slot-purchases"] });
    },
  });
}

// ---- Examiner wallet + withdrawals ----

export function useWallet(page = 1, pageSize = 20) {
  return useQuery<WalletResponse>({
    queryKey: ["commerce", "wallet", page, pageSize],
    queryFn: async () =>
      (await apiClient.get<WalletResponse>(
        `/api/v1/wallet?page=${page}&pageSize=${pageSize}`)).data,
  });
}

export function useMyWithdrawals() {
  return useQuery<Withdrawal[]>({
    queryKey: ["commerce", "withdrawals"],
    queryFn: async () =>
      (await apiClient.get<Withdrawal[]>("/api/v1/wallet/withdrawals")).data,
  });
}

export function useRequestWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: WithdrawalRequest) =>
      (await apiClient.post<Withdrawal>("/api/v1/wallet/withdrawals", body)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["commerce", "wallet"] });
      void qc.invalidateQueries({ queryKey: ["commerce", "withdrawals"] });
    },
  });
}

// ---- Platform admin: withdrawal payout queue + order void ----

export function useAdminWithdrawals(status?: string) {
  return useQuery<Withdrawal[]>({
    queryKey: ["commerce", "admin-withdrawals", status ?? null],
    queryFn: async () =>
      (await apiClient.get<Withdrawal[]>(
        `/api/v1/admin/withdrawals${status ? `?status=${status}` : ""}`)).data,
  });
}

export function useMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post<Withdrawal>(`/api/v1/admin/withdrawals/${id}/mark-paid`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["commerce", "admin-withdrawals"] }),
  });
}

export function useRejectWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      (await apiClient.post<Withdrawal>(`/api/v1/admin/withdrawals/${id}/reject`, { reason }))
        .data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["commerce", "admin-withdrawals"] }),
  });
}

export function useVoidOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post<{ orderId: string; status: string }>(
        `/api/v1/admin/orders/${id}/void`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["commerce", "orders"] });
      // A void refunds the buyer and reverses the org's credit → wallet ledger changes.
      void qc.invalidateQueries({ queryKey: ["commerce", "wallet"] });
    },
  });
}
