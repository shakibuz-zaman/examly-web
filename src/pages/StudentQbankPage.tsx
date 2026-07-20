import { useState } from "react";
import { Alert, Button, Card, Pagination, Skeleton, Space, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { QBANK_PAPERS_PAGE_SIZE, useQbankPapers } from "../api/qbank";
import { useActiveTrack } from "../features/tracks/TrackContext";
import { Chip } from "../components/Chip";
import { Illustration } from "../components/Illustration";
import { bnNum } from "../lib/bn";
import { radii } from "../theme/tokens";
import type { CategoryNode } from "../api/categories";
import type { QbankPaperSummary } from "../api/types";

function chipLabel(c: CategoryNode): string {
  return c.name.bn || c.name.en || c.slug;
}

// Papers grouped by year, newest first, so the list reads like a shelf of past papers.
function groupByYear(papers: QbankPaperSummary[]): [number, QbankPaperSummary[]][] {
  const byYear = new Map<number, QbankPaperSummary[]>();
  for (const p of papers) {
    const bucket = byYear.get(p.year);
    if (bucket) bucket.push(p);
    else byYear.set(p.year, [p]);
  }
  return [...byYear.entries()].sort((a, b) => b[0] - a[0]);
}

export function StudentQbankPage() {
  const { activeTrackId, collections } = useActiveTrack();
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  // "সব" is the default; a stale selection (after the active track changes) falls
  // back to all rather than filtering everything away.
  const activeCollection =
    collectionId && collections.some((c) => c.id === collectionId) ? collectionId : null;

  const { data, isLoading, isError, refetch } = useQbankPapers(
    activeTrackId,
    activeCollection,
    null,
    page,
  );

  // activeTrackId null = tracks still resolving; the query is disabled, so show a skeleton.
  const loading = activeTrackId == null || isLoading;

  const papers = data?.items ?? [];
  const total = data?.total ?? 0;
  const groups = groupByYear(papers);
  // A collection chip is active and narrowed the list to nothing — distinct from a
  // truly-empty track.
  const isFilteredEmpty = activeCollection !== null && papers.length === 0;

  return (
    <div>
      <Typography.Title level={3} style={{ color: "var(--ex-ink)" }}>
        প্রশ্নব্যাংক
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
            onClick={() => {
              setCollectionId(null);
              setPage(1); // new filter → first page
            }}
          />
          {collections.map((c) => (
            <Chip
              key={c.id}
              label={chipLabel(c)}
              selected={activeCollection === c.id}
              onClick={() => {
                setCollectionId(c.id);
                setPage(1); // new filter → first page
              }}
            />
          ))}
        </div>
      )}

      {loading ? (
        <Skeleton active />
      ) : isError ? (
        <Alert
          type="error"
          showIcon
          title="প্রশ্নব্যাংক লোড করা যায়নি"
          action={
            <Button size="small" onClick={() => refetch()}>
              আবার চেষ্টা করুন
            </Button>
          }
        />
      ) : papers.length === 0 ? (
        isFilteredEmpty ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <Typography.Paragraph style={{ color: "var(--ex-ink-soft)" }}>
              এই ফিল্টারে কিছু পাওয়া যায়নি।
            </Typography.Paragraph>
            <Button type="link" onClick={() => setCollectionId(null)}>
              সব দেখুন
            </Button>
          </div>
        ) : (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <Illustration name="empty" />
            <Typography.Paragraph style={{ marginTop: 12, color: "var(--ex-ink-soft)" }}>
              এই ট্র্যাকে এখনো কোনো প্রশ্নব্যাংক নেই
            </Typography.Paragraph>
          </div>
        )
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {groups.map(([year, yearPapers]) => (
            <div key={year}>
              <Typography.Title level={5} style={{ marginTop: 0, color: "var(--ex-ink)" }}>
                {bnNum(year)} সাল
              </Typography.Title>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {yearPapers.map((paper) => (
                  <Card
                    key={paper.id}
                    hoverable
                    style={{ width: "100%", borderRadius: radii.md }}
                    onClick={() => navigate(`/student/qbank/papers/${paper.id}`)}
                  >
                    <Space orientation="vertical" size={4} style={{ width: "100%" }}>
                      <Typography.Text strong>{paper.title}</Typography.Text>
                      <Typography.Text type="secondary">
                        {bnNum(paper.questionCount)}টি প্রশ্ন
                      </Typography.Text>
                    </Space>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !isError && total > QBANK_PAPERS_PAGE_SIZE && (
        <Pagination
          style={{ marginTop: 20 }}
          align="center"
          current={page}
          pageSize={QBANK_PAPERS_PAGE_SIZE}
          total={total}
          showSizeChanger={false}
          onChange={(p) => setPage(p)}
        />
      )}
    </div>
  );
}
