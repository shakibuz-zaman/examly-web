import { Link } from "react-router-dom";
import { Alert, Card, Spin, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { usePricing } from "../api/commerce";
import type { MatrixCell } from "../api/commerce";

const taka = (n: number) => `৳${n.toLocaleString("en-US")}`;

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

// Pivot the flat seat×exam cells into one row per seat slot, one column per exam slot.
function MatrixTable({ cells }: { cells: MatrixCell[] }) {
  const seatSlots = uniqueSorted(cells.map((c) => c.seatSlot));
  const examSlots = uniqueSorted(cells.map((c) => c.examSlot));
  const priceOf = (seat: number, exam: number) =>
    cells.find((c) => c.seatSlot === seat && c.examSlot === exam)?.priceBdt;

  type Row = { key: number; seat: number };
  const columns: ColumnsType<Row> = [
    {
      title: "সিট / পরীক্ষা",
      dataIndex: "seat",
      fixed: "left",
      render: (seat: number) => <strong>{seat}</strong>,
    },
    ...examSlots.map((exam) => ({
      title: `${exam} পরীক্ষা`,
      key: `exam-${exam}`,
      align: "right" as const,
      render: (_: unknown, row: Row) => {
        const p = priceOf(row.seat, exam);
        return p == null ? "—" : taka(p);
      },
    })),
  ];
  const data: Row[] = seatSlots.map((seat) => ({ key: seat, seat }));

  return (
    <Table<Row>
      size="small"
      columns={columns}
      dataSource={data}
      pagination={false}
      scroll={{ x: true }}
    />
  );
}

function StandaloneTable({ cells }: { cells: MatrixCell[] }) {
  const rows = [...cells].sort((a, b) => a.seatSlot - b.seatSlot);
  return (
    <Table
      size="small"
      pagination={false}
      rowKey={(r) => String(r.seatSlot)}
      dataSource={rows}
      columns={[
        { title: "সিট", dataIndex: "seatSlot", render: (v: number) => <strong>{v}</strong> },
        {
          title: "মূল্য",
          dataIndex: "priceBdt",
          align: "right",
          render: (v: number) => taka(v),
        },
      ]}
    />
  );
}

export function PricingPage() {
  const { data, isLoading, isError } = usePricing();

  return (
    <div style={{ maxWidth: 860, margin: "48px auto", padding: "0 16px" }}>
      <Typography.Title level={2}>মূল্য তালিকা</Typography.Title>
      <Typography.Paragraph type="secondary">
        প্রতিষ্ঠানের জন্য এককালীন সিট × পরীক্ষা প্যাকেজ — কোনো মাসিক সাবস্ক্রিপশন নেই। সিট = রোস্টারে
        শিক্ষার্থীর সংখ্যা, পরীক্ষা = বান্ডেলে পরীক্ষার সংখ্যা।
      </Typography.Paragraph>

      {isLoading && <Spin style={{ display: "block", margin: "48px auto" }} />}
      {isError && (
        <Alert type="error" showIcon title="মূল্য তালিকা লোড করা যায়নি। পরে আবার চেষ্টা করুন।" />
      )}

      {data && (
        <>
          <Card title="মডেল টেস্ট প্যাকেজ (একাধিক পরীক্ষা)" style={{ marginBottom: 20 }}>
            <MatrixTable cells={data.modelTestMatrix} />
          </Card>

          <Card title="একক পরীক্ষা (স্ট্যান্ডঅলোন)" style={{ marginBottom: 20 }}>
            <StandaloneTable cells={data.standalonePrices} />
          </Card>

          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            title="মার্কেটপ্লেস কমিশন: ২০% — গেটওয়ে ফি সহ"
            description="শিক্ষার্থীর কাছে সরাসরি বিক্রি হওয়া পেইড কনটেন্টে প্ল্যাটফর্ম ২০% কমিশন নেয় (পেমেন্ট গেটওয়ে ফি এর অন্তর্ভুক্ত)।"
          />
          <Alert
            type="success"
            showIcon
            title="ফ্রি কনটেন্ট সবসময় বিনামূল্যে — বিনামূল্যের পরীক্ষা ও মডেল টেস্টে কোনো কমিশন বা ফি নেই।"
          />

          <Typography.Paragraph style={{ marginTop: 24, textAlign: "center" }}>
            <Link to="/login">লগ ইন / শুরু করুন</Link>
          </Typography.Paragraph>
        </>
      )}
    </div>
  );
}
