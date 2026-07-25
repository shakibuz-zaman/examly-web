// Ref-counted page→AppHeader stores (7c: qbank becomes the second banded page).
//   • band visible        — with no HeroBand mounted the bar never compacts (empty
//                           default true); with claims, visible only while EVERY
//                           mounted band's sentinel is on screen.
//   • search target       — present while ANY default-id SearchBar is mounted.
// Booleans were only safe with a single producer: a route transition could let one
// page's stale unmount reset clobber the other's fresh write. A claim dies with its
// owner, so ordering no longer matters.
export type Claim = { set(v: boolean): void; release(): void };

function createClaimStore(derive: (values: boolean[]) => boolean, empty: boolean) {
  const claims = new Map<symbol, boolean>();
  let value = empty;
  const listeners = new Set<() => void>();
  const recompute = () => {
    const next = claims.size === 0 ? empty : derive([...claims.values()]);
    if (next === value) return; // idempotent: no subscriber churn on repeat writes
    value = next;
    listeners.forEach((l) => l());
  };
  return {
    acquire(initial: boolean): Claim {
      const key = Symbol();
      claims.set(key, initial);
      recompute();
      return {
        set(v: boolean) {
          if (!claims.has(key) || claims.get(key) === v) return;
          claims.set(key, v);
          recompute();
        },
        release() {
          claims.delete(key);
          recompute();
        },
      };
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get(): boolean {
      return value;
    },
  };
}

const band = createClaimStore((vs) => vs.every(Boolean), true);
const searchTarget = createClaimStore((vs) => vs.some(Boolean), false);

export function acquireBandClaim(): Claim {
  return band.acquire(true);
}
export function subscribeBand(listener: () => void): () => void {
  return band.subscribe(listener);
}
export function getBandVisible(): boolean {
  return band.get();
}

export function acquireSearchTargetClaim(): Claim {
  return searchTarget.acquire(true);
}
export function subscribeSearchTarget(listener: () => void): () => void {
  return searchTarget.subscribe(listener);
}
export function getSearchTargetPresent(): boolean {
  return searchTarget.get();
}
