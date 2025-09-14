import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import { FlightRequestSchema, FlightResponseSchema } from "../../schemas/flights";

export class FlightsPost extends OpenAPIRoute {
  public schema = {
    tags: ["Flights"],
    summary: "Query live flights (unimplemented)",
    operationId: "flights-post",
    request: {
      body: contentJson(FlightRequestSchema),
    },
    responses: {
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
      "501": {
        description: "Not Implemented",
        ...contentJson(
          z.object({
            success: z.literal(false),
            errors: z.array(z.object({ code: z.number().int(), message: z.string() })),
          })
        ),
      },
      "200": {
        description: "Example shape for future success",
        ...contentJson(z.object({ success: z.literal(true), result: FlightResponseSchema })),
      },
    },
  };

  public async handle(c: AppContext) {
    await this.getValidatedData<typeof this.schema>();

    const apiKey = c.req.header("x-api-key") || "";
    if (!apiKey) {
      c.status(401);
      return {
        success: false,
        errors: [{ code: 1101, message: "Missing API key" }],
      } as const;
    }

    const keyOwner = await c.env.FLIGHTWALL_API_KEYS.get(apiKey);
    if (!keyOwner) {
      c.status(401);
      return {
        success: false,
        errors: [{ code: 1102, message: "Invalid API key" }],
      } as const;
    }

    const { success } = await c.env.FLIGHTWALL_RATE_LIMITER.limit({ key: apiKey });
    if (!success) {
      c.status(429);
      return {
        success: false,
        errors: [{ code: 1201, message: "Rate limit exceeded" }],
      } as const;
    }

    c.status(501);
    return {
      success: false,
      errors: [{ code: 1001, message: "Flights endpoint not implemented yet" }],
    } as const;
  }
}
