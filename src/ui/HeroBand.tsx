import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { acquireBandClaim } from "./bandSentinel";

// Per-page extension of the teal app bar (spec §5). Renders full-bleed, so pages
// place it OUTSIDE PageContainer:  <><HeroBand …/><PageContainer banded>…</></>
// `overlap` adds bottom room for a floating first card (pair it with
// className="ex-band-overlap" on that card — used from plan 7b on).
export function HeroBand({
  title,
  subtitle,
  back,
  tabs,
  actions,
  overlap = false,
}: {
  // ReactNode, not string, for the same reason SectionHeader's label is: a decorative
  // glyph in the h1 has to be marked aria-hidden, and a plain string cannot carry that —
  // it would land inside the heading's accessible name and be announced with the title.
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  tabs?: ReactNode;
  actions?: ReactNode;
  overlap?: boolean;
}) {
  // End-of-band sentinel: it sits AFTER the band content, so the app bar only
  // collapses to its compact 52px form (spec §5) once the title/tabs have
  // actually scrolled out — not on the first ~64px of scroll. It carries an
  // explicit 1px height because a zero-area element is unreliable for
  // IntersectionObserver. Releasing the claim on unmount means a band-less page
  // can never leave the bar stuck compact, regardless of mount/cleanup ordering
  // against another page's band.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const claim = acquireBandClaim();
    const io = new IntersectionObserver(([entry]) => claim.set(entry.isIntersecting));
    io.observe(el);
    return () => {
      io.disconnect();
      claim.release(); // this band stops voting; a band-less page un-compacts the bar
    };
  }, []);

  return (
    <div className={overlap ? "ex-heroband ex-heroband--overlap" : "ex-heroband"}>
      <div className="ex-heroband-inner">
        {back && (
          <Link className="ex-heroband-back" to={back.to}>
            <span aria-hidden>‹</span> {back.label}
          </Link>
        )}
        <div className="ex-heroband-titlerow">
          <h1 className="ex-heroband-title">{title}</h1>
          {actions}
        </div>
        {subtitle && <div className="ex-heroband-subtitle">{subtitle}</div>}
        {tabs && <div className="ex-heroband-tabs">{tabs}</div>}
      </div>
      <div ref={sentinelRef} className="ex-heroband-sentinel" aria-hidden />
    </div>
  );
}
