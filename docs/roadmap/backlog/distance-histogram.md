---
title: Distance distribution histogram
status: Planned
target: —
---

## Goal

Show the runner how their volume is distributed across distance buckets — reveals training bias (all short runs? no long runs?) at a glance.

## Scope

- [ ] Bucket definition (e.g., <3 km, 3–5, 5–8, 8–12, 12–18, 18–25, 25+)
- [ ] Aggregate count + total km per bucket across a configurable window (30d / 90d / YTD / all-time)
- [ ] Dashboard chart component (Recharts `BarChart`)

## Technical notes

- Buckets should be opinionated runner-friendly ranges, not evenly spaced — reflects real training distribution.
- Query can be pure SQL aggregation; no need to materialize in JS.
