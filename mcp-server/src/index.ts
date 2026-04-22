/**
 * index.ts — Weekend Getaway MCP Server (Act 1)
 *
 * Exposes 7 tools across 4 "teams":
 *
 *   Weather Team
 *     1. get_weather_forecast   — Open-Meteo (no auth)
 *     2. check_weather_alerts   — WeatherAPI.com
 *
 *   Hotel Inventory Team
 *     3. find_hotels            — liteapi Hotel Data API
 *     4. search_hotel_rates     — liteapi Search API
 *
 *   Booking & Payments Team
 *     5. prebook_hotel_rate     — liteapi Booking API
 *     6. confirm_hotel_booking  — liteapi Booking API
 *
 *   Calendar Team
 *     7. manage_calendar        — Google Calendar API (list + create)
 *
 * Transport: stdio (for use with Claude Code / VS Code MCP extension)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  GetWeatherForecastSchema,
  CheckWeatherAlertsSchema,
  getWeatherForecast,
  checkWeatherAlerts,
} from "./tools/weather.js";

import {
  FindHotelsSchema,
  SearchHotelRatesSchema,
  findHotels,
  searchHotelRates,
} from "./tools/hotels.js";

import {
  PrebookHotelRateSchema,
  ConfirmHotelBookingSchema,
  prebookHotelRate,
  confirmHotelBooking,
} from "./tools/booking.js";

import { ManageCalendarSchema, manageCalendar } from "./tools/calendar.js";
import { RunWorkflowSchema, runWeekendGetawayWorkflow } from "./tools/workflow.js";

// ── Server ────────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "weekend-getaway-planner",
  version: "1.0.0",
});

// ── Tool registrations ────────────────────────────────────────────────────────

server.tool(
  "get_weather_forecast",
  "Get a daily weather forecast (precipitation, weather code, temperature, " +
    "wind speed) for a destination over a date range. " +
    "Use this to evaluate whether the weather is suitable for a weekend getaway. " +
    "Returns daily data from the free Open-Meteo API — no API key required.",
  GetWeatherForecastSchema.shape,
  { readOnlyHint: true, destructiveHint: false },
  async (input) => {
    const result = await getWeatherForecast(
      GetWeatherForecastSchema.parse(input)
    );
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "check_weather_alerts",
  "Check for active weather warnings and alerts at a destination " +
    "for the next 3 days using WeatherAPI.com. " +
    "Use this to flag severe weather before proceeding with a booking.",
  CheckWeatherAlertsSchema.shape,
  { readOnlyHint: true, destructiveHint: false },
  async (input) => {
    const result = await checkWeatherAlerts(
      CheckWeatherAlertsSchema.parse(input)
    );
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "find_hotels",
  "Retrieve a list of hotels available in a destination city using the " +
    "liteapi Hotel Data API. Returns hotel IDs and basic property details. " +
    "You must call this before search_hotel_rates to obtain the hotel IDs.",
  FindHotelsSchema.shape,
  { readOnlyHint: true, destructiveHint: false },
  async (input) => {
    const result = await findHotels(FindHotelsSchema.parse(input));
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "search_hotel_rates",
  "Search live availability and pricing for a list of hotels on specific " +
    "check-in/check-out dates using the liteapi Search API. " +
    "Returns the best available offer (offerId and price) per hotel. " +
    "Requires hotel IDs from find_hotels.",
  SearchHotelRatesSchema.shape,
  { readOnlyHint: true, destructiveHint: false },
  async (input) => {
    const result = await searchHotelRates(
      SearchHotelRatesSchema.parse(input)
    );
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "prebook_hotel_rate",
  "Lock in a hotel rate to confirm real-time availability and price " +
    "using the liteapi Booking API (sandbox — no real charges). " +
    "Returns a prebookId valid for a short window. " +
    "Must be followed by confirm_hotel_booking to complete the reservation.",
  PrebookHotelRateSchema.shape,
  { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  async (input) => {
    const result = await prebookHotelRate(
      PrebookHotelRateSchema.parse(input)
    );
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "confirm_hotel_booking",
  "Complete a hotel booking using the prebookId from prebook_hotel_rate " +
    "(sandbox — no real charges or obligations). " +
    "Requires guest details and payment method. " +
    "Returns a booking confirmation ID and status.",
  ConfirmHotelBookingSchema.shape,
  { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  async (input) => {
    const result = await confirmHotelBooking(
      ConfirmHotelBookingSchema.parse(input)
    );
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "manage_calendar",
  "Manage Google Calendar events for a getaway. " +
    'Use action="list" to check for scheduling conflicts on the travel dates, ' +
    'then action="create" to block the dates with an all-day event once the ' +
    "booking is confirmed. Requires a Google OAuth2 Bearer token.",
  ManageCalendarSchema.shape,
  { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  async (input) => {
    const result = await manageCalendar(ManageCalendarSchema.parse(input));
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "run_weekend_getaway_workflow",
  "[Act 3 — Arazzo Workflow] Execute the complete weekend getaway plan as a single " +
    "deterministic workflow. Pass the destination, travel dates, and guest details. " +
    "The workflow automatically geocodes the city, checks the weather, finds and books " +
    "a hotel, and blocks your calendar — in a guaranteed sequence with no LLM decisions " +
    "between steps. API keys are injected from environment variables.",
  RunWorkflowSchema.shape,
  { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  async (input) => {
    const result = await runWeekendGetawayWorkflow(RunWorkflowSchema.parse(input));
    return { content: [{ type: "text", text: result }] };
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weekend Getaway MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
