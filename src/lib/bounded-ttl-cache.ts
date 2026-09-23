/**
 * A TTL cache with a hard entry bound.
 *
 * A process-lifetime `Map` used as a cache is a memory leak waiting to happen:
 * entries expire logically but are never reclaimed, so a long-lived instance
 * accumulates one entry per distinct key forever. This cache keeps the TTL
 * semantics callers want while guaranteeing a fixed ceiling on retained
 * entries, which makes it safe to hold at module scope.
 */
export type BoundedTtlCache<K, V> = {
  /** Returns a live value and marks the entry as most recently used. */
  get(key: K): V | undefined;
  /** Stores a value, then reclaims expired and least-recently-used entries. */
  set(key: K, value: V): void;
  /** Current retained count. May include entries whose TTL has not yet been reclaimed. */
  readonly size: number;
  clear(): void;
};

export type BoundedTtlCacheOptions = {
  ttlMs: number;
  maxEntries: number;
};

export const createBoundedTtlCache = <K, V>({ ttlMs, maxEntries }: BoundedTtlCacheOptions): BoundedTtlCache<K, V> => {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new Error("bounded_ttl_cache_invalid_ttl");
  if (!Number.isInteger(maxEntries) || maxEntries <= 0) throw new Error("bounded_ttl_cache_invalid_max_entries");
  const entries = new Map<K, { expiresAt: number; value: V }>();
  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return undefined;
      }
      // Re-insert so Map iteration order tracks recency, which keeps the
      // hottest keys from being the first evicted.
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },
    set(key, value) {
      entries.delete(key);
      entries.set(key, { expiresAt: Date.now() + ttlMs, value });
      if (entries.size <= maxEntries) return;
      // Reclaim expired entries before evicting anything still usable.
      const now = Date.now();
      for (const [candidate, entry] of entries) {
        if (entry.expiresAt <= now) entries.delete(candidate);
      }
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    },
    get size() {
      return entries.size;
    },
    clear() {
      entries.clear();
    },
  };
};
