import { useState } from "react";
import { Input, Modal, Typography } from "antd";
import { PillButton } from "../../ui/PillButton";
import { identityError, useEmailChange } from "../../api/auth";
import type { MeUser } from "../../api/auth";

export function EmailSection({ user, bare = false }: { user: MeUser; bare?: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const change = useEmailChange();

  function submit() {
    setError(null);
    change.mutate(draft.trim(), {
      onSuccess: (m) => setNotice(m),
      onError: (e) => setError(identityError(e, "সঠিক ইমেইল ঠিকানা দিন।")),
    });
  }

  return (
    <section>
      {!bare && (
        <Typography.Title level={5} style={{ color: "var(--ex-ink)" }}>
          ইমেইল
        </Typography.Title>
      )}
      <div className="ex-acct-row">
        <span className="ex-acct-value">
          {user.email ?? "—"}
          {user.email && (
            <span
              className={`ex-chipstat ${user.emailVerified ? "ex-chipstat--active" : "ex-chipstat--draft"}`}
              style={{ marginInlineStart: 8 }}
            >
              {user.emailVerified ? "নিশ্চিত" : "যাচাই বাকি"}
            </span>
          )}
        </span>
        <PillButton size="sm" onClick={() => { setDraft(""); setNotice(null); setError(null); setOpen(true); }}>
          {user.email ? "বদলান" : "যুক্ত করুন"}
        </PillButton>
      </div>
      <Modal
        title={user.email ? "ইমেইল বদলান" : "ইমেইল যুক্ত করুন"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={notice ? () => setOpen(false) : submit}
        okText={notice ? "ঠিক আছে" : "লিংক পাঠান"}
        cancelText="বাতিল"
        okButtonProps={{ disabled: !notice && !draft.trim() }}
        confirmLoading={change.isPending}
      >
        <div className="ex-otpflow">
          {notice ? (
            <p className="ex-otpflow-hint" role="status">{notice}</p>
          ) : (
            <>
              <label className="ex-otpflow-label" htmlFor="acct-email">নতুন ইমেইল</label>
              <Input id="acct-email" type="email" autoComplete="email" value={draft}
                onChange={(e) => setDraft(e.target.value)} onPressEnter={submit} />
              <p className="ex-acct-meta">নতুন ঠিকানায় একটি নিশ্চিতকরণ লিংক যাবে (১ ঘণ্টা কার্যকর)।</p>
            </>
          )}
          {error && <div className="ex-otpflow-error" role="alert">{error}</div>}
        </div>
      </Modal>
    </section>
  );
}
