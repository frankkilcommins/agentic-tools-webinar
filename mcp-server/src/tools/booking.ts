/**
 * tools/booking.ts
 *
 * Tool 5: prebook_hotel_rate — liteapi Booking API (POST /rates/prebook)
 * Tool 6: confirm_hotel_booking — liteapi Booking API (POST /rates/book)
 *
 * These tools represent the "Booking & Payments Team" in our multi-team demo.
 * Both require LITEAPI_KEY.
 */

import { z } from "zod";

const BOOKING_BASE = "https://api.liteapi.travel/v3.0";

// ── Tool schemas ──────────────────────────────────────────────────────────────

export const PrebookHotelRateSchema = z.object({
  offer_id: z
    .string()
    .describe("The offerId from search_hotel_rates to lock in"),
  api_key: z.string().describe("liteapi.travel API key"),
});

export const ConfirmHotelBookingSchema = z.object({
  prebook_id: z
    .string()
    .describe("The prebookId returned by prebook_hotel_rate"),
  guest_first_name: z.string().describe("Guest first name"),
  guest_last_name: z.string().describe("Guest last name"),
  guest_email: z.string().email().describe("Guest email for confirmation"),
  api_key: z.string().describe("liteapi.travel API key"),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function prebookHotelRate(
  input: z.infer<typeof PrebookHotelRateSchema>
): Promise<string> {
  const res = await fetch(`${BOOKING_BASE}/rates/prebook`, {
    method: "POST",
    headers: {
      "X-API-Key": input.api_key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ offerId: input.offer_id }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`liteapi prebook error ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { data?: unknown };
  return JSON.stringify(data.data ?? data, null, 2);
}

export async function confirmHotelBooking(
  input: z.infer<typeof ConfirmHotelBookingSchema>
): Promise<string> {
  const res = await fetch(`${BOOKING_BASE}/rates/book`, {
    method: "POST",
    headers: {
      "X-API-Key": input.api_key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prebookId: input.prebook_id,
      guestInfo: {
        guestFirstName: input.guest_first_name,
        guestLastName: input.guest_last_name,
        guestEmail: input.guest_email,
      },
      payment: { paymentType: "INVOICE" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`liteapi confirm_booking error ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { data?: unknown };
  return JSON.stringify(data.data ?? data, null, 2);
}
