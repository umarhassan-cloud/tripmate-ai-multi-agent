# TripMate AI — Multi-Agent Travel Planner

Production-style **multi-agent AI travel planner** built with **LangGraph**, **MCP**, a **Supervisor**, **Guardrails**, and **Human-in-the-Loop** approval.

Inspired by the Code With Aarohi series:
1. [Multi-Agent AI + Memory + APIs](https://youtu.be/ctHby5vhDqg)
2. [MCP Explained](https://youtu.be/tcdtYA0_N7w)
3. [APIs → MCP in Travel Planner](https://youtu.be/DjMX7o2EeV0)
4. [Supervisor, Guardrails & HITL](https://youtu.be/ZULVHkPa4xk)
5. [Deploy on a VPS](https://youtu.be/84LbJElhfL4)

Perfect portfolio / CV project for **Agentic AI**, **LangGraph**, and **MCP**.

---

## What this multi-agent system does

```
User query
   ↓
Supervisor + Guardrail  →  reject non-travel requests
   ↓
Specialist agents (selected dynamically):
   • Flight Agent   → AviationStack via MCP
   • Hotel Agent    → Tavily Search via MCP
   • Weather Agent  → OpenWeather via custom MCP server
   • Budget Agent   → cost / feasibility analysis
   • Itinerary Agent → day-by-day draft plan
   ↓
Human Approval (HITL)   →  you approve or request changes
   ↓
Final Agent             →  polished travel proposal
```

PostgreSQL (or in-memory) stores thread state so HITL pause/resume works.

---

## Tech stack

| Layer | Tools |
|--------|--------|
| Orchestration | LangGraph `StateGraph` |
| LLM | Groq · Llama 3.3 70B |
| Tools | MCP (Tavily, AviationStack, OpenWeather) |
| API / UI | FastAPI + HTML/CSS/JS |
| Memory | PostgreSQL checkpoints (or MemorySaver) |
| Deploy | Docker / VPS |

---

## Quick start (Windows)

### 1. Create virtual environment

```powershell
cd "D:\cv project"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```powershell
pip install -r requirements.txt
```

Also install `uv` (needed for AviationStack MCP via `uvx`):

```powershell
pip install uv
```

### 3. Configure `.env`

```powershell
copy .env.example .env
```

Fill in API keys (all have free tiers):

| Key | Get from |
|-----|----------|
| `GROQ_API_KEY` | https://console.groq.com |
| `TAVILY_API_KEY` | https://tavily.com |
| `AVIATIONSTACK_API_KEY` | https://aviationstack.com |
| `OPENWEATHER_API_KEY` | https://openweathermap.org/api |

For a local demo **without PostgreSQL**, keep:

```env
USE_MEMORY_CHECKPOINT=true
```

### 4. Run the app

```powershell
python app.py
```

Open: **http://127.0.0.1:8000**

Example prompt:

> Plan a complete 7 days Japan trip from Karachi including flights, hotels and sightseeing under 2 lakhs.

The UI will pause for **Approve / Revise** before the final plan.

---

## Optional: PostgreSQL memory

```sql
CREATE DATABASE langgraph_memory_demo;
```

```env
USE_MEMORY_CHECKPOINT=false
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/langgraph_memory_demo
```

---

## Docker / VPS deploy

```powershell
docker build -t tripmate-ai .
docker run -p 8000:8000 --env-file .env tripmate-ai
```

On a VPS, point Nginx to port `8000` and keep your `.env` secrets off Git.

---

## Project structure

```
app.py                       # FastAPI server + routes
backend.py                   # LangGraph agents, supervisor, HITL
mcp_client.py                # MCP client (Tavily / Aviation / Weather)
custom_weather_mcp_server.py # Custom OpenWeather MCP server
templates/index.html         # Web UI
static/                      # CSS + JS
Dockerfile                   # Production container
.env.example                 # Secrets template
```

---


## License

See [LICENSE](LICENSE). Tutorial concepts credited to the referenced YouTube series; adapt and present as your own implementation for learning / portfolio use.
