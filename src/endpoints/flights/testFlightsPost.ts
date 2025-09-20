import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import { FlightResponseSchema } from "../../schemas/flights";
import { exampleFlights } from "../../data/exampleFlights";

/**
 * Utility function to introduce a random small delay.
 * The delay will be between minMs and maxMs milliseconds.
 */
const randomDelay = async (minMs: number = 100, maxMs: number = 400): Promise<void> => {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
};

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
    await randomDelay();
    const shuffledFlights = [...exampleFlights].sort(() => Math.random() - 0.5);
    const limitedFlights = shuffledFlights.slice(0, 10);

    return {
      flights: limitedFlights,
    };
  }
}
