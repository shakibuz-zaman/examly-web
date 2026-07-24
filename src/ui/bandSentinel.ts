// Two tiny external boolean stores wiring page-level producers to AppHeader:
//   • bandVisible        — HeroBand's sentinel: "is the hero band still on screen?"
//                          AppHeader compacts when it is not (spec §5).
//                          Default true so band-less pages never trigger compact mode.
//   • searchTargetPresent — SearchBar: "is there a #ex-page-search to focus?"
//                          Default false so the compact bar only offers the search
//                          shortcut on pages that actually mount the input.
function createFlagStore(initial: boolean) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    set(v: boolean): void {
      if (v === value) return; // idempotent: no subscriber churn on repeat writes
      value = v;
      listeners.forEach((l) => l());
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

const band = createFlagStore(true);
const searchTarget = createFlagStore(false);

export function setBandVisible(v: boolean): void {
  band.set(v);
}

export function subscribeBand(listener: () => void): () => void {
  return band.subscribe(listener);
}

export function getBandVisible(): boolean {
  return band.get();
}

export function setSearchTargetPresent(v: boolean): void {
  searchTarget.set(v);
}

export function subscribeSearchTarget(listener: () => void): () => void {
  return searchTarget.subscribe(listener);
}

export function getSearchTargetPresent(): boolean {
  return searchTarget.get();
}
