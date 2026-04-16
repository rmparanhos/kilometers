# Project Kilometer

Open source running training analysis and visualization web app.

Transform activity data into intuitive visual insights — making the relationship between fitness, fatigue, and form readable without a coach.

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: SQLite via Drizzle ORM (`better-sqlite3`)
- **Visualization**: Recharts
- **File parsing**: `fit-file-parser` (.fit), `fast-xml-parser` (.gpx)

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
npm run db:seed
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — no login required.

### 4. Configure your profile

Visit `/profile` to set:
- **Heart rate profile** (HR Max, HR Rest, LTHR) — selects the best training load model
- **Garmin Connect credentials** — enables one-click activity sync

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
├── lib/
│   ├── db/           # Drizzle schema and DB singleton
│   ├── auth/         # getCurrentUser helper
│   ├── parsers/      # .fit and .gpx parsers
│   ├── sync/         # Garmin Connect sync
│   └── training/     # CTL/ATL/TSB and VO2max calculation
└── components/       # UI, chart, and layout components
```

## Training Load Models

The app automatically selects the best model based on available HR data:

| Priority | Model | Required | Reference |
|---|---|---|---|
| 1 | Banister TRIMP | HR Max + HR Rest | Banister (1991) |
| 2 | Linear hrTSS | Avg HR + LTHR | Manzi et al. (2009) |
| 3 | Duration fallback | — | 60 TSS/hour |

Each activity stores which model was used (`loadModel` column). Changing the HR profile automatically recalculates all existing activities.

## Roadmap

- [x] Project scaffold (Next.js + Drizzle)
- [x] .fit and .gpx file parsers
- [x] CTL/ATL/TSB performance manager chart (Banister impulse–response)
- [x] Contextual training zones with advice (peak / fresh / neutral / optimal / high risk)
- [x] Dual training load model (Banister TRIMP + linear hrTSS) with auto-selection
- [x] VO₂max estimation from submaximal HR data (Swain et al. 1994)
- [x] Garmin Connect sync
- [x] Training load heatmap calendar
- [ ] Parser unit tests (validate .fit and .gpx output)
- [ ] Pace and HR curves by distance (best effort over time per distance bucket)
- [ ] Cadence trend chart (avg and max cadence over time, with distribution histogram)
- [ ] Distance distribution histogram (frequency of activities by distance bucket)
- [ ] VO₂max evolution chart (estimated VO₂max over time from submaximal efforts)
- [ ] Shoe tracking — accumulated km, pace trend, and retirement alert per shoe (data source TBD: manual entry, Garmin gear API, or .fit device field)
- [ ] Performance curve by distance over time
- [ ] Activity calendar with daily weather (temperature at activity location and time)

## Self-hosting

The app uses a local SQLite file (`db/local.db`) — no external database or authentication required. Deploy anywhere Node.js runs (Vercel, Fly.io, VPS).

For Vercel deploys, SQLite requires a persistent volume or switching to Turso (libSQL).

## License

MIT
