import { useState } from "react";
import { Alert, Button, Card, Input, List, Space, Tag, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useClaimSeat, useMyExams } from "../../api/commerce";
import { Illustration } from "../../components/Illustration";
import { radii } from "../../theme/tokens";
import type { MyExamItem } from "../../api/types";

const PAGE_SIZE = 20;

// How a live entitlement was granted (Entitlement.Source).
function sourceTag(source: string) {
  if (source === "purchase") return <Tag color="gold">কেনা</Tag>;
  if (source === "seat") return <Tag color="blue">সিট</Tag>;
  return <Tag color="green">ফ্রি</Tag>; // free_claim
}

// Bundles carry per-member state, so they just deep-link ("দেখুন"); single exams
// surface the runtime action for the student's own latest attempt.
function ctaFor(item: MyExamItem): { label: string; to: string } {
  if (item.productType === "model_test") {
    return { label: "দেখুন", to: `/student/model-tests/${item.productId}` };
  }
  const status = item.latestAttemptStatus;
  const label = status == null ? "শুরু করুন" : status === "in_progress" ? "চালিয়ে যান" : "রিভিউ";
  return { label, to: `/student/exams/${item.productId}` };
}

// B2B seat claim by invite code; reused in the header and the empty state. The hook
// invalidates the ownership seam on success, so a claimed exam appears here immediately.
function ClaimSeatForm() {
  const [code, setCode] = useState("");
  const claim = useClaimSeat();
  const submit = () => {
    const trimmed = code.trim();
    if (!trimmed || claim.isPending) return;
    claim.mutate(trimmed, {
      onSuccess: () => {
        message.success("পরীক্ষায় যোগ দেওয়া হয়েছে");
        setCode("");
      },
      onError: (e: unknown) => {
        const err = e as { response?: { data?: { error?: string } } };
        message.error(err.response?.data?.error ?? "কোড যাচাই করা যায়নি");
      },
    });
  };
  return (
    <Input.Search
      value={code}
      onChange={(e) => setCode(e.target.value)}
      onSearch={submit}
      placeholder="ইনভাইট কোড"
      enterButton="কোড দিয়ে যোগ দিন"
      loading={claim.isPending}
      style={{ maxWidth: 380 }}
    />
  );
}

export function MyExamsList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useMyExams(page, PAGE_SIZE);
  const navigate = useNavigate();
  const items = data?.items ?? [];

  if (isError) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <ClaimSeatForm />
        </div>
        <Alert
          type="error"
          showIcon
          title="আপনার পরীক্ষা লোড করা যায়নি"
          action={
            <Button size="small" onClick={() => refetch()}>
              আবার চেষ্টা করুন
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <ClaimSeatForm />
      </div>
      <List
        loading={isLoading}
        dataSource={items}
        locale={{
          emptyText: (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <Illustration name="empty" />
              <Typography.Paragraph style={{ marginTop: 12, color: "var(--ex-ink-soft)" }}>
                আপনি এখনো কোনো পরীক্ষা কেনেননি বা যোগ দেননি
              </Typography.Paragraph>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                <ClaimSeatForm />
              </div>
            </div>
          ),
        }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.total ?? 0,
          onChange: setPage,
          hideOnSinglePage: true,
        }}
        renderItem={(item) => {
          const cta = ctaFor(item);
          return (
            <List.Item style={{ padding: 0, marginBottom: 12, border: "none" }}>
              <Card style={{ width: "100%", borderRadius: radii.md }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <Space orientation="vertical" size={4} style={{ flex: 1, minWidth: 0 }}>
                    <Space wrap>
                      <Typography.Text strong>{item.title}</Typography.Text>
                      {sourceTag(item.source)}
                    </Space>
                    {item.orgName && (
                      <Typography.Text style={{ fontSize: 13, color: "var(--ex-ink-faint)" }}>
                        {item.orgName}
                      </Typography.Text>
                    )}
                    {item.examCount > 1 && (
                      <Typography.Text type="secondary">{item.examCount}টি পরীক্ষা</Typography.Text>
                    )}
                  </Space>
                  <Button type="primary" onClick={() => navigate(cta.to)}>
                    {cta.label}
                  </Button>
                </div>
              </Card>
            </List.Item>
          );
        }}
      />
    </div>
  );
}
