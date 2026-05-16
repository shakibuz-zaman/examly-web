const STORAGE_KEY = "examly.token";

let inMemoryToken: string | null = null;

export const tokenStore = {
  get(): string | null {
    if (inMemoryToken) return inMemoryToken;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      inMemoryToken = stored;
      return stored;
    }
    return null;
  },
  set(token: string) {
    inMemoryToken = token;
    sessionStorage.setItem(STORAGE_KEY, token);
  },
  clear() {
    inMemoryToken = null;
    sessionStorage.removeItem(STORAGE_KEY);
  },
};
