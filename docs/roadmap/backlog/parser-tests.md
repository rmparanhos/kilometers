---
title: Parser unit tests
status: Planned
target: —
---

## Goal

Lock down `.fit` and `.gpx` parsing behavior with tests so future changes (new fields, vendor quirks, schema tweaks) don't silently corrupt ingested data.

## Scope

- [ ] Fixture library: real-world `.fit` and `.gpx` files from Garmin, Coros, Polar, Suunto, Strava export
- [ ] Happy-path tests: distance, duration, avg HR, per-second records, cadence, elevation
- [ ] Edge cases: missing HR, missing GPS, paused segments, multi-sport files, files with `records` but no summary
- [ ] Regression tests for known parsing bugs as they surface

## Technical notes

- Vitest is already wired up (`vitest.config.ts`). Place fixtures under `src/lib/parsers/__fixtures__/` and keep them small — checked-in binary fixtures bloat the repo, but parser tests genuinely need real files.
- Prefer table-driven tests (one assertion per field × fixture) over per-file test files — easier to spot which vendor broke.
- `.fit` files from Garmin Connect downloads can be large; strip to first N seconds for fixtures where the full duration isn't relevant to the assertion.
