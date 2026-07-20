import { useState } from "react";
import { Button, Card, List, Space, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { useCatalog } from "../api/student";
import { useActiveTrack } from "../features/tracks/TrackContext";
import { Illustration } from "../components/Illustration";
import { formatDateTime, formatDuration } from "../lib/format";
import { radii } from "../theme/tokens";
import type { CatalogItem } from "../api/types";
import type { CategoryNode } from "../api/categories";

const PAGE_SIZE = 20;

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

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={{
        flex: "0 0 auto",
        border: "1.5px solid",
        borderRadius: 999,
        padding: "5px 14px",
        fontSize: 14,
        cursor: "pointer",
        background: selected ? "var(--ex-teal-tint)" : "var(--ex-card)",
        borderColor: selected ? "var(--ex-teal)" : "var(--ex-line-strong)",
        color: selected ? "var(--ex-teal-ink)" : "var(--ex-ink)",
        fontWeight: selected ? 600 : 400,
        transition: "background .15s, border-color .15s",
      }}
    >
      {label}
    </button>
  );
}

export function StudentCatalogPage() {
  const [page, setPage] = useState(1);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const { collections, activeTrackId } = useActiveTrack();
  // Phase 8: the catalog is now track-scoped server-side. Task 14 replaces this page with the
  // full storefront; for now pass the active track and keep the existing client-side collection
  // chips (they narrow the fetched page as in 7a). The query is disabled until a track resolves.
  const { data, isLoading } = useCatalog({
    trackId: activeTrackId ?? "",
    page,
    pageSize: PAGE_SIZE,
  });
  const navigate = useNavigate();

  // "সব" (all) is the default; a stale selection (after the active track changes)
  // falls back to all rather than filtering everything away.
  const activeCollection =
    collectionId && collections.some((c) => c.id === collectionId) ? collectionId : null;

  // Selecting any chip (including "সব") resets pagination to page 1.
  const selectCollection = (id: string | null) => {
    setCollectionId(id);
    setPage(1);
  };

  const items = data?.items ?? [];
  // Phase-8 seam: client-side filter over the fetched page is plan-sanctioned for 7a;
  // server-side category filtering arrives with the Phase 8 storefront (the pagination
  // total intentionally reflects the unfiltered server total until then). The 7a catalog
  // fetch is not track-scoped server-side, so chips only narrow the current fetched page.
  const filtered = activeCollection
    ? items.filter((item) => item.categoryId === activeCollection)
    : items;

  // A chip other than "সব" is active and it filtered the fetched page down to nothing,
  // even though the unfiltered page has results — distinct from a truly-empty track.
  const isFilteredEmpty = activeCollection !== null && items.length > 0 && filtered.length === 0;

  return (
    <div>
      <Typography.Title level={3} style={{ color: "var(--ex-ink)" }}>
        মডেল টেস্ট
      </Typography.Title>

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

      <List
        loading={isLoading || activeTrackId == null}
        dataSource={filtered}
        locale={{
          emptyText: isFilteredEmpty ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <Typography.Paragraph style={{ color: "var(--ex-ink-soft)" }}>
                এই ফিল্টারে কিছু পাওয়া যায়নি।
              </Typography.Paragraph>
              <Button type="link" onClick={() => selectCollection(null)}>
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
              </Space>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
}
