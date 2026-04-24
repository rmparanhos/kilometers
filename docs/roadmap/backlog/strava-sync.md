---
title: Strava sync
status: Planned
target: —
---

## Goal

Let users connect their Strava account and pull activities, with the same download/recalculate split already used for Garmin — so re-fitting training load never requires a re-download.

## Scope

- [ ] OAuth 2.0 flow: authorize, token exchange, refresh
- [ ] Activity list fetch + paginated download as JSON
- [ ] Map Strava activity schema into the app's internal record shape
- [ ] Store raw payload in `rawDataJson` so recalculate logic is source-agnostic
- [ ] Recalculate endpoint reuses the Garmin recalc code path

## Technical notes

- Required env: `STRAVA_CLIENT_ID` + `STRAVA_CLIENT_SECRET` in `.env.local` (register at strava.com/settings/api).
- Strava rate limits: 100 requests / 15 min, 1000 / day. Respect with backoff; batch list endpoints before per-activity detail fetches.
- Mirror the file layout in [src/lib/sync/](../../../src/lib/sync/): `strava-download.ts` + reuse the shared recalc helper.
- Token storage: per-user, encrypted at rest (same table as Garmin credentials).

## Open questions

- Do we de-duplicate against Garmin-synced activities? Strava mirrors Garmin for many users — need an `externalId` + source check.
