/**
 * .fit file parser wrapper
 *
 * Wraps `fit-file-parser` and returns a normalized raw activity object.
 * Full implementation comes in Step 2 of the project roadmap.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FitParser = require("fit-file-parser").default;

export interface FitData {
  activity?: {
    sessions?: FitSession[];
  };
  records?: FitRecord[];
  laps?: FitLap[];
}

export interface FitSession {
  start_time?: Date;
  total_elapsed_time?: number;
  total_timer_time?: number;
  total_distance?: number;
  total_ascent?: number;
  total_descent?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_cadence?: number;
  avg_speed?: number;
  sport?: string;
}

export interface FitRecord {
  timestamp?: Date;
  position_lat?: number;
  position_long?: number;
  distance?: number;
  speed?: number;
  heart_rate?: number;
  cadence?: number;
  altitude?: number;
}

export interface FitLap {
  start_time?: Date;
  total_elapsed_time?: number;
  total_distance?: number;
  avg_heart_rate?: number;
  avg_speed?: number;
  avg_cadence?: number;
  total_ascent?: number;
}

export async function parseFitBuffer(buffer: Buffer): Promise<FitData> {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      speedUnit: "m/s",
      lengthUnit: "m",
      temperatureUnit: "celsius",
      elapsedRecordField: true,
      mode: "both",
    });

    parser.parse(buffer, (error: Error | null, data: FitData) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}
