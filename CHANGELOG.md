# SYNQ — Changelog

All notable changes documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.4.4] — 2026-05-10 — Architectural Hardening

### Retrieval & Process
- **RAG Benchmarking** — Introduced a quantitative harness to measure retrieval accuracy.
- **Context Budgeting** — Character-based context window management.
- **Memory Decay** — Time-based relevance scoring for aging conversations.
- **Data Portability** — Session export and import functionality.
- **Bug Fixes** — Resolved UI deadlocks caused by missing polling routes and ghost jobs remaining in the queue after a backend restart.
- **Test Coverage** — Expanded unit tests for DOM resolvers and extraction logic.


---

## [1.4.3] — 2026-05-09 — Hybrid Search & MCP Evolution

### Retrieval & Intelligence
- **Hybrid Search (Vector + Graph)** — Both the Dashboard and MCP server now perform Hybrid Retrieval. The system extracts entities from user prompts and queries the Knowledge Graph for structured facts, combining them with semantic vector chunks.
- **Global Hybrid Search** — `search_memory` now performs cross-project graph scans, improving discovery across multiple repositories.
- **Smart Project Detection** — Added `identify_active_project` MCP tool to automatically match a terminal's CWD to a Synq project ID.

### MCP (Model Context Protocol) Improvements
- **Dashboard Visibility** — Manual saves from MCP-compatible tools (Claude Code, Cursor) are now saved to the `full_chats` table and appear in the Dashboard history.
- **MCP Resources** — Exposed the entire Knowledge Graph as a browsable MCP Resource (`synq://projects/{id}/graph`).
- **LLM Robustness** — Implemented try/catch fallbacks for AI extraction. If Ollama/Groq is unavailable, tools fallback gracefully to vector-only mode.
- **Config Generator** — Added `npm run mcp:config` to automatically generate absolute path configurations for AI tools.

### CI/CD & Maintenance
- **MCP Integration Tests** — Added automated tool verification to GitHub Actions, running on every PR in the SQLite-native environment.
- **Stability Fixes** — Resolved critical compilation errors and test regressions in the `isValidObjectId` validator.

---

## [1.4.2] — 2026-05-08 — SQLite Native (Zero-Docker) Migration

### Storage Architecture
- **Unified Storage Interface** — Introduced `ISessionStore`, `IGraphStore`, and `IVectorStore` interfaces.
- **SQLite Support** — Implemented `better-sqlite3` and `sqlite-vec` backends, allowing Synq to run without Docker (MongoDB, Neo4j, ChromaDB).
- **Dynamic Storage Factory** — Added `SYNQ_STORAGE_MODE` (docker/sqlite) to `.env` to toggle between legacy Docker and new local storage.

### Onboarding & Deployment
- **Zero-Docker Fallback** — `install.bat` and `install.sh` now automatically detect if Docker is missing/not running and default to SQLite mode.
- **Resource Efficiency** — SQLite mode reduces RAM requirement to 2GB and disk requirement to 5GB.
- **Version Alignment** — Synchronized version `1.4.2` across all modules: backend, dashboard, extension manifest, and MCP server.

### Maintenance & Fixes
- **Unified ID Validation** — Updated `isValidObjectId` to support both MongoDB ObjectIds and standard UUIDs for SQLite compatibility.
- **Jobs Worker** — Migrated background extraction worker to the unified storage layer.
- **MCP Server** — Full support for SQLite mode added to the Model Context Protocol server.

---

## [1.4.1] — 2026-05-05 — Expanding Platform Support

### Supported Platforms

- **New: DeepSeek (chat.deepseek.com)** — Full support. Leverages DeepSeek's stable `#chat-input` ID and product-specific `.ds-markdown` classes.
- All platforms (Claude, ChatGPT, Gemini, DeepSeek) now share the same multi-strategy resolver architecture.

### Automated Maintenance

- **Expanded Selector Monitoring** — `scripts/check-selectors.js` and the weekly GitHub Action now monitor all 4 platforms.
- **Fail-fast CI** — Selector staleness check updated to alert on DeepSeek regressions.

### Version Alignment

- Unified project versioning across extension manifest, extension package, backend, and dashboard to `1.4.1`.


## [1.4.0] — 2026-05-03 — Security, MCP & Production Hardening

### Security

- **Prompt injection defence** — `backend/src/middleware/sanitize.ts` scans every retrieved RAG chunk for 10 known injection patterns before it reaches any AI. Matching content is replaced with `[Content redacted: potential prompt injection pattern detected]`
- **XML context delimiters** — all injected context is wrapped in `<synq_retrieved_context>` XML tags. LLMs treat XML-tagged content as structured data rather than executable instructions
- **SECURITY.md** — expanded with prompt injection threat model and Groq privacy disclosure

### MCP Server — Universal Memory Layer

- New: `backend/src/mcp/server.ts` — standalone stdio MCP server compatible with Claude Code, Cursor, Windsurf, and Claude Desktop
- Five tools: `recall_context`, `store_memory`, `search_memory`, `list_projects`, `get_project_summary`
- All tools use the same MongoDB, ChromaDB, and Neo4j databases as the Chrome extension
- New: `MCP_SETUP.md` — copy-paste setup guide for all supported AI tools

### Resilient Selectors

- New: `extension/src/platform/resolver.ts` — multi-strategy DOM selector resolver
- Each platform now has 4–7 ordered fallback strategies: testid → aria-label → role → placeholder → generic contenteditable
- `MutationObserver` in `watchForInput()` auto-reconnects when the input is not yet in the DOM (SPA navigation)
- Claude, ChatGPT, and Gemini platform files updated to use `INPUT_SELECTOR_STRATEGIES` from the resolver

### Smart Ollama / Groq Auto-Detect

- `extractor.ts` — probes Ollama at startup. Uses `llama3.1:8b` locally if available; falls back to Groq with an explicit privacy warning if not
- `GROQ_API_KEY` removed from mandatory env validation — now strictly optional
- New env vars: `GRAPH_BACKEND` (force `ollama` or `groq`), `OLLAMA_MODEL` (default: `llama3.1:8b`)

### Production Dashboard

- `backend/src/index.ts` — `sirv` middleware serves `dashboard/dist/` as static files on port 3001
- No separate Vite dev server needed. Dashboard URL: `http://localhost:3001`
- Dashboard build reduced from ~5 MB to ~319 KB (gzip: 105 KB)
- CORS allowlist updated to include `localhost:3001`

### Lite Mode

- `docker-compose.yml` — added `full` and `lite` profiles. Neo4j tagged as `full` only
- New: `docker-compose.lite.yml` — standalone file with only MongoDB + ChromaDB

### Installers & Launchers

- New: `install.sh` — one-command first-time setup for macOS/Linux (~3 min)
- New: `install.bat` — one-command first-time setup for Windows
- Updated: `start.bat` — RAM detection (WMIC), `llama3.1:8b` model check, dashboard build step, plain ASCII output (no box-drawing characters)
- Updated: `start.sh` — RAM detection, Docker profiles, builds production dashboard instead of starting Vite dev server, adds MCP reference

### CI/CD & Maintenance

- New: `.github/workflows/integration-tests.yml` — full RAG pipeline integration test on every PR
- New: `.github/workflows/selector-check.yml` — weekly headless check for selector staleness; auto-creates GitHub issues
- New: `.github/workflows/release.yml` — auto-creates GitHub Release with extension zip on version tags
- New: `backend/tests/pipeline.integration.test.ts` — seeds a fixture and asserts end-to-end retrieval
- New: `ROADMAP.md` — versioned milestones and planned features

### TypeScript

- `backend/tsconfig.json` — `include: ["src/**/*"]` explicit, `tests/` excluded from rootDir, `resolveJsonModule: true` added. Compilation: 0 errors.

---

## [1.3.3] — 2026-05-03 — Startup Robustness

- Forced Docker Compose project name to `synq` — prevents errors when the repository folder has dots or version numbers in the name
- Removed Unicode box-drawing characters from `start.bat` that caused rendering errors in Windows CMD

---

## [1.3.2] — 2026-05-03 — UI Refinement & Extension Features

### Dashboard

- Complete UI overhaul — new layout and color palette
- Granular graph settings (node size, position, tension)
- Collapsible left sidebar (Facts + Chat tabs)
- Fixed staggered graph rendering lag on large knowledge graphs
- Resolved UI arrow/connection rendering errors

### Extension

- Multi-save support — same chat can be saved multiple times without duplicate sessions
- Unload Session button — explicitly disconnect from active session
- Pause/Resume always visible in compact UI layout
- Badge toggle — click the SYNQ badge to toggle on/off instantly
- Save button contrast fix

---

## [1.3.1] — 2026-05-01 — Scripts & Documentation

- Fixed `start.bat` and `start.sh` parenthesis/pipe parsing errors
- Added automatic Ollama and backend dependency checks in launchers
- Suppressed npm deprecation warnings in build output
- README: added project logo and demo video
- Added `.gitattributes` and updated `.gitignore` for extension `/dist`

---

## [1.3.0] — 2026-04-27 — UI/UX Overhaul & Open Source Readiness

### Dashboard — Graph

- Degree-scaled nodes: 8–60px radius — hub nodes visually dominant
- Curved quadratic bezier edges with hover-reveal labels
- Per-type colored glow filters (22 types)
- Hover tooltip: name, type, connection count
- Zoom controls (+/−/reset)
- 3D radial gradient fills

### Dashboard — Chat Viewer

- Color-coded conversation: user messages right-aligned (indigo), assistant left-aligned (cyan)
- Turn parser from raw text into styled bubbles
- Header stats: turn count, message count, save date

### Dashboard — App Shell

- Sidebar redesign with Outfit typeface
- Skeleton loaders during data loading
- Error banner when backend is unreachable
- React hook lint errors resolved (0 ESLint errors)

### Open Source

- Added `CODE_OF_CONDUCT.md`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`
- Added `CHANGELOG.md`, `ARCHITECTURE.md`, `RAG_PIPELINE.md`, `PLATFORM_SELECTORS.md`, `SELF_HOSTING.md`, `CONTRIBUTING.md`

---

## [1.2.0] — 2026-04-26 — Zero-Loss RAG + Auto-Connect

### RAG Pipeline

Replaced the Groq topic splitter with a pure sliding window chunker:

| | Groq Topic Splitter | Sliding Window Chunker |
|---|---|---|
| Personal facts | Deleted as "filler" | Preserved verbatim |
| Short messages | Rejected | Always included |
| API call on save | Yes | None |
| Data loss | Significant | Zero |

### Auto-Connect

Replaced manual Connect button with automatic interceptor attachment on init(). Simple Pause/Resume toggle replaces the connect state machine.

### Knowledge Graph

- Entity types: 12 → 22 (added: Person, Pet, Goal, Problem, Preference, Habit, Tool, Pattern, Location, Organization)
- Relation types: ~6 → 20+ (added: OWNS, NAMED, PREFERS, WANTS, KNOWS, IS_BUILDING, SOLVED_WITH, etc.)

### Bug Fixes

- Infinite loop in chunker when `overlapWords >= windowWords` — clamped to `windowWords - 1`
- `start.bat` closed immediately — missing `call` keyword before all `npm`/`npx` invocations
- Session change not broadcast to other tabs — fixed with `broadcastSessionChanged()`

---

## [1.1.0] — 2026-04-25 — Security & Reliability Audit

- CORS locked from wildcard to explicit allowlist
- Rate limiting: 200 req/min global; 10 req/min on `/api/chat/save`
- sessionId validated as MongoDB ObjectId on all routes
- Body limit reduced from 50 MB to 5 MB
- Embeddings generated in parallel via `Promise.all` (was sequential)
- Neo4j connection with exponential backoff retry (5 attempts)
- Project summary cached in `Session.summary`
- All `console.log` replaced with structured `logger` utility

---

## [1.0.0] — 2026-04-24 — Initial Release

- Chrome extension: Claude, ChatGPT, Gemini support
- Groq LLaMA 3.1 knowledge graph extraction
- MongoDB session and FullChat storage
- Neo4j semantic graph (12 entity types)
- Classic Inject (structured summary pasted into input)
- React dashboard with D3.js force graph
- Docker Compose infrastructure
