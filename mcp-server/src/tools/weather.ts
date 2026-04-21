/**
 * tools/weather.ts
 *
 * Tool 1: get_weather_forecast  — Open-Meteo (no auth, free, open)
 * Tool 2: check_weather_alerts  — WeatherAPI.com (requires WEATHER_API_KEY)
 *
 * These two tools represent the "Weather Team" in our multi-team demo.
 */

import { z } from "zod";

// ── Tool schemas ──────────────────────────────────────────────────────────────

export const GetWeatherForecastSchema = z.object({
  latitude: z.number().describe("Latitude of the destination"),
  longitude: z.number().describe("Longitude of the destination"),
  start_date: z.string().describe("Start date in YYYY-MM-DD format"),
  end_date: z.string().describe("End date in YYYY-MM-DD format"),
});

export const CheckWeatherAlertsSchema = z.object({
  location: z
    .string()
    .describe(
      'Location name or coordinates, e.g. "Dublin, Ireland" or "53.33,-6.25"'
    ),
  api_key: z.string().describe("WeatherAPI.com API key"),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function getWeatherForecast(
  input: z.infer<typeof GetWeatherForecastSchema>
): Promise<string> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(input.latitude));
  url.searchParams.set("longitude", String(input.longitude));
  url.searchParams.set(
    "daily",
    "precipitation_sum,weathercode,wind_speed_10m_max,temperature_2m_max,temperature_2m_min"
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", input.start_date);
  url.searchParams.set("end_date", input.end_date);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();
  return JSON.stringify(data, null, 2);
}

export async function checkWeatherAlerts(
  input: z.infer<typeof CheckWeatherAlertsSchema>
): Promise<string> {
  const url = new URL("https://api.weatherapi.com/v1/forecast.json");
  url.searchParams.set("key", input.api_key);
  url.searchParams.set("q", input.location);
  url.searchParams.set("days", "3");
  url.searchParams.set("alerts", "yes");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`WeatherAPI error: ${res.status}`);
  const data = (await res.json()) as { alerts?: unknown; forecast?: unknown };

  // Return just alerts + current conditions — keep response tight
  return JSON.stringify(
    {
      alerts: (data as any).alerts?.alert ?? [],
      current: (data as any).current,
    },
    null,
    2
  );
}
