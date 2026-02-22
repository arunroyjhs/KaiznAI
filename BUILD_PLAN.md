# BUILD_PLAN.md — Outcome Runtime
## Implementation Plan (Derived from product.md, agent.md, design.md)

---

## SUMMARY

This plan turns three specification documents into a working **Outcome Runtime** monorepo. The project is a platform that replaces sprint-based execution with outcome-driven experimentation, powered by AI agents and governed by human gates.

**Current state:** Zero implementation code. Three spec files (product.md, agent.md, design.md) + LICENSE.
**Target state (Phase 0):** Working end-to-end demo — define outcome → AI generates hypotheses → human approves → agent builds → signal measured → dashboard shows results.

---

## PHASE 0: FOUNDATION (Steps 1–15)

### Step 1: Monorepo Scaffolding

**Goal:** Create the Turborepo + pnpm workspace skeleton with all packages defined.

**Actions:**
1. Initialize root `package.json` with pnpm workspaces pointing to `apps/*`, `packages/*`, `integrations/**/*`
2. Create `turbo.json` with build/dev/test/lint pipeline definitions
3. Create `pnpm-workspace.yaml`
4. Create `.gitignore` (node_modules, dist, .env, .next, coverage, postgres data)
5. Create `.nvmrc` with `20` (Node 20+ required per agent.md)
6. Scaffold empty packages with `package.json` + `tsconfig.json` for each:
   - `apps/web`, `apps/api`, `apps/docs`
   - `packages/core`, `packages/hypothesis-engine`, `packages/signal-collector`
   - `packages/execution-orchestrator`, `packages/llm-gateway`, `packages/human-gates`
   - `packages/learning-library`, `packages/agent-sdk`, `packages/mcp-server`
   - `packages/cli`, `packages/ui-components`
7. Create shared `tsconfig.base.json` (TypeScript strict mode, no `any` in public APIs)
8. Add root dev dependencies: `turbo`, `typescript`, `vitest`, `eslint`, `prettier`

**Files created:** ~40+ package.json/tsconfig.json files, turbo.json, pnpm-workspace.yaml, .gitignore, .nvmrc

---

### Step 2: Shared TypeScript Configuration & Tooling

**Goal:** Consistent TypeScript strict mode, linting, and formatting across all packages.

**Actions:**
1. Create `tsconfig.base.json` at root — strict: true, target: ES2022, module: NodeNext
2. Create `packages/core/tsconfig.json` extending base
3. Configure ESLint with `@typescript-eslint` — enforce no `any` in exported types
4. Configure Prettier (single quotes, trailing commas, 100 char width)
5. Add `lint-staged` + `husky` for pre-commit hooks
6. Add Vitest config at root for shared test setup

**Files:** tsconfig.base.json, .eslintrc.js, .prettierrc, .husky/pre-commit

---

### Step 3: Docker Infrastructure (PostgreSQL + TimescaleDB + Redis)

**Goal:** One-command `docker-compose up` starts all infrastructure dependencies.

**Actions:**
1. Create `docker-compose.yml` (dev) with:
   - `timescale/timescaledb-ha:pg16-latest` on port 5432 (includes pgvector)
   - `redis:7-alpine` on port 6379
   - Volumes for persistent data
   - Health checks for both services
2. Create `docker-compose.prod.yml` per agent.md spec (adds api + web services)
3. Create `.env.example` with all required env vars from agent.md
4. Create `scripts/setup-db.sh` — enables TimescaleDB and pgvector extensions

**Files:** docker-compose.yml, docker-compose.prod.yml, .env.example, scripts/setup-db.sh

---

### Step 4: Database Schema & Drizzle ORM Setup (`packages/core`)

**Goal:** All core tables from agent.md schema created via Drizzle ORM migrations.

**Actions:**
1. Install `drizzle-orm`, `drizzle-kit`, `pg` in `packages/core`
2. Define Drizzle schemas for all tables from agent.md:
   - `orgs` — multi-tenant root
   - `workspaces` — org subdivision
   - `outcomes` — core domain (status, signal, target, constraints, horizon)
   - `experiments` — hypotheses, predictions, measurement plans, status lifecycle
   - `signal_measurements` — TimescaleDB hypertable for time-series
   - `human_gates` — gate types, context packages, SLA, decisions
   - `learnings` — experiment findings with pgvector embeddings
   - `llm_provider_configs` — provider auth (API key + OAuth tokens, encrypted)
3. Create initial migration (`0001_initial_schema.sql`)
4. Add `pnpm db:migrate` and `pnpm db:generate` scripts
5. Create Zod schemas for all JSONB fields (primary_signal, target, constraints, prediction, intervention, measurement_plan, rollout_plan, context_package)
6. Export TypeScript types inferred from Drizzle schemas

**Key tables:** 7 core tables + TimescaleDB hypertable + pgvector index
**Files:** packages/core/src/db/schema/*.ts, packages/core/drizzle.config.ts, drizzle/*.sql

---

### Step 5: Core Types & Shared Domain Logic (`packages/core`)

**Goal:** All shared types, enums, constants, and the Zod validation schemas used across packages.

**Actions:**
1. Define enums:
   - `OutcomeStatus`: draft | active | achieved | abandoned | expired
   - `ExperimentStatus`: hypothesis | awaiting_portfolio_gate | building | awaiting_launch_gate | running | measuring | awaiting_analysis_gate | scaling | awaiting_scale_gate | killed | shipped | failed_build
   - `GateType`: portfolio_review | launch_approval | analysis_review | scale_approval | ship_approval
   - `GateStatus`: pending | approved | rejected | approved_with_conditions | delegated | timed_out
   - `LLMPurpose`: hypothesis_generation | hypothesis_scoring | analysis | vibe_check | context_summarization | decision_synthesis
   - `SignalDirection`: increase | decrease
2. Define Zod schemas for outcome.yaml parsing (complete spec from agent.md)
3. Define `OutcomeRuntimeError` base class per agent.md error handling standards
4. Export all types as a public API from `packages/core`

**Files:** packages/core/src/types/*.ts, packages/core/src/errors.ts, packages/core/src/schemas/*.ts, packages/core/src/index.ts

---

### Step 6: Outcome State Machine (`packages/core`)

**Goal:** XState v5 state machine managing the outcome lifecycle (draft → active → achieved/abandoned/expired).

**Actions:**
1. Install `xstate` v5 in `packages/core`
2. Implement outcome lifecycle state machine:
   - States: `draft` → `active` → `achieved` | `abandoned` | `expired`
   - Transitions: activate (draft→active), achieve (active→achieved), abandon (active→abandoned), expire (active→expired)
   - Guards: validate outcome has valid signal config before activation
   - Actions: on activate → trigger hypothesis generation, on achieve → record timestamp
3. Implement experiment lifecycle state machine:
   - States: full lifecycle from agent.md (hypothesis → awaiting_portfolio_gate → building → ... → shipped/killed)
   - Guards: gate approval required for transitions through gate states
   - Actions: state transition side effects (create gates, notify, record timestamps)
4. Write comprehensive tests (95% coverage required per agent.md for state machine)
5. Never modify state machine code without migration strategy (per agent working rules)

**Files:** packages/core/src/state-machine/outcome-machine.ts, packages/core/src/state-machine/experiment-machine.ts, packages/core/src/state-machine/__tests__/

---

### Step 7: LLM Gateway (`packages/llm-gateway`)

**Goal:** Unified LLM provider abstraction — all AI calls route through the gateway. Never call providers directly.

**Actions:**
1. Define `LLMRequest` and `LLMResponse` interfaces per agent.md spec
2. Implement `LLMGateway` class with:
   - `complete(request, orgId)` — main entry point
   - `resolveConfig(orgId, purpose)` — picks provider/model based on org config + purpose
   - Rate limiting per org/provider
   - Token budget checking (for OAuth account mode with monthly limits)
   - Retry with exponential backoff (3 retries per agent.md error standards)
   - Usage logging (input/output tokens, latency, provider)
3. Implement Anthropic provider adapter (API key mode — Phase 0 scope)
   - Claude Opus for hypothesis generation
   - Claude Sonnet for routine analysis
4. Implement OpenAI provider adapter (API key mode — Phase 0 scope)
5. Create provider interface that all adapters implement
6. Stub OAuth account mode (Phase 2 implementation)

**Files:** packages/llm-gateway/src/gateway.ts, packages/llm-gateway/src/providers/anthropic.ts, packages/llm-gateway/src/providers/openai.ts, packages/llm-gateway/src/providers/base.ts

---

### Step 8: Hypothesis Engine (`packages/hypothesis-engine`)

**Goal:** Given an active outcome, generate a portfolio of 3 experiment hypotheses using the LLM Gateway.

**Actions:**
1. Implement `HypothesisEngine` class per agent.md spec:
   - `generatePortfolio(outcome)` — main method
   - Step 1: Gather context in parallel (funnel data, segment data, past learnings, codebase context)
   - Step 2: Decompose metric into sub-problems via LLM
   - Step 3: Generate candidate hypotheses per sub-problem via LLM (parallel)
   - Step 4: Score candidates (expectedImpact * 0.35 + riskMultiplier * 0.25 + speedBonus * 0.20 + learningValue * 0.20)
   - Step 5: Select diverse, non-conflicting portfolio
2. Define Zod schemas for LLM output parsing (SubProblem, ExperimentCandidate)
3. Write system prompts for decomposition and hypothesis generation
4. Implement conflict detection (file path overlap between experiments)
5. Write tests with mocked LLM responses (80% coverage required)

**Files:** packages/hypothesis-engine/src/generator.ts, packages/hypothesis-engine/src/prompts.ts, packages/hypothesis-engine/src/scoring.ts, packages/hypothesis-engine/src/schemas.ts

---

### Step 9: Signal Collector — Core + 2 Connectors (`packages/signal-collector`)

**Goal:** Poll metrics from external sources (Mixpanel + PostgreSQL), store as time-series, detect significance.

**Actions:**
1. Define `SignalConnector` interface per agent.md (testConnection, fetchMetric, fetchVariantMetric, listMetrics)
2. Implement **Mixpanel connector** — fetch funnel and event metrics via Mixpanel API
3. Implement **PostgreSQL connector** — fetch metrics via custom SQL queries
4. Implement signal polling scheduler (BullMQ job, every 6 hours per agent.md)
5. Store measurements in `signal_measurements` TimescaleDB hypertable
6. Implement `SequentialTest` class (mSPRT — mixture Sequential Probability Ratio Test):
   - Always-valid p-values for continuous monitoring
   - Confidence interval calculation
   - Success threshold detection
   - Kill threshold detection
7. Implement constraint monitoring — auto-pause experiments when guardrail metrics violated
8. Write comprehensive tests (90% coverage required per agent.md)

**Files:** packages/signal-collector/src/connectors/mixpanel.ts, packages/signal-collector/src/connectors/postgres.ts, packages/signal-collector/src/scheduler.ts, packages/signal-collector/src/statistics/sequential-test.ts, packages/signal-collector/src/monitor.ts

---

### Step 10: Human Gates (`packages/human-gates`)

**Goal:** Create, assign, notify, and resolve human decision gates at each stage of the experiment lifecycle.

**Actions:**
1. Implement gate creation — generates context package with full experiment/outcome state
2. Implement gate assignment — assigns to configured user, sets SLA countdown
3. Implement email notification on gate creation (basic SMTP via nodemailer)
4. Implement gate resolution — approve / reject / approve_with_conditions
5. Implement SLA monitoring — reminder at 50% of SLA, escalation to backup at 100%
6. Connect gates to experiment state machine transitions
7. Create gate decision recording (who decided, when, with what conditions)

**Files:** packages/human-gates/src/gate-manager.ts, packages/human-gates/src/notifications.ts, packages/human-gates/src/sla-monitor.ts

---

### Step 11: Fastify API Server (`apps/api`)

**Goal:** RESTful API implementing the full route map from agent.md.

**Actions:**
1. Initialize Fastify with TypeScript, CORS, helmet, rate-limiting
2. Implement route groups per agent.md API design:
   - `POST /api/v1/outcomes` — create outcome (from JSON or parsed outcome.yaml)
   - `GET /api/v1/outcomes` — list outcomes (paginated, filtered by workspace)
   - `GET /api/v1/outcomes/:id` — outcome detail with current signal
   - `POST /api/v1/outcomes/:id/activate` — trigger hypothesis generation
   - `GET /api/v1/outcomes/:id/experiments` — experiments for outcome
   - `GET /api/v1/outcomes/:id/signals` — time-series data
   - `GET /api/v1/experiments/:id` — experiment detail
   - `GET /api/v1/experiments/:id/brief` — agent-ready experiment brief
   - `POST /api/v1/experiments/:id/built` — agent reports completion
   - `GET /api/v1/gates/pending` — pending gates for current user
   - `GET /api/v1/gates/:id` — gate detail
   - `POST /api/v1/gates/:id/respond` — human responds to gate
   - `POST /api/v1/signals/ingest` — webhook signal ingestion
   - `GET /api/v1/signals/connectors` — list connectors
   - `POST /api/v1/signals/connectors/test` — test connector config
3. Add Zod request/response validation on all routes
4. Add basic auth middleware (API key for Phase 0 — Better Auth in Phase 5)
5. Add error handling middleware returning `OutcomeRuntimeError` format
6. Write e2e tests with supertest

**Files:** apps/api/src/server.ts, apps/api/src/routes/*.ts, apps/api/src/middleware/*.ts, apps/api/src/plugins/*.ts

---

### Step 12: Next.js Dashboard (`apps/web`)

**Goal:** Web UI implementing the dashboard per design.md specifications.

**Actions:**
1. Initialize Next.js 14 (App Router) with TypeScript
2. Install and configure shadcn/ui + Tailwind CSS with design.md color system
3. Configure fonts: Geist + Geist Mono (per design.md typography)
4. Implement dark-first theme with CSS variables from design.md
5. Build layout:
   - Fixed left sidebar (240px) with sections: Outcomes, Experiments, Gates, Signals, Learnings, Settings
   - Workspace switcher at top
   - Main content area: max-width 1400px, 12/4/1 column responsive grid
6. Build pages:
   - **Outcome list** — cards with signal value, target, status, experiment count (E6-01)
   - **Outcome detail** — signal time-series chart + experiment list (E6-02)
   - **Experiment card** — hypothesis, prediction, current delta, significance meter (E6-03)
   - **Experiment result chart** — control vs treatment time-series (E6-04)
   - **Gate inbox** — all pending gates for current user (E6-05)
   - **Gate detail** — full context package + decision UI with approve/reject (E6-06)
7. Implement chart components (Recharts):
   - Signal time-series with confidence band
   - Target line (dashed green), kill threshold (dashed red), baseline (dashed amber)
   - Control (grey) vs treatment (indigo) lines
8. Implement status indicators per design.md:
   - Running: pulsing indigo dot
   - Achieved: solid green checkmark
   - Gate pending: amber clock
   - Constraint violated: red warning
   - Killed: grey strikethrough
9. Implement empty state copy per design.md
10. Implement error state copy per design.md

**Files:** apps/web/src/app/layout.tsx, apps/web/src/app/(dashboard)/*.tsx, apps/web/src/components/*.tsx, apps/web/tailwind.config.ts

---

### Step 13: MCP Server (`packages/mcp-server`)

**Goal:** 5 MCP tools per agent.md — works with Claude Code, Cursor, Windsurf, and any MCP-compatible IDE.

**Actions:**
1. Install `@modelcontextprotocol/sdk`
2. Implement MCP server exposing 5 tools:
   - `get_active_outcomes` — list active outcomes with signal values and experiment portfolios
   - `get_experiment_brief` — full experiment brief for an agent to build
   - `report_experiment_built` — agent reports build complete (files changed, feature flag, summary)
   - `query_learnings` — semantic search over past experiment learnings
   - `request_human_gate` — trigger a human gate when agent needs approval
3. Each tool calls the Fastify API internally (HTTP client)
4. Configure stdio transport (for IDE config)
5. Publish as `outcome-runtime-mcp` npm package name

**Files:** packages/mcp-server/src/server.ts, packages/mcp-server/src/tools/*.ts

---

### Step 14: CLI (`packages/cli`)

**Goal:** `npx outcome-runtime init` bootstraps a project; `experiment` and `report` commands for agent workflows.

**Actions:**
1. Build CLI with `commander` or `citty`
2. Implement commands:
   - `init` — creates outcome.yaml.example in current directory, prints setup instructions
   - `validate` — validates outcome.yaml against Zod schema, shows clear errors
   - `experiment --id <id>` — fetches experiment brief from API, prints to stdout
   - `report --id <id>` — reports experiment built, prompts for summary + files changed
   - `status` — shows all active outcomes and their current state
3. Publish as `outcome-runtime` npm package (for `npx outcome-runtime`)

**Files:** packages/cli/src/index.ts, packages/cli/src/commands/*.ts

---

### Step 15: outcome.yaml Parser & Example

**Goal:** Complete outcome.yaml reference config that validates and parses into domain objects.

**Actions:**
1. Create `outcome.yaml.example` at repo root (full reference from agent.md)
2. Implement YAML parser in `packages/core` using `js-yaml` + Zod validation
3. Support environment variable interpolation (`${ENV_VAR}` syntax)
4. Return clear, actionable error messages for invalid configs
5. Map parsed YAML to outcome creation API calls

**Files:** outcome.yaml.example, packages/core/src/config/parser.ts, packages/core/src/config/schema.ts

---

## PHASE 0 BUILD ORDER (Dependency Graph)

```
Step 1  (Monorepo Scaffolding)
  └── Step 2  (TypeScript & Tooling)
  └── Step 3  (Docker Infrastructure)
        └── Step 4  (Database Schema + Drizzle)
              └── Step 5  (Core Types & Schemas)
                    ├── Step 6  (State Machine)  ←  independent
                    ├── Step 7  (LLM Gateway)    ←  independent
                    └── Step 15 (outcome.yaml)   ←  independent
                          │
              Step 7 + Step 5 ──→ Step 8  (Hypothesis Engine)
              Step 4 + Step 5 ──→ Step 9  (Signal Collector)
              Step 6 + Step 5 ──→ Step 10 (Human Gates)
                    │
              Steps 5-10 ──────→ Step 11 (API Server)
              Step 11 ──────────→ Step 12 (Dashboard)  ←  can start UI in parallel with API stubs
              Step 11 ──────────→ Step 13 (MCP Server)
              Step 11 ──────────→ Step 14 (CLI)
```

**Parallelizable work after Step 5:**
- Steps 6, 7, 15 can be built simultaneously
- Steps 8, 9, 10 can be built simultaneously (after their deps)
- Steps 12, 13, 14 can be built simultaneously (after Step 11)

---

## PHASE 1: SIGNAL DEPTH (Steps 16–21)

### Step 16: Additional Signal Connectors
- Amplitude connector
- GA4 connector
- Datadog connector
- BigQuery connector

### Step 17: Statistical Testing Engine Enhancement
- Full mSPRT implementation with configurable mixing distributions
- Confidence interval visualization data
- Auto kill-switch (when kill threshold hit, rollback automatically)

### Step 18: Constraint Monitoring
- Guardrail metrics auto-pause experiments
- Constraint violation alerts and notifications

### Step 19: Feature Flag Integrations
- LaunchDarkly integration (create flags, set rollout %, kill switch)
- Unleash integration

### Step 20: Slack Gate Notifications
- Slack bot with interactive buttons (approve/reject from Slack)
- Thread-based gate discussions

### Step 21: Experiment Result Visualization
- Control vs treatment chart with confidence bands
- Statistical significance meter component
- Delta over time visualization

---

## PHASE 2: LLM FLEXIBILITY (Steps 22–27)

### Step 22: LLM Gateway — Full Provider Support
- Perplexity API key mode
- Local model support via Ollama

### Step 23: OAuth Account Mode
- Anthropic OAuth flow (use Claude.ai Pro/Max subscription)
- OpenAI OAuth flow (use ChatGPT Plus)
- Perplexity OAuth flow (use Perplexity Pro)

### Step 24: LLM Provider UI
- Settings page: connect/test/set default providers
- Model picker per purpose (expensive for hypothesis, cheap for analysis)

### Step 25: Token Usage Dashboard
- Track spend per provider per org
- Monthly usage charts
- Budget alerts

---

## PHASE 3: LEARNING ENGINE (Steps 26–29)

### Step 26: Learning Library Persistence
- Store learnings per experiment conclusion
- Learning quality scoring

### Step 27: Semantic Search (pgvector)
- Generate embeddings for learnings
- Semantic similarity search via pgvector
- "What we know about X" MCP tool query

### Step 28: Hypothesis Engine — Learning Context
- Query past learnings before generating new hypotheses
- Cross-outcome learning (learnings from checkout inform cart)

### Step 29: Learning Export
- Export learnings as markdown for AI context
- Searchable learning library UI page

---

## PHASE 4: MULTI-AGENT FLEET (Steps 30–33)

### Step 30: Agent Registry & Tracking
- Which agent is building what
- Agent action audit log

### Step 31: Conflict Detection & Scope Enforcement
- Two agents touching same files → alert
- Experiments cannot touch forbidden paths

### Step 32: Agent SDK npm Package
- SDK for agentic IDE integration
- Devin, Windsurf, generic REST agent protocol

### Step 33: Fleet Status Dashboard
- Real-time fleet view
- Agent status and progress tracking

---

## PHASE 5: SAAS & GROWTH (Steps 34–38)

### Step 34: Auth & Multi-Tenancy
- Better Auth integration (modern, open-source, supports OAuth)
- Org/workspace model with proper isolation

### Step 35: Billing Integration
- Stripe subscription management
- Plan enforcement (feature flags per plan)
- Usage tracking and limits

### Step 36: Cloud Deployment
- Vercel (web) + Railway or Fly.io (API + workers)
- CI/CD pipeline (GitHub Actions)

### Step 37: Onboarding Flow
- Waitlist → invite → onboarding wizard
- Team management and invites

### Step 38: Enterprise Features
- SSO (SAML/OIDC)
- Audit logs
- Compliance exports

---

## TECHNOLOGY DECISIONS (Locked — Per agent.md ADRs)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo | Turborepo + pnpm | Fast builds, shared packages |
| API | Fastify + TypeScript | Speed, type safety, plugin ecosystem |
| Frontend | Next.js 14 App Router + TypeScript | SSR, React ecosystem |
| UI | shadcn/ui + Tailwind CSS | Accessible, customizable, no runtime overhead |
| Database | PostgreSQL 16 | Reliability, JSON support, pgvector |
| Time-series | TimescaleDB extension | Signal measurements at scale |
| Cache/PubSub | Redis (Upstash-compatible) | Real-time state, job queues |
| Queue | BullMQ (Redis-backed) | Reliable scheduling, gate timeouts |
| State Machine | XState v5 | Outcome/experiment lifecycle |
| ORM | Drizzle ORM | Type-safe, migrations, lightweight |
| Auth (Phase 5) | Better Auth | Modern, open-source, OAuth |
| Vector Search | pgvector | Semantic similarity for learning dedup |
| Statistics | Custom sequential testing (mSPRT) | Always-valid p-values |
| Container | Docker + docker-compose | One-command setup |
| CI/CD | GitHub Actions | Standard, well-documented |
| Charts | Recharts | React-native, composable |
| Fonts | Geist + Geist Mono | Per design.md |

---

## TESTING STRATEGY

| Package | Min Coverage | Test Type |
|---------|-------------|-----------|
| core/state-machine | 95% | Unit |
| signal-collector | 90% | Unit + Integration (test containers) |
| hypothesis-engine | 80% | Unit (mocked LLM) |
| All other packages | 70% | Unit |
| apps/api | — | E2E (supertest) |
| apps/web | — | Component (RTL) + E2E (Playwright) |

**Tools:** Vitest (unit/integration), Supertest (API e2e), React Testing Library (components), Playwright (browser e2e)

---

## DESIGN SYSTEM TOKENS (From design.md)

Ship **dark mode first**. Key tokens:

- Background: `#0A0A0B` (void), `#111113` (surface), `#18181B` (elevated)
- Text: `#FAFAFA` (primary), `#A1A1AA` (secondary), `#52525B` (muted)
- Signal: `#10B981` (positive/green), `#EF4444` (negative/red), `#6366F1` (neutral/indigo), `#F59E0B` (warning/amber)
- Accent: `#6366F1` (primary/indigo), `#8B5CF6` (secondary/violet)
- Fonts: Geist (sans), Geist Mono (monospace)
- Cards: 1px border, 8px radius, no shadows, 4px left accent bar for status
- Buttons: indigo primary, zinc secondary, red danger, ghost

---

## IMMEDIATE NEXT ACTIONS

To start building, execute Steps 1–3 first (scaffolding + infrastructure). These are the zero-dependency foundation:

1. **Run Step 1** — Initialize monorepo with all package skeletons
2. **Run Step 2** — Configure TypeScript strict, ESLint, Prettier
3. **Run Step 3** — Create docker-compose with TimescaleDB + Redis

Then proceed to Step 4 (database) and Step 5 (core types), which unlock all remaining Phase 0 work in parallel tracks.

**Estimated Phase 0 packages:** ~15 packages, ~11 apps/packages with implementation code
**Key integration test:** Define outcome.yaml → `docker-compose up` → dashboard shows outcome → activate → hypotheses generated → gate created → approve → signal measured
