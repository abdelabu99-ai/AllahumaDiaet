// Gleitendes Zeitfenster: höchstens `limit` Anfragen pro `windowMs`.

export type RateLimitDecision = { ok: true } | { ok: false; retryAfterMs: number };

export type RateLimiter = { tryAcquire: (now?: number) => RateLimitDecision };

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const timestamps: number[] = [];
  return {
    tryAcquire(now = Date.now()) {
      while (timestamps.length > 0 && now - timestamps[0] >= windowMs) timestamps.shift();
      if (timestamps.length < limit) {
        timestamps.push(now);
        return { ok: true };
      }
      return { ok: false, retryAfterMs: windowMs - (now - timestamps[0]) };
    },
  };
}
