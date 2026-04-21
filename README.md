# Weekend Getaway Planner

Demonstrates how to represent a real-world agentic task across three levels of the reproducibility ladder — as featured in the webinar **Agent Skills, MCP, and Workflows: Tools for Enabling Agents** (Jentic, April 2026).

## Scenario

> Check the 5–7 day forecast for a destination. If next Friday looks good (no rain, no warnings), search hotel availability for 2 guests. If the best rate is within budget, book it — create a calendar block and surface any conflicts.

## Repository Structure

```
/
├── skill/                    # Agent Skill (SKILL.md + references + scripts)
│   ├── SKILL.md              # Skill definition — works with Claude Code & OpenClaw
│   ├── references/
│   │   └── apis.md           # API reference: Open-Meteo, WeatherAPI, liteapi, Google Calendar
│   └── scripts/
│       └── next_friday.py    # Date utility: calculate next Friday's date
│
├── mcp/                      # MCP Server (TypeScript) — coming soon
│   └── README.md
│
└── arazzo/                   # Arazzo workflow document — coming soon
    └── weekend-getaway.arazzo.yaml
```

## Using the Skill

### With Claude Code (claude.ai/code)
1. Download `skill/` as a `.skill` file (zip with `.skill` extension)
2. Drag into your Claude Code project or add via Settings → Skills

### With OpenClaw
1. Copy the `skill/` folder into your OpenClaw workspace `skills/` directory
2. OpenClaw auto-discovers SKILL.md files on startup

## APIs Used

| Capability | Provider | Cost |
|---|---|---|
| 7-day weather forecast | [Open-Meteo](https://open-meteo.com) | Free, no auth |
| Weather alerts | [WeatherAPI.com](https://weatherapi.com) | Free tier (1M/month) |
| Hotel search + booking | [liteapi.travel](https://liteapi.travel) | Free sandbox, free production tier |
| Calendar | Google Calendar API | Free (OAuth) |

## Webinar

**Agent Skills, MCP, and Workflows: Tools for Enabling Agents**  
Frank Kilcommins & Erik Wilde — Jentic, April 22, 2026  
[Registration](https://jentic.com/webinar/agent-skills-mcp-workflows)
