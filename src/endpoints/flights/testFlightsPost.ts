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
    return {
      flights: exampleFlights,
    };
  }
}
