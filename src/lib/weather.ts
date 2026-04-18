export interface WeatherSnapshot {
  tempC: number;
  feelsLikeC: number;
  humidityPct: number;
  windKph: number;
  weatherCode: number;
  label: string;
}

const WMO_LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Icy fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Moderate showers",
  82: "Heavy showers",
  85: "Light snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

function wmoLabel(code: number): string {
  return WMO_LABELS[code] ?? "Unknown";
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchWeather(
  lat: number,
  lon: number,
  startedAt: Date
): Promise<WeatherSnapshot | null> {
  try {
    const dateStr = formatDate(startedAt);
    const url = new URL("https://archive-api.open-meteo.com/v1/archive");
    url.searchParams.set("latitude", lat.toFixed(6));
    url.searchParams.set("longitude", lon.toFixed(6));
    url.searchParams.set("start_date", dateStr);
    url.searchParams.set("end_date", dateStr);
    url.searchParams.set(
      "hourly",
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code"
    );
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = await res.json();
    const times: string[] = data.hourly?.time ?? [];
    if (times.length === 0) return null;

    // Find hourly index closest to startedAt
    const targetMs = startedAt.getTime();
    let closestIdx = 0;
    let closestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(new Date(times[i]).getTime() - targetMs);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = i;
      }
    }

    const tempC = data.hourly.temperature_2m[closestIdx];
    const feelsLikeC = data.hourly.apparent_temperature[closestIdx];
    const humidityPct = data.hourly.relative_humidity_2m[closestIdx];
    const windKph = data.hourly.wind_speed_10m[closestIdx];
    const weatherCode = data.hourly.weather_code[closestIdx];

    if (tempC == null) return null;

    return {
      tempC: Math.round(tempC * 10) / 10,
      feelsLikeC: Math.round(feelsLikeC * 10) / 10,
      humidityPct: Math.round(humidityPct),
      windKph: Math.round(windKph * 10) / 10,
      weatherCode,
      label: wmoLabel(weatherCode),
    };
  } catch {
    return null;
  }
}
