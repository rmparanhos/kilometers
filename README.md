# Project Kilometer

Open source running training analysis and visualization web app.

Transform activity data into intuitive visual insights — making the relationship between fitness, fatigue, and form readable without a coach.

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: SQLite via Drizzle ORM (`better-sqlite3`)
- **Auth**: NextAuth.js v4 (credentials-based, single user)
- **Visualization**: Recharts
- **File parsing**: `fit-file-parser` (.fit), `fast-xml-parser` (.gpx)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/rmparanhos/kilometers.git
cd kilometers
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local — set NEXTAUTH_SECRET to a random string:
openssl rand -base64 32
```

### 3. Initialize the database

```bash
npm run db:migrate
npm run db:seed
```

Default credentials: `admin@localhost` / `changeme` — change via `SEED_EMAIL` and `SEED_PASSWORD` in `.env.local`.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in.

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
├── lib/
│   ├── db/           # Drizzle schema and DB singleton
│   ├── auth/         # NextAuth config
│   ├── parsers/      # .fit and .gpx parsers
│   └── training/     # CTL/ATL/TSB calculation functions
└── components/       # UI, chart, and layout components
```

## Roadmap

- [x] Project scaffold (Next.js + Drizzle + NextAuth)
- [ ] .fit and .gpx file parsers with tests
- [ ] CTL/ATL/TSB calculation (validated against Intervals.icu)
- [ ] Form chart visualization with contextual zones
- [ ] Training load heatmap
- [ ] Equipment dashboard (pace/HR/cadence/km by shoe)
- [ ] Performance curve by distance over time

## Self-hosting

The app uses a local SQLite file (`db/local.db`) — no external database required. Deploy anywhere Node.js runs (Vercel, Fly.io, VPS).

For Vercel deploys, SQLite requires a persistent volume or switching to Turso (libSQL).

## License

MIT
