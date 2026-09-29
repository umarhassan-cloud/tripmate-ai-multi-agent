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

## CV / portfolio talking points

- Built a **multi-agent travel planner** with LangGraph state machines
- Used **MCP** so agents call external tools through a standard protocol
- Added a **Supervisor** that routes only the agents needed per query
- Implemented **input guardrails** to block off-topic / unsafe requests
- Added **Human-in-the-Loop** approval before final itinerary delivery
- Persisted conversation/thread state with **PostgreSQL checkpoints**
- Shipped a **FastAPI** web UI and **Docker** deploy path

---

## Roman Urdu guide — yeh project kya hai aur kaise chalaye

### Yeh multi-agent system kya karta hai?

Yeh ek **AI travel planner** hai jismein **kai agents** mil kar kaam karte hain — ek akela chatbot nahi.

1. **Supervisor Agent** — pehle check karta hai ke request travel related hai ya nahi (**guardrail**). Phir decide karta hai kaun se agents chalane hain.
2. **Flight Agent** — MCP ke through AviationStack se flights dhoondhta hai.
3. **Hotel Agent** — Tavily MCP se hotels / stay options nikalta hai.
4. **Weather Agent** — OpenWeather MCP se destination ka mausam batata hai.
5. **Budget Agent** — budget ke hisaab se plan feasible hai ya nahi, analyze karta hai.
6. **Itinerary Agent** — day-by-day draft plan banata hai.
7. **Human Approval (HITL)** — aap draft approve / revise karte ho.
8. **Final Agent** — sab kuch milakar polished travel plan deta hai.

Matlab: aap prompt do → agents research karein → aap approve karo → final plan mile.

### Kaise run karein (Windows)

1. Folder kholo: `D:\cv project`
2. Terminal mein:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install uv
copy .env.example .env
```

3. `.env` file mein apni API keys daalo (`GROQ`, `TAVILY`, `AVIATIONSTACK`, `OPENWEATHER`).
4. Pehli baar ke liye `USE_MEMORY_CHECKPOINT=true` rakho (PostgreSQL ki zaroorat nahi).
5. Run:

```powershell
python app.py
```

6. Browser: http://127.0.0.1:8000
7. Prompt likho, **Generate Draft** dabao, phir **Approve** karo.

### Portfolio / CV pe kaise likhein

> Built a multi-agent AI travel planner using LangGraph and MCP with supervisor routing, input guardrails, human-in-the-loop approval, and FastAPI deployment.

Agar interview mein poochhein **"multi-agent kya hota hai?"** to short jawab:

> Ek system jahan alag-alag specialized AI agents apna kaam karte hain (flights, hotels, weather), aur ek supervisor unko coordinate karta hai — jaise team lead + specialists.

---

## License

See [LICENSE](LICENSE). Tutorial concepts credited to the referenced YouTube series; adapt and present as your own implementation for learning / portfolio use.
