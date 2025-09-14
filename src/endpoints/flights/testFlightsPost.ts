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
      "200": {
        description: "Two example flights",
        ...contentJson(z.object({ success: z.literal(true), result: FlightResponseSchema })),
      },
    },
  };

  public async handle(c: AppContext) {
    return { flights: exampleFlights };
  }
}
