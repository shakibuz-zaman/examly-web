import { useState } from "react";
import { Input, Modal, Typography, message } from "antd";
import { PillButton } from "../../ui/PillButton";
import { identityError, useUpdateName } from "../../api/auth";
import type { MeUser } from "../../api/auth";

export function NameSection({ user }: { user: MeUser }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(user.name);
  const update = useUpdateName();

  function submit() {
    update.mutate(draft.trim(), {
      onSuccess: () => {
        message.success("নাম আপডেট হয়েছে");
        setOpen(false);
      },
      onError: (e) => message.error(identityError(e, "নাম আপডেট করা যায়নি")),
    });
  }

  return (
    <section>
      <Typography.Title level={5} style={{ color: "var(--ex-ink)" }}>
        নাম
      </Typography.Title>
      <div className="ex-acct-row">
        <span className="ex-acct-value">{user.name || "—"}</span>
        <PillButton size="sm" onClick={() => { setDraft(user.name); setOpen(true); }}>
          বদলান
        </PillButton>
      </div>
      <Modal
        title="নাম বদলান"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText="সংরক্ষণ করুন"
        cancelText="বাতিল"
        okButtonProps={{ disabled: !draft.trim() }}
        confirmLoading={update.isPending}
      >
        <Input value={draft} maxLength={80} onChange={(e) => setDraft(e.target.value)} onPressEnter={submit} />
      </Modal>
    </section>
  );
}
