# Weekend Getaway Planner — Demo Repository

A three-act demo for the webinar **"Agent Skills, MCP, and Workflows: Tools for Enabling Agents"**.

Live / On-demand Session: https://jentic.com/webinar/agent-skills-mcp-workflows
Slides: http://dret.net/lectures/webinar-2026/agentic-tools

Each act builds on the previous, showing how agent tooling evolves from raw MCP tools → guided skills → deterministic Arazzo workflows.

---

## Repository Structure

```
weekend-getaway-repo/
├── .vscode/
│   └── mcp.json              # MCP server config for VS Code / Claude Code
├── arazzo/
│   └── weekend-getaway.arazzo.yaml   # Act 3: validated Arazzo workflow
├── mcp-server/               # Act 1 & 3: MCP server
│   ├── src/
│   │   ├── index.ts          # Server entry point (8 tool registrations)
│   │   ├── config.ts         # Env-var credential loader
│   │   └── tools/
│   │       ├── weather.ts    # Tools 1–2: Open-Meteo + WeatherAPI
│   │       ├── hotels.ts     # Tools 3–4: liteapi Hotel Data + Search
│   │       ├── booking.ts    # Tools 5–6: liteapi Prebook + Confirm
│   │       ├── calendar.ts   # Tool 7: Google Calendar (list + create)
│   │       └── workflow.ts   # Tool 8: Arazzo workflow executor (Act 3)
│   ├── .env.example          # Environment variable template
│   ├── package.json
│   └── tsconfig.json
└── skill/
    ├── SKILL.md              # Act 2: agent skill definition
    ├── references/apis.md    # API reference notes
    └── scripts/next_friday.py
```

---

## The 8 MCP Tools

| # | Tool | API | Act | Team |
|---|------|-----|-----|------|
| 1 | `get_weather_forecast` | Open-Meteo (free, no auth) | 1 & 2 | Weather |
| 2 | `check_weather_alerts` | WeatherAPI.com | 1 & 2 | Weather |
| 3 | `find_hotels` | liteapi Hotel Data API | 1 & 2 | Hotel Inventory |
| 4 | `search_hotel_rates` | liteapi Search API | 1 & 2 | Hotel Inventory |
| 5 | `prebook_hotel_rate` | liteapi Booking API | 1 & 2 | Booking & Payments |
| 6 | `confirm_hotel_booking` | liteapi Booking API | 1 & 2 | Booking & Payments |
| 7 | `manage_calendar` | Google Calendar API | 1 & 2 | Calendar |
| 8 | `run_weekend_getaway_workflow` | All of the above | **3** | Workflow |

---

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- **VS Code** with the [Claude Code extension](https://marketplace.visualstudio.com/items?itemName=Anthropic.claude-code)
- API keys (see [Credentials](#credentials) below)

---

## Getting Started Locally

### 1. Clone and install

```bash
git clone <repo-url>
cd weekend-getaway-repo/mcp-server
npm install
```

### 2. Set up credentials

```bash
cp .env.example .env
```

Edit `.env` and fill in your API keys:

| Variable | Where to get it |
|----------|----------------|
| `WEATHER_API_KEY` | [weatherapi.com/signup](https://www.weatherapi.com/signup.aspx) — free tier |
| `LITEAPI_KEY` | [app.liteapi.travel](https://app.liteapi.travel) — use the **sandbox** key (`sand_...`) for demos |
| `GOOGLE_CALENDAR_TOKEN` | [OAuth Playground](https://developers.google.com/oauthplayground) → select `Google Calendar API v3` → authorise → copy the access token |

### 3. Build the MCP server

```bash
npm run build
```

This compiles TypeScript to `dist/`. The output is `dist/index.js`.

### 4. Load environment variables

The MCP server reads credentials from environment variables at startup. Before launching VS Code (or in your shell profile):

```bash
export WEATHER_API_KEY="your_key"
export LITEAPI_KEY="sand_your_sandbox_key"
export GOOGLE_CALENDAR_TOKEN="your_google_token"
```

Or use a tool like [`direnv`](https://direnv.net/) to load `.env` automatically when you enter the project directory.

### 5. Configure Claude Code in VS Code

The repository already includes `.vscode/mcp.json` which registers the MCP server with Claude Code:

```json
{
  "servers": {
    "weekend-getaway-planner": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/mcp-server/dist/index.js"],
      "env": {
        "WEATHER_API_KEY": "${env:WEATHER_API_KEY}",
        "LITEAPI_KEY": "${env:LITEAPI_KEY}",
        "GOOGLE_CALENDAR_TOKEN": "${env:GOOGLE_CALENDAR_TOKEN}"
      }
    }
  }
}
```

Open the repository root in VS Code. Claude Code will auto-detect `.vscode/mcp.json` and make the tools available.

### 6. Verify the tools are loaded

In VS Code, open the Claude Code panel. The 8 tools should appear in the tool list:
- `get_weather_forecast`
- `check_weather_alerts`
- `find_hotels`
- `search_hotel_rates`
- `prebook_hotel_rate`
- `confirm_hotel_booking`
- `manage_calendar`
- `run_weekend_getaway_workflow`

---

## Demo Prompt (Act 1)

Use this prompt in Claude Code to drive the Act 1 demo:

```
I'd like to plan a spontaneous weekend getaway to Galway, Ireland
for next Friday (25 April) to Saturday (26 April) for 2 adults.

Please:
1. Check whether the weather looks suitable (not heavy rain or storms)
2. If the weather is OK, find hotels in Galway and get the best available rate
3. Prebook the best offer and confirm the booking for:
   - Guest: Jane Doe, jane.doe@example.com
4. Check my primary Google Calendar for any conflicts on those dates
5. If no major conflicts, create a calendar block for the trip

My API keys are already configured in the environment.
Use the liteapi sandbox key for the hotel booking.
```

This prompt intentionally leaves the **orchestration to the LLM** — it has to figure out the right tool call sequence, pass data between calls, and decide when to proceed. This is Act 1: capable but fragile.

---

## Credentials

> ⚠️ Never commit real API keys. `.env` is in `.gitignore`.

**liteapi sandbox key**: The sandbox key (`sand_...`) returns realistic mock data without making real bookings or charges. Safe for demos and recordings.

**Google Calendar token**: OAuth2 access tokens expire after 1 hour. For a pre-recorded demo, generate a fresh token immediately before recording. For a live demo, use a long-lived service account or mock the Calendar calls.

---

## Act 2: Agent Skill

See [`skill/SKILL.md`](skill/SKILL.md). Load this into the agent's system context alongside the MCP tools. The skill provides structured guidance on how to sequence the tools, evaluate weather thresholds, and handle failures — but the LLM is still the orchestrator.

## Act 3: Arazzo Workflow

See [`arazzo/weekend-getaway.arazzo.yaml`](arazzo/weekend-getaway.arazzo.yaml). The Arazzo document encodes the full workflow as a deterministic, executable specification.

The 8th MCP tool — `run_weekend_getaway_workflow` — executes this workflow in a single tool call. No LLM decisions between steps. Geocode → weather gate → hotel search → booking → calendar, all in sequence.

**Act 3 demo prompt:**

```
Use the run_weekend_getaway_workflow tool to plan a weekend getaway to Galway,
Ireland for 25–26 April for 2 adults.
Guest: Frank Kilcommins, fkilcommins@gmail.com
```

One tool call. Deterministic. The workflow handles the sandbox payment failure gracefully (skips to calendar steps) and returns a structured summary.
