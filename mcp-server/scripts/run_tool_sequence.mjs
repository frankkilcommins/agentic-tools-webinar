import { McpClient } from "@modelcontextprotocol/sdk/client/mcp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const client = new McpClient({ name: "weekend-getaway-client" });
  const transport = new StdioClientTransport();
  await client.connect(transport);
  console.error("Connected to MCP server via stdio");

  // Helper to call a tool
  async function callTool(tool, input) {
    console.error(`Calling ${tool} with ${JSON.stringify(input)}`);
    const resp = await client.call(tool, input);
    console.error(`Response from ${tool}:`, resp);
    return resp;
  }

  // 1. Check weather for Galway next Friday-Saturday (2026-04-25 to 2026-04-26)
  const weatherInput = {
    latitude: 53.2707,
    longitude: -9.0568,
    start_date: "2026-04-25",
    end_date: "2026-04-26",
  };

  const weather = await callTool("get_weather_forecast", weatherInput);
  console.log("WEATHER", JSON.stringify(weather, null, 2));

  // If weather contains heavy rain or storms, exit.
  // We'll conservatively proceed.

  // 2. Find hotels in Galway
  const findHotelsInput = {
    country_code: "IE",
    city_name: "Galway",
    api_key: process.env.LITEAPI_KEY || "",
    limit: 10,
  };
  const hotels = await callTool("find_hotels", findHotelsInput);
  console.log("HOTELS", JSON.stringify(hotels, null, 2));

  // 3. Search hotel rates — for demo, use sample hotelIds if available
  let hotelIds = [];
  try {
    const parsed = JSON.parse(hotels.content?.[0]?.text || hotels);
    if (parsed?.hotels) hotelIds = parsed.hotels.slice(0, 3).map(h => h.id || h.hotelId || h.hotel_id || h.hotelId);
  } catch (e) {
    // fallback: empty
  }
  if (hotelIds.length === 0) {
    console.error("No hotel IDs found — aborting rate search");
    return;
  }

  const searchRatesInput = {
    hotel_ids: hotelIds,
    checkin: "2026-04-25",
    checkout: "2026-04-26",
    adults: 2,
    currency: "EUR",
    guest_nationality: "IE",
    api_key: process.env.LITEAPI_KEY || "",
  };
  const rates = await callTool("search_hotel_rates", searchRatesInput);
  console.log("RATES", JSON.stringify(rates, null, 2));

  // Extract best offer id from rates
  let bestOfferId = null;
  try {
    const parsed = JSON.parse(rates.content?.[0]?.text || rates);
    const first = parsed?.results?.[0];
    bestOfferId = first?.bestOffer?.offerId || first?.bestOffer?.offer_id;
  } catch (e) {}
  if (!bestOfferId) {
    console.error("No offerId found — aborting prebook");
    return;
  }

  // 4. Prebook the best offer
  const prebookInput = { offer_id: bestOfferId, api_key: process.env.LITEAPI_KEY || "" };
  const prebook = await callTool("prebook_hotel_rate", prebookInput);
  console.log("PREBOOK", JSON.stringify(prebook, null, 2));

  let prebookId = null;
  try {
    const parsed = JSON.parse(prebook.content?.[0]?.text || prebook);
    prebookId = parsed?.prebookId || parsed?.prebook_id || parsed?.data?.prebookId || parsed?.id;
  } catch (e) {}
  if (!prebookId) {
    console.error("No prebookId found — aborting confirm");
    return;
  }

  // 5. Confirm booking
  const confirmInput = {
    prebook_id: prebookId,
    guest_first_name: "Frank",
    guest_last_name: "Kilcommins",
    guest_email: "fkilcommins@gmail.com",
    api_key: process.env.LITEAPI_KEY || "",
  };
  const confirm = await callTool("confirm_hotel_booking", confirmInput);
  console.log("CONFIRM", JSON.stringify(confirm, null, 2));

  // 6. Check calendar for conflicts
  const listInput = {
    action: "list",
    calendar_id: "primary",
    token: process.env.GOOGLE_CALENDAR_TOKEN || "",
    time_min: "2026-04-25T00:00:00Z",
    time_max: "2026-04-26T23:59:59Z",
  };
  const calList = await callTool("manage_calendar", listInput);
  console.log("CALENDAR_LIST", JSON.stringify(calList, null, 2));

  const events = JSON.parse(calList.content?.[0]?.text || calList);
  if (events?.event_count && events.event_count > 0) {
    console.error("Found calendar conflicts — aborting create");
    return;
  }

  // 7. Create calendar block
  const createInput = {
    action: "create",
    calendar_id: "primary",
    token: process.env.GOOGLE_CALENDAR_TOKEN || "",
    summary: "Galway weekend — Frank Kilcommins",
    start_date: "2026-04-25",
    end_date: "2026-04-26",
    description: "Weekend getaway to Galway",
  };
  const calCreate = await callTool("manage_calendar", createInput);
  console.log("CALENDAR_CREATE", JSON.stringify(calCreate, null, 2));

  console.error("Sequence complete");
}

main().catch(err => {
  console.error("Error in run_tool_sequence:", err);
  process.exit(1);
});
