import { useState } from "react";
import { Input } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/useAuth";
import { PhoneOtpFlow } from "../features/auth/PhoneOtpFlow";
import { PillButton } from "../ui/PillButton";
import { normalizePhone } from "../lib/phone";
import {
  ME_KEY,
  fetchMe,
  googleStartUrl,
  identityError,
  passwordLogin,
  useProviders,
  verifyOtp,
} from "../api/auth";
import type { TokenResponse } from "../api/auth";

export function LoginPage() {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const providers = useProviders();
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function finishLogin(t: TokenResponse) {
    setToken(t.accessToken);
    // /auth/me is authoritative for role (the login payload can lag the admin allowlist).
    const me = await queryClient
      .fetchQuery({ queryKey: ME_KEY, queryFn: fetchMe })
      .catch(() => t.user);
    navigate(me.role === "student" ? "/student/home" : "/dashboard", { replace: true });
  }

  async function onPasswordLogin() {
    if (!normalizePhone(phone)) {
      setError("সঠিক মোবাইল নম্বর দিন (যেমন 01712345678)।");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await finishLogin(await passwordLogin(phone, password));
    } catch (e) {
      setError(identityError(e, "ফোন নম্বর বা পাসওয়ার্ড সঠিক নয়।"));
    } finally {
      setBusy(false);
    }
  }

  const googleOn = providers.data?.includes("google") ?? false;

  return (
    <div className="ex-login">
      <div className="ex-login-card">
        <div className="ex-login-brand">Examly</div>
        <p className="ex-login-tagline">মোবাইল নম্বর দিয়ে লগইন করুন</p>
        {mode === "otp" ? (
          <PhoneOtpFlow verify={verifyOtp} onComplete={finishLogin} />
        ) : (
          <div className="ex-otpflow">
            <label className="ex-otpflow-label" htmlFor="pw-phone">
              মোবাইল নম্বর
            </label>
            <div className="ex-otpflow-phone">
              <span className="ex-otpflow-cc">+880</span>
              <Input
                id="pw-phone"
                className="ex-num"
                inputMode="tel"
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
                value={phone}
                disabled={busy}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <label className="ex-otpflow-label" htmlFor="pw-pass">
              পাসওয়ার্ড
            </label>
            <Input.Password
              id="pw-pass"
              autoComplete="current-password"
              value={password}
              disabled={busy}
              onChange={(e) => setPassword(e.target.value)}
              onPressEnter={() => void onPasswordLogin()}
            />
            <PillButton
              variant="primary"
              className="ex-otpflow-cta"
              disabled={busy || !phone || !password}
              onClick={() => void onPasswordLogin()}
            >
              লগইন
            </PillButton>
            {error && (
              <div className="ex-otpflow-error" role="alert">
                {error}
              </div>
            )}
          </div>
        )}
        <div className="ex-login-links">
          {mode === "otp" ? (
            <PillButton variant="ghost" size="sm" onClick={() => { setMode("password"); setError(null); }}>
              পাসওয়ার্ড দিয়ে লগইন
            </PillButton>
          ) : (
            <PillButton variant="ghost" size="sm" onClick={() => { setMode("otp"); setError(null); }}>
              কোড দিয়ে লগইন
            </PillButton>
          )}
          {googleOn && (
            <a className="ex-btn ex-btn--outline" href={googleStartUrl("/")}>
              Google দিয়ে চালিয়ে যান
            </a>
          )}
          <Link to="/pricing">মূল্য তালিকা</Link>
          {import.meta.env.DEV && <Link to="/dev-login">Dev login</Link>}
        </div>
      </div>
    </div>
  );
}
