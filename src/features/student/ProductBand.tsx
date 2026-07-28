import { bnNum } from "../../lib/bn";
import { HeroBand } from "../../ui/HeroBand";
import { PillButton } from "../../ui/PillButton";
import { PriceChip } from "../../ui/StatusChip";
import type { ListingInfo } from "../../api/types";

// §5.1 (D13): the shared chrome of the two product pages — মডেল টেস্ট ডিটেইল and এক্সাম লবি.
// A thin composition over HeroBand rather than a second band, so the gradient, the
// compact-app-bar sentinel and the band's white focus rings keep one implementation.
// Renders full-bleed like HeroBand, so pages place it OUTSIDE PageContainer.
export function ProductBand({
  title,
  back,
  org,
  count,
  listing,
}: {
  title: string;
  back: { to: string; label: string };
  org: string | null;
  // «৫টি পরীক্ষা» / «৫০টি প্রশ্ন» — never empty, so the subtitle line is always present:
  // HeroBand drops a falsy subtitle, and an org-less product would otherwise sit a line
  // shorter than its sibling page.
  count: string;
  listing: ListingInfo;
}) {
  return (
    <HeroBand
      title={title}
      subtitle={org ? `${org} · ${count}` : count}
      back={back}
      // PriceChip, not the old `owned && priceBdt > 0` Tag: ownership, ফ্রি and the price
      // are one vocabulary with the store cards, and every variant brings its own light
      // surface, which is what keeps it legible on the teal band.
      actions={<PriceChip priceBdt={listing.priceBdt} owned={listing.owned} />}
    />
  );
}

// Deliberately NOT in the band: --ex-band-from IS --ex-teal in light mode, so a primary
// pill on the band would be teal on teal, and the tonal variant collapses the same way in
// dark (--ex-teal-tint === --ex-band-from there). It sits in the content column instead,
// where primary holds its contrast in both modes. Shared so the price format and «কিনুন»
// live in one place across the two pages; the purchase flow behind onClick is untouched.
export function BuyCta({ priceBdt, onClick }: { priceBdt: number; onClick: () => void }) {
  return (
    <PillButton variant="primary" onClick={onClick}>
      ৳{bnNum(priceBdt)} — কিনুন
    </PillButton>
  );
}
