import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { validateApiKeyAndRateLimit } from "./middleware/auth";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { FlightsPost } from "./endpoints/flights/flightsPost";
import { TestFlightsPost } from "./endpoints/flights/testFlightsPost";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  if (err instanceof ApiException) {
    // If it's a Chanfana ApiException, let Chanfana handle the response
    return c.json({ success: false, errors: err.buildResponse() }, err.status as ContentfulStatusCode);
  }

  console.error("Global error handler caught:", err); // Log the error if it's not known

  // For other errors, return a generic 500 response
  return c.json(
    {
      success: false,
      errors: [{ code: 7000, message: "Internal Server Error" }],
    },
    500
  );
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
  docs_url: "/",
  schema: {
    info: {
      title: "TheFlightWall API",
      version: "0.1.0",
      description: "Core endpoints for TheFlightWall.",
    },
  },
});

// Global middleware - applies to all routes registered below
app.use("*", validateApiKeyAndRateLimit);

// Register flights endpoints
openapi.post("/flights", FlightsPost);
openapi.post("/test/flights", TestFlightsPost);

// Export the Hono app
export default app;
