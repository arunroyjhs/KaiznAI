# AGENT.md — Outcome Runtime
## Engineering & Solution Architecture Document
### For: Claude Code, Cursor, Devin, Windsurf, Copilot Workspace, and all agentic IDEs

---

## PROJECT IDENTITY

**Product:** Outcome Runtime  
**Tagline:** The infrastructure layer that replaces sprint-based execution with outcome-driven experimentation.  
**Core Problem:** When AI executes in hours what used to take weeks, the bottleneck is no longer building — it's knowing if what you built actually moved the metric. Outcome Runtime is the missing infrastructure for that world.  
**License:** Apache 2.0 (open-source core) + commercial SaaS  
**Monorepo Root:** `outcome-runtime/`

---

## AGENT WORKING RULES

When working on this codebase as an AI agent:

1. **Always read this file first.** It is your single source of truth for architecture decisions.
2. **Check `product.md` before building any feature.** Do not build what is not in the backlog without explicit human instruction.
3. **Never modify `packages/core/src/state-machine/`** without creating a new migration strategy — this is stateful code affecting live experiments.
4. **Always write tests** for anything in `packages/signal-collector/` — signal integrity is non-negotiable.
5. **LLM calls go through the LLM Gateway only.** Never make direct provider API calls from feature code.
6. **Feature flags wrap every new capability** exposed to users.
7. **If uncertain about a scope boundary, escalate via comment `// AGENT: needs human decision —` and stop.**
8. **Data models are append-only.** Never drop columns. Add new columns with defaults.

---

## SYSTEM OVERVIEW

Outcome Runtime is a platform that lets product and engineering teams define measurable outcomes, generate AI-powered experiment hypotheses, execute them via AI agents, and automatically measure results — all governed by mandatory human gates.

### The Core Loop

```
Define Outcome (outcome.yaml)
        ↓
AI generates experiment portfolio
        ↓
Human Gate 1: Portfolio approval
        ↓
AI agents build experiments
        ↓
Human Gate 2: Launch approval
        ↓
Experiments run in production
        ↓
Signal collector measures continuously
        ↓
Human Gate 3: Analysis & decision
        ↓
Ship / Kill / Iterate
```

### What Makes This Different

- **Outcomes not tickets.** The primitive is a metric target with constraints, not a task.
- **Experiments not features.** Every change is a falsifiable hypothesis with a measured result.
- **AI proposes, humans decide.** AI generates hypotheses and builds. Humans approve at every gate.
- **Signals are first-class.** The system connects directly to your analytics stack.

---

## MONOREPO STRUCTURE

```
outcome-runtime/
├── apps/
│   ├── web/                    # Next.js dashboard (the UI)
│   ├── api/                    # Fastify API server
│   └── docs/                   # Documentation site (Docusaurus)
│
├── packages/
│   ├── core/                   # State machines, types, shared logic
│   ├── hypothesis-engine/      # AI experiment generation
│   ├── signal-collector/       # Metrics ingestion & measurement
│   ├── execution-orchestrator/ # Dispatches work to AI agents
│   ├── llm-gateway/            # Unified LLM provider abstraction
│   ├── human-gates/            # Gate management & notifications
│   ├── learning-library/       # Persists experiment learnings
│   ├── agent-sdk/              # SDK for agentic IDE integration
│   ├── mcp-server/             # MCP server for Claude/Cursor/etc
│   ├── cli/                    # `npx outcome-runtime` CLI
│   └── ui-components/          # Shared React components (shadcn base)
│
├── integrations/
│   ├── signal-sources/
│   │   ├── mixpanel/
│   │   ├── amplitude/
│   │   ├── ga4/
│   │   ├── datadog/
│   │   ├── bigquery/
│   │   ├── postgres/
│   │   └── webhook/            # Generic POST endpoint
│   ├── execution-targets/
│   │   ├── claude-code/        # Claude Code SDK integration
│   │   ├── cursor/             # Cursor agent integration
│   │   ├── devin/              # Devin API integration
│   │   ├── windsurf/           # Windsurf integration
│   │   └── generic-agent/      # Generic REST agent protocol
│   ├── notification-channels/
│   │   ├── slack/
│   │   ├── email/
│   │   └── webhook/
│   └── llm-providers/
│       ├── anthropic/          # Claude via API key or OAuth
│       ├── openai/             # GPT via API key or OAuth
│       └── perplexity/         # Perplexity via API key or OAuth
│
├── outcome.yaml.example        # Reference config
├── docker-compose.yml          # One-command local setup
├── docker-compose.prod.yml     # Production compose
├── turbo.json                  # Turborepo config
├── package.json                # Root workspace
└── AGENT.md                    # This file
```

---

## TECHNOLOGY STACK

### Core Decisions (Do Not Change Without ADR)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Monorepo | Turborepo + pnpm workspaces | Fast builds, shared packages |
| API Framework | Fastify + TypeScript | Speed, type safety, plugin ecosystem |
| Frontend | Next.js 14 (App Router) + TypeScript | SSR for perf, React ecosystem |
| UI Components | shadcn/ui + Tailwind CSS | Accessible, customizable, no runtime overhead |
| Database (primary) | PostgreSQL 16 | Reliability, JSON support, pgvector for embeddings |
| Time-series | TimescaleDB (PostgreSQL extension) | Signal measurements at scale |
| Cache / Pub-Sub | Redis (Upstash-compatible) | Real-time fleet state, job queues |
| Queue | BullMQ (Redis-backed) | Reliable experiment scheduling, gate timeouts |
| State Machine | XState v5 | Outcome lifecycle management |
| ORM | Drizzle ORM | Type-safe, migrations, lightweight |
| Auth | Better Auth | Modern, open-source, supports OAuth |
| Vector Search | pgvector | Semantic similarity for hypothesis deduplication |
| Statistical Testing | Custom (sequential testing) | Always-valid p-values for continuous monitoring |
| Container | Docker + docker-compose | One-command setup |
| CI/CD | GitHub Actions | Standard, well-documented |

### Language Policy
- All packages: TypeScript strict mode
- No `any` types in public APIs
- Zod schemas for all external data (API inputs, LLM outputs, signal data)

---

## DATABASE SCHEMA

### Core Tables

```sql
-- outcomes.sql
CREATE TABLE outcomes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT UNIQUE NOT NULL,              -- human-readable id (URL-safe)
  title                 TEXT NOT NULL,
  description           TEXT,
  status                TEXT NOT NULL DEFAULT 'draft',
  -- status: draft | active | achieved | abandoned | expired

  -- Signal definition
  primary_signal        JSONB NOT NULL,
  -- { source, metric, segment, aggregation, current_value, unit, connector_config }
  secondary_signals     JSONB[] DEFAULT '{}',
  
  -- Target definition
  target                JSONB NOT NULL,
  -- { direction: increase|decrease, threshold, confidence_required: 0.95 }
  
  -- Constraints (hard limits that kill experiments if violated)
  constraints           JSONB NOT NULL DEFAULT '[]',
  -- [{ signal, min?, max?, rule?: string }]
  
  -- Portfolio settings
  max_concurrent_experiments    INTEGER DEFAULT 3,
  horizon               INTERVAL NOT NULL,
  deadline              TIMESTAMPTZ,
  
  -- Human governance
  owner                 TEXT NOT NULL,
  team_members          TEXT[] DEFAULT '{}',
  
  -- Org
  org_id                UUID NOT NULL REFERENCES orgs(id),
  workspace_id          UUID REFERENCES workspaces(id),
  
  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  activated_at          TIMESTAMPTZ,
  achieved_at           TIMESTAMPTZ
);

-- experiments.sql
CREATE TABLE experiments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id            UUID NOT NULL REFERENCES outcomes(id),
  
  -- Identity
  title                 TEXT NOT NULL,
  
  -- Hypothesis (the intellectual core)
  hypothesis            TEXT NOT NULL,
  mechanism             TEXT NOT NULL,        -- why we think it works
  prediction            JSONB NOT NULL,
  -- { signal, expected_delta, delta_range: [min, max], confidence }
  
  -- Implementation
  intervention          JSONB NOT NULL,
  -- { type: code_change|config_change|copy_change, scope, description, feature_flag }
  
  -- Measurement
  measurement_plan      JSONB NOT NULL,
  -- { duration_days, min_sample_size, success_threshold, kill_threshold, segments }
  
  -- Rollout
  rollout_plan          JSONB NOT NULL,
  -- { initial_pct, scale_to_pct, scale_trigger, segments }
  
  -- Baseline (captured at launch)
  baseline_value        NUMERIC,
  baseline_captured_at  TIMESTAMPTZ,
  
  -- Execution
  generated_by          TEXT NOT NULL,        -- 'ai' | 'human' | 'hybrid'
  agent_id              TEXT,                 -- which agent built this
  agent_runtime         TEXT,                 -- 'claude-code' | 'cursor' | 'devin' etc
  feature_flag_key      TEXT,                 -- in your feature flag service
  
  -- State
  status                TEXT NOT NULL DEFAULT 'hypothesis',
  -- hypothesis | awaiting_portfolio_gate | building | awaiting_launch_gate |
  -- running | measuring | awaiting_analysis_gate | scaling | 
  -- awaiting_scale_gate | killed | shipped | failed_build
  
  -- Results
  current_result        JSONB,               -- live snapshot
  final_result          JSONB,               -- conclusion
  -- { delta, ci_lower, ci_upper, p_value, sample_size, significant, conclusion }
  
  learnings             TEXT,               -- human-readable findings
  
  -- Org
  org_id                UUID NOT NULL REFERENCES orgs(id),
  
  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  launched_at           TIMESTAMPTZ,
  concluded_at          TIMESTAMPTZ
);

-- signal_measurements.sql (TimescaleDB hypertable)
CREATE TABLE signal_measurements (
  time                  TIMESTAMPTZ NOT NULL,
  outcome_id            UUID REFERENCES outcomes(id),
  experiment_id         UUID REFERENCES experiments(id),
  signal_name           TEXT NOT NULL,
  variant               TEXT,               -- 'control' | 'treatment' | null
  value                 NUMERIC NOT NULL,
  sample_size           INTEGER,
  segment               JSONB,
  source                TEXT NOT NULL,
  raw_response          JSONB,              -- full API response for debugging
  org_id                UUID NOT NULL REFERENCES orgs(id)
);
SELECT create_hypertable('signal_measurements', 'time');
CREATE INDEX ON signal_measurements (outcome_id, experiment_id, time DESC);

-- human_gates.sql
CREATE TABLE human_gates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id         UUID NOT NULL REFERENCES experiments(id),
  outcome_id            UUID NOT NULL REFERENCES outcomes(id),
  
  gate_type             TEXT NOT NULL,
  -- portfolio_review | launch_approval | analysis_review | scale_approval | ship_approval
  
  -- What the human sees (HILP protocol compatible)
  context_package       JSONB NOT NULL,
  question              TEXT NOT NULL,
  signal_snapshot       JSONB,             -- metric state at gate creation
  options               JSONB,             -- AI-suggested choices
  
  -- Assignment
  assigned_to           TEXT NOT NULL,
  escalation_chain      TEXT[],            -- backup assignees if no response by SLA
  sla_hours             INTEGER DEFAULT 24,
  
  -- Decision
  status                TEXT NOT NULL DEFAULT 'pending',
  -- pending | approved | rejected | approved_with_conditions | delegated | timed_out
  conditions            TEXT[],
  response_note         TEXT,
  decided_by            TEXT,
  
  -- Notification tracking
  notification_sent_at  TIMESTAMPTZ,
  reminder_sent_at      TIMESTAMPTZ,
  
  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT now(),
  responded_at          TIMESTAMPTZ,
  
  org_id                UUID NOT NULL REFERENCES orgs(id)
);

-- learnings_library.sql
CREATE TABLE learnings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id         UUID REFERENCES experiments(id),
  outcome_id            UUID REFERENCES outcomes(id),
  
  finding               TEXT NOT NULL,
  finding_type          TEXT NOT NULL,
  -- confirmed_hypothesis | refuted_hypothesis | unexpected_effect | 
  -- segment_insight | constraint_discovered | methodology_learning
  
  signal_evidence       JSONB,
  confidence            NUMERIC CHECK (confidence BETWEEN 0 AND 1),
  applies_to            TEXT[],            -- tags: ['mobile', 'checkout', 'form-ux']
  
  -- Vector embedding for semantic search
  embedding             vector(1536),
  
  org_id                UUID NOT NULL REFERENCES orgs(id),
  created_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON learnings USING ivfflat (embedding vector_cosine_ops);

-- orgs & workspaces
CREATE TABLE orgs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  slug                  TEXT UNIQUE NOT NULL,
  plan                  TEXT NOT NULL DEFAULT 'free',
  -- free | pro | enterprise
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workspaces (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES orgs(id),
  name                  TEXT NOT NULL,
  outcome_yaml_path     TEXT,              -- path in connected git repo
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- llm_provider_configs.sql
CREATE TABLE llm_provider_configs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES orgs(id),
  
  provider              TEXT NOT NULL,
  -- 'anthropic' | 'openai' | 'perplexity'
  
  auth_mode             TEXT NOT NULL,
  -- 'api_key' | 'oauth_account'
  
  -- For api_key mode: encrypted API key stored here
  encrypted_api_key     TEXT,
  key_hint              TEXT,              -- last 4 chars for display
  
  -- For oauth_account mode: OAuth tokens
  oauth_access_token    TEXT,             -- encrypted
  oauth_refresh_token   TEXT,             -- encrypted
  oauth_expires_at      TIMESTAMPTZ,
  oauth_scopes          TEXT[],
  account_email         TEXT,             -- display only, which account
  
  -- Model preferences
  preferred_model       TEXT,             -- model slug to use
  fallback_model        TEXT,
  
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
```

---

## LLM GATEWAY — ARCHITECTURE

The LLM Gateway is the single interface for all AI calls. **Never call LLM providers directly from feature code.**

### Provider Support Matrix

| Provider | Auth Mode | Model Options | Notes |
|----------|-----------|--------------|-------|
| Anthropic / Claude | API Key | claude-opus-4, claude-sonnet-4-5, claude-haiku-4-5 | Preferred for reasoning |
| Anthropic / Claude | OAuth (Account) | Same models | Uses user's Claude.ai Pro/Max subscription |
| OpenAI / ChatGPT | API Key | gpt-4o, gpt-4o-mini, o1, o3-mini | Strong coder |
| OpenAI / ChatGPT | OAuth (Account) | Same models | Uses user's ChatGPT Plus subscription |
| Perplexity | API Key | llama-3.1-sonar-large, sonar-pro | Good for research/signal context |
| Perplexity | OAuth (Account) | Same models | Uses user's Perplexity Pro subscription |

### OAuth Account Mode — How It Works

For users who want to use their existing LLM subscriptions without separate API billing:

**Anthropic (Claude):**
- Anthropic provides API access for Pro/Max subscribers via their developer console
- OAuth flow: user authorizes via claude.ai → we receive scoped API token
- Token has rate limits tied to their subscription tier

**OpenAI (ChatGPT Plus):**
- OpenAI provides API access separately from ChatGPT Plus
- OAuth flow: user authorizes via platform.openai.com → scoped access token
- Subscription users get a usage credit pool vs. pay-per-token

**Perplexity Pro:**
- Perplexity provides API access for Pro subscribers
- OAuth flow: user authorizes via perplexity.ai → API token tied to Pro plan
- Pro users get 5000 req/month included

### Gateway Interface

```typescript
// packages/llm-gateway/src/gateway.ts

export interface LLMRequest {
  messages: Message[];
  system?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: 'text' | 'json_object';
  
  // Gateway routing
  purpose: LLMPurpose;
  // 'hypothesis_generation' | 'hypothesis_scoring' | 'analysis' | 
  // 'vibe_check' | 'context_summarization' | 'decision_synthesis'
  
  // Override org default if needed
  provider_override?: ProviderSlug;
  model_override?: string;
}

export interface LLMResponse {
  content: string;
  provider_used: ProviderSlug;
  model_used: string;
  auth_mode_used: 'api_key' | 'oauth_account';
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
}

export class LLMGateway {
  async complete(request: LLMRequest, orgId: string): Promise<LLMResponse> {
    const config = await this.resolveConfig(orgId, request.purpose);
    const provider = this.getProvider(config);
    
    // Rate limit check
    await this.rateLimiter.check(orgId, config.provider);
    
    // Token budget check (for oauth accounts with monthly limits)
    await this.budgetChecker.check(orgId, config);
    
    // Execute with retry
    const result = await this.withRetry(() => provider.complete(request, config));
    
    // Log usage
    await this.usageLogger.log(orgId, config, result);
    
    return result;
  }
}
```

---

## AGENTIC IDE INTEGRATION — CORE PRINCIPLE

Outcome Runtime must work **seamlessly** with every major agentic IDE. The integration strategy is:

1. **MCP Server** — Primary integration. Works with Claude.ai, Claude Code, Cursor, Windsurf, and any MCP-compatible tool.
2. **Agent SDK** — Secondary integration. An npm package agents import to report results and receive missions.
3. **REST API** — Universal fallback. Any agent can POST to our API.
4. **CLI** — For human developers interacting from terminal.

### MCP Server (Primary)

```typescript
// packages/mcp-server/src/server.ts
// Exposes Outcome Runtime as MCP tools that any MCP-compatible IDE can use

const tools = [
  {
    name: 'get_active_outcomes',
    description: 'Get all active outcomes for this workspace with their current signal values and experiment portfolios',
    inputSchema: { type: 'object', properties: { workspace_id: { type: 'string' } } }
  },
  {
    name: 'get_experiment_brief',
    description: 'Get full experiment brief for an AI agent to build — includes hypothesis, scope, constraints, patterns to follow',
    inputSchema: { type: 'object', properties: { experiment_id: { type: 'string' } }, required: ['experiment_id'] }
  },
  {
    name: 'report_experiment_built',
    description: 'Report that an experiment has been built and is ready for human gate review',
    inputSchema: {
      type: 'object',
      properties: {
        experiment_id: { type: 'string' },
        implementation_summary: { type: 'string' },
        files_changed: { type: 'array', items: { type: 'string' } },
        feature_flag_key: { type: 'string' },
        agent_notes: { type: 'string' }
      },
      required: ['experiment_id', 'implementation_summary', 'files_changed']
    }
  },
  {
    name: 'query_learnings',
    description: 'Search past experiment learnings to inform hypothesis generation',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } } }
  },
  {
    name: 'request_human_gate',
    description: 'Trigger a human gate when agent encounters a decision requiring human approval',
    inputSchema: {
      type: 'object',
      properties: {
        experiment_id: { type: 'string' },
        gate_type: { type: 'string' },
        question: { type: 'string' },
        context: { type: 'object' }
      },
      required: ['experiment_id', 'gate_type', 'question']
    }
  }
];
```

### IDE-Specific Integration Notes

**Claude Code:**
Add to your project's `CLAUDE.md`:
```markdown
## Outcome Runtime Integration
This project uses Outcome Runtime. When building experiments:
1. Run `npx outcome-runtime experiment --id <id>` to get your experiment brief
2. Build only within the scope defined in the brief
3. Use the feature flag key provided — do not ship without it
4. Run `npx outcome-runtime report --id <id>` when complete
```

**Cursor:**
Add to `.cursor/rules`:
```
When working on experiments:
- Always fetch experiment brief via MCP: get_experiment_brief
- Respect the scope.allowed_paths and scope.forbidden_paths
- Use feature flag key from experiment brief
- Report completion via MCP: report_experiment_built
```

**Windsurf / Other MCP-compatible IDEs:**
Add MCP server config:
```json
{
  "mcpServers": {
    "outcome-runtime": {
      "command": "npx",
      "args": ["outcome-runtime-mcp"],
      "env": { "OR_API_KEY": "your_key", "OR_WORKSPACE": "your_workspace" }
    }
  }
}
```

**Devin / API-first agents:**
```bash
# Get experiment brief
curl https://api.outcomeruntime.dev/v1/experiments/{id}/brief \
  -H "Authorization: Bearer $OR_API_KEY"

# Report completion
curl -X POST https://api.outcomeruntime.dev/v1/experiments/{id}/built \
  -H "Authorization: Bearer $OR_API_KEY" \
  -d '{"implementation_summary": "...", "files_changed": [...], "feature_flag_key": "..."}'
```

---

## HYPOTHESIS ENGINE — IMPLEMENTATION

```typescript
// packages/hypothesis-engine/src/generator.ts

export class HypothesisEngine {
  
  async generatePortfolio(outcome: Outcome): Promise<ExperimentDraft[]> {
    
    // Parallel: gather all context
    const [funnelData, segmentData, pastLearnings, codebaseContext] = await Promise.all([
      this.analyzeFunnel(outcome.primarySignal),
      this.analyzeSegments(outcome.primarySignal),
      this.queryLearnings(outcome),
      this.gatherCodebaseContext(outcome.constraints)
    ]);
    
    // Step 1: Decompose the metric into sub-problems
    const subProblems = await this.llmGateway.complete({
      purpose: 'hypothesis_generation',
      system: DECOMPOSITION_SYSTEM_PROMPT,
      messages: [{ 
        role: 'user', 
        content: buildDecompositionPrompt(outcome, funnelData, segmentData, pastLearnings)
      }],
      response_format: 'json_object'
    }, outcome.orgId);
    
    const parsed: SubProblem[] = SubProblemSchema.parse(JSON.parse(subProblems.content));
    
    // Step 2: Generate candidates for each sub-problem (parallel)
    const candidates = await Promise.all(
      parsed.map(sp => this.generateCandidates(sp, outcome, codebaseContext))
    );
    
    // Step 3: Score all candidates
    const scored = candidates.flat().map(c => this.score(c, outcome));
    
    // Step 4: Select diverse, non-conflicting portfolio
    return this.selectPortfolio(scored, outcome.maxConcurrentExperiments);
  }
  
  private score(candidate: ExperimentCandidate, outcome: Outcome): ScoredCandidate {
    const expectedImpact = candidate.prediction.expectedDelta * candidate.prediction.confidence;
    const riskMultiplier = { low: 1.0, medium: 0.8, high: 0.5 }[candidate.riskLevel];
    const speedBonus = 1 / Math.log(candidate.effortHours + 2);
    const learningValue = candidate.reversible ? 1.0 : 0.7;
    
    return {
      ...candidate,
      score: (expectedImpact * 0.35) + (riskMultiplier * 0.25) + 
             (speedBonus * 0.20) + (learningValue * 0.20)
    };
  }
  
  private selectPortfolio(scored: ScoredCandidate[], maxConcurrent: number): ExperimentDraft[] {
    const selected: ScoredCandidate[] = [];
    const sortedByScore = [...scored].sort((a, b) => b.score - a.score);
    
    for (const candidate of sortedByScore) {
      if (selected.length >= maxConcurrent) break;
      
      // No file conflicts with already-selected candidates
      const hasConflict = selected.some(s => this.conflictsWith(s, candidate));
      if (!hasConflict) selected.push(candidate);
    }
    
    return selected.map(this.toDraft);
  }
}
```

---

## SIGNAL COLLECTOR — IMPLEMENTATION

### Statistical Testing (Critical — Get This Right)

We use **sequential testing** (always-valid p-values), not fixed-horizon testing. This allows continuous monitoring without p-hacking.

```typescript
// packages/signal-collector/src/statistics/sequential-test.ts

export class SequentialTest {
  // Mixture Sequential Probability Ratio Test (mSPRT)
  // Always valid regardless of when you peek
  
  async isSignificant(
    measurements: Measurement[],
    plan: MeasurementPlan
  ): Promise<SignificanceResult> {
    
    if (measurements.length < plan.minSampleSize) {
      return { significant: false, reason: 'insufficient_sample' };
    }
    
    const control = measurements.filter(m => m.variant === 'control');
    const treatment = measurements.filter(m => m.variant === 'treatment');
    
    // Calculate test statistic (mixture approach)
    const testStatistic = this.calculateMixtureSPRT(control, treatment, plan);
    
    // Threshold: alpha = 0.05 → threshold = 1/0.05 = 20
    const threshold = 1 / (1 - plan.confidenceRequired);
    
    const delta = this.estimateDelta(control, treatment);
    const ci = this.confidenceInterval(control, treatment, plan.confidenceRequired);
    
    return {
      significant: testStatistic >= threshold,
      test_statistic: testStatistic,
      estimated_delta: delta,
      confidence_interval: ci,
      sample_size_control: control.length,
      sample_size_treatment: treatment.length,
      meets_success_threshold: delta <= plan.successThreshold,
      exceeds_kill_threshold: delta >= plan.killThreshold
    };
  }
}
```

### Signal Source Connectors

Each connector implements this interface:

```typescript
// packages/signal-collector/src/connectors/base.ts

export interface SignalConnector {
  name: string;
  
  // Test connection with given config
  testConnection(config: ConnectorConfig): Promise<ConnectionResult>;
  
  // Fetch metric value for a given time range and optional segment
  fetchMetric(
    metric: string,
    timeRange: TimeRange,
    segment?: Record<string, string>,
    config?: ConnectorConfig
  ): Promise<MetricValue>;
  
  // For A/B variant breakdown
  fetchVariantMetric(
    metric: string,
    variantKey: string,
    timeRange: TimeRange,
    config?: ConnectorConfig
  ): Promise<VariantMetricValue>;
  
  // List available metrics (for UI metric picker)
  listMetrics(config: ConnectorConfig): Promise<MetricDefinition[]>;
}
```

---

## API DESIGN

### REST API — Route Map

```
/api/v1/
  auth/
    POST   /login
    POST   /register  
    GET    /session
    POST   /oauth/:provider          # OAuth flow for LLM accounts
    GET    /oauth/:provider/callback
  
  outcomes/
    GET    /                         # List outcomes (paginated)
    POST   /                         # Create outcome
    GET    /:id                      # Get outcome detail
    PUT    /:id                      # Update outcome (draft only)
    POST   /:id/activate             # Activate outcome (triggers hypothesis gen)
    GET    /:id/experiments          # List experiments for outcome
    GET    /:id/signals              # Time-series signal data
    GET    /:id/learnings            # Relevant past learnings
  
  experiments/
    GET    /:id                      # Get experiment detail
    GET    /:id/brief                # Agent brief (clean, focused)
    POST   /:id/built                # Agent reports build complete
    GET    /:id/result               # Current measurement result
    GET    /:id/signals              # Time-series for this experiment
  
  gates/
    GET    /pending                  # All pending gates for user
    GET    /:id                      # Gate detail
    POST   /:id/respond              # Human responds to gate
  
  signals/
    POST   /ingest                   # Webhook for signal ingestion
    GET    /connectors               # List available connectors
    POST   /connectors/test          # Test a connector config
  
  llm/
    GET    /providers                # List configured providers
    POST   /providers                # Add provider config (api_key or oauth)
    PUT    /providers/:id            # Update provider config
    DELETE /providers/:id            # Remove provider
    POST   /providers/:id/test       # Test provider config
  
  learnings/
    GET    /                         # Search learnings (semantic)
    GET    /:id                      # Get learning detail
  
  workspace/
    GET    /                         # Workspace settings
    PUT    /                         # Update settings
    GET    /members                  # Team members
    POST   /members/invite           # Invite member
```

---

## FEATURE FLAG INTEGRATION

Experiments must use feature flags for safe rollout. Outcome Runtime integrates with:

- **LaunchDarkly** (cloud)
- **Unleash** (self-hosted)
- **PostHog** (self-hosted / cloud)
- **Statsig** (cloud)
- **Custom** (simple JSON over HTTP)

```typescript
// packages/core/src/feature-flags/interface.ts

export interface FeatureFlagService {
  createFlag(key: string, description: string): Promise<FeatureFlag>;
  setRolloutPercentage(key: string, percentage: number, segment?: Segment): Promise<void>;
  killFlag(key: string): Promise<void>;           // immediate kill switch
  getVariantForUser(key: string, userId: string): Promise<'control' | 'treatment'>;
}
```

---

## OUTCOME.YAML — COMPLETE REFERENCE

```yaml
# outcome.yaml — place in repo root or specify path in workspace settings
version: 1

outcomes:
  - id: checkout-abandonment-mobile          # unique slug
    title: "Reduce Mobile Checkout Abandonment"
    description: "Improve the mobile checkout completion rate from 32% to above 45%"
    
    signal:
      source: mixpanel                        # connector slug
      metric: checkout_completed              # event or metric name
      method: funnel                          # funnel | event | custom
      funnel_steps:                           # for funnel method
        - cart_viewed
        - checkout_started
        - payment_entered
        - order_confirmed
      segment:
        platform: mobile
      aggregation: 7d_rolling                 # point | 7d_rolling | 30d_rolling
      
    target:
      direction: increase                     # increase | decrease
      from: 0.32                              # current baseline
      to: 0.45                               # target
      confidence_required: 0.95              # statistical confidence threshold
      
    constraints:
      - signal: payment_success_rate
        min: 0.97
        source: datadog
        metric: payment.success_rate
      - signal: checkout_p95_latency_ms
        max: 800
        source: datadog
        metric: checkout.latency.p95
      - rule: "No changes to payment provider integration files"
      - rule: "No changes to order management service"
      
    horizon: 6w                               # ISO 8601 duration
    
    portfolio:
      max_concurrent: 3
      
    gates:
      portfolio_review:
        assigned_to: "arunoday@company.com"
        sla: 24h
        channel: slack:#checkout-outcomes
      launch_approval:
        assigned_to: "checkout-lead@company.com"
        sla: 4h
        channel: slack:#checkout-outcomes
      analysis_review:
        assigned_to: "arunoday@company.com"
        sla: 48h
        
    scope:
      allowed_paths:
        - "frontend/checkout/"
        - "api/cart/"
      forbidden_paths:
        - "services/payments/"
        - "services/orders/"
        - "infra/"
        
    llm_provider: anthropic                   # which configured provider to use

llm:
  default_provider: anthropic                 # which provider to use by default
  hypothesis_model: claude-opus-4             # expensive model for hypothesis gen
  analysis_model: claude-sonnet-4-5           # cheaper for routine analysis
  
signal_connectors:
  - name: mixpanel
    type: mixpanel
    config:
      project_id: "${MIXPANEL_PROJECT_ID}"
      service_account: "${MIXPANEL_SERVICE_ACCOUNT}"
      
  - name: datadog
    type: datadog
    config:
      api_key: "${DATADOG_API_KEY}"
      app_key: "${DATADOG_APP_KEY}"
      
feature_flags:
  provider: launchdarkly
  config:
    sdk_key: "${LD_SDK_KEY}"
    
notifications:
  slack:
    bot_token: "${SLACK_BOT_TOKEN}"
    default_channel: "#outcome-runtime"
```

---

## ERROR HANDLING STANDARDS

```typescript
// All errors extend OutcomeRuntimeError
export class OutcomeRuntimeError extends Error {
  constructor(
    public code: string,       // 'SIGNAL_FETCH_FAILED' | 'GATE_TIMEOUT' | ...
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
  }
}

// Signal errors never crash experiments — they pause and alert
// Gate timeouts escalate to escalation_chain automatically
// LLM errors retry 3x with exponential backoff then escalate to human
// Constraint violations trigger immediate experiment pause + kill
```

---

## ENVIRONMENT VARIABLES

```bash
# Core
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
API_SECRET=...
NEXTAUTH_SECRET=...
APP_URL=https://...

# LLM Providers (set by users via UI — not hardcoded)
# System-level for hypothesis engine default
ANTHROPIC_API_KEY=...

# Signal connectors (set per-workspace via UI)
# Stored encrypted in DB, not env vars

# Feature flags
LAUNCHDARKLY_SDK_KEY=...

# Notifications
SLACK_BOT_TOKEN=...

# OAuth (for LLM account mode)
ANTHROPIC_OAUTH_CLIENT_ID=...
ANTHROPIC_OAUTH_CLIENT_SECRET=...
OPENAI_OAUTH_CLIENT_ID=...
OPENAI_OAUTH_CLIENT_SECRET=...
PERPLEXITY_OAUTH_CLIENT_ID=...
PERPLEXITY_OAUTH_CLIENT_SECRET=...

# Encryption (for stored API keys and OAuth tokens)
ENCRYPTION_KEY=...   # 32-byte key for AES-256-GCM
```

---

## DEVELOPMENT SETUP

```bash
# Prerequisites: Node 20+, pnpm 9+, Docker

# Clone and setup
git clone https://github.com/your-org/outcome-runtime
cd outcome-runtime
pnpm install

# Start infrastructure
docker-compose up -d   # PostgreSQL, TimescaleDB, Redis

# Run migrations
pnpm db:migrate

# Start all services
pnpm dev               # Turborepo starts all packages in watch mode

# Services:
# API:       http://localhost:3001
# Web:       http://localhost:3000
# Docs:      http://localhost:3002
# MCP:       stdio (connect via IDE config)
```

---

## DEPLOYMENT — SELF-HOSTED (Docker Compose)

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  db:
    image: timescale/timescaledb-ha:pg16-latest
    environment:
      POSTGRES_DB: outcome_runtime
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  redis:
    image: redis:7-alpine
    
  api:
    image: outcome-runtime/api:latest
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@db:5432/outcome_runtime
      REDIS_URL: redis://redis:6379
    depends_on: [db, redis]
    
  web:
    image: outcome-runtime/web:latest
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001
    depends_on: [api]
    ports:
      - "80:3000"
      
volumes:
  postgres_data:
```

One-command install:
```bash
curl -fsSL https://install.outcomeruntime.dev | bash
# or
docker compose -f docker-compose.prod.yml up -d
```

---

## TESTING STANDARDS

```
packages/
  */
    src/
      __tests__/
        unit/         # Fast, no I/O
        integration/  # With DB/Redis (use test containers)
    
apps/
  api/
    src/
      __tests__/
        e2e/          # Full API flow tests (supertest)
  web/
    src/
      __tests__/
        component/    # React Testing Library
        e2e/          # Playwright
```

**Coverage requirements:**
- `signal-collector/`: 90% minimum — signals are the foundation
- `hypothesis-engine/`: 80% minimum — correctness of AI prompts
- `core/state-machine/`: 95% minimum — experiment lifecycle must be correct
- All else: 70% minimum

---

## ADR LOG (Architectural Decision Records)

| # | Decision | Status | Date |
|---|----------|--------|------|
| 001 | Use TimescaleDB for signal measurements | Accepted | Day 1 |
| 002 | XState v5 for experiment state machine | Accepted | Day 1 |
| 003 | LLM Gateway abstraction over direct provider calls | Accepted | Day 1 |
| 004 | Sequential testing (mSPRT) over fixed-horizon | Accepted | Day 1 |
| 005 | MCP server as primary IDE integration | Accepted | Day 1 |
| 006 | Drizzle ORM over Prisma | Accepted | Day 1 — lightweight, type-safe |
| 007 | Encrypt all LLM API keys and OAuth tokens at rest | Accepted | Day 1 |
| 008 | Feature flags required for all experiments | Accepted | Day 1 |
