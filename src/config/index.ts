import type { Env } from "../bindings";

export type AppConfig = {
  cacheTtlSeconds: number;
  h3Resolution: number;
  cachePartitionHint: string;
};

export const DEFAULT_CONFIG: AppConfig = {
  cacheTtlSeconds: 10,
  h3Resolution: 5,
  cachePartitionHint: "nearby-v1",
};

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function getConfig(env?: Env): AppConfig {
  const cacheTtlSeconds = parsePositiveInteger(env?.CACHE_TTL_SECONDS, DEFAULT_CONFIG.cacheTtlSeconds);
  const h3Resolution = parsePositiveInteger(env?.H3_RESOLUTION, DEFAULT_CONFIG.h3Resolution);
  return {
    cacheTtlSeconds,
    h3Resolution,
    cachePartitionHint: DEFAULT_CONFIG.cachePartitionHint,
  };
}
