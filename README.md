# Italy Job Hunter

> An AI pipeline that automates the entire job hunting workflow for the Italian tech market — from web search to personalized CV analysis — and delivers results directly to Telegram.

Built because manually scanning job boards every day is a solved problem. This tool runs unattended, filters noise with a fast LLM, and only surfaces opportunities that actually match your profile.

---

## How It Works

Two independent pipelines, both running fully automated:

**Hunt mode** — finds active job listings targeting the Italian market, runs a fast boolean AI triage, analyzes each match against your CV, and delivers a formatted report to Telegram.

**Scout mode** — discovers target companies in Italy and generates a personalized cold-outreach pitch for each one, ready to send to a CTO or HR Manager.

```
Tavily (web search)
       │
       ▼
groq-ollama  →  model: ollama-groq
(boolean triage — YES / NO)
       │ YES
       ▼
deepseek-ollama  →  model: ollama-deepseek
(CV match analysis + recruiter hook)
       │
       ▼
Telegram Bot
(formatted report)
```

Two specialized local services replace the former cloud providers, one per stage:
`groq-ollama` (boolean triage) and `deepseek-ollama` (CV analysis). Both run on Ollama,
each serving a model built from its own `Modelfile` on top of `qwen2.5:3b-instruct` — no
external API keys, no per-call cost, full data privacy.

---

## Why Two Local Services

Each stage runs on its own self-hosted Ollama service, specialized for its job:

- **groq-ollama** (`ollama-groq`) — a tuned boolean yes/no filter (temperature 0, tiny output) that discards off-target listings before any deep analysis
- **deepseek-ollama** (`ollama-deepseek`) — a headhunter persona tuned for structured CV matching and recruiter-hook generation

Splitting the two roles into separate services keeps each model loaded and specialized, avoids
contention on a single instance, and lets you scale or swap each stage independently. The result:
zero API cost, no rate limits, and no listing or CV data leaving the machine.

---

## Prerequisites

- **Node.js 18** or higher
- **Docker + docker compose** with NVIDIA GPU support — the bundled `groq-ollama` and `deepseek-ollama` services build and provision the two specialized models automatically
- An API key for the following service:

| Service | Purpose | Cost |
|---|---|---|
| [Tavily](https://tavily.com) | Web search | Free tier available |
| groq-ollama (local) | Boolean triage (`ollama-groq`) | Free / self-hosted |
| deepseek-ollama (local) | CV analysis (`ollama-deepseek`) | Free / self-hosted |
| [Telegram Bot](https://core.telegram.org/bots#botfather) | Delivery | Free |

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/simonecamerano/italy-job-hunter.git
cd italy-job-hunter

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and fill in your API keys

# 4. Add your CV
# Replace data/cv.md with your own CV in Markdown format
```

---

## Usage

```bash
# Find job listings and send match reports to Telegram
npm start

# Find target companies and generate cold-outreach pitches
npm run scout

# Run the test suite
npm test
```

---

## Configuration

### Environment variables (`.env`)

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Your bot token from [@BotFather](https://t.me/botfather) |
| `TELEGRAM_CHAT_ID` | Your personal chat ID (use [@userinfobot](https://t.me/userinfobot)) |
| `TAVILY_API_KEY` | Tavily API key |
| `GROQ_OLLAMA_URL` | Triage service URL (default `http://groq-ollama:11434`) |
| `DEEPSEEK_OLLAMA_URL` | Analysis service URL (default `http://deepseek-ollama:11434`) |
| `TRIAGE_MODEL` | Triage model name (default `ollama-groq`) |
| `ANALYSIS_MODEL` | Analysis model name (default `ollama-deepseek`) |
| `OLLAMA_MODEL` | Base model pulled by the ollama containers (default `qwen2.5:3b-instruct`) |

### Search constants (`src/config.js`)

All search queries, model names, and tuning parameters live in `src/config.js`. Edit this file to adapt the tool to any stack or market without touching the pipeline logic.

| Constant | Default | Description |
|---|---|---|
| `SEARCH_QUERY` | *(see file)* | Tavily query for job listings |
| `SEARCH_MAX_RESULTS` | `20` | Max raw results per hunt run |
| `SCOUT_QUERY` | *(see file)* | Tavily query for company scouting |
| `SCOUT_MAX_RESULTS` | `6` | Max companies per scouting session |
| `GROQ_OLLAMA_URL` | `http://groq-ollama:11434` | Triage service base URL |
| `DEEPSEEK_OLLAMA_URL` | `http://deepseek-ollama:11434` | Analysis service base URL |
| `TRIAGE_MODEL` | `ollama-groq` | Specialized model for boolean filtering |
| `ANALYSIS_MODEL` | `ollama-deepseek` | Specialized model for CV analysis |
| `API_DELAY_MS` | `2500` | Delay between calls (serializes each single-instance service) |
| `TELEGRAM_MAX_CHARS` | `4000` | Message chunk size (Telegram limit: 4096) |

### CV (`data/cv.md`)

Replace `data/cv.md` with your own CV in Markdown format. The analyzer reads it at runtime to generate personalized match reports and cold-outreach pitches. The quality of the output scales directly with the quality of your CV file.

---

## Project Structure

```
italy-job-hunter/
├── data/
│   └── cv.md                     Your CV in Markdown format
├── src/
│   ├── config.js                 Centralized constants — service URLs, models, limits
│   ├── ollama_client.js          Shared HTTP client (baseUrl + model per call)
│   ├── ollama/
│   │   └── init-ollama.sh        Entrypoint for the ollama services (starts the server)
│   ├── seen_store.js             Deduplication cache — no duplicate results
│   ├── search_engine.js          Stage 1: web search via Tavily
│   ├── triage_filter.js          Stage 2: boolean filter via groq-ollama
│   ├── ollama_analyzer.js        Stage 3: CV match analysis via deepseek-ollama
│   ├── telegram_sender.js        Stage 4: formatted delivery via Telegram
│   ├── company_scouter.js        Scout: finds target companies via Tavily
│   └── spontaneous_analyzer.js   Scout: cold-outreach pitches via deepseek-ollama
├── ollamagroq/                   groq-ollama image — Dockerfile + Modelfile (triage)
├── ollamadeepseek/               deepseek-ollama image — Dockerfile + Modelfile (analysis)
├── tests/                        Vitest test suite — runs fully offline, no API calls
├── index.js                      Hunt mode orchestrator
├── scouting.js                   Scout mode orchestrator
├── docker-compose.yml            bot + groq-ollama + deepseek-ollama services
└── .env.example                  Environment variable template
```

---

## Tech Stack

| Tool | Purpose | Why |
|---|---|---|
| [Tavily](https://tavily.com) | Web search | Purpose-built for AI agents; returns clean, structured content |
| [Ollama](https://ollama.com) — `ollama-groq` (triage) + `ollama-deepseek` (analysis) | Two specialized local models on `qwen2.5:3b-instruct` | Self-hosted, zero cost, private; one tuned service per stage |
| [Telegram Bot API](https://core.telegram.org/bots/api) | Delivery | Instant push notifications, zero UI to build or maintain |
| [Vitest](https://vitest.dev) | Testing | Native ESM support, zero config |

---

## Adapting to Your Stack

The pipeline is not Italy-specific. To use it for a different market or tech stack:

1. Edit `SEARCH_QUERY` and `SCOUT_QUERY` in `src/config.js`
2. Replace `data/cv.md` with your own CV
3. Edit `ollamagroq/Modelfile` / `ollamadeepseek/Modelfile` to tune each model, or point `GROQ_OLLAMA_URL` / `DEEPSEEK_OLLAMA_URL` / `TRIAGE_MODEL` / `ANALYSIS_MODEL` at other Ollama services or models — the interfaces are modular

The core pipeline logic does not need to change.

---

## Author

**Simone Camerano** — AI workflow engineer and full stack developer.

I build systems that automate complex, multi-step processes. This tool came out of a real problem: the Italian tech job market is fragmented and noisy. Manual searching wastes time that could be automated.

- 🌐 [simonecamerano.dev](https://simonecamerano.dev)
- 💼 [linkedin.com/in/simone-camerano](https://linkedin.com/in/simone-camerano)
- 🐙 [github.com/simonecamerano](https://github.com/simonecamerano)

---

## License

ISC
