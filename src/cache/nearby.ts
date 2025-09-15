import { polygonToCells, cellToParent } from "h3-js";
import type { Env } from "../bindings";
import type { Flight, FlightRequest, FlightResponse } from "../schemas/flights";

const DATA_TILE_BASE = "https://apihelper.theflightwall.com/data/res5" as const;

export function getTenSecondBucket(nowMs = Date.now()): number {
  return Math.floor(nowMs / 10000);
}

export function buildTileCacheKey(hex: string, bucket: number, version = "v1"): string {
  return `${version}:res5:${hex}:${bucket}`;
}

export function buildTileUrl(hex: string): string {
  return `${DATA_TILE_BASE}/${hex}`;
}

export async function fetchRes5Tile(hex: string, env: Env, bucket: number): Promise<FlightResponse> {
  const clientId = env.FW_DATA_ENGINE_CLIENT_ID || "";
  const clientSecret = env.FW_DATA_ENGINE_CLIENT_SECRET || "";

  if (!clientId || !clientSecret) {
    throw new Error("Missing data engine credentials");
  }

  const cacheKey = buildTileCacheKey(hex, bucket);
  const url = buildTileUrl(hex);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "CF-Access-Client-Id": clientId,
      "CF-Access-Client-Secret": clientSecret,
      Accept: "application/json",
    },
    cf: {
      cacheEverything: true,
      cacheTtl: 10,
      cacheKey,
    },
  } as RequestInit & { cf: RequestInitCfProperties });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tile fetch error ${res.status} for ${hex}: ${text}`);
  }

  const json = (await res.json().catch(() => ({}))) as Partial<FlightResponse>;
  return { flights: Array.isArray(json.flights) ? (json.flights as Flight[]) : [] };
}

export function computeRes5CoverageForRequest(req: FlightRequest): string[] {
  const res = 5;
  if (req.radius_request) {
    const { latitude, longitude, radius_km } = req.radius_request;
    const [lat, lon] = sanitizeLatLon(latitude, longitude);
    // Oversample the circle polygon at a higher resolution, then collapse to res5 parents
    const ring = buildCircleRingLatLng(lat, lon, radius_km, 72);
    const oversampleRes = 8;
    const children = polygonToCells([ring], oversampleRes, false);
    const parents = new Set<string>();
    for (const child of children) parents.add(cellToParent(child, res));
    return Array.from(parents).sort();
  }
  if (req.geo_request) {
    const coordsLonLat = req.geo_request.coordinates || [];
    const ring = coordsLonLat.map(([lon, lat]) => [lat, lon]);
    if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
      ring.push([...ring[0]]);
    }
    return polygonToCells([ring], res, true);
  }
  return [];
}

export function buildCircleRingLatLng(lat: number, lon: number, radiusKm: number, points = 72): [number, number][] {
  const ring: [number, number][] = [];
  const earthRadiusKm = 6371.0088;
  const angDist = radiusKm / earthRadiusKm;
  const latRad = toRad(lat);
  const lonRad = toRad(lon);
  for (let i = 0; i < points; i++) {
    const bearing = (2 * Math.PI * i) / points;
    const sinLat = Math.sin(latRad) * Math.cos(angDist) + Math.cos(latRad) * Math.sin(angDist) * Math.cos(bearing);
    const dLat = Math.asin(sinLat);
    const y = Math.sin(bearing) * Math.sin(angDist) * Math.cos(latRad);
    const x = Math.cos(angDist) - Math.sin(latRad) * Math.sin(dLat);
    const dLon = Math.atan2(y, x);
    const latDeg = toDeg(dLat);
    const lonDeg = normalizeLon(toDeg(lonRad + dLon));
    ring.push([latDeg, lonDeg]);
  }
  ring.push([...ring[0]]);
  return ring;
}

export function sanitizeLatLon(lat: number, lon: number): [number, number] {
  let outLat = lat;
  let outLon = lon;
  const inLatRange = outLat >= -90 && outLat <= 90;
  const lonLooksLikeLat = outLon >= -90 && outLon <= 90;
  const lonValid = outLon >= -180 && outLon <= 180;
  if (!inLatRange && lonValid && lonLooksLikeLat) {
    // Swap if provided in lon,lat order
    const tmp = outLat;
    outLat = outLon;
    outLon = tmp;
  }
  if (!(outLat >= -90 && outLat <= 90)) throw new Error(`Latitude out of range after sanitization: ${outLat}`);
  if (!(outLon >= -180 && outLon <= 180)) throw new Error(`Longitude out of range after sanitization: ${outLon}`);
  return [outLat, outLon];
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function normalizeLon(lon: number): number {
  let l = lon;
  while (l < -180) l += 360;
  while (l > 180) l -= 360;
  return l;
}

export function filterFlightsToRequest(flights: Flight[], req: FlightRequest): Flight[] {
  let out = flights;

  // Data filters
  if (req.data_filters?.only_aircraft?.length) {
    const set = new Set(req.data_filters.only_aircraft);
    out = out.filter((f) => (f.icao24 && set.has(f.icao24)) || (f.registration && set.has(f.registration || "")));
  }
  if (req.data_filters?.only_airlines?.length) {
    const set = new Set(req.data_filters.only_airlines);
    out = out.filter((f) => (f.airline_code && set.has(f.airline_code)) || (f.airline_operating_as && set.has(f.airline_operating_as)) || (f.airline_painted_as && set.has(f.airline_painted_as)));
  }

  // Shape filters
  if (req.radius_request) {
    const { latitude, longitude, radius_km } = req.radius_request;
    out = out.filter((f) => isFiniteNumber(f.position_lat) && isFiniteNumber(f.position_lon) && haversineKm(latitude, longitude, f.position_lat!, f.position_lon!) <= radius_km);
  } else if (req.geo_request) {
    const ringLatLng = req.geo_request.coordinates.map(([lon, lat]) => [lat, lon]) as [number, number][];
    if (ringLatLng.length && (ringLatLng[0][0] !== ringLatLng[ringLatLng.length - 1][0] || ringLatLng[0][1] !== ringLatLng[ringLatLng.length - 1][1])) {
      ringLatLng.push([...ringLatLng[0]]);
    }
    out = out.filter((f) => isFiniteNumber(f.position_lat) && isFiniteNumber(f.position_lon) && pointInPolygon([f.position_lat!, f.position_lon!], ringLatLng));
  }

  return out;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function pointInPolygon(pointLatLng: [number, number], ringLatLng: [number, number][]): boolean {
  // Ray-casting algorithm on lon-lat order requires conversion
  const point = { x: pointLatLng[1], y: pointLatLng[0] };
  const verts = ringLatLng.map(([lat, lon]) => ({ x: lon, y: lat }));
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x,
      yi = verts[i].y;
    const xj = verts[j].x,
      yj = verts[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.0000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
