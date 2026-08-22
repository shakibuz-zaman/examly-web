import { bnNum } from "../lib/bn";
import { CONTENT_STATUS, DIFFICULTY } from "../lib/labels";
import { lookup } from "../lib/lookup";
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
  // The ✓ is a tint on the word, not a second fact: «কেনা আছে» already says owned, so the
  // glyph is decorative and would only add "check mark" to the announcement.
  if (owned)
    return (
      <span className="ex-chipstat ex-chipstat--owned">
        <span aria-hidden>✓</span> কেনা আছে
      </span>
    );
  if (priceBdt === 0) return <span className="ex-chipstat ex-chipstat--free">ফ্রি</span>;
  return <span className="ex-chipstat ex-chipstat--price">৳{bnNum(priceBdt)}</span>;
}

// §9 examiner content status. The union is the superset of three wire enums — questions and
// admin qbank papers ("draft" | "active" | "archived", types.ts:87/:699) and exams and model
// tests (ExamStatus, types.ts:151) — so every call site's own narrower status assigns to it,
// and a server that grows a fifth state fails at the call site instead of here.
export type ContentStatus = "draft" | "active" | "published" | "archived";

// Four tint classes, one per state, even though `--published` and `--free` resolve to the
// same two tokens today: a chip class is a *vocabulary* entry, not a colour alias. Sharing
// `--free` would mean re-tinting the price vocabulary silently re-tints exam status.
// No dot: the dot in TimeStatusChip separates chips that otherwise read alike in a dense
// catalog row; here the four Bengali labels are already distinct, and a same-colour dot in
// a 36px table cell is noise. Ink-on-tint measured (light / dark): draft 4.51 / 5.38,
// active 6.81 / 7.61, published 4.53 / 4.97, archived 5.70 / 7.52 — all AA on the card
// surface examiner tables paint on.
export function ContentStatusChip({ status }: { status: ContentStatus }) {
  // The prop is a closed union, but the wire is untyped JSON — `strict` (and with it
  // `strictNullChecks`) is ON under the pinned TypeScript 6, which types the boundary and
  // does not police what actually arrives at runtime. So an unknown status can still reach
  // here, and neutral tint plus the raw key beats an unstyled transparent chip with an empty
  // label. `lookup` (lib/lookup) is the prototype-key guard, not truthiness: CONTENT_STATUS
  // is a plain object literal, so a wire value like "constructor" resolves through
  // Object.prototype to a *function* — truthy, so it would pick an unstyled tint class and
  // then hand React a function as a child, which throws.
  const label = lookup(CONTENT_STATUS, status);
  return (
    <span className={`ex-chipstat ex-chipstat--${label ? status : "archived"}`}>
      {label ?? status}
    </span>
  );
}

// §9 money vocabulary (7g). The wallet ledger's entry kind and the payout queue's status,
// which were `<Tag color="green|blue|gold|red">` — antd presets that sit outside the token
// module entirely. Four steps, four readings: green came in, neutral went out, amber is still
// queued, coral went WRONG. Coral never means merely "this is a debit" — a routine withdrawal
// is not an alarm — which is why `--outflow` is the quiet one (ui.css records why it also
// carries `--price`'s hairline rather than a bare tint).
//
// It lives here beside ContentStatusChip rather than inside WalletPage because a money state
// is not wallet-private: the same four readings answer a seat purchase and an order line, and
// a second copy is how CONTENT_STATUS_COLORS drifted. Label is caller-supplied Bengali, as in
// TimeStatusChip — these are two different wire enums with no shared key space, so a map on
// the primitive would have to be keyed to `string` and would say nothing.
//
// Callers pass the NEUTRAL tone for a wire value they cannot read, never `queued`: the same
// rule ContentStatusChip's archived fallback records — an unknown value must assert nothing.
export type MoneyTone = "inflow" | "outflow" | "queued" | "danger";

export function MoneyChip({ tone, label }: { tone: MoneyTone; label: string }) {
  return <span className={`ex-chipstat ex-chipstat--${tone}`}>{label}</span>;
}

export type Difficulty = "easy" | "medium" | "hard";

// §9 difficulty cell: colour dot + the Bengali word. The dot is aria-hidden — it restates
// the label beside it, and the label is the fact AT reads. Colour alone never carries this.
export function DifficultyDot({ difficulty }: { difficulty: Difficulty }) {
  // Guarded for the same reason as ContentStatusChip above: DIFFICULTY is a plain object
  // literal, and a prototype key ("constructor") would otherwise reach React as a function
  // child. The dot needs no guard — an unmatched modifier class just falls back to the
  // ink-faint fill.
  const hit = lookup(DIFFICULTY, difficulty);
  return (
    <span className="ex-diffdot">
      <span className={`ex-diffdot-mark ex-diffdot-mark--${difficulty}`} aria-hidden />
      {hit ?? difficulty}
    </span>
  );
}

// §9 roster seat state (7g Task 3). Two states and no unknown branch, unlike MoneyChip and
// ContentStatusChip: this chip is driven by `claimedAt != null` on the wire, not by a string
// enum, so there is no value we could fail to read and nothing to fall back to. That is also
// why it owns its labels instead of taking them from the caller — one closed boolean, one
// pair of words, and a second surface that shows seat states gets the same two rather than
// inventing «দখলকৃত». Revoked is deliberately absent: revoking DELETES the roster row
// (SlotService.RevokeMemberAsync), so a revoked seat is a row that is gone, not a state.
export function SeatChip({ claimed }: { claimed: boolean }) {
  return claimed ? (
    <span className="ex-chipstat ex-chipstat--claimed">সিট নিয়েছে</span>
  ) : (
    <span className="ex-chipstat ex-chipstat--seat-pending">অপেক্ষমাণ</span>
  );
}
