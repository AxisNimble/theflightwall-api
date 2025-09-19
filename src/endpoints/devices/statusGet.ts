import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";

export class DeviceStatusGet extends OpenAPIRoute {
  public schema = {
    tags: ["Devices"],
    summary: "Get latest device status",
    operationId: "devices-status-get",
    request: {
      params: z.object({ device_id: z.string().min(3).max(128) }),
    },
    responses: {
      "200": {
        description: "OK",
        content: { "application/json": { schema: z.any() } },
      },
      "404": {
        description: "Not Found",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(false),
              errors: z.array(z.object({ code: z.number().int(), message: z.string() })),
            }),
          },
        },
      },
    },
  };

  public async handle(c: AppContext) {
    const apiKey = c.req.header("x-api-key") || "";
    const { params } = await this.getValidatedData<typeof this.schema>();
    const row = await c.env.DB.prepare(
      `SELECT h.device_id, h.app_state, h.ssid, h.uptime_seconds, h.firmware_version, h.timestamp
       FROM devices d
       JOIN device_heartbeats h ON h.device_id = d.device_id
       WHERE d.api_key = ? AND d.device_id = ?
       ORDER BY h.timestamp DESC
       LIMIT 1`
    )
      .bind(apiKey, params.device_id)
      .first<{
        device_id: string;
        app_state: string | null;
        ssid: string | null;
        uptime_seconds: number;
        firmware_version: string;
        timestamp: string;
      }>();

    if (!row) {
      c.status(404);
      return { success: false, errors: [{ code: 4041, message: "Device status not found" }] } as const;
    }

    return {
      device_id: row.device_id,
      app_state: row.app_state ?? undefined,
      ssid: row.ssid ?? undefined,
      uptime_seconds: row.uptime_seconds,
      firmware_version: row.firmware_version,
      last_seen: row.timestamp,
    } as const;
  }
}


