import { message } from "antd";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { bnNum } from "../../lib/bn";
import { formatDhakaShortBn } from "../../lib/format";
import { useRegister } from "../../api/commerce";
import { EmptyState } from "../../ui/EmptyState";
import { PillButton } from "../../ui/PillButton";
import { TimeStatusChip } from "../../ui/StatusChip";
import type { HomeLiveItem } from "../../api/types";

function lobbyPath(item: HomeLiveItem): string {
  return item.kind === "exam"
    ? `/student/exams/${item.id}`
    : `/student/model-tests/${item.id}`;
}

function LiveCard({ item }: { item: HomeLiveItem }) {
  const navigate = useNavigate();
  const register = useRegister();
  const isLive = item.state === "live";
  const goToLobby = () => navigate(lobbyPath(item));

  // One-tap register only where the listing (and price) is known. A null listing/price is a
  // public-default rail item — it carries no commercial affordance.
  const isFree = item.priceBdt === 0;
  const isPaid = item.priceBdt != null && item.priceBdt > 0;

  function onRegister(e: React.MouseEvent) {
    e.stopPropagation();
    if (!item.listingId) return;
    register.mutate(item.listingId, {
      onError: (err) => {
        const msg = err instanceof AxiosError ? err.response?.data?.error : undefined;
        message.error(msg ?? "রেজিস্টার করা যায়নি");
      },
    });
  }

  // Title button and price CTA share the container's destination; stopPropagation keeps
  // one press to one navigation now that the container's onClick is mouse-only.
  function open(e: React.MouseEvent) {
    e.stopPropagation();
    goToLobby();
  }

  // Dhaka-pinned Bengali datetime — dayjs().format("D MMM…") rendered an English month
  // in the *browser's* timezone, which is wrong on both counts (§3.1).
  const startsAt = formatDhakaShortBn(item.windowStartUtc);

  return (
    // Plain container, NOT role="button": this card owns two real controls (the title
    // and the CTA) and ARIA 1.2's children-presentational rule would flatten them out
    // of the a11y tree. onClick is mouse convenience; the title <button> is the
    // keyboard/AT stop. (This replaces the role="button"-wrapping-a-button defect the
    // 7c follow-ups flagged here.)
    <div
      className={isLive ? "ex-livecard ex-livecard--live" : "ex-livecard ex-livecard--upcoming"}
      onClick={goToLobby}
    >
      <div className="ex-livecard-chips">
        <TimeStatusChip
          status={isLive ? "live" : "upcoming"}
          label={isLive ? "লাইভ চলছে" : "আসছে"}
        />
        {/* Hand-rolled twin of PriceChip's owned chip (same classes, same decorative ✓);
            the duplication is a follow-up, the aria-hidden is not. */}
        {item.registered && (
          <span className="ex-chipstat ex-chipstat--owned">
            <span aria-hidden>✓</span> রেজিস্টার্ড
          </span>
        )}
      </div>
      <button type="button" className="ex-livecard-title ex-cardtitle-btn" onClick={open}>
        {item.title}
      </button>
      <div className="ex-livecard-meta">
        {item.orgName ? `${item.orgName} · ${startsAt}` : startsAt}
      </div>
      {item.registeredCount > 0 && (
        <div className="ex-livecard-meta">{bnNum(item.registeredCount)} জন রেজিস্টার করেছে</div>
      )}
      {!item.registered && item.listingId && isFree && (
        <PillButton
          className="ex-livecard-cta"
          variant="tonal"
          size="sm"
          disabled={register.isPending}
          onClick={onRegister}
        >
          {register.isPending ? "রেজিস্টার হচ্ছে…" : "রেজিস্টার"}
        </PillButton>
      )}
      {!item.registered && item.listingId && isPaid && (
        // Stays a real button, not a PriceChip: this is the paywall's tap target into
        // the lobby, and the price is its label. (`!` — isPaid is the null check, but
        // it's an aliased boolean, which TS doesn't carry into the narrowing here.)
        <PillButton className="ex-livecard-cta" variant="primary" size="sm" onClick={open}>
          ৳{bnNum(item.priceBdt!)}
        </PillButton>
      )}
    </div>
  );
}

export function LiveRail({ items }: { items: HomeLiveItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        variant="empty"
        message="এই ট্র্যাকে এখন কোনো লাইভ পরীক্ষা নেই"
        actionLabel="মডেল টেস্ট দেখুন"
        actionTo="/student/tests"
      />
    );
  }
  return (
    <div className="ex-rail">
      {items.map((item) => (
        <LiveCard key={`${item.kind}-${item.id}`} item={item} />
      ))}
    </div>
  );
}
