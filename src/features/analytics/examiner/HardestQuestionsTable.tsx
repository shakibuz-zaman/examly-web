import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link } from "react-router-dom";
import type { HardQuestion } from "../../../api/examinerAnalytics";
import { QuestionContentView } from "../../questions/QuestionContentView";

// Both flags are the server's heuristics, not verdicts — the labels say «সম্ভাব্য»/«সম্ভবত»
// for that reason. Colour is decoration on top of a word that already carries the meaning.
const FLAG_META: Record<string, { color: string; label: string }> = {
  possible_bad_key: { color: "red", label: "সম্ভাব্য ভুল উত্তর-কি" },
  possibly_confusing: { color: "orange", label: "সম্ভবত বিভ্রান্তিকর" },
};

// D8: the two rate columns stay Western digits + `.ex-num`; headers and flags are Bengali.
const columns: ColumnsType<HardQuestion> = [
  {
    title: "প্রশ্ন",
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
    // «সঠিকতা», not «সঠিক»: this column is a RATE, and «সঠিক» is already the results table's
    // header for a COUNT of correct answers («সঠিক · ভুল · খালি»). Two different quantities
    // under one word, two clicks apart, is the collision worth spending three characters on.
    title: "সঠিকতা",
    dataIndex: "correctRate",
    width: 90,
    align: "right",
    className: "ex-num",
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
  {
    title: "ফ্ল্যাগ",
    dataIndex: "flags",
    width: 210,
    render: (flags: string[]) =>
      flags.length === 0
        ? "—"
        : flags.map((f) => (
            <Tag key={f} color={FLAG_META[f]?.color ?? "default"} style={{ marginBottom: 2 }}>
              {FLAG_META[f]?.label ?? f}
            </Tag>
          )),
  },
  {
    title: "",
    key: "edit",
    width: 70,
    // Same destination as before — the question editor for THIS question id. A row with no
    // stemHtml is a snapshot whose source question is gone, so there is nothing to open.
    render: (_, r) =>
      r.stemHtml ? <Link to={`/questions/${r.questionId}`}>এডিট</Link> : null,
  },
];

export function HardestQuestionsTable({ rows }: { rows: HardQuestion[] }) {
  return (
    <Card title="সবচেয়ে কঠিন প্রশ্ন (সঠিকতা কম থেকে বেশি)">
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
