import { Card, Skeleton, Tag, Typography } from "antd";
import { useState } from "react";
import { useStrength, useSubjectStrength, type StrengthRow } from "../../api/analytics";
import { bnNum } from "../../lib/bn";
import { bilingualLabel } from "../../lib/labels";
import type { AnalyticsFilters } from "./filters";
import { useChartColors } from "./chartTheme";

// One accuracy row: name, bar with peer tick, value. Reused by the drill below and by the
// examiner's attempt breakdown (the only external consumer) — it is a component, so
// exporting it beside StrengthMap needs no fast-refresh suppression.
export function StrengthBarRow({
  row, indent = 0, onClick,
}: { row: StrengthRow; indent?: number; onClick?: () => void }) {
  const chartColors = useChartColors();
  return (
    <div
      onClick={onClick}
      style={{
        display: "grid", gridTemplateColumns: "minmax(110px, 36%) 1fr 64px",
        gap: 10, alignItems: "center", padding: "6px 4px",
        paddingLeft: 4 + indent * 18, cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ fontSize: 13, lineHeight: 1.3 }}>
        {bilingualLabel(row.name)}
        {row.lowSample && <Tag style={{ marginLeft: 6, fontSize: 10 }}>আরও প্রশ্ন দরকার</Tag>}
        <div style={{ fontSize: 11, color: "#8c8c8c" }}>{bnNum(row.attempted)}টি প্রশ্ন</div>
      </div>
      <div style={{ position: "relative", height: 10, background: "#f5f5f5", borderRadius: "0 5px 5px 0" }}>
        <div style={{
          position: "absolute", inset: "0 auto 0 0", width: `${Math.max(0, row.accuracy)}%`,
          background: row.lowSample ? "#9ec5f4" : chartColors.you, borderRadius: "0 4px 4px 0",
        }} />
        {row.peerAccuracy !== null && (
          <div style={{
            position: "absolute", top: -3, bottom: -3, left: `${row.peerAccuracy}%`,
            width: 2, background: "#595959", borderRadius: 1,
          }} />
        )}
      </div>
      <div style={{ textAlign: "right", fontSize: 13, fontWeight: 600 }}>
        {bnNum(row.accuracy)}%
        {row.peerAccuracy !== null && (
          <div style={{ fontSize: 10, fontWeight: 400, color: "#8c8c8c" }}>সহপাঠী {bnNum(row.peerAccuracy)}%</div>
        )}
      </div>
    </div>
  );
}

export function StrengthMap({ filters }: { filters: AnalyticsFilters }) {
  const strength = useStrength(filters);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const drill = useSubjectStrength(filters, openSubject);

  return (
    <Card title="বিষয়ভিত্তিক সঠিকতা">
      {strength.isLoading ? (
        <Skeleton active />
      ) : (strength.data ?? []).length === 0 ? (
        <Typography.Text type="secondary">এই ফিল্টারে এখনো উত্তর দেওয়া কোনো প্রশ্ন নেই।</Typography.Text>
      ) : (
        <>
          {(strength.data ?? []).map((row) => (
            <div key={row.nodeId ?? "uncategorized"}>
              <StrengthBarRow
                row={row}
                onClick={row.nodeId ? () =>
                  setOpenSubject(openSubject === row.nodeId ? null : row.nodeId) : undefined}
              />
              {row.nodeId !== null && openSubject === row.nodeId && (
                <div style={{ borderLeft: "2px solid #f0f0f0", marginLeft: 8 }}>
                  {drill.isLoading && <Skeleton active paragraph={{ rows: 2 }} />}
                  {(drill.data ?? []).map((topic) => (
                    <div key={topic.nodeId ?? "uncat"}>
                      <StrengthBarRow row={topic} indent={1} />
                      {topic.subtopics.map((sub) => (
                        <StrengthBarRow key={sub.nodeId ?? "u"} row={sub} indent={2} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ▐ দাগ = একই প্রশ্নে সহপাঠীদের গড়। টপিক দেখতে বিষয়ে ট্যাপ করুন।
          </Typography.Text>
        </>
      )}
    </Card>
  );
}
