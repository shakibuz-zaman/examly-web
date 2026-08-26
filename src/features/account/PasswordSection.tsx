import { useState } from "react";
import { Input, Modal, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { PillButton } from "../../ui/PillButton";
import { useAuth } from "../../auth/useAuth";
import { identityError, useRemovePassword, useSetPassword } from "../../api/auth";
import type { MeUser } from "../../api/auth";

export function PasswordSection({ user }: { user: MeUser }) {
  const { adoptSession, logout } = useAuth();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const set = useSetPassword();
  const remove = useRemovePassword();

  function openEdit() {
    setCurrent("");
    setNext("");
    setError(null);
    setEditOpen(true);
  }

  function submitSet() {
    setError(null);
    set.mutate(
      { currentPassword: user.hasPassword ? current : null, newPassword: next },
      {
        onSuccess: (t) => {
          adoptSession(t); // the server revoked every OTHER session and re-minted this one
          message.success("পাসওয়ার্ড সংরক্ষিত — অন্য সব ডিভাইস লগআউট হয়েছে");
          setEditOpen(false);
        },
        onError: (e) => setError(identityError(e, "পাসওয়ার্ড সংরক্ষণ করা যায়নি")),
      },
    );
  }

  function submitRemove() {
    setError(null);
    remove.mutate(current, {
      onSuccess: () => {
        // 204 revoked EVERY session, this one included — nothing to adopt; leave cleanly.
        message.success("পাসওয়ার্ড মুছে ফেলা হয়েছে — কোড দিয়ে আবার লগইন করুন");
        logout();
        navigate("/login");
      },
      onError: (e) => setError(identityError(e, "বর্তমান পাসওয়ার্ড সঠিক নয়।")),
    });
  }

  return (
    <section>
      <Typography.Title level={5} style={{ color: "var(--ex-ink)" }}>
        পাসওয়ার্ড
      </Typography.Title>
      <div className="ex-acct-row">
        <span className="ex-acct-value">{user.hasPassword ? "সেট করা আছে" : "সেট করা নেই"}</span>
        <span style={{ display: "flex", gap: 8 }}>
          <PillButton size="sm" onClick={openEdit}>
            {user.hasPassword ? "বদলান" : "সেট করুন"}
          </PillButton>
          {user.hasPassword && (
            <PillButton size="sm" variant="outline" onClick={() => { setCurrent(""); setError(null); setRemoveOpen(true); }}>
              মুছুন
            </PillButton>
          )}
        </span>
      </div>
      <Modal
        title={user.hasPassword ? "পাসওয়ার্ড বদলান" : "পাসওয়ার্ড সেট করুন"}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={submitSet}
        okText="সংরক্ষণ করুন"
        cancelText="বাতিল"
        okButtonProps={{ disabled: next.length < 8 || (user.hasPassword && !current) }}
        confirmLoading={set.isPending}
      >
        <div className="ex-otpflow">
          {user.hasPassword && (
            <>
              <label className="ex-otpflow-label" htmlFor="pw-current">বর্তমান পাসওয়ার্ড</label>
              <Input.Password id="pw-current" autoComplete="current-password" value={current}
                onChange={(e) => setCurrent(e.target.value)} />
            </>
          )}
          <label className="ex-otpflow-label" htmlFor="pw-next">নতুন পাসওয়ার্ড</label>
          <Input.Password id="pw-next" autoComplete="new-password" value={next}
            onChange={(e) => setNext(e.target.value)} onPressEnter={submitSet} />
          <p className="ex-acct-meta">কমপক্ষে ৮ অক্ষর — ফোন নম্বরটি নয়।</p>
          {error && <div className="ex-otpflow-error" role="alert">{error}</div>}
        </div>
      </Modal>
      <Modal
        title="পাসওয়ার্ড মুছবেন?"
        open={removeOpen}
        onCancel={() => setRemoveOpen(false)}
        onOk={submitRemove}
        okText="মুছুন"
        cancelText="বাতিল"
        okButtonProps={{ danger: true, disabled: !current }}
        confirmLoading={remove.isPending}
      >
        <div className="ex-otpflow">
          <p className="ex-acct-meta">মুছে ফেললে সব ডিভাইস থেকে লগআউট হয়ে যাবেন — কোড দিয়ে লগইন সবসময় চালু থাকবে।</p>
          <label className="ex-otpflow-label" htmlFor="pw-remove">বর্তমান পাসওয়ার্ড</label>
          <Input.Password id="pw-remove" autoComplete="current-password" value={current}
            onChange={(e) => setCurrent(e.target.value)} onPressEnter={submitRemove} />
          {error && <div className="ex-otpflow-error" role="alert">{error}</div>}
        </div>
      </Modal>
    </section>
  );
}
