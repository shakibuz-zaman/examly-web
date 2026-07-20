import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Button, Card, Input, Popconfirm, Progress, Space, Spin, Table, Tag, Typography, message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
  useAddAllowlist, useRevokeMember, useRoster, useRotateCode, useSlotPurchases,
} from "../api/commerce";
import type { AllowlistReport, AllowlistRow, RosterMember } from "../api/commerce";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

// "01712345678, Rahim Uddin" → { phone: "01712345678", name: "Rahim Uddin" }. Name is optional.
function parseRows(text: string): AllowlistRow[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const comma = line.indexOf(",");
      if (comma === -1) return { phone: line, name: null };
      return { phone: line.slice(0, comma).trim(), name: line.slice(comma + 1).trim() || null };
    });
}

export function RosterPage() {
  const { slotPurchaseId } = useParams<{ slotPurchaseId: string }>();
  const navigate = useNavigate();
  const { data: roster, isLoading, isError, error } = useRoster(slotPurchaseId);
  const { data: purchases } = useSlotPurchases();
  const addAllowlist = useAddAllowlist(slotPurchaseId ?? "");
  const revoke = useRevokeMember(slotPurchaseId ?? "");
  const rotate = useRotateCode(slotPurchaseId ?? "");

  const [raw, setRaw] = useState("");
  const [report, setReport] = useState<AllowlistReport | null>(null);

  const purchase = purchases?.find((p) => p.id === slotPurchaseId);

  if (isLoading) return <Spin style={{ display: "block", marginTop: 80 }} />;

  if (isError || !roster) {
    return (
      <div>
        <Button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          ← Back
        </Button>
        <Alert type="error" showIcon title={serverError(error, "Could not load this roster.")} />
      </div>
    );
  }

  const usedPct = roster.seatSlot > 0 ? (roster.seatsUsed / roster.seatSlot) * 100 : 0;

  const onAdd = async () => {
    const rows = parseRows(raw);
    if (rows.length === 0) {
      message.error("Add at least one phone number");
      return;
    }
    try {
      const res = await addAllowlist.mutateAsync(rows);
      setReport(res);
      setRaw("");
    } catch (e) {
      message.error(serverError(e, "Could not add to the allowlist"));
    }
  };

  const onRotate = async () => {
    try {
      await rotate.mutateAsync();
      message.success("Invite code rotated — the old code no longer works");
    } catch (e) {
      message.error(serverError(e, "Could not rotate the code"));
    }
  };

  const onRevoke = async (memberId: string) => {
    try {
      await revoke.mutateAsync(memberId);
      message.success("Member revoked");
    } catch (e) {
      message.error(serverError(e, "Could not revoke this member"));
    }
  };

  const columns: ColumnsType<RosterMember> = [
    { title: "Phone", dataIndex: "phone", key: "phone", render: (v: string | null) => v ?? "—" },
    { title: "Name", dataIndex: "name", key: "name", render: (v: string | null) => v ?? "—" },
    {
      title: "Status",
      key: "status",
      render: (_, m) =>
        m.claimedAt ? (
          <Tag color="green">Claimed {new Date(m.claimedAt).toLocaleDateString()}</Tag>
        ) : (
          <Tag color="gold">Pending</Tag>
        ),
    },
    { title: "Source", dataIndex: "source", key: "source", render: (v: string) => <Tag>{v}</Tag> },
    {
      title: "",
      key: "action",
      align: "right",
      render: (_, m) => (
        <Popconfirm
          title="Revoke this member?"
          description="They lose access. A claimed seat is freed only if they haven't started."
          okText="Revoke"
          okButtonProps={{ danger: true }}
          onConfirm={() => onRevoke(m.id)}
        >
          <Button size="small" danger loading={revoke.isPending && revoke.variables === m.id}>
            Revoke
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← Back
      </Button>

      <Card style={{ marginBottom: 16 }}>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {purchase?.productTitle ?? "Roster"}
          </Typography.Title>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Seats used: {roster.seatsUsed}/{roster.seatSlot}
            </Typography.Text>
            <Progress percent={Math.round(usedPct)} showInfo={false} />
          </div>
          {purchase && (
            <Space wrap>
              <Typography.Text strong>Invite code</Typography.Text>
              <Typography.Text copyable={{ text: purchase.inviteCode }} code style={{ fontSize: 15 }}>
                {purchase.inviteCode}
              </Typography.Text>
              <Popconfirm
                title="Rotate the invite code?"
                description="The current code stops working immediately. Already-claimed seats keep access."
                okText="Rotate"
                onConfirm={onRotate}
              >
                <Button size="small" loading={rotate.isPending}>
                  Rotate
                </Button>
              </Popconfirm>
            </Space>
          )}
        </Space>
      </Card>

      <Card title="Add to allowlist" style={{ marginBottom: 16 }}>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            One phone per line, optional name after a comma. Allowlisted numbers can claim a seat
            with the invite code.
          </Typography.Text>
          <Input.TextArea
            rows={5}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"01712345678, Rahim Uddin\n01898765432"}
          />
          <Button type="primary" loading={addAllowlist.isPending} onClick={onAdd}>
            Add to allowlist
          </Button>
          {report && (
            <Alert
              type={report.errors.length > 0 ? "warning" : "success"}
              showIcon
              title={`Added ${report.added} · Skipped ${report.skipped}`}
              description={
                report.errors.length > 0 ? (
                  <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                    {report.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                ) : undefined
              }
            />
          )}
        </Space>
      </Card>

      <Card title={`Members (${roster.members.length})`}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={roster.members}
          pagination={false}
          locale={{ emptyText: "No members yet — add phones above or share the invite code." }}
        />
      </Card>
    </div>
  );
}
