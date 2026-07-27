const STORAGE_KEY = "examly-active-track";

// The active track is identity-scoped, but unlike the token (sessionStorage) it lives in
// localStorage, so it survives tab close and browser restart. Every identity change must
// drop it, or the incoming student's session silently opens scoped to the outgoing one's
// track — TrackContext only falls back when the stored id is *unsubscribed*, so two
// students who share a track (the shared-device case) inherit it from each other.
// Kept in its own module so AuthContext can clear it without importing a component file.
export const activeTrackStore = {
  get(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  },
  set(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
