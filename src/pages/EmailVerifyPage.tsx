import { useEffect, useRef, useState } from "react";
import { Spin } from "antd";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ME_KEY, emailChangeVerify, identityError } from "../api/auth";

export function EmailVerifyPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const queryClient = useQueryClient();
  const firedRef = useRef(false);
  const [state, setState] = useState<{ status: "pending" | "done" | "failed"; message: string }>(() =>
    token
      ? { status: "pending", message: "" }
      : { status: "failed", message: "লিংকটি অবৈধ বা মেয়াদোত্তীর্ণ।" },
  );

  useEffect(() => {
    if (!token || firedRef.current) return;
    firedRef.current = true;
    emailChangeVerify(token)
      .then((m) => {
        void queryClient.invalidateQueries({ queryKey: ME_KEY }); // same browser + signed in → fresh emailVerified
        setState({ status: "done", message: m });
      })
      .catch((e) => setState({ status: "failed", message: identityError(e, "লিংকটি অবৈধ বা মেয়াদোত্তীর্ণ।") }));
  }, [token, queryClient]);

  return (
    <div className="ex-login">
      <div className="ex-login-card">
        <div className="ex-login-brand">Examly</div>
        {state.status === "pending" ? (
          <Spin style={{ display: "block", margin: "16px auto" }} />
        ) : (
          <>
            <p className={state.status === "failed" ? "ex-otpflow-error" : "ex-otpflow-hint"} role="status">
              {state.message}
            </p>
            <div className="ex-login-links">
              <Link to="/">চালিয়ে যান</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
