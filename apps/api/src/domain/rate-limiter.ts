export class RateLimiter {
  private readonly buckets = new Map<string, { count: number; windowStartedAt: number }>();

  public allow(key: string, limit: number, now = Date.now()): boolean {
    const bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStartedAt >= 60_000) {
      this.buckets.set(key, { count: 1, windowStartedAt: now });
      return true;
    }
    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
  }
}
