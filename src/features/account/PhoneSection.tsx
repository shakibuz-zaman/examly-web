import { useState } from "react";
import { Input, Modal, Typography, message } from "antd";
import { OtpInput } from "../../ui/OtpInput";
import { PillButton } from "../../ui/PillButton";
import { useCountdown } from "../student/useCountdown";
import { bnNum } from "../../lib/bn";
import { normalizePhone, toLocalPhone } from "../../lib/phone";
import { useAuth } from "../../auth/useAuth";
import { identityError, usePhoneChange, usePhoneChangeVerify } from "../../api/auth";
import type { MeUser } from "../../api/auth";

export function PhoneSection({ user }: { user: MeUser }) {
  const { adoptSession } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const request = usePhoneChange();
  const confirm = usePhoneChangeVerify();
  const { remaining, resync } = useCountdown(() => {});
  const canResend = remaining == null || remaining <= 0;
  const busy = request.isPending || confirm.isPending;

  function reset() {
    setStep("phone");
    setNewPhone("");
    setCode("");
    setNotice("");
    setError(null);
  }

  function sendCode() {
    if (!normalizePhone(newPhone)) {
      setError("সঠিক মোবাইল নম্বর দিন (যেমন 01712345678)।");
      return;
    }
    setError(null);
    request.mutate(newPhone, {
      onSuccess: (m) => {
        setNotice(m); // generic by design — says nothing about whether the number is taken
        setCode("");
        setStep("code");
        resync(60);
      },
      onError: (e) => setError(identityError(e, "কোড পাঠানো যায়নি — একটু পরে আবার চেষ্টা করুন।")),
    });
  }

  function verifyCode(codeArg?: string) {
    const effectiveCode = codeArg ?? code;
    setError(null);
    confirm.mutate(
      { newPhone, code: effectiveCode },
      {
        onSuccess: (t) => {
          adoptSession(t); // re-minted session — the old token dies on its next sst check
          message.success("ফোন নম্বর বদলেছে");
          setOpen(false);
          reset();
        },
        onError: (e) => setError(identityError(e, "কোডটি সঠিক নয় বা মেয়াদ শেষ।")),
      },
    );
  }

  return (
    <section>
      <Typography.Title level={5} style={{ color: "var(--ex-ink)" }}>
        ফোন নম্বর
      </Typography.Title>
      <div className="ex-acct-row">
        <span className="ex-acct-value">{user.phone ? bnNum(toLocalPhone(user.phone)) : "—"}</span>
        <PillButton size="sm" onClick={() => { reset(); setOpen(true); }}>
          বদলান
        </PillButton>
      </div>
      <Modal title="ফোন নম্বর বদলান" open={open} onCancel={() => { setOpen(false); reset(); }} footer={null}>
        <div className="ex-otpflow">
          {step === "phone" ? (
            <>
              <label className="ex-otpflow-label" htmlFor="acct-newphone">নতুন নম্বর</label>
              <div className="ex-otpflow-phone">
                <span className="ex-otpflow-cc">+880</span>
                <Input id="acct-newphone" className="ex-num" inputMode="tel" placeholder="01XXXXXXXXX"
                  value={newPhone} disabled={busy} onChange={(e) => setNewPhone(e.target.value)}
                  onPressEnter={sendCode} />
              </div>
              <PillButton variant="primary" className="ex-otpflow-cta" disabled={busy} onClick={sendCode}>
                কোড পাঠান
              </PillButton>
            </>
          ) : (
            <>
              <p className="ex-otpflow-hint">{notice}</p>
              <OtpInput value={code} onChange={setCode} onComplete={(c) => verifyCode(c)} disabled={busy} />
              <PillButton variant="primary" className="ex-otpflow-cta" disabled={busy || code.length < 6} onClick={() => verifyCode()}>
                যাচাই করুন
              </PillButton>
              <PillButton variant="ghost" size="sm" disabled={busy || !canResend} onClick={sendCode}>
                {canResend ? "আবার পাঠান" : `আবার পাঠান (${bnNum(Math.ceil(remaining ?? 0))} সে)`}
              </PillButton>
            </>
          )}
          {error && <div className="ex-otpflow-error" role="alert">{error}</div>}
        </div>
      </Modal>
    </section>
  );
}
