import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link } from "react-router-dom";
import type { HardQuestion } from "../../../api/examinerAnalytics";
import { QuestionContentView } from "../../questions/QuestionContentView";

const FLAG_META: Record<string, { color: string; label: string }> = {
  possible_bad_key: { color: "red", label: "possible bad key" },
  possibly_confusing: { color: "orange", label: "possibly confusing" },
};

const columns: ColumnsType<HardQuestion> = [
  {
    title: "Question",
    key: "stem",
    render: (_, r) =>
      r.stemHtml ? (
        <div style={{ maxWidth: 420, maxHeight: 96, overflow: "hidden" }}>
          <QuestionContentView html={r.stemHtml} />
        </div>
      ) : (
        <Typography.Text type="secondary">{r.stemText}</Typography.Text>
      ),
  },
  {
    title: "Correct",
    dataIndex: "correctRate",
    width: 100,
    align: "right",
    render: (v: number) => `${v}%`,
  },
  {
    title: "Skipped",
    dataIndex: "skipRate",
    width: 100,
    align: "right",
    render: (v: number) => `${v}%`,
  },
  {
    title: "Flags",
    dataIndex: "flags",
    width: 200,
    render: (flags: string[]) =>
      flags.length === 0
        ? "—"
        : flags.map((f) => (
            <Tag key={f} color={FLAG_META[f]?.color ?? "default"}>
              {FLAG_META[f]?.label ?? f}
            </Tag>
          )),
  },
  {
    title: "",
    key: "edit",
    width: 70,
    render: (_, r) =>
      r.stemHtml ? <Link to={`/questions/${r.questionId}`}>Edit</Link> : null,
  },
];

export function HardestQuestionsTable({ rows }: { rows: HardQuestion[] }) {
  return (
    <Card title="Hardest questions (lowest correct-rate first)">
      <Table
        size="small"
        rowKey="questionId"
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: true }}
      />
    </Card>
  );
}
