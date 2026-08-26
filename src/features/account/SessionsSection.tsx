import { useState } from "react";
import { Modal, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { RowItem } from "../../ui/RowItem";
import { PillButton } from "../../ui/PillButton";
import { RetryNotice } from "../../ui/RetryNotice";
import { SkeletonRow } from "../../ui/Skeletons";
import { formatDhakaShortBn } from "../../lib/format";
import { useAuth } from "../../auth/useAuth";
import { identityError, useLogoutAll, useRevokeSession, useSessions } from "../../api/auth";
import type { SessionInfo } from "../../api/auth";

export function SessionsSection() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const logoutAll = useLogoutAll();
  const [revokeRow, setRevokeRow] = useState<SessionInfo | null>(null);
  const [allOpen, setAllOpen] = useState(false);

  function submitRevoke() {
    if (!revokeRow) return;
    revoke.mutate(revokeRow.sid, {
      onSuccess: () => {
        message.success("সেশনটি বন্ধ হয়েছে");
        setRevokeRow(null);
      },
      onError: (e) => message.error(identityError(e, "সেশন বন্ধ করা যায়নি")),
    });
  }

  function submitLogoutAll() {
    logoutAll.mutate(undefined, {
      onSuccess: () => {
        logout(); // the server rotated the stamp — this token is dead anyway
        navigate("/login");
      },
      onError: (e) => message.error(identityError(e, "লগআউট করা যায়নি")),
    });
  }

  return (
    <section>
      <Typography.Title level={5} style={{ color: "var(--ex-ink)" }}>
        সেশন
      </Typography.Title>
      {sessions.isPending ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : sessions.data == null ? (
        sessions.isError ? (
          <RetryNotice tone="panel" framed={false} busy={sessions.isFetching} onRetry={() => void sessions.refetch()} />
        ) : null
      ) : (
        <>
          {sessions.isError && (
            <RetryNotice tone="strip" busy={sessions.isFetching} onRetry={() => void sessions.refetch()} />
          )}
          {sessions.data.map((s) => (
            <RowItem
              key={s.sid}
              title={
                <>
                  {s.device}
                  {s.current && (
                    <span className="ex-chipstat ex-chipstat--active" style={{ marginInlineStart: 8 }}>
                      এই ডিভাইস
                    </span>
                  )}
                </>
              }
              meta={`শুরু: ${formatDhakaShortBn(s.createdAt)} · সর্বশেষ: ${formatDhakaShortBn(s.lastSeenAt)}`}
              trailing={
                s.current ? null : (
                  <PillButton size="sm" variant="outline" onClick={() => setRevokeRow(s)}>
                    লগআউট
                  </PillButton>
                )
              }
            />
          ))}
          <PillButton variant="outline" onClick={() => setAllOpen(true)}>
            সব ডিভাইস থেকে লগআউট
          </PillButton>
        </>
      )}
      <Modal
        title="এই সেশনটি বন্ধ করবেন?"
        open={revokeRow !== null}
        onCancel={() => setRevokeRow(null)}
        onOk={submitRevoke}
        okText="লগআউট"
        cancelText="না"
        okButtonProps={{ danger: true }}
        confirmLoading={revoke.isPending}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {revokeRow ? `${revokeRow.device} — সর্বশেষ ${formatDhakaShortBn(revokeRow.lastSeenAt)}` : ""}
        </Typography.Paragraph>
      </Modal>
      <Modal
        title="সব ডিভাইস থেকে লগআউট?"
        open={allOpen}
        onCancel={() => setAllOpen(false)}
        onOk={submitLogoutAll}
        okText="লগআউট"
        cancelText="না"
        okButtonProps={{ danger: true }}
        confirmLoading={logoutAll.isPending}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          এই ডিভাইসসহ সব ডিভাইসের সেশন বন্ধ হবে।
        </Typography.Paragraph>
      </Modal>
    </section>
  );
}
