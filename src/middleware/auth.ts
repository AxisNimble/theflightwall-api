import type { MiddlewareHandler } from "hono";
import type { Env } from "../bindings";

/**
 * Global middleware to enforce API key presence, validate against KV, and apply rate limiting.
 *
 * Behavior:
 * - Requires header `x-api-key`.
 * - Checks existence of the API key in `FLIGHTWALL_API_KEYS` KV. Value is ignored.
 * - Applies rate limiting via `FLIGHTWALL_RATE_LIMITER` keyed by the API key string.
 * - Returns consistent error envelopes on failure.
 */
export const validateApiKeyAndRateLimit: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const apiKey = c.req.header("x-api-key") || "";
  if (!apiKey) {
    return c.json(
      {
        success: false,
        errors: [{ code: 1101, message: "Missing API key" }],
      },
      401
    );
  }

  const keyExists = await c.env.FLIGHTWALL_API_KEYS.get(apiKey);
  if (!keyExists) {
    return c.json(
      {
        success: false,
        errors: [{ code: 1102, message: "Invalid API key" }],
      },
      401
    );
  }

  const { success } = await c.env.FLIGHTWALL_RATE_LIMITER.limit({ key: apiKey });
  if (!success) {
    return c.json(
      {
        success: false,
        errors: [{ code: 1201, message: "Rate limit exceeded" }],
      },
      429
    );
  }

  await next();
};
