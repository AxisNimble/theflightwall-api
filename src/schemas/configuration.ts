import { z } from "zod";

// Configuration data model based on configurator.md

export const FlightRequestTypeSchema = z.union([z.literal("radius"), z.literal("geo")]);
export type FlightRequestType = z.infer<typeof FlightRequestTypeSchema>;

const LonLatTupleSchema = z.tuple([z.number(), z.number()]);

export const DataFiltersSchema = z.object({
  only_aircraft: z.array(z.string()).optional().nullable(),
  only_airlines: z.array(z.string()).optional().nullable(),
});
export type DataFilters = z.infer<typeof DataFiltersSchema>;

export const BaseRequestConfigSchema = z.object({
  type: FlightRequestTypeSchema,
  coordinates: z.array(LonLatTupleSchema),
  min_altitude: z.number().optional().nullable(),
  max_altitude: z.number().optional().nullable(),
  data_filters: DataFiltersSchema.optional().nullable(),
});

export const RadiusRequestConfigSchema = BaseRequestConfigSchema.extend({
  type: z.literal("radius"),
  radius_km: z.number().gt(0),
});

export const GeoRequestConfigSchema = BaseRequestConfigSchema.extend({
  type: z.literal("geo"),
});

export const RequestConfigSchema = z.union([RadiusRequestConfigSchema, GeoRequestConfigSchema]);
export type RequestConfig = z.infer<typeof RequestConfigSchema>;
export type RadiusRequestConfig = z.infer<typeof RadiusRequestConfigSchema>;
export type GeoRequestConfig = z.infer<typeof GeoRequestConfigSchema>;

export const DisplayConfigSchema = z.object({
  model: z.union([z.literal("mini-v1"), z.literal("widescreen-v1")]),
  info_layout_preset: z.union([z.literal("default"), z.literal("technical")]),
  display_layout_preset: z.union([z.literal("default"), z.literal("no_logo")]),
  anchor_airports: z.array(z.string()).max(6).optional().nullable(),
  brightness_percent: z.number().int().min(1).max(100).optional(),
  border_enable: z.boolean().optional(),
  border_brightness_percent: z.number().int().min(1).max(100).optional(),
});
export type DisplayConfig = z.infer<typeof DisplayConfigSchema>;

export const PersistedConfigurationMetaSchema = z.object({
  savedAtEpochMs: z.number().optional(),
  version: z.number().optional(),
});
export type PersistedConfigurationMeta = z.infer<typeof PersistedConfigurationMetaSchema>;

export const PersistedConfigurationSchema = z.object({
  request_config: RequestConfigSchema,
  display_config: DisplayConfigSchema.optional().nullable(),
  meta: PersistedConfigurationMetaSchema.optional(),
});
export type PersistedConfiguration = z.infer<typeof PersistedConfigurationSchema>;

// Defaults
export const DEFAULT_REQUEST_CONFIG: RadiusRequestConfig = {
  type: "radius",
  coordinates: [[-118.2437, 34.0522]],
  radius_km: 25,
  min_altitude: null,
  max_altitude: null,
  data_filters: null,
};

export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  model: "mini-v1",
  info_layout_preset: "default",
  display_layout_preset: "default",
  anchor_airports: [],
  brightness_percent: 100,
  border_enable: false,
  border_brightness_percent: 50,
};

export const DEFAULT_PERSISTED_CONFIGURATION: PersistedConfiguration = {
  request_config: DEFAULT_REQUEST_CONFIG,
  display_config: DEFAULT_DISPLAY_CONFIG,
  meta: { version: 1 },
};

export const ConfigurationGetResponseSchema = z.object({
  last_saved: z.number().optional(),
  data: z
    .object({
      request_config: RequestConfigSchema,
      display_config: DisplayConfigSchema.optional().nullable(),
    })
    .optional(),
});
export type ConfigurationGetResponse = z.infer<typeof ConfigurationGetResponseSchema>;

export const ConfigurationPostBodySchema = z.object({
  request_config: RequestConfigSchema,
  display_config: DisplayConfigSchema.optional().nullable(),
});
export type ConfigurationPostBody = z.infer<typeof ConfigurationPostBodySchema>;
