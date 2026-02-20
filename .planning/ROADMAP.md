# Roadmap: Home IoT Monitor

## Overview

Three-phase delivery from data pipeline to full dashboard. Phase 1 gets real sensor data flowing into Supabase and FMI weather polling running -- nothing else matters until the database has data. Phase 2 builds the live dashboard that displays current readings per room with outdoor weather context and computed comfort metrics. Phase 3 adds historical trend charts, system health monitoring, and data gap visualization. Each phase delivers a complete, verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Pipeline** - Supabase schema, Ruuvi ingestion edge function, FMI weather polling, and infrastructure reliability (completed 2026-02-17)
- [ ] **Phase 2: Live Dashboard** - Real-time room readings, outdoor weather, computed comfort metrics, and mobile-responsive UI
- [ ] **Phase 3: History and Health** - Historical trend charts with time range selection, system health diagnostics, and data gap visualization
- [ ] **Phase 4: Storage Dashboard Widget** - Front-end display of database storage usage on dashboard (gap closure for PIPE-05)

## Phase Details

### Phase 1: Data Pipeline
**Goal**: Sensor data flows reliably from RuuviTags through the Android app into Supabase, and FMI weather data is polled automatically every 10 minutes -- the database accumulates data 24/7
**Depends on**: Nothing (first phase)
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06
**Success Criteria** (what must be TRUE):
  1. Ruuvi Station Android app successfully POSTs sensor readings to the Supabase edge function and data appears in the database within seconds
  2. FMI weather data for Helsinki-Vantaa airport is automatically fetched every 10 minutes and stored, with no manual intervention
  3. Invalid or duplicate sensor readings are rejected by the edge function without corrupting stored data
  4. Database storage usage is queryable and the Supabase project stays active indefinitely (no 7-day pause)
**Plans:** 2/2 plans complete

Plans:
- [ ] 01-01-PLAN.md -- Database schema (all tables, partitions, functions) and Ruuvi sensor ingestion edge function
- [ ] 01-02-PLAN.md -- FMI weather polling edge function, pg_cron scheduled jobs, and infrastructure reliability

### Phase 2: Live Dashboard
**Goal**: User opens a URL on any device and sees current temperature, humidity, and pressure for every room plus outdoor weather and comfort indicators -- the primary value of the entire project
**Depends on**: Phase 1
**Requirements**: LIVE-01, LIVE-02, LIVE-03, LIVE-04, LIVE-05, LIVE-06, LIVE-07, COMP-01, COMP-02, COMP-03
**Success Criteria** (what must be TRUE):
  1. User can see current temperature, humidity, and pressure for bedroom, kid's room, and living room on a single page
  2. User can see current outdoor weather from FMI (temperature, humidity, wind, pressure, precipitation, cloud cover) alongside indoor readings
  3. Each sensor shows how recently it was updated, with a visual warning when data is stale, and a battery level indicator
  4. User can view dew point, absolute humidity, and comfort classification (dry/comfortable/humid/very humid) per room
  5. Dashboard works well on phone screens and supports dark mode toggle
**Plans:** 2 plans

Plans:
- [ ] 02-01-PLAN.md -- Next.js project scaffold, Supabase clients, database migration (Realtime + views + RLS), utility functions, and full dashboard with room cards, weather panel, Realtime subscriptions, and responsive layout
- [ ] 02-02-PLAN.md -- Sortable card grid with drag-to-reorder, sort controls, room name/icon editing, mobile collapsible weather, and dark mode toggle

### Phase 3: History and Health
**Goal**: User can explore how conditions have changed over time with trend charts and verify that all sensors are operating correctly through a dedicated health view
**Depends on**: Phase 2
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05, HLTH-01, HLTH-02, HLTH-03, HLTH-04
**Success Criteria** (what must be TRUE):
  1. User can view historical line charts for temperature, humidity, and pressure per room over selectable time ranges (24h, 7d, 30d, custom)
  2. User can overlay multiple rooms on the same chart and see daily/weekly summary stats (min, max, average)
  3. Charts visually indicate where data gaps exist (sensor offline or phone away)
  4. User can view a dedicated system health page showing battery voltage trends, signal strength, movement counter, and last-seen timestamps per sensor
**Plans:** 2 plans

Plans:
- [ ] 03-01-PLAN.md -- Database functions (aggregation, gap detection, summary stats), dependencies (recharts, @tanstack/react-table), navigation header, shared hooks, and history page with trend charts, time range picker, room overlay, zoom/pan, gap visualization, and summary stats
- [ ] 03-02-PLAN.md -- System health page with sortable/expandable sensor table, severity indicators, battery/RSSI trend mini-charts, and dashboard warning icons linking to health page

### Phase 4: Storage Dashboard Widget
**Goal**: Database storage usage is visible on the dashboard so the user can monitor Supabase free-tier consumption at a glance
**Depends on**: Phase 2
**Requirements**: PIPE-05
**Gap Closure:** Closes PIPE-05 gap from v1.0 audit — infrastructure (PostgreSQL functions + cron job) exists in Phase 1 but front-end display was never built
**Success Criteria** (what must be TRUE):
  1. Dashboard displays current database size (MB) and per-table breakdown
  2. Data comes from existing `get_database_size_mb()` / `get_table_sizes()` functions or `ingestion_log` storage entries
**Plans:** 0 plans

Plans:
- (none yet — run `/gsd:plan-phase 4`)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Pipeline | 0/2 | Complete    | 2026-02-17 |
| 2. Live Dashboard | 0/2 | Not started | - |
| 3. History and Health | 0/2 | Not started | - |
| 4. Storage Dashboard Widget | 0/0 | Not started | - |
