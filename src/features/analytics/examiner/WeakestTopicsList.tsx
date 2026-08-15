import { Card, Skeleton, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link } from "react-router-dom";
import type { WeakTopic } from "../../../api/examinerAnalytics";
import { bilingualLabel } from "../../../lib/labels";

// Counts and rates stay Western with tabular figures (.ex-num, D8 table-data class) — they
// are scanned down a column, not read as prose. The Bengali numerals on this surface live in
// the chrome around the table (the card title's «১০০+», the empty copy).
const columns: ColumnsType<WeakTopic> = [
  {
    title: "টপিক",
    key: "node",
    render: (_, r) => (
      <>
        {r.subjectName && (
          <Typography.Text type="secondary">
            {bilingualLabel(r.subjectName)} →{" "}
          </Typography.Text>
        )}
        {bilingualLabel(r.name)}
      </>
    ),
  },
  { title: "উত্তর", dataIndex: "answers", width: 100, align: "right", className: "ex-num" },
  {
    title: "ভুলের হার",
    dataIndex: "errorRate",
    width: 110,
    align: "right",
    className: "ex-num",
    render: (v: number) => `${v}%`,
  },
  {
    title: "ব্যাংকে",
    dataIndex: "bankQuestionCount",
    width: 90,
    align: "right",
    className: "ex-num",
  },
  {
    title: "",
    key: "author",
    width: 130,
    render: (_, r) =>
      r.nodeId && r.subjectId ? (
        <Link to={`/questions?subjectId=${r.subjectId}&topicId=${r.nodeId}`}>প্রশ্ন যোগ করুন</Link>
      ) : null,
  },
];

// Feeds question authoring (spec §6/§8): the link opens the bank pre-filtered
// to the weak topic. Untagged rows have no node to filter by — no link.
//
// `stale` = the org query is serving keepPreviousData, and it gates the EMPTY branch only.
// «কোনো টপিকে ১০০+ উত্তর জমা পড়েনি» is a claim about the filters in the chips, but held rows
// belong to the filters before the change; the copy is achromatic, so the page's saturate()
// cue cannot mark it. A populated table may go stale-and-desaturated; emptiness waits.
export function WeakestTopicsList({ rows, stale }: { rows: WeakTopic[]; stale: boolean }) {
  return (
    <Card title="সবচেয়ে দুর্বল টপিক (১০০+ উত্তর)">
      {rows.length === 0 ? (
        stale ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : (
          <Typography.Text type="secondary">
            এই সময়সীমায় এখনো কোনো টপিকে ১০০+ উত্তর জমা পড়েনি।
          </Typography.Text>
        )
      ) : (
        <Table size="small" rowKey={(r) => r.nodeId ?? "uncategorized"} columns={columns}
          dataSource={rows} pagination={false} scroll={{ x: true }} />
      )}
    </Card>
  );
}
