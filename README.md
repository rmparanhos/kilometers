# Project Kilometer

Open-source running training analysis and visualization web app.

Transform activity data into actionable insights — tracking fitness, fatigue, form, VO₂max, critical speed, and weekly volume without a coach or subscription.

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: SQLite via Drizzle ORM (`better-sqlite3`)
- **Visualization**: Recharts
- **File parsing**: `fit-file-parser` (.fit), `fast-xml-parser` (.gpx)
- **Styling**: Tailwind CSS v4

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/rmparanhos/kilometers.git
cd kilometers
npm install
```

### 2. Initialize the database

```bash
npm run db:migrate
npm run db:seed        # creates the default user (admin@localhost / changeme)
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — no login required.

### 4. Configure your profile

Visit `/profile` to set:
- **Heart rate profile** (HR Max, HR Rest, LTHR) — selects the best training load model
- **Garmin Connect credentials** — enables activity sync

## Features

### Dashboard
- **Performance Manager Chart** — CTL (fitness), ATL (fatigue), TSB (form) via Banister impulse-response model
- **Weekly Volume** — bar chart of km per week with 8-week rolling average
- **Activity Calendar** — heatmap of daily training load across the year
- **VO₂max Evolution** — per-activity submaximal estimate with 28-day EWMA trend line
- **Critical Speed** — hyperbolic speed-duration model (CS + D′), fitted from your fastest efforts per duration bin, with race time predictions for 5 km / 10 km / half / marathon

### Activities
- Upload `.fit` or `.gpx` files
- Garmin Connect sync (download raw `.fit` files; recalculate separately without re-downloading)
- Activity detail page: pace & HR chart, lap splits, weather snapshot at start time
- Training load badge showing which model was used (Banister / hrTSS / duration)

### Multi-user
- `/admin` — create users (name + HR profile + Garmin credentials), switch active user, download/recalculate per user
- Session switching via cookie — all dashboards and APIs reflect the selected user

### Training Science Docs
- `/docs` — explains every model used: Banister TRIMP, CTL/ATL/TSB, VO₂max estimation, Critical Speed, exercise intensity domains, and model limitations, with primary literature references

## Training Load Models

| Priority | Model | Required inputs | Reference |
|---|---|---|---|
| 1 | Banister TRIMP | HR Max + HR Rest | Banister (1991) |
| 2 | Linear hrTSS | Avg HR + LTHR | Manzi et al. (2009) |
| 3 | Duration fallback | — | 60 TSS/hour |

Changing the HR profile automatically recalculates load for all existing activities.

## Project Structure

```
src/
├── app/
│   ├── activities/          # list + detail pages
│   ├── admin/               # user manager
│   ├── api/
│   │   ├── activities/      # upload + delete
│   │   ├── admin/           # user CRUD + session switch
│   │   ├── profile/         # HR profile patch
│   │   └── sync/garmin/     # download + recalculate endpoints
│   ├── dashboard/           # main dashboard page
│   ├── docs/                # training science reference
│   ├── equipment/           # placeholder
│   └── profile/             # HR + Garmin config
├── lib/
│   ├── db/                  # Drizzle schema + migrations
│   ├── auth/                # getCurrentUser (cookie-aware)
│   ├── parsers/             # .fit and .gpx parsers
│   ├── sync/                # garmin-download.ts · garmin-recalculate.ts
│   └── training/            # metrics.ts (CTL/ATL/VO₂max) · critical-speed.ts
└── components/
    ├── admin/               # UserManager
    ├── charts/              # FormChart · Vo2maxChart · WeeklyVolumeChart
    │                        # CriticalSpeedChart · ActivityCalendar
    ├── layout/              # Header · ProfileForm · GarminRecalcButton
    └── ui/                  # shadcn/ui primitives
```

## Roadmap

### Released

- [x] `.fit` and `.gpx` file parsers
- [x] CTL / ATL / TSB performance manager chart (Banister impulse-response model)
- [x] Training zones with contextual advice (peak / fresh / neutral / fatigued / overreached)
- [x] Dual training load model (Banister TRIMP + linear hrTSS) with auto-selection
- [x] VO₂max estimation from submaximal HR (Swain et al. 1994) with 28-day EWMA trend
- [x] Garmin Connect sync — download raw `.fit` files + recalculate separately
- [x] Activity calendar (training load heatmap)
- [x] Activity detail page — pace & HR chart, lap splits, weather snapshot
- [x] Weekly volume chart with 8-week rolling average
- [x] Critical Speed model (hyperbolic, Monod & Scherrer 1965) + race time predictions
- [x] Multi-user support with session switching (`/admin`)
- [x] Training science documentation page (`/docs`)

### Planned

- [ ] Distance distribution histogram — frequency of activities by distance bucket
- [ ] Cadence distribution histogram — cadence frequency curve per activity and aggregate
- [ ] Pace best-effort curves — best time per canonical distance (1 km, 5 km, 10 km…) over time
- [ ] Shoe tracking — accumulated km, pace trend, retirement alert per shoe
- [ ] W′ balance per activity — real-time D′ depletion curve from per-second pace data
- [ ] Parser unit tests

## Self-hosting

The app uses a local SQLite file (`db/local.db`) — no external database or auth required. Deploy anywhere Node.js runs (Vercel, Fly.io, VPS).

> **Vercel note**: SQLite requires a persistent volume or switching to Turso (libSQL) for serverless deployments.

## License

MIT
