/**
 * tools/calendar.ts
 *
 * Tool 7: manage_calendar — Google Calendar API
 *   - action "list"   → GET /calendars/{calendarId}/events
 *   - action "create" → POST /calendars/{calendarId}/events
 *
 * A single tool with an `action` parameter keeps the tool count down while
 * still representing two distinct API operations. The LLM will naturally
 * call list first to check conflicts, then create to block the dates.
 *
 * Requires GOOGLE_CALENDAR_TOKEN (OAuth2 Bearer token with calendar scope).
 */

import { z } from "zod";

const GCAL_BASE = "https://www.googleapis.com/calendar/v3";

// ── Tool schema ───────────────────────────────────────────────────────────────

export const ManageCalendarSchema = z.object({
  action: z
    .enum(["list", "create"])
    .describe(
      '"list" to retrieve events (conflict check), "create" to block the dates'
    ),
  calendar_id: z
    .string()
    .default("primary")
    .describe("Google Calendar ID (default: primary)"),
  token: z.string().describe("Google OAuth2 Bearer access token"),

  // list params
  time_min: z
    .string()
    .optional()
    .describe("ISO 8601 start time for event listing (required for list)"),
  time_max: z
    .string()
    .optional()
    .describe("ISO 8601 end time for event listing (required for list)"),

  // create params
  summary: z
    .string()
    .optional()
    .describe("Event title (required for create)"),
  start_date: z
    .string()
    .optional()
    .describe("All-day event start date YYYY-MM-DD (required for create)"),
  end_date: z
    .string()
    .optional()
    .describe("All-day event end date YYYY-MM-DD (required for create)"),
  description: z
    .string()
    .optional()
    .describe("Event description (optional for create)"),
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function manageCalendar(
  input: z.infer<typeof ManageCalendarSchema>
): Promise<string> {
  const headers = {
    Authorization: `Bearer ${input.token}`,
    "Content-Type": "application/json",
  };

  if (input.action === "list") {
    if (!input.time_min || !input.time_max) {
      throw new Error("time_min and time_max are required for action=list");
    }
    const url = new URL(
      `${GCAL_BASE}/calendars/${encodeURIComponent(input.calendar_id)}/events`
    );
    url.searchParams.set("timeMin", input.time_min);
    url.searchParams.set("timeMax", input.time_max);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google Calendar list error ${res.status}: ${body}`);
    }
    const data = (await res.json()) as { items?: unknown[] };
    const items = data.items ?? [];
    return JSON.stringify(
      { event_count: items.length, events: items },
      null,
      2
    );
  }

  // action === "create"
  if (!input.summary || !input.start_date || !input.end_date) {
    throw new Error(
      "summary, start_date, and end_date are required for action=create"
    );
  }
  const body = {
    summary: input.summary,
    description: input.description ?? "",
    start: { date: input.start_date },
    end: { date: input.end_date },
  };

  const res = await fetch(
    `${GCAL_BASE}/calendars/${encodeURIComponent(input.calendar_id)}/events`,
    { method: "POST", headers, body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Calendar create error ${res.status}: ${errBody}`);
  }
  const created = await res.json();
  return JSON.stringify(created, null, 2);
}
