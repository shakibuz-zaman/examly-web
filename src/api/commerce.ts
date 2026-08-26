import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "./client";
import type { ExamResponse } from "./types";
import type { MyExamsResponse } from "./types";

// ---- Wire types (mirror Examly.Api Features/Commerce/CommerceDtos.cs, camelCase) ----

// One price cell of the seat×exam matrix (business plan §3.1).
export type MatrixCell = { seatSlot: number; examSlot: number; priceBdt: number };

// GET /api/v1/pricing (anon) + GET/PUT /api/v1/admin/platform-config body. vatRatePercent is
// the rate stamped onto every order at mint (Phase 10 D5) — prices are VAT-INCLUSIVE, so this
// is what the receipt breaks the amount down BY, never something added on at checkout.
export type Pricing = {
  modelTestMatrix: MatrixCell[];
  standalonePrices: MatrixCell[];
  commissionRate: number;
  priceFloorBdt: number;
  withdrawalMinBdt: number;
  vatRatePercent: number;
};

// POST /student/checkout + POST /slot-purchases response. checkoutToken is the payment
// provider's session token (dev stub: the order id) handed to the gateway / stub route.
// redirectUrl is the gateway-hosted page to send the buyer to, and is null exactly when the
// provider has none — the dev stub, which pays through the in-app panel instead.
export type CheckoutResponse = {
  orderId: string;
  checkoutToken: string;
  amountBdt: number;
  redirectUrl: string | null;
};

// The slot upgrade route returns a checkout OR { appliedFree: true } when the delta is zero.
export type UpgradeResult = CheckoutResponse | { appliedFree: true };

// amountBdt is VAT-INCLUSIVE; vatBdt is the portion of it that is VAT, at the rate frozen on
// the order at mint. Those two plus gatewayTxnId are the whole receipt (D7).
export type OrderItem = {
  id: string;
  kind: string;
  listingId: string;
  productTitle: string;
  amountBdt: number;
  vatBdt: number;
  vatRatePercent: number;
  gatewayTxnId: string | null;
  status: string;
  createdAt: string;
  paidAt: string | null;
};
export type OrdersResponse = { items: OrderItem[]; total: number; page: number; pageSize: number };

// GET /api/v1/orders/{id}/status — the owner-scoped settlement probe the payment-return page
// polls (404 for anyone but the buyer). status is one of pending | paid | failed | voided |
// duplicate; everything but "pending" is terminal.
export type OrderStatusInfo = { id: string; status: string; listingId: string; kind: string };

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
  orgId: string;
  amountBdt: number;
  destination: string;
  status: string;
  requestedAt: string;
  rejectReason: string | null;
};

// GET /api/v1/admin/orders/{id} (platform_admin) — the order-void lookup. Carries both the B2C
// (studentId + commission/share) and B2B (orgId + seat/exam slots) fields; the UI shows whichever
// apply. productTitle is "(deleted)" when the listing or its product is gone.
export type AdminOrder = {
  id: string;
  kind: string;
  studentId: string | null;
  orgId: string | null;
  listingId: string;
  productTitle: string;
  amountBdt: number;
  seatSlot: number | null;
  examSlot: number | null;
  status: string;
  createdAt: string;
  paidAt: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  commissionBdt: number | null;
  authorShareBdt: number | null;
  // Phase 10, appended: which adapter minted the session, the gateway's own id for the
  // settlement, the VAT stamp (D5) and the duplicate-resolution stamps (D6). A row in the
  // duplicates queue is UNRESOLVED exactly while duplicateResolvedAt is null — the list keeps
  // resolved rows, so that field is the only thing separating the two.
  provider: string;
  gatewayTxnId: string | null;
  vatBdt: number;
  vatRatePercent: number;
  duplicateResolvedAt: string | null;
  duplicateResolvedBy: string | null;
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

// The post-purchase cache sweep, for callers that land on a settled order OUTSIDE a mutation:
// the /payment/return page, whose grant was fulfilled server-side by the gateway callback (or
// the sweep), so no client mutation ever ran. Same set useStubPay flushes on the dev-stub path.
export function invalidatePurchaseCaches(qc: ReturnType<typeof useQueryClient>) {
  invalidateOwnership(qc);
  void qc.invalidateQueries({ queryKey: ["commerce", "slot-purchases"] });
  void qc.invalidateQueries({ queryKey: ["commerce", "wallet"] });
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

// /payment/return polls this until the gateway callback / sweep settles the order. The
// interval stops itself on any terminal status — it re-arms only while the order is still
// "pending" (or has not loaded yet), so paid / failed / voided / duplicate all end the poll.
export function useOrderStatus(orderId: string | null) {
  return useQuery<OrderStatusInfo>({
    queryKey: ["commerce", "order-status", orderId],
    enabled: !!orderId,
    refetchInterval: (q) =>
      q.state.data == null || q.state.data.status === "pending" ? 3000 : false,
    queryFn: async () =>
      (await apiClient.get<OrderStatusInfo>(`/api/v1/orders/${orderId}/status`)).data,
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

// 7b store: infinite-scroll my-exams. The key extends the ["student", "my-exams"]
// prefix in OWNERSHIP_KEYS, so a claim / purchase / free-register invalidates it too.
export function useInfiniteMyExams(pageSize = 20) {
  return useInfiniteQuery<MyExamsResponse>({
    queryKey: ["student", "my-exams", "infinite", pageSize],
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    queryFn: async ({ pageParam }) =>
      (await apiClient.get<MyExamsResponse>(
        `/api/v1/student/my-exams?page=${pageParam}&pageSize=${pageSize}`)).data,
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
    // `page` is IN the key, so a page step is a NEW query, not a refetch — without this the
    // whole ওয়ালেট body (tiles, ledger and the pager the reader just clicked) unmounted behind
    // a skeleton, and the balance the header prints fell back to ৳০ for the duration. The
    // held slice keeps both honest: `balance` is page-independent on the wire, so a
    // placeholder balance is the SAME number, not a stale claim about another cohort — the
    // only thing that lags is the entry list, which the consumer marks with the house
    // saturate(.35) cue (never opacity) plus aria-busy off `isPlaceholderData`.
    // The key itself is untouched — ExaminerSidebar's badge prefix-matches ["commerce","wallet"]
    // and reads cache entries, which placeholder substitution never writes to.
    placeholderData: keepPreviousData,
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

// Look up one order by id for the void escape hatch. Enabled only on a non-empty id; retry:false
// so an unknown/malformed id (404) surfaces its error immediately instead of retry-spamming.
export function useAdminOrder(id: string) {
  return useQuery<AdminOrder>({
    queryKey: ["commerce", "admin-order", id],
    enabled: !!id,
    retry: false,
    queryFn: async () =>
      (await apiClient.get<AdminOrder>(`/api/v1/admin/orders/${id}`)).data,
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

// The duplicate-payment queue (D6): orders the gateway settled twice. The list keeps RESOLVED
// rows too — `duplicateResolvedAt != null` is what tells the two apart, so the page filters,
// it does not assume every row is outstanding.
export function useAdminDuplicates() {
  return useQuery<AdminOrder[]>({
    queryKey: ["commerce", "admin-duplicates"],
    queryFn: async () =>
      (await apiClient.get<AdminOrder[]>("/api/v1/admin/orders/duplicates")).data,
  });
}

export function useResolveDuplicate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) =>
      (await apiClient.post<{ orderId: string; status: string }>(
        `/api/v1/admin/orders/${orderId}/resolve-duplicate`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["commerce", "admin-duplicates"] }),
  });
}
