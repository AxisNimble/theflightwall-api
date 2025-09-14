export interface RateLimiterBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

export interface Env extends Cloudflare.Env {
  DB: D1Database;
  FLIGHTWALL_API_KEYS: KVNamespace;
  FLIGHTWALL_RATE_LIMITER: RateLimiterBinding;
  KVNamespace: KVNamespace;
}
