import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Flights Test Endpoint Integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it("POST /test/flights should return two example flights", async () => {
    const response = await SELF.fetch(`http://local.test/test/flights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await response.json<{
      success: boolean;
      result: { flights: any[] };
    }>();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.result.flights)).toBe(true);
    expect(body.result.flights.length).toBe(2);
    expect(body.result.flights[0]).toHaveProperty("callsign");
  });
});
