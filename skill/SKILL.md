---
name: weekend-getaway-planner
description: Plan a spontaneous weekend getaway end-to-end. Use when the user asks to plan a last-minute weekend trip, check if the weather looks good for a getaway, find and optionally book a hotel stay, or block time off in their calendar. Triggers on phrases like "plan a weekend away", "check if the weather is good for a trip", "find a hotel for the weekend", "book a weekend getaway", or "is next Friday a good day to travel to [location]".
---

# Weekend Getaway Planner

Plan a spontaneous weekend getaway: check the 5–7 day forecast, evaluate conditions for next Friday, search for hotel availability and pricing, optionally book, then block time off in Google Calendar and surface any conflicts.

## Inputs

Gather from the user before proceeding:

| Input | Required | Default |
|---|---|---|
| `location` | Yes | — |
| `checkin_date` | No | Next Friday (auto-calculated) |
| `checkout_date` | No | Next Saturday (auto-calculated) |
| `guests` | No | 2 adults |
| `budget_per_night` | No | Ask user if hotel step is reached |
| `calendar_id` | No | `primary` |

If `checkin_date` is not provided, calculate next Friday's date from today's date.

## Workflow

Execute the steps below in order. Each step has a **success condition** that must be met before proceeding.

### Step 1 — Get Weather Forecast

Call Open-Meteo to retrieve the 7-day daily forecast for the location.

- Resolve the location to latitude/longitude before calling (use your knowledge or ask the user).
- Request: `daily=precipitation_sum,weathercode,wind_speed_10m_max`
- Timezone: use the location's local timezone (e.g. `Europe/Dublin` for Ireland).

**Success condition:** Forecast data returned for the target Friday date.

See `references/apis.md` → Open-Meteo for endpoint details.

### Step 2 — Evaluate Weather Conditions

Assess the Friday forecast against these criteria:

- `precipitation_sum` < 5mm (light rain threshold)
- `weathercode` not in the "heavy rain / storm" codes: 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99
- Check WeatherAPI alerts endpoint for active warnings at the location.

See `references/apis.md` → WeatherAPI for the alerts call.

**If conditions are poor:** Inform the user clearly — precipitation level, weather code description, and any active alerts. Stop and ask if they want to try a different date or location.

**Success condition:** No heavy rain, precipitation < 5mm, no active weather warnings.

### Step 3 — Search Hotel Availability

Call liteapi to find available hotels and rates for the location on the target dates.

1. First call `GET /v3.0/data/hotels` to find hotel IDs for the city.
2. Then call `POST /v3.0/hotels/rates` with the hotel IDs, dates, and occupancy.
3. Present the top 3–5 options to the user: hotel name, room type, total price, currency.

**Always use the sandbox API key for demos** (see `references/apis.md`). Replace with a live key for real bookings.

**If no results:** Inform the user and suggest adjusting dates or location.

**Success condition:** At least one available offer with a price returned.

### Step 4 — Evaluate Price

Compare the best available rate against `budget_per_night`.

- If no budget was provided, ask the user now: *"The best available rate is X EUR/night. Is that within your budget?"*
- If price is within budget, confirm with the user before booking.

**If over budget:** Present the cheapest option found and ask if they want to proceed or adjust.

**Success condition:** User confirms they want to proceed with a specific offer.

### Step 5 — Prebook and Book (Optional)

If the user confirms, complete the booking in two steps:

1. Call `POST /v3.0/rates/prebook` with the `offerId` — this locks the rate and returns a `prebookId`.
2. Confirm the locked price with the user.
3. Call `POST /v3.0/rates/book` with `prebookId` and guest details to confirm the booking.

Collect guest details before booking: first name, last name, email.

**Important:** In sandbox mode, no real booking is made. Tell the user this clearly.

See `references/apis.md` → liteapi for full request shapes.

**Success condition:** Booking confirmation ID returned.

### Step 6 — Manage Calendar

1. Call `GET /calendars/{calendarId}/events` to list events on the Friday and Saturday.
2. Surface any conflicts to the user (event title, time, organiser if available).
3. Call `POST /calendars/{calendarId}/events` to create a "Weekend Getaway — [Location]" all-day event covering Friday and Saturday.

See `references/apis.md` → Google Calendar for scopes and request shapes.

**Success condition:** Calendar event created; conflict list presented to user.

## Final Output

Summarise the outcome:

- Weather verdict for Friday (conditions + any alerts)
- Hotel booked (name, dates, price, confirmation ID) — or best option found if user chose not to book
- Calendar event created
- Conflicts to reschedule (list or "none")

## Constraints

- Never make a real booking without explicit user confirmation.
- Always tell the user when operating in sandbox mode.
- Do not store or log guest personal details beyond the current session.
- If any step fails due to an API error, report the error clearly and ask the user how to proceed.
- Google Calendar requires OAuth — if not authenticated, instruct the user to authenticate first.
