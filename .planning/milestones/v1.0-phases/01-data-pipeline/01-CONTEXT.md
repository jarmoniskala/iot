# Phase 1: Data Pipeline - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Sensor data flows reliably from RuuviTags through the Android app into Supabase, and FMI weather data is polled automatically every 10 minutes. The database accumulates data 24/7. This phase covers schema, ingestion edge function, FMI polling, and infrastructure reliability. Dashboard UI and computed metrics are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Sensor mapping
- Use sensor name from Ruuvi Station Android app (user-assigned name in the app)
- If sensor has default/unnamed value, the UI should indicate it hasn't been properly named (Phase 2 concern, but pipeline should preserve the raw name)
- 4 sensors initially: bedroom, living room, kid's room, outdoors (outdoors will move to office later)
- Accept readings from any RuuviTag — new sensors show up automatically
- Unregistered/unnamed sensors categorized differently in UI
- Sensor config table maps MAC addresses to rooms with timestamps, supporting:
  - **Repurposing**: tag moves rooms — old data stays with old room name
  - **Replacement**: new tag replaces broken tag in same room — new tag inherits room
- Sensor management UI in Phase 2 dashboard
- Store all available RuuviTag fields (temp, humidity, pressure, battery, RSSI, movement counter, TX power, etc.)
- Also store raw JSON payload in JSONB column for debugging and format changes

### Weather data scope
- FMI station: Helsinki-Vantaa airport (FMISID 100968), balcony coordinates ~60.326°N, 25.040°E
- One station is sufficient — no multi-station support needed
- Store all available FMI parameters (temperature, humidity, wind speed/direction, pressure, precipitation, cloud cover, dew point, visibility, etc.)
- Observations only — no forecast storage (forecasts can be shown live on UI in Phase 2 but not persisted)
- Historical weather observations stored in parallel with sensor data for indoor/outdoor correlation analysis
- Polling every 10 minutes (matches FMI update frequency)
- Log failed FMI fetches for Phase 3 health view visibility
- FMI fetching and XML parsing via Supabase Edge Function (not inside database)

### Data expectations
- Ruuvi Station cloud forwarding interval: unknown — researcher to verify default
- Keep all raw data forever (no aggregation, no deletion)
- Free tier Supabase (500MB limit) — monitor storage usage and alert when approaching limit, user decides strategy
- Monthly partitioning for sensor readings tables
- Staleness defined by missed update cycles, not absolute time: 3 consecutive missed updates = stale warning

### Ingestion behavior
- Duplicate readings (same sensor + timestamp): reject silently, return success to app, log the duplicate
- Outlier detection: store all readings but flag suspicious values; exclude flagged values from reports, calculations, and computed metrics; show flagged values in logs
- Authentication: Supabase anon key
- Backfill: accept all readings regardless of age — fill gaps when phone reconnects
- Rate limiting: yes, reasonable limit to prevent abuse
- Basic ingestion metrics: track counts, error rates (feeds Phase 3 health view)

### Claude's Discretion
- Edge function response format (status only vs. echo back)
- Keep-alive strategy (whether FMI polling alone prevents Supabase pause)
- Partition automation implementation details
- Outlier detection thresholds and algorithm
- Rate limiting specifics

</decisions>

<specifics>
## Specific Ideas

- User wants to correlate outdoor weather observations with indoor sensor readings over time — historical weather storage is motivated by this analysis goal
- Sensor config table needs timestamp-based assignment history to support both repurposing (tag moves rooms) and replacement (new tag in same room) scenarios
- "Alert me and I'll decide" approach to storage management — no automatic aggregation or deletion

</specifics>

<deferred>
## Deferred Ideas

- Sensor management UI — Phase 2
- Forecast display on dashboard — Phase 2
- Indoor/outdoor correlation analysis views — Phase 3

</deferred>

---

*Phase: 01-data-pipeline*
*Context gathered: 2026-02-17*
