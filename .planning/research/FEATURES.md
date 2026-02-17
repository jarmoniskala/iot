# Feature Landscape

**Domain:** Home IoT indoor climate monitoring dashboard (RuuviTag BLE sensors + FMI outdoor weather)
**Researched:** 2026-02-17

## Table Stakes

Features users expect from any climate monitoring dashboard. Missing = the product feels broken or pointless.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Live readings per room | Core value proposition -- "what's the temperature right now?" | Low | Show temperature, humidity, pressure for each of the 3 rooms (bedroom, kid's room, living room) |
| Outdoor weather display | Context for indoor readings; every weather station shows indoor vs outdoor side-by-side | Low | Helsinki-Vantaa via FMI API: temperature, humidity, wind speed, pressure |
| Indoor vs outdoor comparison | Users instinctively want to compare -- "is it warmer inside or outside?" | Low | Show delta or side-by-side; trivial once both data sources exist |
| Historical trend charts | Second most requested feature after live readings; "what happened overnight?" | Medium | Line charts for temperature/humidity over selectable time ranges (24h, 7d, 30d, custom) |
| Time range selector | Useless history without the ability to zoom in/out | Low | Preset buttons (24h, 7d, 30d) plus custom date range picker |
| Mobile-responsive layout | Most users check home dashboards on their phone | Medium | Must work well on phone screens; "mobile-first, tablet-optimized" approach |
| Data freshness indicator | Users need to know if they're looking at live data or stale data | Low | "Last updated X minutes ago" per sensor; visual warning if data is old |
| Sensor battery level | RuuviTags run on CR2477 batteries; users need to know when to replace | Low | RuuviTag broadcasts battery voltage (1.6-3.647V); map to percentage or low/ok/good |
| Unit display (Celsius) | Finnish users expect Celsius, hPa for pressure | Low | Hardcode Celsius for this personal project; no unit toggle needed |

## Differentiators

Features that elevate beyond "just another temperature display." Not expected, but make the dashboard genuinely useful.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Computed comfort metrics | Dew point, absolute humidity, and "feels like" temperature calculated from raw sensor data; tells you if a room is actually comfortable vs just showing numbers | Medium | Dew point = f(temp, humidity); absolute humidity = f(temp, humidity); comfort classification (dry/comfortable/humid/very humid) |
| Mold risk indicator | Alerts when humidity near cold surfaces could cause mold (>70% RH near dew point); highly relevant for Finnish winters with cold exterior walls | Medium | Requires indoor temp, indoor humidity, and outdoor temp to estimate cold surface condensation risk |
| Room comparison overlay | Overlay multiple rooms on same chart to spot which room is coldest/most humid | Low | Multi-series line chart; trivial with any charting library |
| System health dashboard | Dedicated view showing sensor diagnostics: battery trends, signal strength (TX power), movement counter, measurement sequence gaps, last-seen timestamps | Medium | Unique to this project's spec; uses RuuviTag's full RAWv2 data (battery, TX power, movement counter, sequence number) |
| Data gap detection | Visual markers on charts where data is missing (sensor offline, gateway down) | Medium | Detect gaps in measurement sequence or time; render as dashed lines or shaded regions on charts |
| Ventilation suggestion | "Open windows" indicator when outdoor air is cooler/drier than indoor and conditions are comfortable | Low | Compare indoor vs outdoor temp and humidity; simple threshold logic |
| FMI weather enrichment | Show wind speed, cloud cover, precipitation, and visibility alongside temperature; gives full outdoor context | Low | FMI provides all these parameters; just display them |
| Daily/weekly summary stats | Min, max, average per room per day; useful for spotting trends without staring at charts | Medium | Aggregate queries on historical data; display as compact cards or table |
| Dark mode | Dashboard often viewed in bed (checking bedroom temp) or on wall-mounted display | Low | CSS theme toggle; implement from the start in Tailwind |

## Anti-Features

Features to deliberately NOT build. Each would add complexity without proportional value for a personal/household dashboard.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User authentication / multi-tenant | This is a personal dashboard for one household, not a SaaS product. Auth adds complexity and login friction. | Deploy as a private dashboard; use Vercel's built-in password protection or IP allowlist if needed |
| Push notifications / SMS alerts | Requires notification infrastructure (service workers, SMS provider, mobile app). Over-engineered for 3 sensors in your own home. | Visual alerts on the dashboard itself; check the dashboard when you want to |
| Thermostat / HVAC control | Controlling devices is a completely different domain (actuation vs monitoring). Mixing them creates safety concerns and doubles the architecture complexity. | Keep it read-only. Use Home Assistant or similar if control is needed. |
| Complex alerting rules engine | Configurable alert thresholds, escalation policies, snooze rules -- enterprise monitoring features that add UI/UX complexity for minimal personal value. | Hardcode a few sensible thresholds (battery low, sensor offline, extreme temp) as visual indicators |
| Data export to CSV/Excel | Nice in theory, rarely used in practice for a personal dashboard. The data lives in Supabase (PostgreSQL) -- just query it directly if needed. | Provide a Supabase dashboard link or document a SQL query for ad-hoc exports |
| Unit conversion toggle (F/C) | Only one household in Finland using this. Adding unit preferences means state management, storage, and UI for a feature nobody will toggle. | Hardcode Celsius, hPa, m/s |
| Sensor configuration UI | Adding/removing/renaming sensors through the dashboard. With 3 fixed sensors, this is unnecessary UI. | Configure sensors in code or environment variables |
| Real-time WebSocket updates | Sub-second live updates require WebSocket infrastructure. RuuviTags broadcast every 2.5 seconds, but the Ruuvi Station app batches and forwards less frequently. | Poll on a reasonable interval (30-60 seconds) or use Supabase Realtime for simple subscription; don't build custom WebSocket server |
| Historical data downsampling / archival | "All data kept indefinitely" is the requirement, and PostgreSQL handles millions of rows fine for a 3-sensor setup. Building time-bucketed aggregation tables is premature optimization. | Use simple queries with date filters. Revisit only if query performance degrades (unlikely for years with 3 sensors at ~1 reading/minute) |
| Forecast display | Showing FMI weather forecasts alongside actuals. Adds a different data pipeline and UI for something users already get from any weather app. | Link to FMI or yr.no for forecasts; focus dashboard on observed data |

## Feature Dependencies

```
Live readings per room -----> Historical trend charts (need data storage first)
                       \
                        \---> System health dashboard (uses same data pipeline)

FMI outdoor weather --------> Indoor vs outdoor comparison
                       \
                        \---> Ventilation suggestion (needs both indoor + outdoor)
                        \---> Mold risk indicator (needs outdoor temp + indoor humidity)

Historical trend charts ----> Room comparison overlay (multi-series on same chart)
                       \
                        \---> Data gap detection (markers on existing charts)
                        \---> Daily/weekly summary stats (aggregation of stored data)

Live readings per room -----> Computed comfort metrics (derived from temp + humidity)

Sensor battery level -------> System health dashboard (battery is one health metric)
Data freshness indicator ---> System health dashboard (freshness is a health signal)
```

## MVP Recommendation

### Phase 1: Core monitoring (build first)
1. **Live readings per room** -- the entire point of the project
2. **Outdoor weather display** -- FMI integration
3. **Indoor vs outdoor comparison** -- trivial once both data sources exist
4. **Data freshness indicator** -- trust signal; users must know data is live
5. **Sensor battery level** -- prevents surprise dead sensors
6. **Mobile-responsive layout** -- most viewing will be on phone

### Phase 2: Historical data and health
7. **Historical trend charts** with **time range selector** -- second-highest value feature
8. **System health dashboard** -- battery trends, signal, movement, sequence gaps
9. **Data gap detection** -- visual markers on charts

### Phase 3: Computed insights
10. **Computed comfort metrics** -- dew point, absolute humidity, comfort classification
11. **Room comparison overlay** -- multi-room chart comparison
12. **Daily/weekly summary stats** -- min/max/avg aggregations
13. **Dark mode** -- CSS theme, low effort

### Defer indefinitely
- **Mold risk indicator** -- compelling but needs validation of the cold-surface estimation model; revisit after core is stable
- **Ventilation suggestion** -- fun but gimmicky; revisit based on actual usage patterns
- **FMI weather enrichment** (beyond basic temp/humidity/wind) -- only if users find outdoor context insufficient

## Available Data Fields Reference

### RuuviTag RAWv2 (Data Format 5) -- per sensor
| Field | Range | Resolution | Dashboard Use |
|-------|-------|-----------|---------------|
| Temperature | -163.8 to +163.8 C | 0.005 C | Primary display |
| Humidity | 0 to 163.8% RH | 0.0025% | Primary display |
| Pressure | 500 to 1155 hPa | 0.01 hPa | Primary display |
| Battery voltage | 1.6 to 3.647 V | 1 mV | Battery indicator, health view |
| TX Power | -40 to +20 dBm | 2 dBm | Health view (signal strength proxy) |
| Acceleration X/Y/Z | -32.7 to +32.7 G | 1 mG | Health view (has sensor been moved/fallen?) |
| Movement counter | 0-254 | 1 | Health view (physical disturbance detection) |
| Measurement sequence | 0-65534 | 1 | Gap detection (missing sequence = data loss) |
| MAC address | 48-bit | -- | Sensor identification |

### FMI API (Helsinki-Vantaa) -- outdoor
| Parameter | Dashboard Use |
|-----------|---------------|
| Temperature | Primary display, indoor/outdoor comparison |
| Humidity | Primary display, comparison |
| DewPoint | Comfort metrics, mold risk |
| Pressure | Display (cross-reference with indoor) |
| WindSpeedMS | Outdoor conditions context |
| WindDirection | Outdoor conditions context |
| WindGust | Outdoor conditions context |
| PrecipitationAmount | Outdoor conditions context |
| TotalCloudCover | Outdoor conditions context |
| Visibility | Outdoor conditions context |

## Sources

- [RuuviTag Data Format 5 (RAWv2)](https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-5-rawv2) -- official Ruuvi documentation
- [FMI Open Data Sets](https://en.ilmatieteenlaitos.fi/open-data-sets-available) -- Finnish Meteorological Institute
- [FMI Open Data Manual](https://en.ilmatieteenlaitos.fi/open-data-manual) -- API access documentation
- [Ruuvi Station App](https://ruuvi.com/quick-start-ruuvi-station/) -- official quick start guide
- [Thermal Comfort integration](https://github.com/dolezsa/thermal_comfort) -- Home Assistant community project for derived comfort metrics
- [Home Assistant Mold Indicator](https://www.home-assistant.io/integrations/mold_indicator/) -- mold risk calculation methodology
- [Kaiterra IAQ Dashboard Guide](https://learn.kaiterra.com/en/resources/indoor-air-quality-dashboard-what-to-look-for) -- table stakes analysis for monitoring dashboards
- [ThingsBoard IoT Monitoring](https://thingsboard.io/monitoring-dashboard/) -- commercial IoT dashboard feature reference
- [Smart Home Dashboard UX Design](https://developex.com/blog/smart-home-dashboard-ux-design/) -- UX patterns for IoT dashboards
- [Dashboard UX Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards) -- data dashboard design best practices
