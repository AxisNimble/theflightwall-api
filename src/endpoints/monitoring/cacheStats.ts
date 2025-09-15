import { OpenAPIRoute } from "chanfana";
import { z } from "zod";

export class CacheStats extends OpenAPIRoute {
  schema = {
    tags: ["Monitoring"],
    summary: "Get cache statistics",
    responses: {
      "200": {
        description: "Cache statistics",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
              data: z.object({
                cache_info: z.string(),
                edge_cache_available: z.boolean(),
                timestamp: z.string(),
              }),
            }),
          },
        },
      },
    },
  };

  async handle() {
    const cacheAvailable = typeof caches !== "undefined" && caches.default;

    return {
      success: true,
      data: {
        cache_info: "Edge cache using Cloudflare Cache API",
        edge_cache_available: !!cacheAvailable,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
