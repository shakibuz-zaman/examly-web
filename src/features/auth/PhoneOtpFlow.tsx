import { useState } from "react";
import { Input } from "antd";
import { OtpInput } from "../../ui/OtpInput";
import { PillButton } from "../../ui/PillButton";
import { useCountdown } from "../student/useCountdown";
import { bnNum } from "../../lib/bn";
import { normalizePhone, toLocalPhone } from "../../lib/phone";
import { identityError, isNeedsName, sendOtp } from "../../api/auth";
import type { TokenResponse, VerifyOutcome } from "../../api/auth";

// Client-side pre-check message = the server's InvalidPhone string, so the user sees one
// wording whichever side catches it.
const INVALID_PHONE = "সঠিক মোবাইল নম্বর দিন (যেমন 01712345678).";

type Step = "phone" | "code" | "name";

// The shared phone → code → (first-login name) machine. LoginPage and the /login/google
// continuations differ only in the verify call and what happens with the minted session.
export function PhoneOtpFlow({
  verify,
  onComplete,
  initialPhone = "",
  phoneLocked = false,
}: {
  verify: (phone: string, code: string, name?: string) => Promise<VerifyOutcome>;
  onComplete: (t: TokenResponse) => void | Promise<void>;
  initialPhone?: string;
  phoneLocked?: boolean;
}) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { remaining, resync } = useCountdown(() => {});
  const canResend = remaining == null || remaining <= 0;

  async function send() {
    if (!normalizePhone(phone)) {
      setError(INVALID_PHONE);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setSentMessage(await sendOtp(phone)); // 202 message is generic by design
      setCode("");
      setStep("code");
      resync(60);
    } catch (e) {
      setError(identityError(e, "কোড পাঠানো যায়নি — একটু পরে আবার চেষ্টা করুন."));
    } finally {
      setBusy(false);
    }
  }

  async function submit(nameArg?: string) {
    setBusy(true);
    setError(null);
    try {
      const outcome = await verify(phone, code, nameArg);
      if (isNeedsName(outcome)) {
        // Unknown phone, correct code: the challenge stays live ~2 min for exactly this
        // round trip — the SAME code is re-posted with the name.
        setStep("name");
        return;
      }
      await onComplete(outcome);
    } catch (e) {
      setError(identityError(e, "কোডটি সঠিক নয় বা মেয়াদ শেষ."));
    } finally {
      setBusy(false);
    }
  }

  const shownPhone = bnNum(toLocalPhone(normalizePhone(phone) ?? phone));

  return (
    <div className="ex-otpflow">
      {step === "phone" && (
        <>
          <label className="ex-otpflow-label" htmlFor="otp-phone">
            মোবাইল নম্বর
          </label>
          <div className="ex-otpflow-phone">
            <span className="ex-otpflow-cc">+880</span>
            <Input
              id="otp-phone"
              className="ex-num"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              value={phone}
              disabled={phoneLocked || busy}
              onChange={(e) => setPhone(e.target.value)}
              onPressEnter={() => void send()}
            />
          </div>
          <PillButton variant="primary" className="ex-otpflow-cta" disabled={busy} onClick={() => void send()}>
            কোড পাঠান
          </PillButton>
        </>
      )}
      {step === "code" && (
        <>
          <p className="ex-otpflow-hint">
            {sentMessage} ({shownPhone})
          </p>
          <OtpInput value={code} onChange={setCode} onComplete={() => void submit()} disabled={busy} />
          <PillButton
            variant="primary"
            className="ex-otpflow-cta"
            disabled={busy || code.length < 6}
            onClick={() => void submit()}
          >
            যাচাই করুন
          </PillButton>
          <PillButton variant="ghost" size="sm" disabled={busy || !canResend} onClick={() => void send()}>
            {canResend ? "আবার পাঠান" : `আবার পাঠান (${bnNum(Math.ceil(remaining ?? 0))} সে)`}
          </PillButton>
        </>
      )}
      {step === "name" && (
        <>
          <label className="ex-otpflow-label" htmlFor="otp-name">
            আপনার নাম
          </label>
          <Input
            id="otp-name"
            value={name}
            maxLength={80}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
            onPressEnter={() => void submit(name)}
          />
          <PillButton
            variant="primary"
            className="ex-otpflow-cta"
            disabled={busy || !name.trim()}
            onClick={() => void submit(name)}
          >
            শুরু করুন
          </PillButton>
          {error && (
            <PillButton variant="ghost" size="sm" disabled={busy} onClick={() => void send()}>
              নতুন কোড পাঠান
            </PillButton>
          )}
        </>
      )}
      {error && (
        <div className="ex-otpflow-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
