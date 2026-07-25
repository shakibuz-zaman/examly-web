import { bnNum } from "../lib/bn";
import type { TimeStatus } from "../lib/catalogStatus";

// §3.4 time-status chip: tint bg + dot + ink. Label is caller-supplied Bengali.
export function TimeStatusChip({ status, label }: { status: TimeStatus; label: string }) {
  return (
    <span className={`ex-chipstat ex-chipstat--${status}`}>
      <span className="ex-chipstat-dot" aria-hidden />
      {label}
    </span>
  );
}

// §3.4 price/ownership chip: ownership wins over price.
export function PriceChip({ priceBdt, owned }: { priceBdt: number; owned: boolean }) {
  if (owned) return <span className="ex-chipstat ex-chipstat--owned">✓ কেনা আছে</span>;
  if (priceBdt === 0) return <span className="ex-chipstat ex-chipstat--free">ফ্রি</span>;
  return <span className="ex-chipstat ex-chipstat--price">৳{bnNum(priceBdt)}</span>;
}
