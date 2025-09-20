import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";
import { DeviceStatusUpdateSchema } from "../../schemas/devices";

export class DeviceStatusPost extends OpenAPIRoute {
  public schema = {
    tags: ["Devices"],
    summary: "Report device status (every ~30 minutes)",
    operationId: "devices-status-post",
    request: {
      body: contentJson(DeviceStatusUpdateSchema),
    },
    responses: {
      "200": {
        description: "Accepted",
        ...contentJson(z.object({ success: z.literal(true) })),
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

    // Validate API key exists
    if (!apiKey) {
      c.status(401);
      return {
        success: false as const,
        errors: [{ code: 1001, message: "Missing API key" }],
      };
    }

    const { body } = await this.getValidatedData<typeof this.schema>();

    const now = new Date().toISOString();

    const record = {
      ...body,
      api_key: apiKey,
      last_seen: now,
      ip: c.req.header("cf-connecting-ip") || undefined,
      user_agent: c.req.header("user-agent") || undefined,
    };

    try {
      // Append to D1 for history/analytics
      await c.env.DB.prepare(
        `INSERT INTO device_heartbeats (device_id, api_key, app_state, ssid, uptime_seconds, firmware_version, last_seen, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(body.device_id, apiKey, body.app_state ?? null, body.ssid ?? null, body.uptime_seconds, body.firmware_version, record.last_seen, record.ip ?? null, record.user_agent ?? null)
        .run();

      // Upsert device row for convenience
      await c.env.DB.prepare(
        `INSERT INTO devices (device_id, api_key, flashed_at, first_seen_at)
         VALUES (?, ?, NULL, CURRENT_TIMESTAMP)
         ON CONFLICT(device_id, api_key) DO NOTHING`
      )
        .bind(body.device_id, apiKey)
        .run();
    } catch (e) {
      console.error("Failed to write device heartbeat to D1", e);
      c.status(500);
      return {
        success: false as const,
        errors: [{ code: 1003, message: "Database error" }],
      };
    }

    return { success: true } as const;
  }
}
