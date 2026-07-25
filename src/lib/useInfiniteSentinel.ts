import { useEffect, useRef } from "react";

// Scroll-intent-gated infinite-scroll sentinel, extracted from StudentCatalogPage
// (plan 7b Task 8) when qbank became its second consumer (plan 7c).
//
// Why the gate: collapsed sections mean the visible cards often don't fill the
// viewport, so the sentinel stays intersecting — an ungated observer chain-fetches
// the entire list on load. Allow exactly ONE observer-driven auto-advance per query
// identity (so wide desktop viewports still fill), after which a real scroll
// gesture is required.
export function useInfiniteSentinel({
  queryIdentity,
  hasNextPage,
  isFetchingNextPage,
  isPlaceholderData,
  fetchNextPage,
  resetKey,
}: {
  queryIdentity: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isPlaceholderData: boolean;
  fetchNextPage: () => unknown;
  resetKey?: unknown; // extra observer re-arm key (the store passes its active tab)
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const autoAdvanced = useRef(false);
  const userScrolled = useRef(false);

  // Serialized query identity — a new filter/search/track starts a fresh budget.
  useEffect(() => {
    autoAdvanced.current = false;
    userScrolled.current = false;
  }, [queryIdentity]);

  // Set by the observer effect: re-observes the sentinel so its CURRENT intersection
  // is re-delivered. An IntersectionObserver only calls back when the ratio crosses a
  // threshold, so a sentinel that was already in view when the auto-advance budget ran
  // out would never fire again — the first scroll gesture has to poke it.
  const pokeSentinel = useRef<(() => void) | null>(null);

  // Registered once. `scroll` is capture-phase because scroll events don't bubble
  // (an inner scroll container would otherwise never reach window); wheel/touchmove
  // cover trackpad and touch drags that haven't moved the scrollport yet.
  useEffect(() => {
    const mark = () => {
      if (userScrolled.current) return;
      userScrolled.current = true;
      pokeSentinel.current?.();
    };
    window.addEventListener("wheel", mark, { passive: true });
    window.addEventListener("touchmove", mark, { passive: true });
    window.addEventListener("scroll", mark, { passive: true, capture: true });
    return () => {
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", mark);
      window.removeEventListener("scroll", mark, { capture: true });
    };
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        // isPlaceholderData: the rows on screen belong to the PREVIOUS query while the
        // new one is in flight — paging them would append the wrong result set.
        if (!entries[0].isIntersecting || !hasNextPage || isFetchingNextPage) return;
        if (isPlaceholderData) return;
        if (!userScrolled.current) {
          if (autoAdvanced.current) return;
          autoAdvanced.current = true;
        }
        void fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    pokeSentinel.current = () => {
      io.unobserve(el);
      io.observe(el);
    };
    return () => {
      pokeSentinel.current = null;
      io.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData, resetKey]);

  return sentinelRef;
}
