---
title: Shoe tracking
status: Planned
target: —
---

## Goal

Track lifetime km per shoe, surface pace trend over the shoe's lifespan, and alert when a pair approaches its retirement threshold — a concrete quality-of-life feature runners ask for from every platform.

## Scope

- [ ] Shoe CRUD (`/equipment` — placeholder page already exists)
- [ ] Assign shoe to activity (default + manual override)
- [ ] Accumulated km per shoe with retirement threshold (user-configurable, default 600 km)
- [ ] Pace trend over shoe lifespan (is this pair getting slower?)
- [ ] Retirement alert at 80% of threshold

## Technical notes

- Schema: `shoes (id, userId, name, brand, model, thresholdKm, retiredAt)` + `activities.shoeId` FK.
- Default assignment: sticky per user — whatever shoe was used most recently is the default for the next import.
- Pace trend: compare activity average pace against the runner's baseline, not absolute — a runner naturally gets faster or slower over months independent of shoes.
