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
    const { body } = await this.getValidatedData<typeof this.schema>();

    const now = new Date().toISOString();

    const record = {
      ...body,
      api_key: apiKey,
      last_seen: now,
      ip: c.req.header("cf-connecting-ip") || undefined,
      user_agent: c.req.header("user-agent") || undefined,
    };

    // Enforce 30-minute interval via D1 latest check
    try {
      const latest = await c.env.DB.prepare(
        `SELECT timestamp FROM device_heartbeats WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1`
      )
        .bind(body.device_id)
        .first<{ timestamp: string }>();

      if (latest) {
        const last = new Date(latest.timestamp).getTime();
        const nowMs = Date.now();
        if (nowMs - last < 30 * 60 * 1000) {
          c.status(429);
          return {
            success: false,
            errors: [{ code: 1202, message: "Status updates limited to once every 30 minutes" }],
          } as const;
        }
      }

      // Append to D1 for history/analytics
      await c.env.DB.prepare(
        `INSERT INTO device_heartbeats (device_id, app_state, ssid, uptime_seconds, firmware_version)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(
          body.device_id,
          body.app_state ?? null,
          body.ssid ?? null,
          body.uptime_seconds,
          body.firmware_version
        )
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
      // Swallow D1 errors to not block ingestion; observability can capture logs
      console.warn("Failed to write device heartbeat to D1", e);
    }

    return { success: true } as const;
  }
}


