// This sheet drives the full B2C purchase loop: checkout → payment → grant. The Phase-10 seam
// is CLOSED: the real gateway redirect is live, and which of the two "paying" branches renders
// is decided by the wire, not by the build — checkout returns a redirectUrl and the sheet hands
// the buyer to the provider's hosted page (the browser leaves; settlement lands server-side and
// /payment/return picks it up), or it returns null and the DEV-STUB panel pays in-app through
// useStubPay. Only that stub branch is dev-only now, and it is reachable only while the devstub
// adapter is the configured provider. The checkout call, the state machine, the success/failure
// handling and the ownership invalidation (done inside useStubPay) are unchanged.
import { useState } from "react";
import { Alert, Button, Drawer, Grid, Modal, Typography } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import { AxiosError } from "axios";
import { useCheckout, useCheckoutMethods, useStubPay } from "../api/commerce";
import type { CheckoutResponse } from "../api/commerce";
import { PillButton } from "../ui/PillButton";
import { bnMoney } from "../lib/bn";

// Bengali labels for the known provider keys; an unknown key from the wire renders its raw
// name (the house fallback rule — the picker asserts nothing about the configured set).
const METHOD_LABELS: Record<string, string> = {
  bkash: "বিকাশ",
  nagad: "নগদ",
  card: "কার্ড",
};

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
  // Phase 10b: the buyer's picked method (null when no picker) threads through so the B2B slot
  // bodies carry it too.
  createOrder?: (method: string | null) => Promise<CheckoutResponse>;
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
  const methods = useCheckoutMethods();
  const available = methods.data?.methods ?? [];
  const firstMethod = available[0] ?? null;
  const [phase, setPhase] = useState<Phase>("idle");
  // The whole checkout session, not just its token: redirectUrl is what picks the paying branch.
  const [session, setSession] = useState<CheckoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The buyer's EXPLICIT pick, or null until they tap an option. The effective method defaults
  // to the first configured key (`firstMethod`), so no effect is needed to seed it — and it is
  // simply null when the host exposes no picker (the shipped 10a default route, byte-for-byte).
  // reset() clears the override so a reopened sheet starts on the first option again.
  const [methodOverride, setMethodOverride] = useState<string | null>(null);
  const method = methodOverride ?? firstMethod;

  function reset() {
    setPhase("idle");
    setSession(null);
    setError(null);
    setMethodOverride(null);
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
      const res = createOrder
        ? await createOrder(method)
        : await checkout.mutateAsync({ listingId, method });
      setSession(res);
      setPhase("paying");
    } catch (err) {
      setError(errorText(err));
      setPhase("failed");
    }
  }

  async function pay(outcome: "complete" | "fail") {
    if (!session) return;
    setError(null);
    try {
      await stubPay.mutateAsync({ token: session.checkoutToken, outcome });
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
        <Typography.Text style={{ color: "var(--ex-ink-soft)" }}>
          {bnMoney(priceBdt)}
        </Typography.Text>
      </div>

      {(phase === "idle" || phase === "ordering") && available.length > 0 && (
        <div>
          <Typography.Text
            id="ex-method-label"
            strong
            style={{ display: "block", marginBottom: 8, color: "var(--ex-ink-soft)" }}
          >
            পেমেন্ট মাধ্যম
          </Typography.Text>
          {/* House PillButton carries the tokens/focus-ring/hover; tonal = selected, outline =
              not. Options lock during `ordering` so a mid-flight pick can't move aria-pressed
              onto a method the already-minted order doesn't carry. */}
          <div
            role="group"
            aria-labelledby="ex-method-label"
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            {available.map((key) => {
              const selected = key === method;
              return (
                <PillButton
                  key={key}
                  variant={selected ? "tonal" : "outline"}
                  aria-pressed={selected}
                  disabled={phase === "ordering"}
                  onClick={() => setMethodOverride(key)}
                  style={{ flex: 1, minWidth: 88 }}
                >
                  {METHOD_LABELS[key] ?? key}
                </PillButton>
              );
            })}
          </div>
        </div>
      )}

      {(phase === "idle" || phase === "ordering") && (
        <Button
          type="primary"
          size="large"
          block
          // Held while the methods query is in flight so a fast first tap can't post
          // method:null and skip the picker on a picker-enabled host. On query ERROR isPending
          // clears with no data → available is [] → no picker, null method → default route
          // (degrades safely to the shipped 10a behaviour).
          loading={phase === "ordering" || methods.isPending}
          disabled={methods.isPending}
          onClick={startCheckout}
        >
          কিনুন — {bnMoney(priceBdt)}
        </Button>
      )}

      {phase === "paying" && session?.redirectUrl && (
        <Button
          type="primary"
          size="large"
          block
          onClick={() => window.location.assign(session.redirectUrl!)}
        >
          পেমেন্ট করুন — {bnMoney(priceBdt)}
        </Button>
      )}

      {phase === "paying" && !session?.redirectUrl && (
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
