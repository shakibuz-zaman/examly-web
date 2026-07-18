import { Progress, Skeleton, Tag, Typography } from "antd";
import { useAttemptTopics } from "../../api/student";
import type { StrengthRow } from "../../api/analytics";
import { nodeLabel } from "../analytics/StrengthMap";

function TopicRow({ row, indent = 0 }: { row: StrengthRow; indent?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 34%) 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "6px 4px",
        paddingLeft: 4 + indent * 18,
      }}
    >
      <div style={{ fontSize: 13, lineHeight: 1.3 }}>
        {nodeLabel(row)}
        {row.lowSample && <Tag style={{ marginLeft: 6, fontSize: 10 }}>কম নমুনা</Tag>}
        {row.peerAccuracy !== null && (
          <div style={{ fontSize: 11, color: "var(--ex-ink-faint)" }}>
            সহপাঠী: {row.peerAccuracy}%
          </div>
        )}
      </div>
      <Progress percent={row.accuracy} size="small" strokeColor="var(--ex-teal)" />
      <Typography.Text className="tnum" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
        {row.correct}/{row.attempted}
      </Typography.Text>
    </div>
  );
}

export function AttemptTopicStrip({
  attemptId,
  enabled,
}: {
  attemptId: string;
  enabled: boolean;
}) {
  const query = useAttemptTopics(attemptId, enabled);

  if (query.isLoading) return <Skeleton active paragraph={{ rows: 4 }} />;
  // Hide the strip entirely on error (404 foreign / 409 pre-reveal — the enabled
  // gate means pre-reveal never fetches) or when there is nothing to show.
  if (query.isError || !query.data || query.data.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <Typography.Title level={5} style={{ marginBottom: 8 }}>
        বিষয়ভিত্তিক নির্ভুলতা
      </Typography.Title>
      {query.data.map((subject) => (
        <div key={subject.nodeId ?? "uncategorized"}>
          <TopicRow row={subject} />
          {subject.subtopics.map((topic) => (
            <TopicRow key={topic.nodeId ?? "u"} row={topic} indent={1} />
          ))}
        </div>
      ))}
    </div>
  );
}
