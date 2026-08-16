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

// D8: the numeric columns keep Western digits + `.ex-num` (tabular numerals) — these are
// dense table data, not prose. Only the headers and the untagged badge are Bengali.
const columns: ColumnsType<TreeRow> = [
  {
    title: "টপিক",
    key: "node",
    render: (_, r) => (
      <>
        {bilingualLabel(r.name)}
        {/* The server's catch-all row for answers whose question carries no taxonomy node.
            «ট্যাগ নেই» is about the QUESTION's tagging, not about the student. */}
        {r.nodeId === null && <Tag style={{ marginLeft: 6, fontSize: 10 }}>ট্যাগ নেই</Tag>}
      </>
    ),
  },
  { title: "উত্তর", dataIndex: "attempted", width: 100, align: "right", className: "ex-num" },
  { title: "সঠিক", dataIndex: "correct", width: 90, align: "right", className: "ex-num" },
  {
    title: "সঠিকতা",
    dataIndex: "accuracy",
    width: 110,
    align: "right",
    className: "ex-num",
    sorter: (a, b) => a.accuracy - b.accuracy,
    render: (v: number) => `${v}%`,
  },
  {
    title: "খালি",
    dataIndex: "skipRate",
    width: 90,
    align: "right",
    className: "ex-num",
    render: (v: number) => `${v}%`,
  },
];

// Mounted only once data is loaded (the tab renders a skeleton first), so
// defaultExpandAllRows sees the real rows on first mount.
export function TopicTreeTable({ rows }: { rows: ExamTopicRow[] }) {
  return (
    <Card title="টপিকভিত্তিক সঠিকতা (র‍্যাঙ্কড প্রথম অ্যাটেম্পট)">
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
