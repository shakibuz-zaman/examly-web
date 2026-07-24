import { useState } from "react";
import { Alert, Button, Card, List, Segmented, Space, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { useCatalog } from "../api/student";
import { useActiveTrack } from "../features/tracks/TrackContext";
import { Chip } from "../components/Chip";
import { Illustration } from "../components/Illustration";
import { MyExamsList } from "./student/MyExamsList";
import { formatDateTime, formatDuration } from "../lib/format";
import { radii } from "../theme/tokens";
import type { CatalogItem } from "../api/types";
import type { CategoryNode } from "../api/categories";
import { PageContainer } from "../ui/PageContainer";

const PAGE_SIZE = 20;

type Segment = "store" | "mine";
type TypeFilter = "all" | "exam" | "model_test";
type PriceFilter = "all" | "free" | "paid";

function windowTag(item: CatalogItem) {
  if (!item.windowStartUtc || !item.windowEndUtc) {
    return <Tag color="green">যেকোনো সময়</Tag>;
  }
  const now = Date.now();
  if (now < new Date(item.windowStartUtc).getTime()) {
    return <Tag color="blue">শুরু {formatDateTime(item.windowStartUtc)}</Tag>;
  }
  if (now < new Date(item.windowEndUtc).getTime()) {
    return <Tag color="gold">চলছে · {formatDateTime(item.windowEndUtc)} পর্যন্ত</Tag>;
  }
  return <Tag>শেষ</Tag>;
}

function chipLabel(c: CategoryNode): string {
  return c.name.bn || c.name.en || c.slug;
}

export function StudentCatalogPage() {
  const [segment, setSegment] = useState<Segment>("store");
  const [page, setPage] = useState(1);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [liveOnly, setLiveOnly] = useState(false);
  const { collections, activeTrackId } = useActiveTrack();
  const navigate = useNavigate();

  // "সব" (all) is the default; a stale selection (after the active track changes)
  // falls back to all rather than filtering everything away.
  const activeCollection =
    collectionId && collections.some((c) => c.id === collectionId) ? collectionId : null;

  // The catalog is now filtered server-side; every filter query carries the active track.
  const { data, isLoading, isError, refetch } = useCatalog({
    trackId: activeTrackId ?? "",
    collectionId: activeCollection,
    type: typeFilter === "all" ? null : typeFilter,
    price: priceFilter === "all" ? null : priceFilter,
    live: liveOnly || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  // Any chip change re-queries from page 1.
  const selectCollection = (id: string | null) => {
    setCollectionId(id);
    setPage(1);
  };
  const selectType = (v: TypeFilter) => {
    setTypeFilter(v);
    setPage(1);
  };
  const selectPrice = (v: PriceFilter) => {
    setPriceFilter(v);
    setPage(1);
  };
  const toggleLive = () => {
    setLiveOnly((v) => !v);
    setPage(1);
  };
  const resetFilters = () => {
    setCollectionId(null);
    setTypeFilter("all");
    setPriceFilter("all");
    setLiveOnly(false);
    setPage(1);
  };

  const items = data?.items ?? [];
  // A non-default filter is active → an empty result is a filter miss, not an empty track.
  const filtersActive =
    activeCollection !== null || typeFilter !== "all" || priceFilter !== "all" || liveOnly;

  return (
    <PageContainer>
      <div>
        <Typography.Title level={3} style={{ color: "var(--ex-ink)" }}>
          মডেল টেস্ট
        </Typography.Title>

        <Segmented
          options={[
            { label: "স্টোর", value: "store" },
            { label: "আমার পরীক্ষা", value: "mine" },
          ]}
          value={segment}
          onChange={(v) => setSegment(v as Segment)}
          style={{ marginBottom: 16 }}
        />

        {segment === "mine" ? (
          <MyExamsList />
        ) : (
          <>
            {collections.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  paddingBottom: 8,
                  marginBottom: 8,
                }}
              >
                <Chip
                  label="সব"
                  selected={activeCollection === null}
                  onClick={() => selectCollection(null)}
                />
                {collections.map((c) => (
                  <Chip
                    key={c.id}
                    label={chipLabel(c)}
                    selected={activeCollection === c.id}
                    onClick={() => selectCollection(c.id)}
                  />
                ))}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 8,
                marginBottom: 8,
              }}
            >
              <Chip label="সব" selected={typeFilter === "all"} onClick={() => selectType("all")} />
              <Chip
                label="মডেল টেস্ট"
                selected={typeFilter === "model_test"}
                onClick={() => selectType("model_test")}
              />
              <Chip
                label="একক পরীক্ষা"
                selected={typeFilter === "exam"}
                onClick={() => selectType("exam")}
              />
              <Chip
                label="ফ্রি"
                selected={priceFilter === "free"}
                onClick={() => selectPrice(priceFilter === "free" ? "all" : "free")}
              />
              <Chip
                label="পেইড"
                selected={priceFilter === "paid"}
                onClick={() => selectPrice(priceFilter === "paid" ? "all" : "paid")}
              />
              <Chip label="লাইভ" selected={liveOnly} onClick={toggleLive} />
            </div>

            {isError ? (
              <Alert
                type="error"
                showIcon
                title="স্টোর লোড করা যায়নি"
                action={
                  <Button size="small" onClick={() => refetch()}>
                    আবার চেষ্টা করুন
                  </Button>
                }
              />
            ) : (
              <List
                loading={isLoading || activeTrackId == null}
                dataSource={items}
                locale={{
                  emptyText: filtersActive ? (
                    <div style={{ padding: "32px 0", textAlign: "center" }}>
                      <Typography.Paragraph style={{ color: "var(--ex-ink-soft)" }}>
                        এই ফিল্টারে কিছু পাওয়া যায়নি।
                      </Typography.Paragraph>
                      <Button type="link" onClick={resetFilters}>
                        সব দেখুন
                      </Button>
                    </div>
                  ) : (
                    <div style={{ padding: "32px 0", textAlign: "center" }}>
                      <Illustration name="empty" />
                      <Typography.Paragraph style={{ marginTop: 12, color: "var(--ex-ink-soft)" }}>
                        এই ট্র্যাকে এখনো কিছু নেই
                      </Typography.Paragraph>
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
                renderItem={(item) => (
                  <List.Item style={{ padding: 0, marginBottom: 12, border: "none" }}>
                    <Card
                      hoverable
                      style={{ width: "100%", borderRadius: radii.md }}
                      onClick={() =>
                        navigate(
                          item.kind === "exam"
                            ? `/student/exams/${item.id}`
                            : `/student/model-tests/${item.id}`,
                        )
                      }
                    >
                      <Space orientation="vertical" size={4} style={{ width: "100%" }}>
                        <Space wrap>
                          <Typography.Text strong>{item.title}</Typography.Text>
                          {item.kind === "model_test" && <Tag color="purple">মডেল টেস্ট</Tag>}
                          {item.priceBdt === 0 ? (
                            <Tag color="green">ফ্রি</Tag>
                          ) : (
                            <Tag color="gold">৳{item.priceBdt}</Tag>
                          )}
                          {item.mode === "live" && <Tag color="red">লাইভ</Tag>}
                          {item.mode === "archive" && <Tag>আর্কাইভ</Tag>}
                          {item.owned && <Tag color="cyan">কেনা আছে</Tag>}
                          {windowTag(item)}
                        </Space>
                        {item.orgName && (
                          <Typography.Text style={{ fontSize: 13, color: "var(--ex-ink-faint)" }}>
                            {item.orgName}
                          </Typography.Text>
                        )}
                        <Typography.Text type="secondary">
                          {item.kind === "model_test" ? `${item.examCount} exams · ` : ""}
                          {item.questionCount} questions · {formatDuration(item.durationMinutes)} ·{" "}
                          {item.totalMarks} marks
                        </Typography.Text>
                        {item.mode === "live" && item.registeredCount > 0 && (
                          <Typography.Text type="secondary">
                            {item.registeredCount} জন রেজিস্টার করেছে
                          </Typography.Text>
                        )}
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
