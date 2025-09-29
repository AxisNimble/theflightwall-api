import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import { ConfigurationGetResponseSchema, PersistedConfigurationSchema } from "../../schemas/configuration";

export class ConfigurationGet extends OpenAPIRoute {
  public schema = {
    tags: ["Configuration"],
    summary: "Get configuration for the calling API key",
    operationId: "configuration-get",
    responses: {
      "200": {
        description: "Configuration for API key",
        ...contentJson(ConfigurationGetResponseSchema),
      },
      "401": {
        description: "Unauthorized",
        ...contentJson(
          z.object({
            success: z.literal(false),
            errors: z.array(z.object({ code: z.number().int(), message: z.string() })),
          })
        ),
      },
      "404": {
        description: "No configuration found",
        ...contentJson(
          z.object({
            success: z.literal(false),
            errors: z.array(z.object({ code: z.number().int(), message: z.string() })),
          })
        ),
      },
      "429": {
        description: "Too Many Requests",
        ...contentJson(
          z.object({
            success: z.literal(false),
            errors: z.array(z.object({ code: z.number().int(), message: z.string() })),
          })
        ),
      },
    },
  };

  public async handle(c: AppContext) {
    const apiKey = c.req.header("x-api-key") || "";

    const raw = await c.env.FLIGHTWALL_CONFIGURATIONS.get(apiKey);
    if (!raw) {
      // No configuration for this key: return empty object
      return {} as const;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      c.status(500);
      return {
        success: false as const,
        errors: [{ code: 1302, message: "Corrupt configuration data" }],
      };
    }

    const validation = PersistedConfigurationSchema.safeParse(parsed);
    if (!validation.success) {
      c.status(500);
      return {
        success: false as const,
        errors: [{ code: 1303, message: "Configuration schema mismatch" }],
      };
    }

    // Return only request_config and optional display_config to align to GET response shape
    const { request_config, display_config } = validation.data;
    return display_config === undefined ? { request_config } : { request_config, display_config };
  }
}
