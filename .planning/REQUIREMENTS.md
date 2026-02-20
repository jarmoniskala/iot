# Requirements: Home IoT Monitor

**Defined:** 2026-02-17
**Core Value:** See current and historical temperature, humidity, and pressure across every room at a glance, with outdoor weather context from FMI.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Pipeline

- [ ] **PIPE-01**: Supabase edge function receives HTTP POST from Ruuvi Station Android app and stores sensor readings
- [ ] **PIPE-02**: Edge function validates incoming sensor data (known MAC, realistic ranges, deduplication)
- [ ] **PIPE-03**: FMI API polled on schedule via pg_cron + pg_net (every 10 min) and stored in database
- [ ] **PIPE-04**: FMI XML/GML response parsed correctly for Helsinki-Vantaa airport station (FMISID 100968)
- [x] **PIPE-05**: Database storage usage monitored and displayed on dashboard
- [ ] **PIPE-06**: Supabase project kept alive (prevent 7-day inactivity pause)

### Live Dashboard

- [ ] **LIVE-01**: User can see current temperature, humidity, and pressure for each room (bedroom, kid's room, living room)
- [ ] **LIVE-02**: User can see current outdoor weather from FMI (temperature, humidity, wind speed, pressure, precipitation, cloud cover)
- [ ] **LIVE-03**: User can compare indoor vs outdoor readings side-by-side
- [ ] **LIVE-04**: Each sensor shows "last updated X minutes ago" with visual warning if data is stale
- [ ] **LIVE-05**: Each sensor shows battery level indicator (low/ok/good)
- [ ] **LIVE-06**: Dashboard is mobile-responsive (works well on phone screens)
- [ ] **LIVE-07**: Dashboard supports dark mode toggle

### Historical Data

- [ ] **HIST-01**: User can view historical trend charts (line charts) for temperature, humidity, and pressure per room
- [ ] **HIST-02**: User can select time range via presets (24h, 7d, 30d) and custom date range picker
- [ ] **HIST-03**: User can overlay multiple rooms on the same chart for comparison
- [ ] **HIST-04**: Charts show visual markers where data gaps exist (sensor offline, phone away)
- [ ] **HIST-05**: User can view daily/weekly summary stats (min, max, average) per room

### System Health

- [ ] **HLTH-01**: Dedicated system health view shows battery voltage trends per sensor
- [ ] **HLTH-02**: System health view shows signal strength (RSSI) per sensor
- [ ] **HLTH-03**: System health view shows movement counter and last-seen timestamps
- [ ] **HLTH-04**: System health view shows measurement sequence gaps (data loss detection)

### Computed Insights

- [ ] **COMP-01**: Dashboard shows dew point calculated from temperature and humidity per room
- [ ] **COMP-02**: Dashboard shows absolute humidity per room
- [ ] **COMP-03**: Dashboard shows comfort classification per room (dry/comfortable/humid/very humid)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Reliability Upgrade

- **RELY-01**: Raspberry Pi as always-on BLE gateway (replaces phone dependency)

### Advanced Insights

- **ADVN-01**: Mold risk indicator based on indoor humidity, temperature, and outdoor temperature
- **ADVN-02**: Ventilation suggestion ("open windows" indicator based on indoor vs outdoor conditions)

### Weather Enrichment

- **WTHR-01**: Show visibility and cloud cover detail alongside basic FMI weather data

## Out of Scope

| Feature | Reason |
|---------|--------|
| User authentication / multi-tenant | Personal dashboard for one household, not a SaaS product |
| Push notifications / SMS alerts | Using Ruuvi Station app's built-in alerts; no notification infrastructure |
| Thermostat / HVAC control | Read-only monitoring; actuation is a different domain |
| Alerting rules engine | Hardcoded visual indicators sufficient for personal use |
| Data export to CSV | Data lives in PostgreSQL; query directly if needed |
| Unit conversion (F/C) | Finnish household; hardcode Celsius, hPa, m/s |
| Sensor configuration UI | 3 fixed sensors; configure in code/env vars |
| Weather forecasts | Users already have weather apps; focus on observed data |
| Ruuvi Cloud integration | Direct data forwarding to Supabase instead |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | Phase 1 | Pending |
| PIPE-02 | Phase 1 | Pending |
| PIPE-03 | Phase 1 | Pending |
| PIPE-04 | Phase 1 | Pending |
| PIPE-05 | Phase 4 | Complete |
| PIPE-06 | Phase 1 | Pending |
| LIVE-01 | Phase 2 | Pending |
| LIVE-02 | Phase 2 | Pending |
| LIVE-03 | Phase 2 | Pending |
| LIVE-04 | Phase 2 | Pending |
| LIVE-05 | Phase 2 | Pending |
| LIVE-06 | Phase 2 | Pending |
| LIVE-07 | Phase 2 | Pending |
| HIST-01 | Phase 3 | Pending |
| HIST-02 | Phase 3 | Pending |
| HIST-03 | Phase 3 | Pending |
| HIST-04 | Phase 3 | Deferred (v2 — RELY-01 prerequisite) |
| HIST-05 | Phase 3 | Pending |
| HLTH-01 | Phase 3 | Pending |
| HLTH-02 | Phase 3 | Pending |
| HLTH-03 | Phase 3 | Pending |
| HLTH-04 | Phase 3 | Pending |
| COMP-01 | Phase 2 | Pending |
| COMP-02 | Phase 2 | Pending |
| COMP-03 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25 (PIPE-05 moved to Phase 4)
- Deferred to v2: 1 (HIST-04 — requires RELY-01)
- Unmapped: 0

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-17 after roadmap creation*
