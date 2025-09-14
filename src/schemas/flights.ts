import { z } from "zod";

// Flight model
export const FlightSchema = z.object({
  // Core identification
  icao24: z.string().optional(),
  callsign: z.string().optional(),
  registration: z.string().optional(),

  // Position data
  position_lat: z.number().optional(),
  position_lon: z.number().optional(),

  // Altitude data (meters)
  position_altitude_baro: z.number().optional(),
  position_altitude_geo: z.number().optional(),

  // Speed and movement
  position_velocity: z.number().optional(), // m/s
  position_true_track: z.number().optional(), // degrees
  position_vertical_rate: z.number().optional(), // m/s

  // Flight status
  position_on_ground: z.boolean().optional(),
  position_squawk: z.string().optional(),

  // Route information
  route_origin_icao: z.string().optional(),
  route_origin_iata: z.string().optional(),
  route_dest_icao: z.string().optional(),
  route_dest_iata: z.string().optional(),
  route_origin_readable: z.string().optional(),
  route_destination_readable: z.string().optional(),

  // Airline information
  airline_code: z.string().optional(),
  airline_painted_as: z.string().optional(),
  airline_operating_as: z.string().optional(),
  airline_name_readable: z.string().optional(),
  airline_logo_url: z.string().url().optional(),

  // Aircraft type
  aircraft_type: z.string().optional(),

  // Metadata
  meta_origin_country: z.string().optional(),
  meta_last_contact: z.number().int().optional(), // unix timestamp
  meta_timestamp: z.string().optional(),
  meta_source: z.string().optional(),
});

export type Flight = z.infer<typeof FlightSchema>;

// Request models
export const FlightRadiusRequestSchema = z.object({
  type: z.literal("radius"),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  radius_km: z.number().gt(0),
  min_altitude: z.number().int().gte(0).optional(),
  max_altitude: z.number().int().gte(0).optional(),
});

export const FlightGeoRequestSchema = z.object({
  type: z.literal("geo"),
  coordinates: z.array(z.array(z.number())), // [ [lon, lat], ... ]
  min_altitude: z.number().int().gte(0).optional(),
  max_altitude: z.number().int().gte(0).optional(),
});

export const DataFiltersSchema = z.object({
  only_aircraft: z.array(z.string()).optional(),
  only_airlines: z.array(z.string()).optional(),
});

export const DisplayConfigSchema = z.object({
  model: z.string().default("mini-v1"),
  info_layout_preset: z.enum(["default", "technical"]).default("default"),
  display_layout_preset: z.enum(["default", "no_logo"]).default("default"),
  anchor_airports: z.array(z.string()).optional(),
});

export const FlightRequestSchema = z.object({
  radius_request: FlightRadiusRequestSchema.optional(),
  geo_request: FlightGeoRequestSchema.optional(),
  data_filters: DataFiltersSchema.optional(),
  display_config: DisplayConfigSchema.optional(),
});

export type FlightRadiusRequest = z.infer<typeof FlightRadiusRequestSchema>;
export type FlightGeoRequest = z.infer<typeof FlightGeoRequestSchema>;
export type DataFilters = z.infer<typeof DataFiltersSchema>;
export type DisplayConfig = z.infer<typeof DisplayConfigSchema>;
export type FlightRequest = z.infer<typeof FlightRequestSchema>;

// Response
export const FlightResponseSchema = z.object({
  flights: z.array(FlightSchema).default([]),
});

export type FlightResponse = z.infer<typeof FlightResponseSchema>;
