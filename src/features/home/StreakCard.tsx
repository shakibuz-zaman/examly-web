import { bnNum } from "../../lib/bn";
import { PillButton } from "../../ui/PillButton";
import type { HomeStreak } from "../../api/types";

// §8 হোম streak card. It floats over the hero band edge (the page wraps it in
// .ex-band-overlap), so the surface carries shadow-2 rather than the card default.
export function StreakCard({
  streak,
  onRepair,
  repairing,
}: {
  streak: HomeStreak | null;
  onRepair: () => void;
  repairing?: boolean;
}) {
  // The API always sends the block in 7b; the null guard is only for the frozen seam.
  if (!streak) return null;

  // Server-computed (repair window is a server concern) — the card stays pure: no
  // dayjs()/Date.now() in render, so it renders identically for a given prop.
  const repairable = streak.repairable;

  const coveredCount = streak.last7.filter((s) => s === "covered").length;
  const activeCount = streak.last7.filter((s) => s === "active").length;

  return (
    <div className="ex-card ex-streakcard">
      <span aria-hidden style={{ fontSize: 18 }}>🔥</span>
      <div className="ex-streakcard-main">
        <div className="ex-streakcard-title">{bnNum(streak.current)} দিনের স্ট্রিক</div>
        {/* role="img" is what makes the label reachable: on a bare <div> (role=generic)
            aria-label is dropped, and the seven bars are empty <span>s with no text.
            The label now carries the covered days too — the bars distinguish three states
            by pattern, and nothing else on the card says how many days were held rather
            than earned. */}
        <div
          className="ex-streakbars"
          role="img"
          aria-label={
            coveredCount > 0
              ? `গত ৭ দিনে ${bnNum(activeCount)} দিন সক্রিয়, ${bnNum(coveredCount)} দিন ফ্রিজে ঢাকা`
              : `গত ৭ দিনে ${bnNum(activeCount)} দিন সক্রিয়`
          }
        >
          {/* last7 is always exactly 7 entries, oldest→newest (API contract), and never
              reorders — the index is a stable identity here. */}
          {streak.last7.map((state, i) => (
            <span
              key={i}
              className={
                state === "active" ? "ex-streakbar is-active"
                  : state === "covered" ? "ex-streakbar is-covered"
                  : "ex-streakbar"
              }
            />
          ))}
        </div>
        {repairable && (
          <div className="ex-streakcard-hint">
            আজ ২টি প্র্যাকটিস সেশন শেষ করলে স্ট্রিক ফিরে আসবে
          </div>
        )}
      </div>
      {streak.freezesBanked > 0 && (
        <span className="ex-chipstat ex-chipstat--upcoming">
          <span aria-hidden>❄</span> ফ্রিজ {bnNum(streak.freezesBanked)}
        </span>
      )}
      {repairable && (
        // PillButton has no antd `loading` spinner, so the label carries the pending
        // state; `disabled` keeps exactly the double-submit guard the antd Button had.
        <PillButton variant="tonal" size="sm" disabled={repairing} onClick={onRepair}>
          {repairing ? "শুরু হচ্ছে…" : "স্ট্রিক ফিরিয়ে আনুন"}
        </PillButton>
      )}
    </div>
  );
}
