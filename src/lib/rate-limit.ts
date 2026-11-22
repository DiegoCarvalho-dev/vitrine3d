// Simple in-memory limit (issue #67): at most `limit` hits per key in a
// sliding window. Per server instance, so it's a first barrier only: the
// database has its own limit for eventos (migration 20261122010000).

const MAX_KEYS = 10_000; // memory cap: past this, old keys are dropped

export function createRateLimiter(limit: number, windowMs = 60_000) {
  const hits = new Map<string, number[]>();
  return function allow(key: string, now = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.delete(key); // re-insert: the Map keeps the most recent last
    hits.set(key, recent);
    if (hits.size > MAX_KEYS) {
      const oldest = hits.keys().next().value;
      if (oldest !== undefined) hits.delete(oldest);
    }
    return true;
  };
}
