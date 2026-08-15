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
  buy,
}: {
  title: string;
  back: { to: string; label: string };
  org: string | null;
  // «৫টি পরীক্ষা» / «৫০টি প্রশ্ন» — never empty, so the subtitle line is always present:
  // HeroBand drops a falsy subtitle, and an org-less product would otherwise sit a line
  // shorter than its sibling page.
  count: string;
  listing: ListingInfo;
  // Present only while the listing is buyable; the page owns that condition and the
  // handler (the CheckoutSheet chain), the band owns only the placement.
  buy?: { priceBdt: number; onClick: () => void };
}) {
  return (
    <HeroBand
      title={title}
      subtitle={org ? `${org} · ${count}` : count}
      back={back}
      // The CTA replaces the chip rather than joining it: «৳১২০ — কিনুন» already states the
      // price, so a chip beside it says the same number twice and costs ~60px of a 375px
      // titlerow. Chip-only when there is nothing to buy — it is then the sole carrier of
      // ownership / ফ্রি / price, one vocabulary with the store cards (not the old
      // `owned && priceBdt > 0` Tag). On the band ui.css swaps every chip variant's tint
      // surface for --ex-band-cta, which is what keeps it legible on the teal.
      actions={
        <div className="ex-heroband-actions">
          {buy ? (
            <BuyCta inBand {...buy} />
          ) : (
            <PriceChip priceBdt={listing.priceBdt} owned={listing.owned} />
          )}
        </div>
      }
    />
  );
}

// In the band since `.ex-btn--band` exists (spec §5.1): primary/tonal both collapse into the
// gradient, the band variant does not. `inBand` so a content-column caller still gets the
// primary pill. Shared so the price format and «কিনুন» live in one place across the two
// pages; the purchase flow behind onClick is untouched.
export function BuyCta({
  priceBdt,
  onClick,
  inBand,
}: {
  priceBdt: number;
  onClick: () => void;
  inBand?: boolean;
}) {
  return (
    <PillButton variant={inBand ? "band" : "primary"} onClick={onClick}>
      ৳{bnNum(priceBdt)} — কিনুন
    </PillButton>
  );
}
