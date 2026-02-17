-- seed.sql
-- Initial sensor configuration entries for 4 known RuuviTag sensors.
--
-- NOTE: MAC addresses are placeholders. After the first successful POST from
-- the Ruuvi Station Android app, check the sensor_readings table for actual
-- MAC addresses and update the entries below, or simply let the auto-registration
-- in the ingest-sensors edge function create entries with real MACs.
--
-- To update a placeholder with a real MAC:
--   UPDATE sensor_config
--   SET mac_address = 'AA:BB:CC:DD:EE:FF'
--   WHERE mac_address = 'XX:XX:XX:XX:XX:01';

INSERT INTO sensor_config (mac_address, display_name, room_name, notes)
VALUES
  ('XX:XX:XX:XX:XX:01', 'Bedroom',      'Bedroom',      'Replace MAC after first POST'),
  ('XX:XX:XX:XX:XX:02', 'Living room',   'Living room',   'Replace MAC after first POST'),
  ('XX:XX:XX:XX:XX:03', 'Kid''s room',   'Kid''s room',   'Replace MAC after first POST'),
  ('XX:XX:XX:XX:XX:04', 'Outdoors',      'Outdoors',      'Will move to office later. Replace MAC after first POST');
