import { latLngToCell } from "h3-js";
import type { Env } from "../bindings";
import type { MiddlewareHandler } from "hono";
import { normalizeNearby, getFromEdgeCache, putInEdgeCache, setSharedCacheHeaders } from "../cache/nearby";
import { StatusCode } from "hono/utils/http-status";
import { getConfig } from "../config";

// Simple adapter implementing only required H3Like functions
const H3 = {
  latLngToCell,
  gridDisk: () => [],
};

type NearbyBody = {
  radius_request?: { latitude: number; longitude: number; radius_km: number };
};

/**
 * Middleware for POST /flights and /test/flights to implement edge caching via H3 quantization.
 * - Normalizes (lat, lon, radius) into a canonical cache key
 * - Serves cache hits (including 304 if ETag matches)
 * - After downstream handler, stamps cache headers, computes ETag, and stores in edge cache
 */
export const nearbyCache: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  // Only apply to POST handlers mounted under this prefix, but we cache via synthetic GET keys
  if (c.req.method !== "POST") {
    return next();
  }

  // Parse body from a clone so the original can still be read by downstream handler
  let body: NearbyBody | null = null;
  try {
    body = await c.req.raw.clone().json();
  } catch (_) {
    // ignore parse errors, just skip caching if body absent
  }

  const rr = body?.radius_request;
  if (!rr || typeof rr.latitude !== "number" || typeof rr.longitude !== "number" || typeof rr.radius_km !== "number") {
    return next();
  }

  // Normalize and build key
  const { cacheTtlSeconds, h3Resolution, cachePartitionHint } = getConfig(c.env);
  const normalized = normalizeNearby(H3, { latitude: rr.latitude, longitude: rr.longitude, radiusKm: rr.radius_km }, h3Resolution);
  const cacheKey = normalized.cacheKey;
  const resourcePath = new URL(c.req.url).pathname; // distinguishes /flights vs /test/flights

  // Try cache via Workers Cache API (GET-only)
  const cached = await getFromEdgeCache(cacheKey, resourcePath, cachePartitionHint);
  if (cached) {
    console.log(`[CACHE] HIT - Key: ${cacheKey} Path: ${resourcePath}`);
    return c.newResponse(await cached.text(), cached.status as StatusCode, Object.fromEntries(cached.headers.entries()));
  }

  console.log(`[CACHE] MISS - Key: ${cacheKey} Path: ${resourcePath}`);

  await next();

  // Only cache successful JSON responses
  if (!c.res || c.res.status !== 200) return;

  try {
    // Stamp headers for edge caching (10s, browser 0s)
    setSharedCacheHeaders(c.res, "");

    // Put a cached copy using synthetic GET key; do not await
    console.log(`[CACHE] STORE - Key: ${cacheKey}, TTL: ${cacheTtlSeconds}s Path: ${resourcePath}`);
    c.executionCtx.waitUntil(putInEdgeCache(cacheKey, c.res, cacheTtlSeconds, resourcePath, cachePartitionHint));
  } catch (_) {
    // Best-effort; do not fail the request on caching issues
  }
};
