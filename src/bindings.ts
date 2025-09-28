export interface RateLimiterBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

export interface Env extends Cloudflare.Env {
  DB: D1Database;
  FLIGHTWALL_API_KEYS: KVNamespace;
  FLIGHTWALL_CONFIGURATIONS: KVNamespace;
  FLIGHTWALL_RATE_LIMITER: RateLimiterBinding;
  FLIGHTWALL_DEVICE_STATUS_LIMITER: RateLimiterBinding;
  KVNamespace: KVNamespace;
  // Optional environment overrides for config
  CACHE_TTL_SECONDS?: string;
  H3_RESOLUTION?: string;
  // Secrets for upstream data engine
  FW_DATA_ENGINE_CLIENT_ID?: string;
  FW_DATA_ENGINE_CLIENT_SECRET?: string;
  // Secret used to authorize provisioning new API keys
  FW_API_KEY_PROVISION_KEY?: string;
}
