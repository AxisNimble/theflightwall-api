import { env } from "cloudflare:test";

// Seed a test device API key for integration tests
await env.FLIGHTWALL_API_KEYS.put("TEST_DEVICE_KEY_1", "1");


