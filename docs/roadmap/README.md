# Roadmap

Living plan for Project Kilometer. The short list in the top-level [README](../../README.md) is the marketing view; this directory is the working view — one file per milestone, one file per planned feature.

## Status board

| Milestone | Theme | Status | Target |
|---|---|---|---|
| [v0.1 — Foundation](milestones/v0.1-foundation.md) | Parsers, upload, dashboard scaffolding | Shipped | — |
| [v0.2 — Training Load](milestones/v0.2-training-load.md) | CTL/ATL/TSB, Banister TRIMP, hrTSS | Shipped | — |
| [v0.3 — Insights & Docs](milestones/v0.3-insights.md) | VO₂max, Critical Speed, `/docs`, multi-user, weekly volume | Shipped | — |
| [v0.4 — Activity Detail](milestones/v0.4-activity-detail.md) | Km split comparison, interactive map | In Progress | — |

## Backlog

Unscheduled features, one file each. They graduate to a milestone when picked up.

| Feature | Notes |
|---|---|
| [Strava sync](backlog/strava-sync.md) | OAuth 2.0, mirrors Garmin download/recalc split |
| [Distance distribution histogram](backlog/distance-histogram.md) | Frequency of activities by distance bucket |
| [Cadence distribution histogram](backlog/cadence-histogram.md) | Per-activity + aggregate cadence curve |
| [Pace best-effort curves](backlog/pace-best-efforts.md) | Best time per canonical distance over time |
| [Shoe tracking](backlog/shoe-tracking.md) | Accumulated km, pace trend, retirement alert |
| [W′ balance per activity](backlog/w-prime-balance.md) | Real-time D′ depletion from per-second pace |
| [Parser unit tests](backlog/parser-tests.md) | Coverage for `.fit` and `.gpx` edge cases |

## How this works

**Milestones** are themed releases. Each one has:

- `status`: `Planned` / `In Progress` / `Shipped` / `Blocked`
- A checklist of features (`[x]` shipped, `[ ]` pending)
- Technical notes and references

**Backlog** entries are individual features not yet assigned to a milestone. Each file carries enough context (goal, scope, technical notes) to be picked up without re-researching.

When a backlog feature is picked up, it moves into the active milestone's checklist and the backlog file is deleted (or kept and cross-referenced if it has heavy technical notes worth preserving).

## Conventions

- Versions are informal — `v0.x` reflects the feature set the project reached, not a strict semver contract.
- Target dates are optional. Solo-project cadence: add them only when a deadline exists (e.g., a race, a demo).
- Update `status` and `shipped` in the milestone frontmatter as work lands; keep the status board above in sync.
