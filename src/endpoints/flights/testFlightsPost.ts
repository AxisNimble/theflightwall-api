import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import { FlightResponseSchema } from "../../schemas/flights";
import { exampleFlights } from "../../data/exampleFlights";

export class TestFlightsPost extends OpenAPIRoute {
  public schema = {
    tags: ["Flights"],
    summary: "Return test flight data",
    operationId: "test-flights-post",
    request: {
      body: contentJson(z.any().optional()),
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
      "200": {
        description: "Two example flights",
        ...contentJson(z.object({ success: z.literal(true), result: FlightResponseSchema })),
      },
    },
  };

  public async handle(c: AppContext) {
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

    return { flights: exampleFlights };
  }
}
