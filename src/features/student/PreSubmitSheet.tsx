import { Button, Drawer, Grid, Modal, Statistic, Typography } from "antd";
import { RunnerPalette, type PaletteState } from "./RunnerPalette";
import { bnNum } from "../../lib/bn";
import type { TakeSection } from "../../api/types";

type PreSubmitSheetProps = {
  open: boolean;
  counts: { unanswered: number; flagged: number; answered: number };
  sections: TakeSection[];
  states: Map<string, PaletteState>;
  onJump: (flatIndex: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
};

const TITLE = "উত্তরপত্র জমা দেবেন?";

export function PreSubmitSheet({
  open,
  counts,
  sections,
  states,
  onJump,
  onConfirm,
  onCancel,
  loading,
}: PreSubmitSheetProps) {
  const isDesktop = Grid.useBreakpoint().md;

  // Jump-back is the whole point (spec §6.3): landing on a question closes the sheet.
  function handleJump(flatIndex: number) {
    onCancel();
    onJump(flatIndex);
  }

  const body = (
    <div>
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          padding: "4px 0 12px",
        }}
      >
        <Statistic title="উত্তর দেওয়া" value={bnNum(counts.answered)} />
        <Statistic title="অনুত্তরিত" value={bnNum(counts.unanswered)} />
        <Statistic title="চিহ্নিত" value={bnNum(counts.flagged)} />
      </div>
      {counts.unanswered > 0 && (
        <Typography.Text style={{ display: "block", color: "var(--ex-coral)", marginBottom: 12 }}>
          {bnNum(counts.unanswered)}টি প্রশ্ন অনুত্তরিত।
        </Typography.Text>
      )}
      <RunnerPalette sections={sections} states={states} currentIndex={-1} onJump={handleJump} />
    </div>
  );

  const footer = (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
      <Button onClick={onCancel}>ফিরে যাই</Button>
      <Button type="primary" loading={loading} onClick={onConfirm}>
        জমা দিন
      </Button>
    </div>
  );

  if (isDesktop) {
    return (
      <Modal open={open} title={TITLE} onCancel={onCancel} footer={footer} destroyOnHidden>
        {body}
      </Modal>
    );
  }

  return (
    <Drawer
      placement="bottom"
      size="70%"
      open={open}
      onClose={onCancel}
      title={TITLE}
      footer={footer}
    >
      {body}
    </Drawer>
  );
}
