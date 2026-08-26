import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Spin } from "antd";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/useAuth";
import { PhoneOtpFlow } from "../features/auth/PhoneOtpFlow";
import { bnNum } from "../lib/bn";
import { toLocalPhone } from "../lib/phone";
import {
  ME_KEY,
  fetchMe,
  googleComplete,
  googleLink,
  googleLogin,
  identityError,
  verifyOtp,
} from "../api/auth";
import type { TokenResponse } from "../api/auth";

const GENERIC_FAIL = "Google দিয়ে সাইন-ইন করা যায়নি — আবার চেষ্টা করুন।";

// Mirror of the server-side returnTo sanitiser (local path, no control chars). No regex —
// no-control-regex is an active lint rule.
function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if ([...raw].some((c) => c.charCodeAt(0) < 32)) return "/";
  return raw;
}

export function GoogleContinuePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isPending, setToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const spentRef = useRef(false); // tickets are single-use — survive StrictMode double-effects

  const ticket = params.get("ticket");
  const link = params.get("link");
  const phoneTicket = params.get("phone_ticket");
  const failedCode = params.get("error");
  const linkPhone = params.get("phone") ?? ""; // local format, server-supplied on the link branch
  const returnTo = safeReturnTo(params.get("returnTo"));

  // Branch 1: known account — spend the one-time login ticket for a session.
  useEffect(() => {
    if (!ticket || spentRef.current) return;
    spentRef.current = true;
    googleLogin(ticket)
      .then(async (t) => {
        setToken(t.accessToken);
        await queryClient.fetchQuery({ queryKey: ME_KEY, queryFn: fetchMe }).catch(() => undefined);
        navigate(returnTo, { replace: true });
      })
      .catch((e) => setError(identityError(e, GENERIC_FAIL)));
  }, [ticket, setToken, queryClient, navigate, returnTo]);

  // Branch 2a: link ticket while ALREADY signed in — attach over the bearer, no re-login.
  useEffect(() => {
    if (!link || isPending || !user || spentRef.current) return;
    spentRef.current = true;
    googleLink(link)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ME_KEY });
        navigate(returnTo, { replace: true });
      })
      .catch((e) => setError(identityError(e, GENERIC_FAIL)));
  }, [link, isPending, user, queryClient, navigate, returnTo]);

  async function completeLogin(t: TokenResponse) {
    setToken(t.accessToken);
    await queryClient.fetchQuery({ queryKey: ME_KEY, queryFn: fetchMe }).catch(() => undefined);
    navigate(returnTo, { replace: true });
  }

  // Branch 2b: link ticket, signed out — OTP-sign-in as the matching account, then link.
  async function completeLinkSignIn(t: TokenResponse) {
    spentRef.current = true;
    setToken(t.accessToken);
    try {
      await googleLink(link ?? "");
      await queryClient.fetchQuery({ queryKey: ME_KEY, queryFn: fetchMe }).catch(() => undefined);
      navigate(returnTo, { replace: true });
    } catch (e) {
      setError(identityError(e, GENERIC_FAIL)); // signed in but unlinked — settings can retry
    }
  }

  let body: ReactNode;
  if (error || failedCode) {
    body = (
      <>
        <div className="ex-otpflow-error" role="alert">
          {error ?? GENERIC_FAIL}
        </div>
        <div className="ex-login-links">
          <Link to="/login">লগইন পাতায় ফিরে যান</Link>
        </div>
      </>
    );
  } else if (ticket || (link && (isPending || user))) {
    body = <Spin style={{ display: "block", margin: "24px auto" }} />;
  } else if (link) {
    body = (
      <>
        <p className="ex-otpflow-hint">
          এই Google ইমেইলটি {bnNum(linkPhone)} নম্বরের অ্যাকাউন্টের — সেই নম্বরে লগইন করলেই যুক্ত হয়ে যাবে।
        </p>
        <PhoneOtpFlow verify={verifyOtp} onComplete={completeLinkSignIn} initialPhone={linkPhone} phoneLocked />
      </>
    );
  } else if (phoneTicket) {
    body = (
      <>
        <p className="ex-otpflow-hint">Google অ্যাকাউন্টটি যুক্ত করতে আপনার মোবাইল নম্বর দিন।</p>
        <PhoneOtpFlow
          verify={(phone, code, name) => googleComplete(phoneTicket, phone, code, name)}
          onComplete={completeLogin}
          initialPhone={user ? toLocalPhone(user.phone) : ""}
          phoneLocked={user != null}
        />
      </>
    );
  } else {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="ex-login">
      <div className="ex-login-card">
        <div className="ex-login-brand">Examly</div>
        {body}
      </div>
    </div>
  );
}
