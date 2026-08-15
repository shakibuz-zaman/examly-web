import { useCallback, useSyncExternalStore } from "react";
import { NavLink } from "react-router-dom";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { EXAMINER_NAV, ROLE_LABEL, isVisibleToRole } from "./examinerNav";
import { useAuth } from "../auth/useAuth";
import { useMyOrg } from "../api/me";
import { bnNum } from "../lib/bn";
import type { QuestionListResponse } from "../api/types";
import type { WalletResponse } from "../api/commerce";

// D6: badges read whatever the pages already put in the cache and NEVER fetch — no
// useQuery, no observer, no queryFn. Prefix-match because both source keys carry page
// params: ["questions","list",filters] and ["commerce","wallet",page,pageSize].
//
// Upper bound across every cached list query, not the first hit. Both callers of
// useQuestions cache under this prefix and both can narrow: QuestionsListPage passes the
// user's filters, and QuestionPickerDrawer always pins status:"active" plus subject/topic.
// First-hit would therefore let whichever query happened to land in the cache first — the
// exam builder's subject subtotal, say — pin the badge low for the rest of the session.
// Since a filter can only ever narrow the set, the max is insertion-order independent and
// converges on the org total as soon as any broad list is fetched.
function readQuestionsBadge(qc: QueryClient): string | null {
  const totals = qc
    .getQueriesData<QuestionListResponse>({ queryKey: ["questions", "list"] })
    .map(([, d]) => d?.total)
    .filter((t) => typeof t === "number");
  return totals.length > 0 ? bnNum(Math.max(...totals)) : null;
}

// WalletResponse's field is `balance` (BDT); there is no balanceBdt on the wire type.
// Rounded and grouped: the 20% B2C commission produces fractional balances by
// construction, and an ungrouped six-figure balance overflows the 11px pill. bnNum maps
// digit characters only, so the separators toLocaleString inserts survive it.
function readWalletBadge(qc: QueryClient): string | null {
  const hit = qc
    .getQueriesData<WalletResponse>({ queryKey: ["commerce", "wallet"] })
    .map(([, d]) => d?.balance)
    .find((b) => typeof b === "number");
  return typeof hit === "number" ? `৳${bnNum(Math.round(hit).toLocaleString("en-US"))}` : null;
}

// getQueriesData is a plain read, so a bare call would render once and then never update
// when the user first visits প্রশ্ন and the cache fills. Subscribing to the QueryCache
// makes the read reactive without creating an observer (an observer would be entitled to
// fetch). The snapshot is a string|null, so the Object.is check inside
// useSyncExternalStore drops every unrelated cache event without a re-render.
function useCachedBadge(read: (qc: QueryClient) => string | null): string | null {
  const qc = useQueryClient();
  const subscribe = useCallback((onChange: () => void) => qc.getQueryCache().subscribe(onChange), [qc]);
  const snapshot = useCallback(() => read(qc), [qc, read]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function ExaminerSidebar({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const { data: org } = useMyOrg();
  // Hooks stay in static order: both badges are computed once here and picked by
  // item.badge in the loop below — never called per nav item.
  const questionsBadge = useCachedBadge(readQuestionsBadge);
  const walletBadge = useCachedBadge(readWalletBadge);

  const groups = EXAMINER_NAV.filter((g) => isVisibleToRole(g, role));
  const roleLabel = ROLE_LABEL[role] ?? role;
  // Admins are org-less; collapsed with no org the footer would be an empty strip.
  const showFoot = !!org || !collapsed;
  // Spread, not slice(0,1): a name opening on an astral char would split its surrogate pair.
  const orgInitial = org ? [...org.name.trim()][0] : undefined;

  return (
    <nav
      className={`ex-sidenav${collapsed ? " ex-sidenav--collapsed" : ""}`}
      aria-label="মূল নেভিগেশন"
    >
      <div className="ex-sidenav-scroll">
        {groups.map((group) => (
          // role="group" + aria-label keeps the grouping legible to AT in the collapsed
          // rail, where the visible overline is display:none.
          <div className="ex-sidenav-group" key={group.label} role="group" aria-label={group.label}>
            <div className="ex-sidenav-overline" aria-hidden>
              {group.label}
            </div>
            {group.items.map((item) => {
              const badge =
                item.badge === "questions"
                  ? questionsBadge
                  : item.badge === "wallet"
                    ? walletBadge
                    : null;
              // Bare, the badge joins the link's accessible name as a naked number
              // ("প্রশ্ন ১২৩"). aria-label on the span is honoured by the name-from-content
              // walk, so the count reaches AT with its unit attached.
              const badgeLabel =
                item.badge === "wallet" ? `ব্যালেন্স ${badge}` : `${badge}টি প্রশ্ন`;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  // Collapsed the label is hidden, so title carries the tooltip and
                  // aria-label carries the accessible name the span no longer provides.
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={({ isActive }) => `ex-sidenav-item${isActive ? " active" : ""}`}
                >
                  <item.Icon size={17} strokeWidth={1.75} aria-hidden />
                  <span className="ex-sidenav-label">{item.label}</span>
                  {badge ? (
                    <span className="ex-sidenav-badge" aria-label={badgeLabel}>
                      {badge}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>
      {showFoot ? (
        <div className="ex-sidenav-foot">
          {orgInitial ? (
            <span className="ex-sidenav-disc" aria-hidden>
              {orgInitial}
            </span>
          ) : null}
          <span className="ex-sidenav-foottext">
            {org ? <span className="ex-sidenav-orgname">{org.name}</span> : null}
            <span className="ex-sidenav-role">{roleLabel}</span>
          </span>
        </div>
      ) : null}
    </nav>
  );
}
