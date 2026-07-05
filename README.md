# Artificial Brain v3

A full-stack, brain-inspired AI platform: a Node.js/Express backend with modular
"brain region" services (prefrontal, hippocampus, amygdala, cerebellum, and more),
an LLM router with multi-tier fallback (OpenRouter → NVIDIA → Ollama), a Neo4j
knowledge graph for episodic memory, and multiple React front-ends served from a
single server:

- **Brain** – the core dashboard, neural map, memory, and chat UI.
- **Genesis** – a visual agent/tool orchestration canvas.
- **Businesses** – business growth, scraping, and reporting tools.
- **Inventor Studio** – autonomous invention, dream loops, and circuit design.

---

## Tech Stack

- **Backend:** Node.js (≥ 18), Express, WebSocket (`ws`)
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, React Three Fiber
- **Databases:** MongoDB (Mongoose), Neo4j (knowledge graph / memory)
- **Auth:** JWT + bcrypt
- **LLM providers:** OpenRouter, NVIDIA NIM, Ollama (tunnel + local)

---

## Prerequisites

Install these before you start:

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js     | ≥ 18    | Includes `npm` |
| Git         | any     | To clone the repo |
| MongoDB     | —       | Local install or a MongoDB Atlas connection string |
| Neo4j       | —       | Optional, for knowledge-graph / memory features |
| Ollama      | —       | Optional, only for local LLM inference |

---

## 1. Clone the repository

### Windows (PowerShell)
```powershell
git clone https://github.com/sanjaydoc/artificial-brain-v3.git
cd artificial-brain-v3
```

### macOS / Linux (Terminal)
```bash
git clone https://github.com/sanjaydoc/artificial-brain-v3.git
cd artificial-brain-v3
```

---

## 2. Configure environment variables

Copy the example file to `.env` and fill in your own keys and secrets.
**Never commit your real `.env` — it is git-ignored on purpose.**

### Windows (PowerShell)
```powershell
Copy-Item .env.example .env
notepad .env
```

### macOS / Linux
```bash
cp .env.example .env
nano .env      # or: vim .env / code .env
```

At minimum set: `OPENROUTER_API_KEY` (or another LLM provider), `JWT_SECRET`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `MONGODB_URI`. See `.env.example` for the
full list of supported variables and their descriptions.

---

## 3. Install dependencies

The commands are identical on every OS.

### Root app
```bash
npm install
```

### Sub-apps (only if you plan to build or develop them individually)
```bash
# Windows PowerShell — run each line separately
cd apps/genesis;        npm install; cd ../..
cd apps/businesses;     npm install; cd ../..
cd apps/inventor-studio; npm install; cd ../..
```

```bash
# macOS / Linux — one-liner
for d in apps/genesis apps/businesses apps/inventor-studio; do (cd "$d" && npm install); done
```

---

## 4. Run the app

All commands are the same across Windows, macOS, and Linux.

| Command             | What it does                                       |
|---------------------|----------------------------------------------------|
| `npm run dev`       | Dev mode — HMR, instant changes, no builds         |
| `npm run build:all` | Build every front-end for production               |
| `npm run start`     | Start the production server on **port 3003**       |
| `npm run agent`     | Start the local agent                              |

### Development
```bash
npm run dev
```
Runs the server plus the Brain and Genesis dev servers with hot-reload.

### Production
```bash
npm run build:all
npm run start
```
Then open **http://localhost:3003**.

Build front-ends individually if you prefer:
```bash
npm run build:genesis
npm run build:businesses
npm run build:inventor
```

---

## Project structure

```
artificial-brain-v3/
├── server.js              # Express entry point (port 3003)
├── brain/                 # Brain-region modules (prefrontal, hippocampus, ...)
├── routes/                # API routes (auth, chat, brain, genesis, llm, sim)
├── services/              # LLM router, agent bridge, Genesis executor
├── models/                # Mongoose models
├── middleware/            # Auth middleware
├── src/                   # Brain React front-end
├── apps/
│   ├── genesis/           # Agent orchestration canvas
│   ├── businesses/        # Business growth / reporting app
│   └── inventor-studio/   # Autonomous inventor app
├── local-agent/           # Local agent (npm run agent)
├── docker/                # docker-compose + Caddy config
└── public/ , dist/        # Built front-end assets
```

---

## Docker

A `docker/` directory with `docker-compose.yml` and a `Caddyfile` is included for
containerized deployment. Copy `docker/.env.example` to `docker/.env`, fill it in,
then:

```bash
cd docker
docker compose up -d
```

---

## Security note

Keep all secrets in `.env` files (git-ignored). Do **not** commit API keys,
database credentials, or tokens to the repository. If a secret is ever committed,
rotate it immediately.

---

## License

This project is licensed under the [MIT License](LICENSE).

## Author

**Dr. Sanjay Anbu**
