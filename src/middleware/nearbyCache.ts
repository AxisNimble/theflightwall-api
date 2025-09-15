import { latLngToCell } from "h3-js";
import type { Env } from "../bindings";
import type { MiddlewareHandler } from "hono";
import { normalizeNearby, getFromEdgeCache, putInEdgeCache, setSharedCacheHeaders, computeEtag, toJsonResponse } from "../cache/nearby";
import { StatusCode } from "hono/utils/http-status";

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
  const normalized = normalizeNearby(H3, { latitude: rr.latitude, longitude: rr.longitude, radiusKm: rr.radius_km }, 6);
  const cacheKey = normalized.cacheKey;
  // Try cache
  const ifNoneMatch = c.req.header("if-none-match") || "";
  const cached = await getFromEdgeCache(cacheKey);
  if (cached) {
    const etag = cached.headers.get("etag") || "";
    if (ifNoneMatch && etag && ifNoneMatch === etag) {
      console.log(`[CACHE] 304 Not Modified - Key: ${cacheKey}, ETag: ${etag}`);
      return c.newResponse(null, 304, Object.fromEntries(new Headers([...Array.from(cached.headers.entries()), ["etag", etag]]).entries()));
    }
    console.log(`[CACHE] HIT - Key: ${cacheKey}, ETag: ${etag}`);
    const cachedText = await cached.text();
    return c.newResponse(cachedText, cached.status as StatusCode, Object.fromEntries(cached.headers.entries()));
  }

  console.log(`[CACHE] MISS - Key: ${cacheKey}`);

  await next();

  // Only cache successful JSON responses
  if (!c.res || c.res.status !== 200) return;

  try {
    // Read outgoing body to compute ETag
    const cloned = c.res.clone();
    // Attempt to parse JSON, fallback to text
    let payload: unknown;
    let text: string;
    try {
      text = await cloned.text();
      payload = JSON.parse(text);
    } catch (_) {
      text = await cloned.text();
      payload = text;
    }

    const tick = Math.floor(Date.now() / 10000) * 10000;
    const etag = await computeEtag(tick, payload);

    // Stamp headers on the live response
    setSharedCacheHeaders(c.res, etag);

    // Put a cached copy
    console.log(`[CACHE] STORE - Key: ${cacheKey}, ETag: ${etag}, TTL: 12s`);
    await putInEdgeCache(cacheKey, c.res, 12);
  } catch (_) {
    // Best-effort; do not fail the request on caching issues
  }
};
