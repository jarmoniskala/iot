# Milestones

## v1.0 MVP (Shipped: 2026-02-20)

**Phases completed:** 4 phases, 7 plans
**Timeline:** 4 days (2026-02-17 → 2026-02-20)
**Codebase:** 6,817 LOC (TypeScript, TSX, CSS, SQL), 113 files, 50 commits
**Git range:** feat(01-01) → feat(04-01)

**Delivered:** Complete home IoT monitoring dashboard with real-time sensor readings, FMI weather data, historical trends, system health diagnostics, and storage monitoring.

**Key accomplishments:**
1. Data pipeline with Ruuvi sensor ingestion, validation, rate limiting, and auto-registration
2. FMI weather polling with XML parsing, pg_cron scheduling, and Vault secrets
3. Real-time dashboard with room cards, comfort metrics, weather panel, and dark mode
4. Sortable drag-to-reorder cards, room editing, and localStorage persistence
5. Historical trend charts with time range presets, room overlay, zoom/pan, and summary stats
6. System health page with severity indicators, battery/RSSI trends, and dashboard warning icons

**Known gaps:**
- HIST-04 deferred to v2 (gap visualization requires Raspberry Pi gateway for continuous data)
- 13 tech debt items (none blocking) — see milestones/v1.0-MILESTONE-AUDIT.md

**Archives:**
- milestones/v1.0-ROADMAP.md
- milestones/v1.0-REQUIREMENTS.md
- milestones/v1.0-MILESTONE-AUDIT.md

---

