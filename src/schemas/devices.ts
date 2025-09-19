import { z } from "zod";

export const DeviceStatusUpdateSchema = z.object({
  device_id: z.string().min(3).max(128),
  firmware_version: z.string().min(1),
  uptime_seconds: z.number().int().nonnegative(),
  app_state: z.string().optional(),
  ssid: z.string().optional(),
});


