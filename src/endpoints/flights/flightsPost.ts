import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import { FlightRequestSchema, FlightResponseSchema } from "../../schemas/flights";
import { FlightWallDataAPI } from "../../data/FlightWallDataAPI";

const MAX_FLIGHT_RESULTS = 3;

export class FlightsPost extends OpenAPIRoute {
  public schema = {
    tags: ["Flights"],
    summary: "Query live flights",
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
      "200": {
        description: "Example shape for future success",
        ...contentJson(z.object({ success: z.literal(true), result: FlightResponseSchema })),
      },
    },
  };

  public async handle(c: AppContext) {
    const { body } = await this.getValidatedData<typeof this.schema>();

    try {
      const client = new FlightWallDataAPI(c.env);
      const result = await client.searchFlights(body);

      // Apply arbitrary limit to prevent excessive response sizes
      const limitedFlights = result.flights.slice(0, MAX_FLIGHT_RESULTS);

      return {
        flights: limitedFlights,
      } as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      c.status(502);
      return {
        success: false,
        errors: [{ code: 1502, message }],
      } as const;
    }
  }
}
