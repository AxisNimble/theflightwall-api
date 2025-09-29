import { z } from "zod";

// Configuration data model aligned to device firmware schema

export const FlightRequestTypeSchema = z.union([z.literal("radius"), z.literal("geo")]);
export type FlightRequestType = z.infer<typeof FlightRequestTypeSchema>;

const LonLatTupleSchema = z.tuple([z.number(), z.number()]);

export const DataFiltersSchema = z.object({
  only_aircraft: z.array(z.string()).optional().nullable(),
  only_airlines: z.array(z.string()).optional().nullable(),
});
export type DataFilters = z.infer<typeof DataFiltersSchema>;

// Requests
export const RadiusRequestSchema = z.object({
  type: z.literal("radius"),
  latitude: z.number(),
  longitude: z.number(),
  radius_km: z.number().gt(0),
  min_altitude: z.number().nullable().optional(),
  max_altitude: z.number().nullable().optional(),
});
export type RadiusRequest = z.infer<typeof RadiusRequestSchema>;

export const GeoRequestSchema = z.object({
  type: z.literal("geo"),
  coordinates: z.array(LonLatTupleSchema),
  min_altitude: z.number().nullable().optional(),
  max_altitude: z.number().nullable().optional(),
});
export type GeoRequest = z.infer<typeof GeoRequestSchema>;

export const RequestConfigSchema = z.object({
  radius_request: RadiusRequestSchema.nullable().optional(),
  geo_request: GeoRequestSchema.nullable().optional(),
  data_filters: DataFiltersSchema.nullable().optional(),
});
export type RequestConfig = z.infer<typeof RequestConfigSchema>;

// Display
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

// Persisted configuration
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
export const DEFAULT_RADIUS_REQUEST: RadiusRequest = {
  type: "radius",
  latitude: 34.0522,
  longitude: -118.2437,
  radius_km: 25,
  min_altitude: null,
  max_altitude: null,
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
  request_config: { radius_request: DEFAULT_RADIUS_REQUEST, geo_request: null, data_filters: null },
  display_config: DEFAULT_DISPLAY_CONFIG,
  meta: { version: 1 },
};

// Responses/Bodies
export const ConfigurationGetResponseSchema = z.union([
  z.object({}).strict(),
  z.object({
    request_config: RequestConfigSchema,
    display_config: DisplayConfigSchema.optional().nullable(),
  }),
]);
export type ConfigurationGetResponse = z.infer<typeof ConfigurationGetResponseSchema>;

export const ConfigurationPostBodySchema = z.object({
  request_config: RequestConfigSchema,
  display_config: DisplayConfigSchema.optional().nullable(),
});
export type ConfigurationPostBody = z.infer<typeof ConfigurationPostBodySchema>;
