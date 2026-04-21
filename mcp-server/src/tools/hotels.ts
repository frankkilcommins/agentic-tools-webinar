/**
 * tools/hotels.ts
 *
 * Tool 3: find_hotels      — liteapi Hotel Data API (GET /data/hotels)
 * Tool 4: search_hotel_rates — liteapi Search API (POST /hotels/rates)
 *
 * These tools represent the "Hotel Inventory Team" in our multi-team demo.
 * Both require LITEAPI_KEY.  Use the sandbox key (sand_...) for demos.
 */

import { z } from "zod";

const HOTEL_DATA_BASE = "https://api.liteapi.travel/v3.0";
const SEARCH_BASE = "https://api.liteapi.travel/v3.0";

// ── Tool schemas ──────────────────────────────────────────────────────────────

export const FindHotelsSchema = z.object({
  country_code: z.string().describe("ISO 3166-1 alpha-2 country code, e.g. IE"),
  city_name: z.string().describe("City name, e.g. Dublin"),
  api_key: z.string().describe("liteapi.travel API key"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe("Maximum number of hotels to return"),
});

export const SearchHotelRatesSchema = z.object({
  hotel_ids: z
    .array(z.string())
    .describe("List of hotel IDs to search (from find_hotels)"),
  checkin: z.string().describe("Check-in date in YYYY-MM-DD format"),
  checkout: z.string().describe("Check-out date in YYYY-MM-DD format"),
  adults: z.number().int().min(1).default(2).describe("Number of adult guests"),
  currency: z.string().default("EUR").describe("Pricing currency code"),
  guest_nationality: z
    .string()
    .default("IE")
    .describe("Guest nationality as ISO country code"),
  api_key: z.string().describe("liteapi.travel API key"),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function findHotels(
  input: z.infer<typeof FindHotelsSchema>
): Promise<string> {
  const url = new URL(`${HOTEL_DATA_BASE}/data/hotels`);
  url.searchParams.set("countryCode", input.country_code);
  url.searchParams.set("cityName", input.city_name);
  url.searchParams.set("limit", String(input.limit));

  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": input.api_key },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`liteapi find_hotels error ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { data?: unknown[] };
  const hotels = data.data ?? [];
  return JSON.stringify({ hotel_count: hotels.length, hotels }, null, 2);
}

export async function searchHotelRates(
  input: z.infer<typeof SearchHotelRatesSchema>
): Promise<string> {
  const res = await fetch(`${SEARCH_BASE}/hotels/rates`, {
    method: "POST",
    headers: {
      "X-API-Key": input.api_key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      hotelIds: input.hotel_ids,
      checkin: input.checkin,
      checkout: input.checkout,
      currency: input.currency,
      guestNationality: input.guest_nationality,
      occupancies: [{ adults: input.adults, children: [] }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`liteapi search_hotel_rates error ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { data?: unknown[] };
  const results = data.data ?? [];

  // Surface just the most useful fields to keep LLM context lean
  const summary = (results as any[]).slice(0, 5).map((h: any) => ({
    hotelId: h.hotelId,
    bestOffer: h.roomTypes?.[0]
      ? {
          offerId: h.roomTypes[0].offerId,
          roomName: h.roomTypes[0].name,
          price: h.roomTypes[0].price,
        }
      : null,
  }));
  return JSON.stringify({ result_count: results.length, results: summary }, null, 2);
}
