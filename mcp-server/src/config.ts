/**
 * config.ts — API credentials loaded from environment variables.
 *
 * Required env vars:
 *   WEATHER_API_KEY   - weatherapi.com API key
 *   LITEAPI_KEY       - liteapi.travel API key (use sandbox key for demos)
 *   GOOGLE_CALENDAR_TOKEN - Google OAuth2 access token with calendar scope
 *
 * Open-Meteo requires no API key.
 */

export function getConfig() {
  return {
    weatherApiKey: process.env.WEATHER_API_KEY ?? "",
    liteApiKey: process.env.LITEAPI_KEY ?? "",
    googleCalendarToken: process.env.GOOGLE_CALENDAR_TOKEN ?? "",
  };
}
