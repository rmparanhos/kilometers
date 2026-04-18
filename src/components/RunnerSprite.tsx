"use client";

import type { FormZone } from "@/lib/training/metrics";

interface ZoneConfig {
  duration: string;
  color: string;
  leanDeg: number;
  strideDeg: number;
  armDeg: number;
}

// Colors match ZONE_COLORS in FormChart.tsx
const CONFIGS: Record<FormZone, ZoneConfig> = {
  peak:        { duration: "0.38s", color: "#22c55e", leanDeg: 4,  strideDeg: 38, armDeg: 26 },
  fresh:       { duration: "0.58s", color: "#84cc16", leanDeg: 3,  strideDeg: 28, armDeg: 20 },
  neutral:     { duration: "0.80s", color: "#f59e0b", leanDeg: 2,  strideDeg: 20, armDeg: 14 },
  fatigued:    { duration: "1.25s", color: "#f97316", leanDeg: 10, strideDeg: 12, armDeg: 8  },
  overreached: { duration: "2.0s",  color: "#ef4444", leanDeg: 20, strideDeg: 7,  armDeg: 4  },
};

interface RunnerSpriteProps {
  zone: FormZone;
  size?: number;
}

/**
 * Animated SVG stick figure whose speed, stride width, and forward lean
 * reflect the current training form zone.
 *
 * peak        → fast stride, upright
 * fresh       → comfortable tempo
 * neutral     → steady jog
 * fatigued    → slow, hunched
 * overreached → barely shuffling
 */
export function RunnerSprite({ zone, size = 56 }: RunnerSpriteProps) {
  const { duration, color, leanDeg, strideDeg, armDeg } = CONFIGS[zone];

  // Spline easing for each half-swing (pendulum feel)
  const spline = "0.45 0 0.55 1;0.45 0 0.55 1";

  return (
    <svg
      width={size}
      height={Math.round(size * 1.35)}
      viewBox="0 0 40 54"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      {/* Lean the whole figure forward around foot base (20, 50) */}
      <g transform={`rotate(${leanDeg}, 20, 50)`}>

        {/* Head */}
        <circle cx="20" cy="7" r="5.5" fill={color} />

        {/* Torso */}
        <line
          x1="20" y1="12.5" x2="20" y2="32"
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
        />

        {/* Right arm — starts swung forward */}
        <line x1="20" y1="18" x2="20" y2="28"
          stroke={color} strokeWidth="2" strokeLinecap="round">
          <animateTransform
            attributeName="transform" type="rotate"
            values={`${armDeg} 20 18;${-armDeg} 20 18;${armDeg} 20 18`}
            keyTimes="0;0.5;1" dur={duration} repeatCount="indefinite"
            calcMode="spline" keySplines={spline}
          />
        </line>

        {/* Left arm — opposite phase */}
        <line x1="20" y1="18" x2="20" y2="28"
          stroke={color} strokeWidth="2" strokeLinecap="round">
          <animateTransform
            attributeName="transform" type="rotate"
            values={`${-armDeg} 20 18;${armDeg} 20 18;${-armDeg} 20 18`}
            keyTimes="0;0.5;1" dur={duration} repeatCount="indefinite"
            calcMode="spline" keySplines={spline}
          />
        </line>

        {/* Right leg — starts swung forward */}
        <line x1="20" y1="32" x2="20" y2="50"
          stroke={color} strokeWidth="2.5" strokeLinecap="round">
          <animateTransform
            attributeName="transform" type="rotate"
            values={`${-strideDeg} 20 32;${strideDeg} 20 32;${-strideDeg} 20 32`}
            keyTimes="0;0.5;1" dur={duration} repeatCount="indefinite"
            calcMode="spline" keySplines={spline}
          />
        </line>

        {/* Left leg — opposite phase */}
        <line x1="20" y1="32" x2="20" y2="50"
          stroke={color} strokeWidth="2.5" strokeLinecap="round">
          <animateTransform
            attributeName="transform" type="rotate"
            values={`${strideDeg} 20 32;${-strideDeg} 20 32;${strideDeg} 20 32`}
            keyTimes="0;0.5;1" dur={duration} repeatCount="indefinite"
            calcMode="spline" keySplines={spline}
          />
        </line>

      </g>
    </svg>
  );
}
