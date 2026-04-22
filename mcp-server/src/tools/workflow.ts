/**
 * workflow.ts — run_weekend_getaway_workflow MCP tool (Act 3)
 *
 * Executes the full Weekend Getaway workflow deterministically:
 *   1. Geocode city → lat/lon
 *   2. Get weather forecast
 *   3. Check weather alerts
 *   4. Evaluate weather gate (precipitation < 5mm, weathercode < 61)
 *   5. Find hotels
 *   6. Search hotel rates
 *   7. Prebook best rate
 *   8. Confirm booking (sandbox — gracefully skips to calendar on 400)
 *   9. List calendar conflicts
 *  10. Create calendar block
 *
 * API keys are injected from environment variables — no LLM orchestration
 * between steps. This is the deterministic Arazzo workflow as a single tool.
 */

import { z } from "zod";

// ── Zod schema (exported for MCP tool registration) ───────────────────────────

export const RunWorkflowSchema = z.object({
  cityName: z.string().describe("City to visit (e.g. 'Galway')"),
  countryCode: z.string().describe("ISO country code (e.g. 'IE')"),
  checkinDate: z.string().describe("Check-in date YYYY-MM-DD (next Friday)"),
  checkoutDate: z.string().describe("Check-out date YYYY-MM-DD (Saturday)"),
  guests: z.number().int().optional().describe("Number of adult guests (default 2)"),
  currency: z.string().optional().describe("Currency code (default EUR)"),
  guestNationality: z.string().optional().describe("Guest nationality ISO code (default IE)"),
  calendarId: z.string().optional().describe("Google Calendar ID (default primary)"),
  guestFirstName: z.string().describe("Guest first name"),
  guestLastName: z.string().describe("Guest last name"),
  guestEmail: z.string().email().describe("Guest email address"),
  liteApiKey: z.string().optional().describe("liteapi.travel API key (defaults to env var)"),
  weatherApiKey: z.string().optional().describe("WeatherAPI.com API key (defaults to env var)"),
  googleCalendarToken: z.string().optional().describe("Google OAuth2 token (defaults to env var)"),
});

// ── Input type ────────────────────────────────────────────────────────────────

export interface WorkflowInputs {
  cityName: string;
  countryCode: string;
  checkinDate: string;   // YYYY-MM-DD
  checkoutDate: string;  // YYYY-MM-DD
  guests?: number;
  currency?: string;
  guestNationality?: string;
  calendarId?: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  liteApiKey?: string;
  weatherApiKey?: string;
  googleCalendarToken?: string;
}

// ── Step helpers ──────────────────────────────────────────────────────────────

async function geocode(cityName: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json() as any;
  const r = data?.results?.[0];
  if (!r) throw new Error(`No geocoding result for "${cityName}"`);
  return { latitude: r.latitude as number, longitude: r.longitude as number, timezone: r.timezone as string, resolvedName: r.name as string };
}

async function getForecast(lat: number, lon: number, timezone: string, startDate: string, endDate: string) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,weathercode&timezone=${encodeURIComponent(timezone)}&start_date=${startDate}&end_date=${endDate}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast failed: ${res.status}`);
  const data = await res.json() as any;
  const precip = data?.daily?.precipitation_sum?.[0] ?? 999;
  const code = data?.daily?.weathercode?.[0] ?? 99;
  return { precipitation: precip as number, weatherCode: code as number };
}

async function checkAlerts(location: string, weatherApiKey: string) {
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${encodeURIComponent(location)}&days=3&alerts=yes`;
  const res = await fetch(url);
  if (!res.ok) return { alerts: [] };
  const data = await res.json() as any;
  return { alerts: (data?.alerts?.alert ?? []) as any[] };
}

async function findHotels(countryCode: string, cityName: string, liteApiKey: string) {
  const url = `https://api.liteapi.travel/v3.0/data/hotels?countryCode=${countryCode}&cityName=${encodeURIComponent(cityName)}&limit=20`;
  const res = await fetch(url, { headers: { "X-API-Key": liteApiKey } });
  if (!res.ok) throw new Error(`findHotels failed: ${res.status}`);
  const data = await res.json() as any;
  return { hotels: data?.data ?? [] };
}

async function searchRates(hotelIds: string[], checkin: string, checkout: string, guests: number, currency: string, nationality: string, liteApiKey: string) {
  const body = {
    hotelIds,
    checkin,
    checkout,
    currency,
    guestNationality: nationality,
    occupancies: [{ adults: guests, children: [] }],
  };
  const res = await fetch("https://api.liteapi.travel/v3.0/hotels/rates", {
    method: "POST",
    headers: { "X-API-Key": liteApiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`searchRates failed: ${res.status}`);
  const data = await res.json() as any;
  const best = data?.data?.[0]?.roomTypes?.[0];
  return {
    rateResults: data?.data ?? [],
    bestOfferId: best?.offerId ?? null,
    bestOfferPrice: best?.price?.totalPrice ?? null,
    bestOfferCurrency: best?.price?.currency ?? currency,
    bestHotelName: data?.data?.[0]?.name ?? "Unknown hotel",
  };
}

async function prebookRate(offerId: string, liteApiKey: string) {
  const res = await fetch("https://api.liteapi.travel/v3.0/rates/prebook", {
    method: "POST",
    headers: { "X-API-Key": liteApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ offerId }),
  });
  if (!res.ok) throw new Error(`prebookRate failed: ${res.status}`);
  const data = await res.json() as any;
  return { prebookId: data?.data?.prebookId as string, confirmedPrice: data?.data?.price };
}

async function confirmBooking(prebookId: string, firstName: string, lastName: string, email: string, liteApiKey: string) {
  const body = {
    prebookId,
    guestInfo: { guestFirstName: firstName, guestLastName: lastName, guestEmail: email },
    payment: { paymentType: "INVOICE" },
  };
  const res = await fetch("https://api.liteapi.travel/v3.0/rates/book", {
    method: "POST",
    headers: { "X-API-Key": liteApiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 400) {
    const err = await res.json() as any;
    // Sandbox payment failure (code 5000) — not fatal, continue to calendar
    if (err?.error?.code === 5000) {
      return { bookingId: null, bookingStatus: "sandbox_payment_failed", skipped: true };
    }
    throw new Error(`confirmBooking failed: ${res.status} ${JSON.stringify(err)}`);
  }
  if (!res.ok) throw new Error(`confirmBooking failed: ${res.status}`);
  const data = await res.json() as any;
  return { bookingId: data?.data?.bookingId as string, bookingStatus: data?.data?.status as string, skipped: false };
}

async function listCalendarEvents(calendarId: string, timeMin: string, timeMax: string, token: string) {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}T00:00:00Z&timeMax=${timeMax}T00:00:00Z&singleEvents=true&orderBy=startTime`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`listCalendarEvents failed: ${res.status}`);
  const data = await res.json() as any;
  return { conflicts: data?.items ?? [] };
}

async function createCalendarEvent(calendarId: string, summary: string, startDate: string, endDate: string, description: string, token: string) {
  const body = { summary, description, start: { date: startDate }, end: { date: endDate } };
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`createCalendarEvent failed: ${res.status}`);
  const data = await res.json() as any;
  return { eventId: data?.id as string };
}

// ── Main workflow executor ─────────────────────────────────────────────────────

export async function runWeekendGetawayWorkflow(inputs: WorkflowInputs): Promise<string> {
  const {
    cityName, countryCode, checkinDate, checkoutDate,
    guests = 2, currency = "EUR", guestNationality = "IE",
    calendarId = "primary",
    guestFirstName, guestLastName, guestEmail,
    liteApiKey: inputLiteApiKey,
    weatherApiKey: inputWeatherApiKey,
    googleCalendarToken: inputGoogleToken,
  } = inputs;

  const liteApiKey = inputLiteApiKey ?? process.env.LITEAPI_KEY ?? "";
  const weatherApiKey = inputWeatherApiKey ?? process.env.WEATHER_API_KEY ?? "";
  const googleToken = inputGoogleToken ?? process.env.GOOGLE_CALENDAR_TOKEN ?? "";

  const log: string[] = [];
  const step = (msg: string) => { log.push(msg); console.error(msg); };

  // Step 1 — Geocode
  step(`[1/10] Geocoding "${cityName}"...`);
  const geo = await geocode(cityName);
  step(`      → ${geo.resolvedName} (${geo.latitude}, ${geo.longitude})`);

  // Step 2 — Weather forecast
  step(`[2/10] Fetching forecast for ${checkinDate}...`);
  const forecast = await getForecast(geo.latitude, geo.longitude, geo.timezone, checkinDate, checkinDate);
  step(`      → precipitation: ${forecast.precipitation}mm, code: ${forecast.weatherCode}`);

  // Step 3 — Weather alerts
  step(`[3/10] Checking weather alerts...`);
  const alertData = await checkAlerts(cityName, weatherApiKey);
  step(`      → ${alertData.alerts.length} active alert(s)`);

  // Step 4 — Weather gate
  step(`[4/10] Evaluating weather gate (precip < 5mm, code < 61)...`);
  if (forecast.precipitation >= 5 || forecast.weatherCode >= 61) {
    const reason = forecast.precipitation >= 5
      ? `precipitation ${forecast.precipitation}mm ≥ 5mm`
      : `weather code ${forecast.weatherCode} indicates rain/storms`;
    return [
      `⛔ Weather gate failed — ${reason}.`,
      `Forecast for ${checkinDate}: ${forecast.precipitation}mm precipitation, code ${forecast.weatherCode}.`,
      alertData.alerts.length > 0 ? `Active alerts: ${alertData.alerts.map((a: any) => a.headline).join("; ")}` : "",
      `Suggest choosing a different destination or date.`,
    ].filter(Boolean).join("\n");
  }
  step(`      → ✅ Weather looks good`);

  // Step 5 — Find hotels
  step(`[5/10] Finding hotels in ${cityName}, ${countryCode}...`);
  const hotelData = await findHotels(countryCode, cityName, liteApiKey);
  const hotelIds = hotelData.hotels.map((h: any) => h.id ?? h.hotelId).filter(Boolean);
  step(`      → ${hotelIds.length} hotels found`);
  if (hotelIds.length === 0) throw new Error(`No hotels found in ${cityName}`);

  // Step 6 — Search rates
  step(`[6/10] Searching rates (${checkinDate} → ${checkoutDate}, ${guests} adults)...`);
  const rates = await searchRates(hotelIds, checkinDate, checkoutDate, guests, currency, guestNationality, liteApiKey);
  if (!rates.bestOfferId) throw new Error("No available rates found");
  step(`      → Best: ${rates.bestHotelName} @ ${rates.bestOfferPrice} ${rates.bestOfferCurrency}`);

  // Step 7 — Prebook
  step(`[7/10] Prebooking rate ${rates.bestOfferId}...`);
  const prebook = await prebookRate(rates.bestOfferId, liteApiKey);
  step(`      → prebookId: ${prebook.prebookId}`);

  // Step 8 — Confirm booking
  step(`[8/10] Confirming booking...`);
  const booking = await confirmBooking(prebook.prebookId, guestFirstName, guestLastName, guestEmail, liteApiKey);
  if (booking.skipped) {
    step(`      → ⚠️  Sandbox payment failed (code 5000) — continuing to calendar steps`);
  } else {
    step(`      → bookingId: ${booking.bookingId}, status: ${booking.bookingStatus}`);
  }

  // Step 9 — List calendar conflicts
  step(`[9/10] Checking calendar for conflicts...`);
  const calEvents = await listCalendarEvents(calendarId, checkinDate, checkoutDate, googleToken);
  step(`      → ${calEvents.conflicts.length} existing event(s) on those dates`);

  // Step 10 — Create calendar block
  step(`[10/10] Creating calendar block...`);
  const bookingDesc = booking.bookingId
    ? `Booking ID: ${booking.bookingId} | Hotel: ${rates.bestHotelName}`
    : `Hotel: ${rates.bestHotelName} (booking confirmation pending — sandbox payment failed)`;
  const calEvent = await createCalendarEvent(calendarId, `Weekend Getaway — ${geo.resolvedName}`, checkinDate, checkoutDate, bookingDesc, googleToken);
  step(`      → eventId: ${calEvent.eventId}`);

  // ── Summary ──
  return [
    `✅ Weekend Getaway Confirmed`,
    ``,
    `📍 Destination: ${geo.resolvedName}, ${countryCode}`,
    `📅 Dates: ${checkinDate} → ${checkoutDate}`,
    `🌤️  Weather: ${forecast.precipitation}mm precipitation, code ${forecast.weatherCode} (suitable)`,
    `🏨 Hotel: ${rates.bestHotelName}`,
    `💶 Price: ${rates.bestOfferPrice} ${rates.bestOfferCurrency}`,
    booking.bookingId
      ? `🔖 Booking ID: ${booking.bookingId} (${booking.bookingStatus})`
      : `🔖 Booking: Sandbox payment failed — prebookId ${prebook.prebookId} available for retry`,
    `📆 Calendar: Event created (ID: ${calEvent.eventId})`,
    calEvents.conflicts.length > 0
      ? `⚠️  ${calEvents.conflicts.length} existing event(s) on those dates — review for conflicts`
      : `✓  No calendar conflicts`,
  ].join("\n");
}
