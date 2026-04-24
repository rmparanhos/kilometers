---
title: Cadence distribution histogram
status: Planned
target: —
---

## Goal

Surface cadence patterns — both per-activity (is this run's cadence typical?) and aggregate (what's the runner's natural cadence range?).

## Scope

- [ ] Per-activity cadence curve on the activity detail page
- [ ] Aggregate cadence histogram on the dashboard (spm frequency across recent runs)
- [ ] Highlight the 180 spm reference line (common coaching target)

## Technical notes

- Cadence comes from per-second records in `rawDataJson`. `.fit` exposes it directly; `.gpx` typically doesn't — gracefully hide the chart when data is missing.
- Bucket width: 2 spm gives a readable curve without over-smoothing.
