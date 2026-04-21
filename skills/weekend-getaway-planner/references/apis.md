# API Reference

All APIs used in the weekend-getaway-planner skill.

---

## Open-Meteo — Weather Forecast

**Base URL:** `https://api.open-meteo.com`  
**Auth:** None required  
**Cost:** Free, no signup

### Get 7-Day Forecast

```
GET /v1/forecast
```

**Key parameters:**

| Parameter | Example | Notes |
|---|---|---|
| `latitude` | `53.3498` | Dublin |
| `longitude` | `-6.2603` | Dublin |
| `daily` | `precipitation_sum,weathercode,wind_speed_10m_max` | Comma-separated |
| `timezone` | `Europe/Dublin` | Local timezone |
| `forecast_days` | `7` | 1–16 |

**Example:**
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=53.3498&longitude=-6.2603
  &daily=precipitation_sum,weathercode,wind_speed_10m_max
  &timezone=Europe/Dublin
  &forecast_days=7
```

**Response shape:**
```json
{
  "timezone": "Europe/Dublin",
  "daily": {
    "time": ["2026-04-25", "2026-04-26", ...],
    "precipitation_sum": [0.0, 1.6, ...],
    "weathercode": [3, 53, ...]
  }
}
```

**WMO Weather Code reference (relevant codes):**
- `0–3`: Clear to overcast — ✅ good
- `51–57`: Drizzle — ⚠️ light
- `61–67`: Rain — ❌ bad
- `80–82`: Rain showers — ❌ bad
- `95–99`: Thunderstorm — ❌ bad

---

## WeatherAPI.com — Weather Alerts

**Base URL:** `https://api.weatherapi.com`  
**Auth:** API key as query param `key=`  
**Cost:** Free tier — 1M calls/month, email signup at weatherapi.com, no credit card

### Get Forecast with Alerts

```
GET /v1/forecast.json?key={API_KEY}&q={location}&days=3&alerts=yes
```

**Parameters:**

| Parameter | Example | Notes |
|---|---|---|
| `key` | `your_api_key` | From weatherapi.com dashboard |
| `q` | `Dublin` or `53.3498,-6.2603` | City name or lat/lon |
| `days` | `3` | Max 3 on free tier |
| `alerts` | `yes` | Include weather alerts |

**operationId:** `getForecastWeather`

**Alerts in response:**
```json
{
  "alerts": {
    "alert": [
      {
        "headline": "Wind Warning",
        "severity": "Moderate",
        "event": "Wind Advisory",
        "effective": "2026-04-25T06:00:00+00:00",
        "expires": "2026-04-25T18:00:00+00:00",
        "desc": "Sustained winds 30–40 km/h..."
      }
    ]
  }
}
```

Empty `alerts.alert` array = no active warnings.

---

## liteapi.travel — Hotel Search and Booking

**Base URL:** `https://api.liteapi.travel`  
**Auth:** `X-API-Key` header  
**Sandbox key:** `sand_c0155ab8-c683-4f26-8f94-b5e92c5797b9` (public test key — no registration needed)  
**Cost:** Free sandbox; free production tier at dashboard.liteapi.travel/register  
**OpenAPI specs:** https://docs.liteapi.travel/openapi/

### 1. List Hotels by City

```
GET /v3.0/data/hotels?countryCode={CC}&cityName={city}&limit={n}
```

| Parameter | Example | Notes |
|---|---|---|
| `countryCode` | `IE` | ISO 3166-1 alpha-2 |
| `cityName` | `Dublin` | URL-encoded city name |
| `limit` | `20` | Max results |

**operationPath:** `/paths/~1data~1hotels/get`

**Response:** Array of `{ id, name, city, ... }`

---

### 2. Search Hotel Rates

```
POST /v3.0/hotels/rates
Content-Type: application/json
X-API-Key: {key}
```

**Request body:**
```json
{
  "hotelIds": ["lp1d4e80", "lp65583390"],
  "checkin": "2026-04-25",
  "checkout": "2026-04-26",
  "currency": "EUR",
  "guestNationality": "IE",
  "occupancies": [{ "adults": 2, "children": [] }]
}
```

**operationPath:** `/paths/~1hotels~1rates/post`

**Response:** Array of hotels, each with `roomTypes[]` containing `offerId`, `name`, `price.totalPrice`, `price.currency`.

---

### 3. Prebook (Lock Rate)

```
POST /v3.0/rates/prebook
Content-Type: application/json
X-API-Key: {key}
```

**Request body:**
```json
{ "offerId": "{offerId from step 2}" }
```

**operationPath:** `/paths/~1rates~1prebook/post`

**Response:** `{ prebookId, price, ... }` — confirms locked rate.

---

### 4. Book Hotel

```
POST /v3.0/rates/book
Content-Type: application/json
X-API-Key: {key}
```

**Request body:**
```json
{
  "prebookId": "{prebookId from step 3}",
  "guestInfo": {
    "guestFirstName": "Frank",
    "guestLastName": "Kilcommins",
    "guestEmail": "frank@example.com"
  },
  "payment": { "paymentType": "INVOICE" }
}
```

**operationPath:** `/paths/~1rates~1book/post`

**Response:** `{ bookingId, status, hotel, ... }` — booking confirmation.

⚠️ **Sandbox mode:** No real booking is made. Always inform the user.

---

## Google Calendar — Events

**Base URL:** `https://www.googleapis.com/calendar/v3`  
**Auth:** OAuth 2.0 — scope `https://www.googleapis.com/auth/calendar.events`  
**Cost:** Free with Google account  
**OpenAPI spec:** `googleapis.com/calendar/v3` in jentic-public-apis  

### List Events (Check Conflicts)

```
GET /calendars/{calendarId}/events
```

**operationId:** `calendar.events.list`

**Key parameters:**

| Parameter | Example | Notes |
|---|---|---|
| `calendarId` | `primary` | Use `primary` for main calendar |
| `timeMin` | `2026-04-25T00:00:00Z` | Friday 00:00 UTC |
| `timeMax` | `2026-04-27T00:00:00Z` | Sunday 00:00 UTC |
| `singleEvents` | `true` | Expand recurring events |
| `orderBy` | `startTime` | Chronological |

**Response:** `{ items: [{ summary, start, end, organizer, ... }] }`

---

### Create Calendar Event (Block Time Off)

```
POST /calendars/{calendarId}/events
```

**operationId:** `calendar.events.insert`

**Request body:**
```json
{
  "summary": "Weekend Getaway — Dublin",
  "start": { "date": "2026-04-25" },
  "end": { "date": "2026-04-27" },
  "description": "Booked via weekend-getaway-planner skill. Hotel: Marlin Hotel Stephens Green. Confirmation: BK-XXXX."
}
```

Use `date` (not `dateTime`) for all-day events.

---

## Date Calculation Helper

To find "next Friday" from today:

```python
from datetime import date, timedelta

def next_friday(from_date=None):
    d = from_date or date.today()
    days_ahead = 4 - d.weekday()  # Friday = 4
    if days_ahead <= 0:
        days_ahead += 7
    return d + timedelta(days=days_ahead)
```
