import { Card, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link } from "react-router-dom";
import type { WeakTopic } from "../../../api/examinerAnalytics";
import { nodeLabel } from "../StrengthMap";

const columns: ColumnsType<WeakTopic> = [
  {
    title: "Topic",
    key: "node",
    render: (_, r) => (
      <>
        {r.subjectName && (
          <Typography.Text type="secondary">
            {nodeLabel({ name: r.subjectName })} →{" "}
          </Typography.Text>
        )}
        {nodeLabel(r)}
      </>
    ),
  },
  { title: "Answers", dataIndex: "answers", width: 100, align: "right" },
  {
    title: "Error rate",
    dataIndex: "errorRate",
    width: 110,
    align: "right",
    render: (v: number) => `${v}%`,
  },
  {
    title: "In bank",
    dataIndex: "bankQuestionCount",
    width: 90,
    align: "right",
  },
  {
    title: "",
    key: "author",
    width: 130,
    render: (_, r) =>
      r.nodeId && r.subjectId ? (
        <Link to={`/questions?subjectId=${r.subjectId}&topicId=${r.nodeId}`}>Add questions</Link>
      ) : null,
  },
];

// Feeds question authoring (spec §6/§8): the link opens the bank pre-filtered
// to the weak topic. Untagged rows have no node to filter by — no link.
export function WeakestTopicsList({ rows }: { rows: WeakTopic[] }) {
  return (
    <Card title="Weakest topics (100+ answers)">
      {rows.length === 0 ? (
        <Typography.Text type="secondary">
          No topic has 100+ answers in this window yet.
        </Typography.Text>
      ) : (
        <Table size="small" rowKey={(r) => r.nodeId ?? "uncategorized"} columns={columns}
          dataSource={rows} pagination={false} scroll={{ x: true }} />
      )}
    </Card>
  );
}
