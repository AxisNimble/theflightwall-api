import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";

const ProvisionRequestSchema = z.object({
  api_key: z.string().min(8).max(256),
});

export class ProvisionKeyPost extends OpenAPIRoute {
  public schema = {
    tags: ["Keys"],
    summary: "Provision a new API key",
    operationId: "keys-provision-post",
    request: {
      body: contentJson(ProvisionRequestSchema),
    },
    responses: {
      "200": {
        description: "Key provisioned",
        ...contentJson(
          z.object({
            success: z.literal(true),
            result: z.object({ provisioned: z.boolean() }),
          })
        ),
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
    },
  };

  public async handle(c: AppContext) {
    const provisionHeader = c.req.header("x-provision-key") || "";
    const secret = c.env.FW_API_KEY_PROVISION_KEY || "";

    if (!secret || provisionHeader !== secret) {
      c.status(401);
      return {
        success: false as const,
        errors: [{ code: 1103, message: "Unauthorized provisioning request" }],
      };
    }

    const { body } = await this.getValidatedData<typeof this.schema>();

    await c.env.FLIGHTWALL_API_KEYS.put(body.api_key, new Date().toISOString());

    return {
      success: true as const,
      result: { provisioned: true },
    };
  }
}
