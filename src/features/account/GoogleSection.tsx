import { useState } from "react";
import { Modal, Typography, message } from "antd";
import { PillButton } from "../../ui/PillButton";
import { googleStartUrl, identityError, useGoogleUnlink } from "../../api/auth";
import type { MeUser } from "../../api/auth";

export function GoogleSection({ user }: { user: MeUser }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const unlink = useGoogleUnlink();

  function submitUnlink() {
    unlink.mutate(undefined, {
      onSuccess: () => {
        message.success("Google বিচ্ছিন্ন হয়েছে");
        setConfirmOpen(false);
      },
      onError: (e) => message.error(identityError(e, "বিচ্ছিন্ন করা যায়নি")),
    });
  }

  return (
    <section>
      <Typography.Title level={5} style={{ color: "var(--ex-ink)" }}>
        Google
      </Typography.Title>
      <div className="ex-acct-row">
        <span className="ex-acct-value">{user.googleLinked ? "যুক্ত আছে" : "যুক্ত নেই"}</span>
        {user.googleLinked ? (
          <PillButton size="sm" variant="outline" onClick={() => setConfirmOpen(true)}>
            বিচ্ছিন্ন করুন
          </PillButton>
        ) : (
          <a className="ex-btn ex-btn--tonal ex-btn--sm" href={googleStartUrl("/settings")}>
            যুক্ত করুন
          </a>
        )}
      </div>
      <Modal
        title="Google বিচ্ছিন্ন করবেন?"
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onOk={submitUnlink}
        okText="বিচ্ছিন্ন করুন"
        cancelText="না"
        okButtonProps={{ danger: true }}
        confirmLoading={unlink.isPending}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          ফোন-কোড দিয়ে লগইন সবসময় চালু থাকবে।
        </Typography.Paragraph>
      </Modal>
    </section>
  );
}
