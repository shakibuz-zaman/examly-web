import { bnNum } from "../lib/bn";
import { formatDateTime, formatDurationBn } from "../lib/format";
import { catalogStatus, timeStatusLabel } from "../lib/catalogStatus";
import { highlightText } from "../lib/highlight";
import { PillButton } from "./PillButton";
import { PriceChip, TimeStatusChip } from "./StatusChip";
import type { CatalogItem } from "../api/types";

// CTA per state (§6). চালিয়ে যান/progress is a recorded deviation — CatalogItem has
// no in-flight data; owned bundles get দেখুন, resume lives on হোম.
function cta(item: CatalogItem, status: ReturnType<typeof catalogStatus>) {
  const accessible = item.owned || item.priceBdt === 0;
  if (status === "live" && accessible) return { label: "যোগ দিন", variant: "primary" as const };
  if (status === "upcoming" && accessible) return { label: "রেজিস্টার করুন", variant: "tonal" as const };
  if (status === "ended") return { label: "দেখুন", variant: "outline" as const };
  if (!accessible) return { label: "বিস্তারিত", variant: "outline" as const };
  return { label: "শুরু করুন", variant: "tonal" as const };
}

export function TestCard({
  item,
  now,
  highlight,
  onOpen,
}: {
  item: CatalogItem;
  now: number;
  highlight?: string;
  onOpen: () => void;
}) {
  const status = catalogStatus(item, now);
  const accent =
    status === "live" ? "ex-testcard--accent-live"
    : status === "upcoming" ? "ex-testcard--accent-upcoming"
    : "";
  const action = cta(item, status);
  const metaParts = [
    ...(item.kind === "model_test" ? [`${bnNum(item.examCount)}টি পরীক্ষা`] : []),
    `${bnNum(item.questionCount)}টি প্রশ্ন`,
    formatDurationBn(item.durationMinutes),
    `${bnNum(item.totalMarks)} মার্কস`,
  ];
  const timeLabel =
    status === "upcoming" && item.windowStartUtc
      ? `শুরু ${formatDateTime(item.windowStartUtc)}`
      : timeStatusLabel(status);

  return (
    <article
      className={`ex-testcard ex-hover-lift ${accent}`.trim()}
      onClick={onOpen}
    >
      <div className="ex-testcard-chips">
        <TimeStatusChip status={status} label={timeLabel} />
        <PriceChip priceBdt={item.priceBdt} owned={item.owned} />
      </div>
      <h3 className="ex-testcard-title">{highlightText(item.title, highlight)}</h3>
      {item.orgName && (
        <div className="ex-testcard-org">{highlightText(item.orgName, highlight)}</div>
      )}
      <div className="ex-testcard-meta">{metaParts.join(" · ")}</div>
      <div className="ex-testcard-footer">
        <span className="ex-testcard-reg">
          {item.mode === "live" && item.registeredCount > 0
            ? `${bnNum(item.registeredCount)} জন রেজিস্টার করেছে`
            : ""}
        </span>
        <PillButton
          variant={action.variant}
          size="sm"
          onClick={(e) => {
            e.stopPropagation(); // same destination as the card — avoid double-fire
            onOpen();
          }}
        >
          {action.label}
        </PillButton>
      </div>
    </article>
  );
}
