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
      c.status(404);
      return {
        success: false as const,
        errors: [{ code: 1301, message: "Configuration not found" }],
      };
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

    const savedMs = validation.data.meta?.savedAtEpochMs ?? Date.now();
    const last_saved = Math.floor(savedMs / 1000);

    return {
      last_saved,
      data: {
        request_config: validation.data.request_config,
        display_config: validation.data.display_config,
      },
    } as const;
  }
}
