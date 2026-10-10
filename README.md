# AI Emotional Partner

**Multi-purpose MCP server that provides behavior guidance instructions to any AI agent based on the user's real-time wellbeing context.**

Built for the [CrossRoads AI Hackathon Bulgaria 2026](https://www.startupbulgaria.eu/crossroads/ai-hackathon) by **AI Cloud Agency**.

🎬 **Pitch & demo video:** [watch the final video](https://github.com/NikitaChernevskiy/crossroads-aica/releases/tag/pitch-video-final) · 🌐 [landing page](https://landing-sparkle-maker-25.lovable.app) · source project in [`Video/`](Video/), built with Claude Code and [Remotion](https://www.remotion.dev/). See [Video/README.md](Video/README.md) for the storyboard, sources and how to render it.

---

## What It Does

AI understands what humans ask — but not always what humans *need at that moment*. This project bridges that gap.

1. **Sensor client** reads EEG/PPG/IMU from a Muse S Athena headband via Web Bluetooth (or runs in simulation mode)
2. Emotional state (valence, arousal, focus, stress) is computed **in-browser** — raw signal never leaves the device
3. Aggregated state is sent to the backend API every 10-30 seconds
4. **MCP server** maps the state to behavior rules and returns instructions
5. Any AI agent calls `get_behavior_guidance` before responding → adapts tone, length, style

**Device-agnostic**: any wellbeing source (Apple Watch, Neurable, VR glasses, fitness bracelets) can send state via the unified format.
**Agent-agnostic**: any MCP-capable AI agent can consume the instructions.

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│  User Device     │     │  Azure Cloud                         │
│                  │     │                                      │
│  Muse S Athena ──┼─BLE─┤  ┌──────────────┐  ┌────────────┐  │
│  (EEG/PPG/IMU)  │     │  │ Backend API   │  │ Cosmos DB  │  │
│                  │     │  │ + MCP Server  ├──┤ (states)   │  │
│  Web Client ─────┼─HTTP┤  │ Container App │  └────────────┘  │
│  (React+TS)      │     │  └──────┬───────┘                   │
│  Static Web App  │     │         │ MCP                       │
│                  │     │  ┌──────┴───────┐                   │
│                  │     │  │  AI Agent    │                   │
│                  │     │  │  (Foundry)   │                   │
│                  │     │  └──────────────┘                   │
└─────────────────┘     └──────────────────────────────────────┘
```

## Unified State Format

```json
{
  "user_id": "entra-oid",
  "source": "muse-s-athena",
  "timestamp": "2026-10-10T14:32:05Z",
  "valence": -0.35,
  "arousal": 0.72,
  "focus": 0.41,
  "stress": 0.68,
  "label": "tense"
}
```

## MCP Tools

| Tool | Purpose |
|------|---------|
| `get_behavior_guidance` | Returns behavior instructions (tone, length, style) based on current state |
| `get_emotional_state` | Returns current emotional state for a user |
| `get_state_history` | Returns trend data over a time window |

**Privacy**: The AI agent never sees raw biometrics or emotional metrics. The MCP server returns only behavioral instructions — "be brief, be calm" not "stress: 0.68".

## Project Structure

```
crossroads-aica/
├── backend/          # Python FastAPI + MCP server (Container Apps)
│   ├── app/
│   │   ├── main.py          # FastAPI app + MCP mount
│   │   ├── config.py        # Environment settings
│   │   ├── models.py        # Pydantic data models
│   │   ├── cosmos.py        # Cosmos DB client + in-memory fallback
│   │   ├── rules.py         # Behavior rules engine
│   │   └── mcp_tools.py     # MCP tool definitions
│   ├── behavior_rules.json  # Configurable behavior rules
│   ├── Dockerfile
│   └── tests/
├── sensor-client/    # React + TypeScript web client (Static Web Apps)
│   └── src/
│       ├── App.tsx
│       ├── api.ts
│       ├── types.ts
│       └── components/
│           ├── DevicePanel.tsx   # Simulation + Bluetooth
│           ├── StateDisplay.tsx  # Real-time state visualization
│           └── ChatPanel.tsx     # Chat UI
├── Video/            # Pitch & demo video (Remotion project)
├── infra/            # Bicep IaC
│   ├── main.bicep
│   └── modules/      # Container Apps, ACR, Cosmos DB, Key Vault, App Insights, SWA
├── docker-compose.yml
└── .gitignore
```

## Quick Start (Local Development)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run with in-memory storage (no Azure needed)
USE_IN_MEMORY=true uvicorn app.main:app --reload --port 8000
```

The API is at `http://localhost:8000` and the MCP server at `http://localhost:8000/mcp`.

### Sensor Client

```bash
cd sensor-client
npm install
npm run dev
# Opens at http://localhost:5173 — proxies /api to backend
```

### Docker Compose

```bash
docker compose up --build
# Backend at :8000, client at :5173
```

### Run Tests

```bash
cd backend
pip install pytest anyio httpx
pytest tests/ -v
```

## Try It

1. Start the backend (`USE_IN_MEMORY=true uvicorn app.main:app --reload`)
2. Send a "tense" state:
   ```bash
   curl -X POST http://localhost:8000/state \
     -H "Content-Type: application/json" \
     -d '{"user_id":"demo","source":"simulation","valence":-0.35,"arousal":0.72,"focus":0.41,"stress":0.68,"label":"tense"}'
   ```
3. Get the current state:
   ```bash
   curl http://localhost:8000/state/demo
   ```
4. Send a "calm" state and see the guidance change:
   ```bash
   curl -X POST http://localhost:8000/state \
     -H "Content-Type: application/json" \
     -d '{"user_id":"demo","source":"simulation","valence":0.4,"arousal":0.3,"focus":0.8,"stress":0.15,"label":"calm"}'
   ```

## Behavior Rules

Rules are configured in `backend/behavior_rules.json` — editable without code changes:

- **High stress** → shorter, calmer, step-by-step responses
- **Low focus** → conclusion first, fewer details
- **Fatigue** → suggest a break, keep it short
- **Calm + focused** → detailed answers welcome
- **Stale data** → respond normally, note device may be disconnected

## Deploy to Azure

```bash
# Deploy infrastructure
az deployment group create \
  --resource-group <rg-name> \
  --template-file infra/main.bicep \
  --parameters environment=dev

# Build and push container
az acr build --registry <acr-name> \
  --image emotional-partner-backend:latest \
  ./backend
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend API | Python, FastAPI, Pydantic |
| MCP Server | MCP Python SDK (streamable HTTP) |
| Storage | Azure Cosmos DB (serverless) |
| Sensor Client | React, TypeScript, Vite, Tailwind CSS |
| Hosting | Azure Container Apps + Static Web Apps |
| IaC | Bicep |
| CI/CD | GitHub Actions |

## License

MIT