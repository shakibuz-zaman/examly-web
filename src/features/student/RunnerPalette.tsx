import type { CSSProperties } from "react";
import { Typography } from "antd";
import { PaletteCell } from "../../components/PaletteCell";
import { bnNum } from "../../lib/bn";
import type { TakeSection } from "../../api/types";

export type PaletteState = {
  state: "notVisited" | "visitedUnanswered" | "answered" | "marked";
  answeredWhileMarked: boolean;
};

type RunnerPaletteProps = {
  sections: TakeSection[];
  states: Map<string, PaletteState>;
  currentIndex: number;
  onJump: (flatIndex: number) => void;
};

const LEGEND: { swatch: CSSProperties; label: string }[] = [
  { swatch: { background: "var(--ex-green)" }, label: "উত্তর দেওয়া" },
  {
    swatch: { background: "var(--ex-coral-tint)", border: "1px solid var(--ex-coral)" },
    label: "দেখা, উত্তর নেই",
  },
  { swatch: { background: "var(--ex-purple)" }, label: "চিহ্নিত" },
  {
    swatch: { background: "var(--ex-stage)", border: "1px solid var(--ex-line)" },
    label: "দেখা হয়নি",
  },
];

const NOT_VISITED: PaletteState = { state: "notVisited", answeredWhileMarked: false };

export function RunnerPalette({ sections, states, currentIndex, onJump }: RunnerPaletteProps) {
  // Continuous numbering across sections — same convention as the runner page.
  const offsets = sections.reduce<number[]>((acc, _s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + sections[i - 1].questions.length);
    return acc;
  }, []);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px" }}>
        {LEGEND.map((item) => (
          <span
            key={item.label}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span style={{ width: 12, height: 12, borderRadius: 4, ...item.swatch }} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {item.label}
            </Typography.Text>
          </span>
        ))}
      </div>
      {sections.map((section, sIndex) => (
        <div key={sIndex} style={{ marginTop: 14 }}>
          {(section.title || sections.length > 1) && (
            <Typography.Text
              strong
              style={{ display: "block", fontSize: 13, marginBottom: 8 }}
            >
              {section.title ?? `সেকশন ${bnNum(sIndex + 1)}`}
            </Typography.Text>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))",
              gap: 8,
            }}
          >
            {section.questions.map((question, qIndex) => {
              const flatIndex = offsets[sIndex] + qIndex;
              const ps = states.get(question.questionId) ?? NOT_VISITED;
              return (
                <PaletteCell
                  key={question.questionId}
                  number={flatIndex + 1}
                  state={ps.state}
                  answeredWhileMarked={ps.answeredWhileMarked}
                  current={flatIndex === currentIndex}
                  onClick={() => onJump(flatIndex)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
