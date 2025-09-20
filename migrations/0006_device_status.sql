-- Define device status tables (clean schema)
CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  flashed_at TIMESTAMP,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (device_id, api_key)
);

CREATE TABLE IF NOT EXISTS device_heartbeats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  app_state TEXT,
  ssid TEXT,
  uptime_seconds INTEGER NOT NULL,
  firmware_version TEXT NOT NULL,
  last_seen TIMESTAMP,
  ip TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_heartbeats_device_time
  ON device_heartbeats(device_id, timestamp DESC);


