# PRODUCT.md — Outcome Runtime
## Product Vision, Roadmap & Backlog

---

## PRODUCT VISION

### One-Line Vision
**The infrastructure that replaces sprint-based execution with outcome-driven experimentation — built for the age of AI agents.**

### The Bet We're Making
Agile and sprint-based processes were designed for a world where **humans** were the execution bottleneck. Write a spec → assign to a developer → wait two weeks → ship → hope.

That world is ending. When AI coding agents can execute in hours what used to take weeks, the bottleneck is no longer *building* — it's knowing whether what you built actually moved a metric.

Outcome Runtime is the infrastructure layer for the world that comes next:
- You declare an **outcome** (a metric target with constraints)
- AI generates **experiment hypotheses** toward that outcome
- AI agents **build** the experiments
- The system **measures** results automatically
- Humans **govern** at every key decision point

No tickets. No sprint planning. No standups about standups.

### North Star Metric
**Outcomes Achieved** — the number of measurable outcomes teams close (metric target hit, statistically significant) per month using Outcome Runtime.

This is the only metric that matters. Everything else is in service of it.

---

## TARGET USERS

### Primary Persona: The Accountable Leader
**Who:** VP of Product, Head of Engineering, Senior PM, Director of Growth at a company with 10-500 engineers deploying AI agents.

**Their World:**
- Managing product and engineering org that is adopting AI coding tools rapidly
- Struggling to answer: "We're shipping faster — are we improving faster?"
- Has OKRs and business metrics they own — not just feature deliverables
- Getting pressure from leadership to show ROI on AI investment
- Running experiments manually today — Google Sheets, fragmented tools, no consistency

**Their Pain (in their words):**
*"My team uses Cursor and Claude Code every day. We're shipping features twice as fast. But our checkout conversion hasn't moved. I don't know if we're building the right things or just building fast."*

**What They Buy:** Control, visibility, and proof that AI execution is translating to business outcomes.

### Secondary Persona: The AI-Native Builder
**Who:** Technical founder, senior engineer, or solo PM at an early-stage company building with AI-first workflows.

**Their World:**
- Vibe-coding in Cursor + Claude Code daily
- No formal PM process — just move fast and measure
- Loves automation, hates meetings
- Wants to apply experimentation discipline without process overhead

**Their Pain:**
*"I'm shipping so fast I can't keep track of what's working. I need something that tells me which of the ten things I built last week actually improved my activation rate."*

**What They Buy:** Speed + discipline without bureaucracy.

### Tertiary Persona: The Enterprise Platform Lead
**Who:** Head of Platform/Infrastructure, CTO, or VP Engineering at a 500+ person company deploying internal AI agents at scale.

**What They Need:** Multi-workspace, SSO, audit logs, enterprise signal connectors, SLA guarantees.

---

## PRODUCT PILLARS

1. **Outcomes over Tickets** — The fundamental unit of work is a metric target, not a task.
2. **Experiments over Features** — Every change is a falsifiable hypothesis with a measured result.
3. **AI proposes, humans decide** — AI generates and builds. Humans govern at every gate.
4. **Works with how you already work** — Integrates with any agentic IDE, any LLM, any analytics stack.
5. **Learning compounds** — Every experiment makes the next one smarter.

---

## PRICING MODEL

### Tier 1: Open Source (Free Forever)
- Self-hosted via docker-compose
- 1 workspace
- 3 active outcomes
- 5 experiments per month
- Community signal connectors (Mixpanel, Postgres)
- All agentic IDE integrations
- MCP server included

### Tier 2: Pro ($99/month per workspace)
- Cloud-hosted or self-hosted
- Unlimited outcomes and experiments
- All signal connectors
- All LLM provider integrations (API key + OAuth)
- Slack/email gate notifications
- Learning library with semantic search
- 5 team members

### Tier 3: Team ($499/month)
- Everything in Pro
- Multiple workspaces
- 25 team members
- Priority support
- Custom signal connectors
- SSO (SAML/OIDC)

### Tier 4: Enterprise (Custom)
- Everything in Team
- Unlimited members and workspaces
- On-premise deployment support
- SLA guarantees
- Dedicated customer success
- Custom LLM provider (Azure OpenAI, AWS Bedrock, etc.)
- Audit logs and compliance exports

---

## ROADMAP

### Phase 0: Foundation (Months 1-2)
*Goal: Working end-to-end demo. Enough to trend on GitHub.*

**Must Ship:**
- [ ] Core data models (outcomes, experiments, gates, signals, learnings)
- [ ] `outcome.yaml` config spec and parser
- [ ] Hypothesis Engine v1 (Claude-powered, generates 3 candidates)
- [ ] Signal collector with 2 connectors: Mixpanel + Postgres
- [ ] State machine (outcome lifecycle)
- [ ] Human gates (web UI + email notification)
- [ ] Basic dashboard (outcome list, experiment cards, signal chart)
- [ ] MCP server with 5 core tools
- [ ] Docker-compose one-command install
- [ ] CLI (`npx outcome-runtime init`)
- [ ] Claude Code integration guide
- [ ] Cursor integration guide

**Demo-worthy scenario:**
A user defines a checkout abandonment outcome in `outcome.yaml`, runs `docker-compose up`, Claude generates 3 experiment hypotheses, one is approved, Claude Code builds it, the dashboard shows the signal improving.

**README:**
The hero README with GIF that captures this scenario in 8 seconds.

---

### Phase 1: Signal Depth (Month 3)
*Goal: Works reliably with real production signal stacks.*

- [ ] Signal connectors: Amplitude, GA4, Datadog, BigQuery
- [ ] Statistical testing engine (sequential testing / mSPRT)
- [ ] Auto kill-switch (when kill threshold hit, rollback automatically)
- [ ] Constraint monitoring (guardrail metrics auto-pause experiments)
- [ ] LaunchDarkly and Unleash feature flag integrations
- [ ] Slack gate notifications (interactive buttons)
- [ ] Experiment result visualization (control vs treatment chart)

---

### Phase 2: LLM Flexibility (Month 4)
*Goal: Works with any LLM setup users already have.*

- [ ] LLM Gateway (unified provider abstraction)
- [ ] Anthropic API key mode
- [ ] OpenAI API key mode  
- [ ] Perplexity API key mode
- [ ] Anthropic OAuth account mode (use Claude.ai subscription)
- [ ] OpenAI OAuth account mode (use ChatGPT Plus)
- [ ] Perplexity OAuth account mode (use Perplexity Pro)
- [ ] LLM provider UI (connect, test, set defaults)
- [ ] Model picker per purpose (expensive model for hypothesis, cheap for analysis)
- [ ] Token usage dashboard (track spend per provider)
- [ ] Local model support via Ollama

---

### Phase 3: Learning Engine (Month 5)
*Goal: The system gets smarter with every experiment.*

- [ ] Learning Library (persist learnings per experiment)
- [ ] Semantic search over learnings (pgvector)
- [ ] Hypothesis engine uses past learnings in context
- [ ] "What we know about X" query via MCP tool
- [ ] Cross-outcome learning (learnings from checkout inform cart)
- [ ] Learning quality scoring (how much did this learning help future hypotheses?)
- [ ] Export learnings as markdown (for AI context)

---

### Phase 4: Multi-Agent Fleet (Month 6)
*Goal: Run multiple experiments simultaneously without chaos.*

- [ ] Agent registry (which agent is building what)
- [ ] Conflict detection (two agents touching same files)
- [ ] Scope enforcement (experiments cannot touch forbidden paths)
- [ ] Agent SDK npm package
- [ ] Devin integration
- [ ] Windsurf integration
- [ ] Generic REST agent protocol
- [ ] Fleet status dashboard
- [ ] Agent action audit log

---

### Phase 5: SaaS & Growth (Month 7-8)
*Goal: Cloud product people pay for.*

- [ ] Auth and multi-tenancy (Better Auth + org/workspace model)
- [ ] Billing integration (Stripe)
- [ ] Cloud deployment (Vercel + Railway or Fly.io)
- [ ] Waitlist and onboarding flow
- [ ] Plan enforcement (feature flags per plan)
- [ ] Usage tracking and limits
- [ ] Invite and team management
- [ ] SSO (SAML for enterprise)
- [ ] Audit logs

---

### Phase 6: Enterprise (Month 9+)
*Goal: Land enterprise accounts.*

- [ ] Custom signal connectors (enterprise analytics stacks)
- [ ] Azure OpenAI / AWS Bedrock LLM support
- [ ] On-premise deployment guide + support
- [ ] Compliance exports (SOC 2 prep)
- [ ] Custom retention policies for signal data
- [ ] Enterprise onboarding and CSM workflow
- [ ] API rate limiting and SLA monitoring

---

## BACKLOG (Phase 0 Detailed)

### Epic 1: Core Domain Model

| ID | Story | Priority | Effort |
|----|-------|----------|--------|
| E1-01 | As an engineer, I can define an outcome in `outcome.yaml` with signal, target, constraints, and horizon | P0 | L |
| E1-02 | As a user, the system validates my `outcome.yaml` and shows clear errors for invalid config | P0 | S |
| E1-03 | As a user, I can create outcomes via the web UI without a YAML file | P1 | L |
| E1-04 | As a user, I can see the current signal value for my outcome on the dashboard | P0 | M |
| E1-05 | As a user, I can activate a draft outcome to trigger hypothesis generation | P0 | S |
| E1-06 | As a user, I can see the full lifecycle status of my outcome at a glance | P0 | M |

### Epic 2: Hypothesis Engine

| ID | Story | Priority | Effort |
|----|-------|----------|--------|
| E2-01 | System auto-generates 3 experiment hypotheses when an outcome is activated | P0 | XL |
| E2-02 | Each hypothesis includes: hypothesis statement, mechanism, prediction, measurement plan, rollout plan, effort estimate, risk level | P0 | L |
| E2-03 | Hypothesis engine queries past learnings before generating (avoids repeating failed experiments) | P1 | M |
| E2-04 | User can request regeneration of the hypothesis portfolio | P1 | S |
| E2-05 | User can submit their own hypothesis alongside AI-generated ones | P1 | M |
| E2-06 | Hypothesis engine respects scope forbidden_paths when suggesting interventions | P0 | M |

### Epic 3: Human Gates

| ID | Story | Priority | Effort |
|----|-------|----------|--------|
| E3-01 | Portfolio review gate: user sees proposed experiments and approves/rejects each | P0 | L |
| E3-02 | Launch approval gate: user reviews built experiment before it goes live | P0 | M |
| E3-03 | Analysis review gate: user reviews experiment results and decides next step | P0 | L |
| E3-04 | Gate email notification sent to assigned_to when gate created | P0 | S |
| E3-05 | SLA countdown shown in UI and reminder sent at 50% of SLA | P1 | M |
| E3-06 | Escalation to backup assignee when SLA expires | P2 | M |
| E3-07 | Slack interactive message gate (approve/reject from Slack) | P1 | L |

### Epic 4: Signal Collection

| ID | Story | Priority | Effort |
|----|-------|----------|--------|
| E4-01 | Mixpanel connector: fetch funnel and event metrics | P0 | L |
| E4-02 | PostgreSQL connector: fetch metrics via custom SQL | P0 | M |
| E4-03 | Signal collector polls primary signal every 6 hours | P0 | M |
| E4-04 | Signal time-series stored in TimescaleDB | P0 | M |
| E4-05 | Kill-switch: experiment auto-paused when kill threshold exceeded | P0 | L |
| E4-06 | Constraint monitor: experiment auto-paused when guardrail metric violated | P0 | L |
| E4-07 | Statistical significance calculated on each poll (sequential testing) | P0 | XL |
| E4-08 | Success threshold auto-triggers analysis gate | P0 | M |

### Epic 5: MCP Server & IDE Integration

| ID | Story | Priority | Effort |
|----|-------|----------|--------|
| E5-01 | MCP server exposes `get_active_outcomes` tool | P0 | M |
| E5-02 | MCP server exposes `get_experiment_brief` tool | P0 | M |
| E5-03 | MCP server exposes `report_experiment_built` tool | P0 | M |
| E5-04 | MCP server exposes `query_learnings` tool | P1 | M |
| E5-05 | MCP server exposes `request_human_gate` tool | P1 | M |
| E5-06 | `npx outcome-runtime` CLI with init, experiment, report commands | P0 | L |
| E5-07 | Claude Code integration guide in docs | P0 | S |
| E5-08 | Cursor integration guide in docs | P0 | S |
| E5-09 | VS Code extension (wraps MCP server) | P2 | XL |

### Epic 6: Dashboard

| ID | Story | Priority | Effort |
|----|-------|----------|--------|
| E6-01 | Outcome list view: cards with signal value, target, status, # experiments | P0 | M |
| E6-02 | Outcome detail: signal chart + experiment list | P0 | L |
| E6-03 | Experiment card: hypothesis, prediction, current delta, significance meter | P0 | L |
| E6-04 | Experiment result visualization: control vs treatment time-series | P0 | L |
| E6-05 | Human gate inbox: all pending gates for current user | P0 | M |
| E6-06 | Gate detail page: full context package + decision UI | P0 | L |
| E6-07 | Learning library: searchable list of past experiment learnings | P1 | M |

---

## SUCCESS METRICS BY PHASE

| Phase | Key Metrics |
|-------|-------------|
| Phase 0 (Launch) | GitHub stars > 1000 in week 1; 500+ docker installs; HN front page |
| Phase 1 (Signal) | 50+ active self-hosted instances; 3 signal connectors used weekly |
| Phase 2 (LLM) | 30% of users connect a non-Anthropic provider; OAuth mode used |
| Phase 3 (Learning) | Hypothesis quality score improves measurably with past learnings |
| Phase 4 (Fleet) | 10+ teams running 3+ concurrent experiments simultaneously |
| Phase 5 (SaaS) | 100 paying customers; $10k MRR |
| Phase 6 (Enterprise) | 5 enterprise accounts; $100k ARR |

---

## COMPETITIVE LANDSCAPE

| Tool | What It Does | Why We're Different |
|------|-------------|---------------------|
| Jira | Sprint/task management | We're not task management — we're outcome measurement |
| Linear | Modern sprint management | Same — we're the layer above project management |
| Amplitude Experiment | A/B testing platform | We add AI hypothesis generation + agent execution |
| LaunchDarkly | Feature flags | We orchestrate experiments, they're a signal source |
| Statsig | Feature flags + analytics | Similar — we add agent orchestration and outcome framing |
| ProductBoard | Roadmap management | We replace roadmaps with outcome loops |
| Mixpanel | Analytics | Signal source for us, not a competitor |

**Our moat:** No one has connected AI agent execution → hypothesis generation → continuous measurement → human governance in a single open-source platform.

---

## ANTI-GOALS (What We Are Not Building)

- A sprint planning tool (outcomes replace sprints)
- An analytics platform (we read from analytics tools, not replace them)
- A feature flag service (we integrate with existing ones)
- A general AI coding agent (we orchestrate agents, not replace them)
- A project management tool (we're the layer above that)
- Another LLM wrapper (the LLM is the hypothesis engine, not the product)
