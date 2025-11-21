type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type CacheStore = Map<string, CacheEntry<unknown>>;

declare global {
  var __kitchenSyncCacheStore: CacheStore | undefined;
}

const store: CacheStore =
  globalThis.__kitchenSyncCacheStore ?? new Map<string, CacheEntry<unknown>>();

if (!globalThis.__kitchenSyncCacheStore) {
  globalThis.__kitchenSyncCacheStore = store;
}

export function getCacheValue<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCacheValue<T>(key: string, value: T, ttlMs: number) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateCacheKey(key: string) {
  store.delete(key);
}
