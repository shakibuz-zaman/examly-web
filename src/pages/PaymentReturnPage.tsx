import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Card, Spin } from "antd";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { invalidatePurchaseCaches, useOrderStatus } from "../api/commerce";
import { useAuth } from "../auth/useAuth";
import { EmptyState } from "../ui/EmptyState";
import { RetryNotice } from "../ui/RetryNotice";

// Where the payment gateway drops the buyer back: /payment/return?orderId=…
// Bare mode on purpose — no StudentShell tabs, no AppShell sidebar. The buyer arrives from an
// off-site page in the middle of a transaction, so the only question this screen answers is
// what happened to THIS order; tabs to elsewhere would just invite a mid-settlement escape.
// Authed but role-agnostic: examiners buy seat slots through the same gateway hop students do.

function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "var(--ex-bg)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>{children}</div>
    </div>
  );
}

function Waiting({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 0" }} aria-live="polite">
      <Spin />
      <p style={{ margin: "16px 0 0", fontSize: 14, color: "var(--ex-ink-soft)" }}>{message}</p>
    </div>
  );
}

export function PaymentReturnPage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const orderId = params.get("orderId");
  const status = useOrderStatus(orderId);

  // Fire the post-purchase cache sweep exactly ONCE per settle. The gateway path never runs a
  // client mutation — the callback (or the sweep) fulfilled the grant server-side — so this
  // effect is the only thing that flips ownership in the cache, and my-exams/catalog show the
  // purchase without a manual refresh. The ref (not just the terminal status) is what keeps it
  // to one: StrictMode double-invokes effects, and any later re-render carrying the same
  // status would otherwise re-invalidate and restart every ownership query on the client.
  const settled = useRef(false);
  useEffect(() => {
    if (settled.current) return;
    if (status.data?.status === "paid" || status.data?.status === "duplicate") {
      settled.current = true;
      invalidatePurchaseCaches(qc);
    }
  }, [status.data?.status, qc]);

  const isStudent = user?.role === "student";

  // The role-aware CTA pair. The examiner/admin half is the same «back to the dashboard» on
  // every outcome — there is no examiner-facing store to return to — so only the student half
  // changes wording with what happened.
  function cta(studentLabel: string) {
    return {
      actionLabel: isStudent ? studentLabel : "ড্যাশবোর্ডে ফিরুন",
      actionTo: isStudent ? "/student/tests" : "/dashboard",
    };
  }

  // No order id at all: a hand-typed URL, or a gateway that dropped the query string. Nothing
  // to poll, so say so rather than spinning forever.
  if (!orderId) {
    return (
      <Frame>
        <Card>
          <EmptyState variant="empty" message="অর্ডারটি শনাক্ত করা যায়নি।" {...cta("স্টোরে ফিরুন")} />
        </Card>
      </Frame>
    );
  }

  // Three-state rule, keyed on `!data` and never on `isError`: the panel replaces the content
  // only when we hold NOTHING. That is the stale/foreign/garbage id — a permanent owner-scoped
  // 404, which the hook lets settle into `error` after its retries rather than polling it
  // every 3s forever.
  if (status.isError && !status.data) {
    return (
      <Frame>
        <RetryNotice tone="panel" busy={status.isFetching} onRetry={() => void status.refetch()} />
      </Frame>
    );
  }

  const settledStatus = status.data?.status;
  const body: ReactNode =
    settledStatus === undefined ? (
      <Waiting message="পেমেন্ট যাচাই হচ্ছে…" />
    ) : settledStatus === "pending" ? (
      <Waiting message="পেমেন্ট প্রসেস হচ্ছে — এই পাতাটি নিজে থেকেই আপডেট হবে।" />
    ) : settledStatus === "paid" ? (
      <EmptyState variant="success" message="কেনা সম্পূর্ণ!" {...cta("আমার পরীক্ষা দেখুন")} />
    ) : settledStatus === "duplicate" ? (
      // Spec §5: the buyer DID pay and DOES own the exam — a second settlement of an
      // already-owned listing is refunded, not a failure. Both halves plainly, success CTA kept.
      <EmptyState
        variant="success"
        message="এই পরীক্ষাটি আগে থেকেই আপনার কেনা আছে — অতিরিক্ত পেমেন্টটি ফেরত দেওয়া হবে।"
        {...cta("আমার পরীক্ষা দেখুন")}
      />
    ) : (
      // failed | voided — the two remaining terminal wire statuses.
      <EmptyState
        variant="empty"
        message="পেমেন্ট সম্পন্ন হয়নি।"
        {...cta("স্টোরে ফিরে আবার চেষ্টা করুন")}
      />
    );

  return (
    <Frame>
      {/* The other half of the same rule: a poll that fails while a status is already on screen
          keeps that status and rides a strip above it. Without the strip the hook's
          stop-on-error would leave a held "pending" spinning with no way to ask again. */}
      {status.isError && (
        <RetryNotice tone="strip" busy={status.isFetching} onRetry={() => void status.refetch()} />
      )}
      <Card>{body}</Card>
    </Frame>
  );
}
