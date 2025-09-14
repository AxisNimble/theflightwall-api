import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Flights API Integration Tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it("POST /flights should be unimplemented and return 501", async () => {
    const response = await SELF.fetch(`http://local.test/flights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        radius_request: {
          type: "radius",
          latitude: 37.6188,
          longitude: -122.375,
          radius_km: 50,
        },
      }),
    });
    const body = await response.json<{
      success: boolean;
      errors: { code: number; message: string }[];
    }>();

    expect(response.status).toBe(501);
    expect(body.success).toBe(false);
    expect(body.errors[0].message).toMatch(/not implemented/i);
  });
});
