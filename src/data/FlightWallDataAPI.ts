import type { Env } from "../bindings";
import type { Flight, FlightRequest, FlightResponse } from "../schemas/flights";
import { computeRes5CoverageForRequest, fetchRes5Tile, filterFlightsToRequest, getTenSecondBucket } from "../cache/nearby";

export class FlightWallDataAPI {
  private readonly env: Env;
  private readonly inflight: Map<string, Promise<FlightResponse>> = new Map();

  constructor(env: Env) {
    this.env = env;
  }

  public async searchFlights(request: FlightRequest): Promise<FlightResponse> {
    const hexes = computeRes5CoverageForRequest(request);
    if (!hexes.length) {
      return { flights: [] };
    }

    const bucket = getTenSecondBucket();
    const maxConcurrency = 12;

    const results = await mapWithConcurrency(hexes, maxConcurrency, async (hex) => {
      const key = `${hex}:${bucket}`;
      let p = this.inflight.get(key);
      if (!p) {
        p = fetchRes5Tile(hex, this.env, bucket).finally(() => {
          this.inflight.delete(key);
        });
        this.inflight.set(key, p);
      }
      try {
        return await p;
      } catch (_) {
        return { flights: [] };
      }
    });

    const union: Flight[] = [];
    for (const r of results) {
      if (Array.isArray(r.flights) && r.flights.length) {
        union.push(...r.flights);
      }
    }

    const filteredFlights = filterFlightsToRequest(union, request);

    return { flights: filteredFlights };
  }

  public filterResultsForUserRequest(results: FlightResponse, request: FlightRequest): FlightResponse {
    return { flights: filterFlightsToRequest(results.flights || [], request) };
  }
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const ret: R[] = new Array(items.length);
  let nextIndex = 0;
  const workers: Promise<void>[] = [];
  const run = async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      ret[i] = await fn(items[i], i);
    }
  };
  const n = Math.max(1, Math.min(concurrency, items.length));
  for (let i = 0; i < n; i++) workers.push(run());
  await Promise.all(workers);
  return ret;
}
