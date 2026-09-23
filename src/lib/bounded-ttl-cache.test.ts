import { afterEach, describe, expect, it, vi } from "vitest";
import { createBoundedTtlCache } from "./bounded-ttl-cache";

describe("bounded TTL cache", () => {
  afterEach(() => vi.useRealTimers());

  it("returns live values and drops expired ones", () => {
    vi.useFakeTimers();
    const cache = createBoundedTtlCache<string, number>({ ttlMs: 1000, maxEntries: 8 });
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    vi.advanceTimersByTime(1001);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("never grows past the entry bound", () => {
    const cache = createBoundedTtlCache<number, string>({ ttlMs: 60_000, maxEntries: 3 });
    for (let index = 0; index < 50; index += 1) cache.set(index, `v${index}`);
    expect(cache.size).toBe(3);
    expect(cache.get(49)).toBe("v49");
    expect(cache.get(0)).toBeUndefined();
  });

  it("keeps recently read entries when it has to evict", () => {
    const cache = createBoundedTtlCache<string, number>({ ttlMs: 60_000, maxEntries: 2 });
    cache.set("hot", 1);
    cache.set("cold", 2);
    expect(cache.get("hot")).toBe(1);
    cache.set("new", 3);
    expect(cache.get("hot")).toBe(1);
    expect(cache.get("new")).toBe(3);
    expect(cache.get("cold")).toBeUndefined();
  });

  it("reclaims expired entries before evicting live ones", () => {
    vi.useFakeTimers();
    const cache = createBoundedTtlCache<string, number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set("stale-1", 1);
    cache.set("stale-2", 2);
    vi.advanceTimersByTime(1001);
    cache.set("live", 3);
    // Both expired entries are reclaimed, so the live one survives even though
    // the bound is 2 and three writes happened.
    expect(cache.get("live")).toBe(3);
    expect(cache.size).toBe(1);
  });

  it("rejects a non-positive bound instead of silently caching without limit", () => {
    expect(() => createBoundedTtlCache({ ttlMs: 1000, maxEntries: 0 })).toThrow("bounded_ttl_cache_invalid_max_entries");
    expect(() => createBoundedTtlCache({ ttlMs: 0, maxEntries: 1 })).toThrow("bounded_ttl_cache_invalid_ttl");
  });
});
