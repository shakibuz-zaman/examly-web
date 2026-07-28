import { Card, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ExamTopicRow } from "../../../api/examinerAnalytics";
import { bilingualLabel } from "../../../lib/labels";

// antd renders an expand icon whenever the childrenColumnName key is present —
// even for an empty array — so leaf rows must carry undefined, not [].
type TreeRow = Omit<ExamTopicRow, "children"> & { children?: TreeRow[] };

const toTreeRow = (r: ExamTopicRow): TreeRow => ({
  ...r,
  children: r.children.length > 0 ? r.children.map(toTreeRow) : undefined,
});

const columns: ColumnsType<TreeRow> = [
  {
    title: "Subject / topic",
    key: "node",
    render: (_, r) => (
      <>
        {bilingualLabel(r.name)}
        {r.nodeId === null && <Tag style={{ marginLeft: 6, fontSize: 10 }}>untagged</Tag>}
      </>
    ),
  },
  { title: "Attempted", dataIndex: "attempted", width: 110, align: "right" },
  { title: "Correct", dataIndex: "correct", width: 100, align: "right" },
  {
    title: "Accuracy",
    dataIndex: "accuracy",
    width: 120,
    align: "right",
    sorter: (a, b) => a.accuracy - b.accuracy,
    render: (v: number) => `${v}%`,
  },
  {
    title: "Skipped",
    dataIndex: "skipRate",
    width: 100,
    align: "right",
    render: (v: number) => `${v}%`,
  },
];

// Mounted only once data is loaded (the tab renders a skeleton first), so
// defaultExpandAllRows sees the real rows on first mount.
export function TopicTreeTable({ rows }: { rows: ExamTopicRow[] }) {
  return (
    <Card title="Accuracy by topic (ranked first attempts)">
      <Table
        size="small"
        rowKey={(r) => r.nodeId ?? "uncategorized"}
        columns={columns}
        dataSource={rows.map(toTreeRow)}
        childrenColumnName="children"
        expandable={{ defaultExpandAllRows: true }}
        pagination={false}
        scroll={{ x: true }}
      />
    </Card>
  );
}
