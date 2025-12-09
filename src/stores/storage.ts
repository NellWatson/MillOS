import { createJSONStorage, type StateStorage } from 'zustand/middleware';

// Provides a JSON storage implementation that falls back to in-memory storage
// when localStorage is unavailable (SSR/tests). Prevents persist() from throwing.
const createMemoryStorage = (): StateStorage => {
  const store = new Map<string, string>();
  return {
    getItem: (name) => store.get(name) ?? null,
    setItem: (name, value) => {
      store.set(name, value);
    },
    removeItem: (name) => {
      store.delete(name);
    },
  };
};

export const safeJSONStorage = createJSONStorage(() => {
  if (typeof window !== 'undefined') {
    const candidate = window.localStorage as Partial<StateStorage> | undefined;
    if (
      candidate &&
      typeof candidate.getItem === 'function' &&
      typeof candidate.setItem === 'function' &&
      typeof candidate.removeItem === 'function'
    ) {
      return candidate as StateStorage;
    }
  }
  return createMemoryStorage();
});
