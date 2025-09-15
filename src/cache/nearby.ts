// Lightweight H3 interface to avoid tight coupling at call sites
export type H3Like = {
  latLngToCell: (lat: number, lon: number, res: number) => string;
  gridDisk: (origin: string, k: number) => string[];
};

export type RadiusBucket = 5 | 10 | 25 | 50 | 100;

export const RADIUS_BUCKETS: RadiusBucket[] = [5, 10, 25, 50, 100];

export type NearbyCacheKey = {
  resolution: number;
  cellIndex: string;
  radiusBucket: RadiusBucket;
};

export function bucketRadiusKm(radiusKm: number): RadiusBucket {
  const abs = Math.max(0, radiusKm);
  let chosen: RadiusBucket = 5;
  for (const b of RADIUS_BUCKETS) {
    chosen = b;
    if (abs <= b) break;
  }
  return chosen;
}

export function buildNearbyKey(resolution: number, cellIndex: string, radiusBucket: RadiusBucket): string {
  return `near/h3/${resolution}/${cellIndex}/r${radiusBucket}`;
}

export function computeCellIndex(h3: H3Like, lat: number, lon: number, resolution: number): string {
  return h3.latLngToCell(lat, lon, resolution);
}

export async function computeEtag(tickMillis: number, payload: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const buf = await crypto.subtle.digest("SHA-1", data);
  const bytes = Array.from(new Uint8Array(buf));
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${tickMillis}-${hex.slice(0, 12)}`;
}

export function setSharedCacheHeaders(resp: Response, etag: string) {
  // Edge caches for 10s; browsers don't cache
  resp.headers.set("Cache-Control", "public, s-maxage=10, max-age=0");
  if (etag) resp.headers.set("ETag", etag);
  return resp;
}

export function toJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export type NearbyRequest = {
  latitude: number;
  longitude: number;
  radiusKm: number;
};

export type NearbyNormalized = NearbyRequest & {
  resolution: number;
  cellIndex: string;
  radiusBucket: RadiusBucket;
  cacheKey: string;
};

export function normalizeNearby(h3: H3Like, req: NearbyRequest, resolution = 6): NearbyNormalized {
  const radiusBucket = bucketRadiusKm(req.radiusKm);
  const cellIndex = computeCellIndex(h3, req.latitude, req.longitude, resolution);
  const cacheKey = buildNearbyKey(resolution, cellIndex, radiusBucket);
  return { ...req, resolution, cellIndex, radiusBucket, cacheKey };
}

/**
 * Build a synthetic GET Request used for Workers Cache API lookups.
 * Including the resourcePath ensures different endpoints do not collide.
 */
function buildEdgeCacheRequest(cacheKey: string, resourcePath?: string, partitionHint?: string): Request {
  const path = resourcePath && resourcePath.startsWith("/") ? resourcePath : resourcePath ? `/${resourcePath}` : "";
  const url = new URL(`https://edge-cache/${cacheKey}${path}`);
  const headers = new Headers();
  if (partitionHint) headers.set("CF-Cache-Partition", partitionHint);
  return new Request(url.toString(), { method: "GET", headers });
}

export async function getFromEdgeCache(cacheKey: string, resourcePath?: string, partitionHint?: string): Promise<Response | null> {
  const cache = caches.default;
  const req = buildEdgeCacheRequest(cacheKey, resourcePath, partitionHint);
  const hit = await cache.match(req);
  return hit ?? null;
}

export async function putInEdgeCache(cacheKey: string, response: Response, ttlSeconds = 10, resourcePath?: string, partitionHint?: string): Promise<void> {
  const cache = caches.default;
  const req = buildEdgeCacheRequest(cacheKey, resourcePath, partitionHint);
  // Stamp edge TTL via Cache-Control. Browsers get 0s; edge caches for ttlSeconds.
  const resp = new Response(response.body, response);
  resp.headers.set("Cache-Control", `public, s-maxage=${ttlSeconds}, max-age=0`);
  await cache.put(req, resp);
}
