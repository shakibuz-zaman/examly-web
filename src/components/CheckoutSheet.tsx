// PHASE-10 SEAM. This sheet drives the full B2C purchase loop: checkout → payment → grant.
// Only the DEV-STUB payment panel (phase "paying") is throwaway — Phase 10 replaces it with a
// real gateway redirect (bKash/SSLCommerz). The checkout call, the state machine, the success/
// failure handling, and the ownership invalidation (done inside useStubPay) all stay as-is; the
// gateway just takes over from where the stub's "সফল পেমেন্ট / ব্যর্থ পেমেন্ট" buttons sit today.
import { useState } from "react";
import { Alert, Button, Drawer, Grid, Modal, Typography } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import { AxiosError } from "axios";
import { useCheckout, useStubPay } from "../api/commerce";
import type { CheckoutResponse } from "../api/commerce";

type CheckoutSheetProps = {
  open: boolean;
  onClose: () => void;
  listingId: string;
  title: string;
  priceBdt: number;
  onPurchased: () => void;
  // B2B seam (Task 17): when provided, the order is created by this callback instead of the
  // B2C student checkout — the stub-pay panel below is identical, so the examiner seat-slot buy/
  // upgrade flows reuse this same sheet. Defaults to the student checkout for existing callers.
  createOrder?: () => Promise<CheckoutResponse>;
};

type Phase = "idle" | "ordering" | "paying" | "done" | "failed";

const TITLE = "কেনাকাটা";

function errorText(err: unknown): string {
  if (err instanceof AxiosError) return err.response?.data?.error ?? "কিছু একটা ভুল হয়েছে";
  return "কিছু একটা ভুল হয়েছে";
}

export function CheckoutSheet({
  open,
  onClose,
  listingId,
  title,
  priceBdt,
  onPurchased,
  createOrder,
}: CheckoutSheetProps) {
  const isDesktop = Grid.useBreakpoint().md;
  const checkout = useCheckout();
  const stubPay = useStubPay();
  const [phase, setPhase] = useState<Phase>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPhase("idle");
    setToken(null);
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  // idle | failed → ordering → paying. The server reuses the same pending order id on a retry
  // until it fails, then issues a fresh one — the client just re-runs checkout either way.
  async function startCheckout() {
    setError(null);
    setPhase("ordering");
    try {
      const res = createOrder ? await createOrder() : await checkout.mutateAsync(listingId);
      setToken(res.checkoutToken);
      setPhase("paying");
    } catch (err) {
      setError(errorText(err));
      setPhase("failed");
    }
  }

  async function pay(outcome: "complete" | "fail") {
    if (!token) return;
    setError(null);
    try {
      await stubPay.mutateAsync({ token, outcome });
      if (outcome === "complete") {
        onPurchased(); // ownership invalidations already ran inside useStubPay
        setPhase("done");
        window.setTimeout(close, 1200); // auto-close on success
      } else {
        setError("পেমেন্ট ব্যর্থ হয়েছে");
        setPhase("failed");
      }
    } catch (err) {
      setError(errorText(err));
      setPhase("failed");
    }
  }

  const body = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Typography.Text strong style={{ display: "block", fontSize: 16 }}>
          {title}
        </Typography.Text>
        <Typography.Text style={{ color: "var(--ex-ink-soft)" }}>৳{priceBdt}</Typography.Text>
      </div>

      {(phase === "idle" || phase === "ordering") && (
        <Button
          type="primary"
          size="large"
          block
          loading={phase === "ordering"}
          onClick={startCheckout}
        >
          কিনুন — ৳{priceBdt}
        </Button>
      )}

      {phase === "paying" && (
        <div
          style={{
            border: "1px dashed var(--ex-line)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Typography.Text strong style={{ color: "var(--ex-ink-soft)" }}>
            ডেভ পেমেন্ট (স্টাব)
          </Typography.Text>
          <Button
            type="primary"
            block
            loading={stubPay.isPending && stubPay.variables?.outcome === "complete"}
            onClick={() => pay("complete")}
          >
            সফল পেমেন্ট
          </Button>
          <Button
            danger
            block
            loading={stubPay.isPending && stubPay.variables?.outcome === "fail"}
            onClick={() => pay("fail")}
          >
            ব্যর্থ পেমেন্ট
          </Button>
        </div>
      )}

      {phase === "done" && (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <CheckCircleFilled style={{ fontSize: 44, color: "var(--ex-teal-ink)" }} />
          <Typography.Title level={4} style={{ marginTop: 12, color: "var(--ex-ink)" }}>
            কেনা সম্পূর্ণ!
          </Typography.Title>
        </div>
      )}

      {phase === "failed" && (
        <>
          {error && <Alert type="error" showIcon title={error} />}
          <Button type="primary" size="large" block onClick={startCheckout}>
            আবার চেষ্টা করুন
          </Button>
        </>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Modal open={open} title={TITLE} onCancel={close} footer={null} centered destroyOnHidden>
        {body}
      </Modal>
    );
  }

  return (
    <Drawer
      placement="bottom"
      size="70%"
      open={open}
      onClose={close}
      title={TITLE}
      styles={{ body: { overflowY: "auto" } }}
      destroyOnHidden
    >
      {body}
    </Drawer>
  );
}
