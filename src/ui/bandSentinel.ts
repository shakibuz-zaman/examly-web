// Tiny external store connecting HeroBand (producer) to AppHeader (consumer):
// "is the hero band still on screen?" AppHeader compacts when it is not (spec §5).
// Default true so band-less pages never trigger compact mode.
let bandVisible = true;
const listeners = new Set<() => void>();

export function setBandVisible(v: boolean): void {
  if (v === bandVisible) return;
  bandVisible = v;
  listeners.forEach((l) => l());
}

export function subscribeBand(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getBandVisible(): boolean {
  return bandVisible;
}
