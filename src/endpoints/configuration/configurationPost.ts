import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import { ConfigurationPostBodySchema, PersistedConfigurationSchema } from "../../schemas/configuration";

export class ConfigurationPost extends OpenAPIRoute {
  public schema = {
    tags: ["Configuration"],
    summary: "Save configuration for the calling API key",
    operationId: "configuration-post",
    request: {
      body: contentJson(ConfigurationPostBodySchema),
    },
    responses: {
      "200": {
        description: "Configuration saved",
        ...contentJson(PersistedConfigurationSchema),
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
    const { body } = await this.getValidatedData<typeof this.schema>();

    const nowMs = Date.now();
    const payload = {
      request_config: body.request_config,
      display_config: body.display_config ?? null,
      meta: { savedAtEpochMs: nowMs, version: 1 },
    } as const;

    // Validate full persisted shape before write for safety
    const validation = PersistedConfigurationSchema.safeParse(payload);
    if (!validation.success) {
      c.status(400);
      return {
        success: false as const,
        errors: [{ code: 1304, message: "Invalid configuration payload" }],
      };
    }

    await c.env.FLIGHTWALL_CONFIGURATIONS.put(apiKey, JSON.stringify(validation.data));

    return validation.data as const;
  }
}
