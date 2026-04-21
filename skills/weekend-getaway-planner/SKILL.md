---
name: weekend-getaway-planner
description: Plan a spontaneous weekend getaway — check the weather, find and book a hotel, and block your calendar. Uses MCP tools from the weekend-getaway-planner server.
---
# Skill: Weekend Getaway Planner

## Purpose

Plan a spontaneous weekend getaway end-to-end using the available MCP tools.
Given a destination and travel dates, check the weather, find and book a hotel,
then block the dates in Google Calendar.

---

## Available Tools

You have access to 7 MCP tools from the `weekend-getaway-planner` server.
Use them in the order defined below. Do not skip steps or change the sequence.

| Step | Tool | Purpose |
|------|------|---------|
| 1 | `get_weather_forecast` | Retrieve daily forecast for the destination |
| 2 | `check_weather_alerts` | Check for active weather warnings |
| 3 | `find_hotels` | Get hotel IDs for the city |
| 4 | `search_hotel_rates` | Get live availability and pricing |
| 5 | `prebook_hotel_rate` | Lock in the best offer |
| 6 | `confirm_hotel_booking` | Complete the booking |
| 7 | `manage_calendar` (list) | Check for calendar conflicts |
| 8 | `manage_calendar` (create) | Block the dates |

> **Important:** Use ONLY the MCP tools from the `weekend-getaway-planner` server
> (tool names start with `mcp_weekend-getaw_`).
> Do not read, execute, or fall back to local script files under any circumstances.

---

## Step-by-Step Instructions

### Step 1 — Get Weather Forecast (`get_weather_forecast`)

- Use the destination's latitude and longitude
- Set `start_date` and `end_date` to the Friday and Saturday of travel

### Step 2 — Check Weather Alerts (`check_weather_alerts`)

- Pass the human-readable location string (e.g. "Galway, Ireland")
- Note any active alerts; they are a hard blocker if severity is extreme

### Step 3 — Evaluate Weather (decision gate)

Before proceeding to hotels, evaluate the forecast:

**Proceed if ALL of the following are true:**
- Friday `precipitation_sum` < 5mm
- Friday `weathercode` < 61 (61+ = rain, 80+ = showers, 95+ = thunderstorm)
- No active alerts with severity "Extreme" or "Severe"

**If conditions are not met:** Stop. Report the weather issue to the user and ask
whether they want to proceed anyway or choose a different date/destination.

### Step 4 — Find Hotels (`find_hotels`)

- Pass `country_code` (e.g. "IE") and `city_name` (e.g. "Galway")
- Keep `limit` at 20
- Extract the hotel IDs from the response — you will need them in Step 5

### Step 5 — Search Hotel Rates (`search_hotel_rates`)

- Pass the hotel IDs from Step 4 as `hotel_ids`
- Use the travel dates for `checkin` / `checkout`
- Default currency: EUR, default nationality: IE
- From the results, identify the best offer: lowest `totalPrice` with a valid `offerId`
- Report the top 3 options to the user with name and price before proceeding

### Step 6 — Prebook Rate (`prebook_hotel_rate`)

- Pass the `offerId` of the selected hotel
- Store the `prebookId` from the response — required for Step 7
- If this step returns an error, fall back to the next-best `offerId` from Step 5

### Step 7 — Confirm Booking (`confirm_hotel_booking`)

- Pass the `prebookId` from Step 6
- Pass guest details: first name, last name, email
- Use `paymentType: INVOICE` (sandbox)
- Store the `bookingId` from the response

### Step 8 — Check Calendar Conflicts (`manage_calendar` with `action: "list"`)

- Use `time_min` = Friday 00:00 and `time_max` = Sunday 00:00 (ISO 8601)
- Report any existing events to the user
- If there are no blocking events, proceed to Step 9

### Step 9 — Create Calendar Block (`manage_calendar` with `action: "create"`)

- `summary`: "Weekend Getaway — {destination}"
- `start_date`: Friday date
- `end_date`: Sunday date (exclusive end for all-day events)
- `description`: Include the hotel name and booking confirmation ID

---

## Output Format

After completing all steps, summarise the outcome:

```
✅ Weekend Getaway Confirmed

📍 Destination: [city, country]
📅 Dates: [Friday] → [Saturday]
🌤️ Weather: [brief summary, e.g. "Partly cloudy, 2mm rain expected"]
🏨 Hotel: [hotel name]
💶 Price: [total price + currency]
🔖 Booking ID: [bookingId]
📆 Calendar: Event created / [N] conflicts found
```

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Weather gate fails | Stop, report to user, offer alternatives |
| No hotels found | Report, suggest adjusting dates or city |
| `search_hotel_rates` returns empty | Retry with a smaller hotel ID list (top 10) |
| `prebook_hotel_rate` fails | Try next-best offerId from Step 5 |
| `confirm_hotel_booking` fails | Report error, do not retry — surface prebookId so user can retry manually |
| Calendar token expired | Report, skip calendar steps, provide dates for manual entry |

---

## Notes

- The liteapi sandbox key (`sand_...`) returns realistic mock data. No real bookings are made.
- Google Calendar token expires after 1 hour. If calendar steps fail with 401, the token needs refreshing.
- Do not pass API keys in your responses or summaries.
