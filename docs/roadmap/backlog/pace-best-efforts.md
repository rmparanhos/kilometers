---
title: Pace best-effort curves
status: Planned
target: —
---

## Goal

For each canonical distance (1 km, 5 km, 10 km, 21.1 km, 42.2 km), show the runner's best time over time — a longitudinal PR chart separate from the Critical Speed model.

## Scope

- [ ] Rolling best extraction from per-second records (sliding window for each distance)
- [ ] Store per-activity best efforts in a dedicated table (avoid recomputing on every dashboard load)
- [ ] Line chart per distance; overlay on a single canvas with distance selector
- [ ] Highlight new PRs

## Technical notes

- Sliding-window best effort is O(n) per distance per activity with a deque; fine to compute at ingest time.
- Relationship to Critical Speed: CS is a *model fit* across durations; this feature is raw bests per canonical distance. Complementary, not redundant.
- Schema addition: `activity_best_efforts (activityId, distanceMeters, timeSeconds)` indexed on (distanceMeters, timeSeconds).
