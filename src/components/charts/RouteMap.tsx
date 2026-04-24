"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import type { NormalizedRecord } from "@/lib/parsers/records";

const ZONE_COLORS = ["#22c55e", "#84cc16", "#f97316", "#ef4444"] as const;
const MAX_SEGMENT_POINTS = 2000;

function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i === 0 || i === arr.length - 1 || i % step === 0) out.push(arr[i]);
  }
  return out;
}

function formatPaceSec(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "—";
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

interface Segment {
  positions: [number, number][];
  color: string;
}

interface Props {
  records: NormalizedRecord[];
}

export default function RouteMap({ records }: Props) {
  const { segments, bounds, paceRange } = useMemo(() => {
    const gpsPoints = records.filter(
      (r): r is NormalizedRecord & { lat: number; lon: number } =>
        r.lat != null && r.lon != null
    );
    if (gpsPoints.length < 2) {
      return { segments: [] as Segment[], bounds: null, paceRange: null };
    }

    const sampled = downsample(gpsPoints, MAX_SEGMENT_POINTS);

    const rawSegments: {
      from: [number, number];
      to: [number, number];
      paceSec: number;
    }[] = [];
    for (let i = 1; i < sampled.length; i++) {
      const a = sampled[i - 1];
      const b = sampled[i];
      let paceSec = Number.POSITIVE_INFINITY;
      if (b.speedMperS != null && b.speedMperS > 0.1) {
        paceSec = 1000 / b.speedMperS;
      } else {
        const dt = b.timeSec - a.timeSec;
        const dd = b.distanceM - a.distanceM;
        if (dt > 0 && dd > 0.5) {
          paceSec = (dt * 1000) / dd;
        }
      }
      rawSegments.push({
        from: [a.lat, a.lon],
        to: [b.lat, b.lon],
        paceSec,
      });
    }

    const validPaces = rawSegments
      .map((s) => s.paceSec)
      .filter((p) => Number.isFinite(p))
      .sort((a, b) => a - b);

    if (validPaces.length === 0) {
      return { segments: [] as Segment[], bounds: null, paceRange: null };
    }

    const q = [0.25, 0.5, 0.75].map(
      (p) =>
        validPaces[
          Math.min(validPaces.length - 1, Math.floor(p * validPaces.length))
        ]
    );

    const segments: Segment[] = rawSegments.map((s) => {
      let colorIdx = 3;
      if (!Number.isFinite(s.paceSec)) colorIdx = 3;
      else if (s.paceSec <= q[0]) colorIdx = 0;
      else if (s.paceSec <= q[1]) colorIdx = 1;
      else if (s.paceSec <= q[2]) colorIdx = 2;
      else colorIdx = 3;
      return {
        positions: [s.from, s.to],
        color: ZONE_COLORS[colorIdx],
      };
    });

    const lats = gpsPoints.map((p) => p.lat);
    const lons = gpsPoints.map((p) => p.lon);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ];

    return {
      segments,
      bounds,
      paceRange: {
        min: validPaces[0],
        max: validPaces[validPaces.length - 1],
      },
    };
  }, [records]);

  if (!bounds || segments.length === 0) return null;

  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Route</h2>
          {paceRange && (
            <div className="text-xs text-muted-foreground tabular-nums">
              {formatPaceSec(paceRange.min)} → {formatPaceSec(paceRange.max)}
            </div>
          )}
        </div>
        <div className="h-[400px] w-full overflow-hidden rounded-md">
          <MapContainer
            bounds={bounds}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={19}
            />
            {segments.map((seg, i) => (
              <Polyline
                key={i}
                positions={seg.positions}
                pathOptions={{ color: seg.color, weight: 5, opacity: 1 }}
              />
            ))}
          </MapContainer>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span>Pace by quartile:</span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-6 rounded"
              style={{ backgroundColor: ZONE_COLORS[0] }}
            />
            fastest
          </span>
          <span
            className="inline-block h-2 w-6 rounded"
            style={{ backgroundColor: ZONE_COLORS[1] }}
          />
          <span
            className="inline-block h-2 w-6 rounded"
            style={{ backgroundColor: ZONE_COLORS[2] }}
          />
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-6 rounded"
              style={{ backgroundColor: ZONE_COLORS[3] }}
            />
            slowest
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
