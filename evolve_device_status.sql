PRAGMA foreign_keys=OFF;

-- devices → add flashed_at, rename first_seen → first_seen_at
CREATE TABLE IF NOT EXISTS devices_new (
  device_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  flashed_at TIMESTAMP,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (device_id, api_key)
);

INSERT INTO devices_new (device_id, api_key, flashed_at, first_seen_at)
SELECT device_id,
       api_key,
       NULL as flashed_at,
       COALESCE(first_seen, CURRENT_TIMESTAMP) as first_seen_at
FROM devices;

DROP TABLE devices;
ALTER TABLE devices_new RENAME TO devices;

-- device_heartbeats → drop api_key, add app_state, ssid, firmware_version, timestamp
CREATE TABLE IF NOT EXISTS device_heartbeats_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  app_state TEXT,
  ssid TEXT,
  uptime_seconds INTEGER NOT NULL,
  firmware_version TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO device_heartbeats_new (device_id, app_state, ssid, uptime_seconds, firmware_version, timestamp)
SELECT device_id,
       NULL as app_state,
       NULL as ssid,
       uptime_seconds,
       'unknown' as firmware_version,
       COALESCE(created_at, CURRENT_TIMESTAMP) as timestamp
FROM device_heartbeats;

DROP TABLE device_heartbeats;
ALTER TABLE device_heartbeats_new RENAME TO device_heartbeats;

CREATE INDEX IF NOT EXISTS idx_device_heartbeats_device_time ON device_heartbeats(device_id, timestamp DESC);

PRAGMA foreign_keys=ON;
