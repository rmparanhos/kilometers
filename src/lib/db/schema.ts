import { sqliteTable, text, integer, real, index, unique } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  name: text("name"),
  // Heart rate profile — used for TRIMP calculation
  hrMax: integer("hr_max"),   // bpm; enables Banister TRIMP (1991)
  hrRest: integer("hr_rest"), // bpm; resting HR for Karvonen HRr
  lthrBpm: integer("lthr_bpm"), // bpm; lactate threshold HR for linear hrTSS
  // Garmin Connect credentials (stored locally for self-hosted use)
  garminEmail: text("garmin_email"),
  garminPassword: text("garmin_password"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// NextAuth adapter tables (required by @auth/drizzle-adapter)
// ---------------------------------------------------------------------------
export const accounts = sqliteTable("accounts", {
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = sqliteTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

// ---------------------------------------------------------------------------
// Equipment (shoes / gear)
// ---------------------------------------------------------------------------
export const equipment = sqliteTable("equipment", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("shoe"), // shoe | watch | other
  purchaseDate: integer("purchase_date", { mode: "timestamp" }),
  retiredAt: integer("retired_at", { mode: "timestamp" }),
  totalDistanceM: real("total_distance_m").notNull().default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------
export const activities = sqliteTable(
  "activities",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    equipmentId: text("equipment_id").references(() => equipment.id, {
      onDelete: "set null",
    }),

    // Identity
    name: text("name"),
    sport: text("sport").notNull().default("running"),
    sourceFile: text("source_file"),
    sourceFormat: text("source_format"), // "fit" | "gpx"
    externalId: text("external_id"),    // Garmin activity ID from .fit, if present

    // Timing
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    durationSec: real("duration_sec").notNull(),
    movingTimeSec: real("moving_time_sec"),

    // Distance & geography
    distanceM: real("distance_m").notNull(),
    elevationGainM: real("elevation_gain_m"),
    elevationLossM: real("elevation_loss_m"),
    startLat: real("start_lat"),
    startLon: real("start_lon"),

    // Physiology
    avgHeartRateBpm: real("avg_heart_rate_bpm"),
    maxHeartRateBpm: real("max_heart_rate_bpm"),
    avgCadenceRpm: real("avg_cadence_rpm"),
    avgPaceMperS: real("avg_pace_m_per_s"), // m/s — convert to min/km in UI
    trainingLoad: real("training_load"),    // hrTSS or TRIMP, used for CTL/ATL
    loadModel: text("load_model"),          // "banister" | "hr_tss" | "duration"
    perceivedEffort: integer("perceived_effort"), // 1–10, user-entered

    // Raw data blob (optional — heart rate/GPS records array)
    rawDataJson: text("raw_data_json"),

    // Weather snapshot at activity start (fetched from Open-Meteo at upload time)
    weatherJson: text("weather_json"),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("activities_user_started_idx").on(t.userId, t.startedAt),
    index("activities_equipment_idx").on(t.equipmentId),
  ]
);

// ---------------------------------------------------------------------------
// Activity laps / splits
// ---------------------------------------------------------------------------
export const activityLaps = sqliteTable("activity_laps", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  activityId: text("activity_id")
    .notNull()
    .references(() => activities.id, { onDelete: "cascade" }),
  lapIndex: integer("lap_index").notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }),
  durationSec: real("duration_sec"),
  distanceM: real("distance_m"),
  avgHeartRateBpm: real("avg_heart_rate_bpm"),
  avgPaceMperS: real("avg_pace_m_per_s"),
  avgCadenceRpm: real("avg_cadence_rpm"),
  elevationGainM: real("elevation_gain_m"),
});

// ---------------------------------------------------------------------------
// Garmin raw downloads
// ---------------------------------------------------------------------------

/**
 * One row per downloaded Garmin activity. The .fit file is stored on disk at
 * fitPath (relative to process.cwd()). Recalculate reads from here instead of
 * hitting Garmin Connect again.
 */
export const garminRaws = sqliteTable(
  "garmin_raws",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    garminActivityId: text("garmin_activity_id").notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp" }).notNull(),
    garminMetaJson: text("garmin_meta_json"),
    fitPath: text("fit_path"),
  },
  (t) => [unique().on(t.userId, t.garminActivityId)]
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
export type Equipment = typeof equipment.$inferSelect;
export type EquipmentInsert = typeof equipment.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type ActivityInsert = typeof activities.$inferInsert;
export type ActivityLap = typeof activityLaps.$inferSelect;
export type ActivityLapInsert = typeof activityLaps.$inferInsert;
export type GarminRaw = typeof garminRaws.$inferSelect;
export type GarminRawInsert = typeof garminRaws.$inferInsert;
