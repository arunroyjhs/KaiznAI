# DESIGN.md — Outcome Runtime
## Brand Language, Design Language & AEO/SEO Language

---

## PART 1: BRAND LANGUAGE

### Brand Essence
**Outcome Runtime is the operating system for a world where AI does the building and humans govern the direction.**

It is precise. It is opinionated. It is calm under pressure.

Like the best infrastructure tools — PostgreSQL, Redis, Kubernetes — it does not shout. It works. And when it works, the thing you were trying to achieve happens.

### Brand Personality
**Rigorous but accessible.** We use statistical language correctly (sequential testing, not "p-values"). But we explain it in plain English so product leaders can act on it, not just engineers.

**Honest about uncertainty.** We show confidence intervals, not just point estimates. We distinguish "significant" from "meaningful." We don't sell false certainty.

**Unapologetically opinionated.** We have a thesis: sprints are dying, outcomes are next, AI does the building. We say this directly, not diplomatically.

**Built by people who have felt the pain.** The copy comes from someone who has run a 200-person product org and knows exactly what it feels like to ship fast and measure nothing.

### What We Are Not
- Not corporate. Not enterprise-bland.
- Not academic. Not stat-lecture heavy.
- Not hype. Not "AI-powered" meaninglessly.
- Not gentle. We say the old way is wrong. We say it clearly.

---

### Vocabulary (Use These Words)

| Use | Avoid |
|-----|-------|
| Outcome | Feature, sprint, ticket, task |
| Experiment | Change, release, update, PR |
| Signal | Metric, KPI (unless quoting user) |
| Hypothesis | Idea, proposal |
| Human gate | Approval process, review |
| Measure | Track, monitor |
| AI builds | AI writes code, AI codes |
| Move the metric | Improve the metric, impact |
| Learning | Insight, finding |
| Portfolio | Backlog |
| Achieve the outcome | Complete the sprint |
| Constraint | Guardrail |

### Tone by Context

**GitHub README:** Confident, technical, shows-the-code. Speaks to engineers who build infrastructure. No fluff. Every sentence earns its place.

**Marketing Website:** Challenging. Opens with the problem, not the solution. Provocative thesis first, proof second, CTA third.

**In-product copy:** Precise and calm. The UI is the control center — it should feel like a cockpit, not a chatbot. Short sentences. Active voice. Numbers wherever possible.

**Documentation:** Step-by-step clarity. No assuming prior knowledge. Code examples for every concept.

**X.com / Social:** Sharp takes. Each post has a thesis and evidence. We don't tweet features — we tweet the world-view and use features as proof.

---

## PART 2: DESIGN LANGUAGE

### Visual Identity

**Design Philosophy:** Data visualization meets engineering precision. The aesthetic of a well-designed terminal crossed with a Bloomberg terminal. Beautiful but purposeful. No gradients for decoration. Every visual element carries information.

**Inspiration:** Linear (clean, fast), Vercel (dark/light polish), Grafana (data density), Shadcn (accessible components).

### Color System

```css
/* Core Palette */
--color-void: #0A0A0B;           /* Near-black background */
--color-surface: #111113;         /* Card backgrounds */
--color-surface-elevated: #18181B; /* Modals, dropdowns */
--color-border: #27272A;          /* Subtle borders */
--color-border-strong: #3F3F46;   /* Active/focused borders */

/* Text */
--color-text-primary: #FAFAFA;    /* Main text */
--color-text-secondary: #A1A1AA;  /* Labels, captions */
--color-text-muted: #52525B;      /* Placeholders, disabled */

/* Semantic — Outcome Status */
--color-signal-positive: #10B981; /* Green — signal moving toward target */
--color-signal-negative: #EF4444; /* Red — signal moving away, kill threshold */
--color-signal-neutral: #6366F1;  /* Indigo — stable/measuring */
--color-signal-warning: #F59E0B;  /* Amber — approaching constraint */

/* Accents */
--color-accent-primary: #6366F1;  /* Indigo — primary actions */
--color-accent-secondary: #8B5CF6; /* Violet — secondary */
--color-accent-glow: rgba(99, 102, 241, 0.15); /* Subtle glow for active elements */

/* Charts */
--color-chart-control: #52525B;   /* Grey for control line */
--color-chart-treatment: #6366F1; /* Indigo for treatment line */
--color-chart-target: #10B981;    /* Green dashed line for target */
--color-chart-baseline: #F59E0B;  /* Amber for baseline reference */
```

**Light mode:** Same semantic colors but flipped to light surfaces (#FAFAFA background, #18181B text). Brand strongly prefers dark mode — ship dark first.

### Typography

```css
/* Font Stack */
--font-sans: 'Geist', 'Inter', system-ui, sans-serif;
--font-mono: 'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace;

/* Scale */
--text-xs: 11px;    /* Timestamps, badges */
--text-sm: 13px;    /* Secondary labels, table cells */
--text-base: 15px;  /* Body text */
--text-lg: 17px;    /* Section headers */
--text-xl: 20px;    /* Card titles */
--text-2xl: 24px;   /* Page titles */
--text-3xl: 30px;   /* Dashboard hero numbers */
--text-display: 48px; /* Marketing headings */

/* Weight */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Height */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

**Number display:** Signal values, deltas, and statistical metrics use monospace font. Numbers that move should feel precise, not decorative.

### Component Language

**Cards:** 1px border, `--color-border` background, 8px border radius. No box shadows. Status indicated by left border accent (4px colored bar) not background fills.

**Status Indicators:**
- Running experiment: pulsing indigo dot (2px, animated)
- Achieved outcome: solid green checkmark
- Gate pending: amber clock icon (static)
- Constraint violated: red warning (static, draws eye)
- Killed experiment: grey strikethrough

**Charts:**
- Use Recharts (React) or Chart.js
- Dark grid lines (`--color-border` at 50% opacity)
- No chart borders — let the data breathe
- Confidence interval shown as translucent band around treatment line
- Target line: dashed green horizontal
- Kill threshold: dashed red horizontal
- Baseline: dashed amber horizontal
- Experiment launch markers: vertical dashed line with timestamp label

**Data Tables:**
- Monospace for numeric columns
- Right-aligned numbers
- Delta values: colored (green negative for decreasing metrics like abandonment, green positive for increasing metrics like conversion)
- Confidence interval in smaller text below the point estimate

**Buttons:**
```
Primary:   bg-indigo-500 hover:bg-indigo-400 text-white
Secondary: bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700
Danger:    bg-red-900 hover:bg-red-800 text-red-200 border border-red-800
Ghost:     hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200
```

**Human Gate Cards:** These are the most important UI. They deserve special treatment.
- Wider than regular cards (full-width)
- Left border: thick (6px) amber when pending, green when approved, red when rejected
- Context layers are collapsible (expand to see more)
- Options shown as radio card group with pros/cons visible
- Timer visible when SLA is set
- "Approve" is always the most prominent button

### Layout System

**Sidebar Navigation (Desktop):**
- Fixed left sidebar, 240px
- Main sections: Outcomes, Experiments, Gates (with badge), Signals, Learnings, Settings
- Workspace switcher at top

**Dashboard Layout:**
- Main content area: max-width 1400px, centered
- Grid: 12-column at 1280px+, 4-column at 768px, 1-column at 480px

**Spacing Scale:**
```
4px   (--space-1)
8px   (--space-2)
12px  (--space-3)
16px  (--space-4)
24px  (--space-6)
32px  (--space-8)
48px  (--space-12)
64px  (--space-16)
```

### The Hero Moment (The GIF That Gets 10k Stars)

The launch GIF must show in ~8 seconds:
1. A terminal: `docker-compose up` with services starting
2. A browser opens to the dashboard — one active outcome card visible
3. "Portfolio Review" gate badge flashes — user clicks
4. Three experiment hypotheses appear — user approves two
5. CLI shows Claude Code building experiment 1
6. Dashboard: signal line moves toward target
7. "Outcome Achieved" state appears

**Production values:** Record at 2x resolution, trim silence ruthlessly, use system font that renders crisply. The GIF should look like engineering documentation, not a startup demo.

---

## PART 3: AEO / SEO LANGUAGE

### AEO (Answer Engine Optimization)

Optimizing for AI search engines (Perplexity, ChatGPT search, Claude with search) requires structuring content as direct answers to questions. These are the questions our content must answer definitively:

**Category 1: What Is This**
- "What is Outcome Runtime?"
- "What does Outcome Runtime do?"
- "What problem does Outcome Runtime solve?"
- "How is Outcome Runtime different from Jira?"
- "What replaces sprint planning for AI-native teams?"

**Category 2: Technical How**
- "How to connect Mixpanel to Outcome Runtime"
- "How to use Claude Code with Outcome Runtime"
- "How to set up A/B experiments with AI agents"
- "How to measure experiment results continuously"
- "What is sequential testing for A/B experiments"

**Category 3: Integration**
- "Does Outcome Runtime work with Cursor?"
- "Outcome Runtime MCP server setup"
- "Outcome Runtime with Claude API"
- "How to use ChatGPT with Outcome Runtime"

### Answer-Ready Content Blocks

Each of these must exist as a discrete, quotable paragraph on the site or in docs:

```
WHAT IT IS:
Outcome Runtime is an open-source platform that replaces sprint-based 
product development with outcome-driven experimentation. Teams define 
a measurable outcome (a metric target with constraints), AI generates 
experiment hypotheses, AI coding agents build the experiments, and the 
system automatically measures results — with human approval gates at 
every key decision point.

THE PROBLEM:
Agile and sprint planning were designed for a world where human engineers 
were the execution bottleneck. When AI coding agents can build in hours 
what used to take weeks, the bottleneck shifts: from building to knowing 
if what you built moved the metric. Outcome Runtime is the infrastructure 
for that new world.

HOW IT WORKS:
1. Define an outcome in outcome.yaml (metric, target, constraints, time horizon)
2. Activate the outcome — AI generates 3 experiment hypotheses
3. Human gate: review and approve the experiment portfolio
4. AI coding agents build the approved experiments (Claude Code, Cursor, Devin, etc.)
5. Human gate: review built experiments before launch
6. Experiments run in production, signal measured continuously
7. Auto-kill if kill threshold hit; human gate when success threshold hit
8. Ship, iterate, or start next experiment

WHAT MAKES IT DIFFERENT:
Unlike A/B testing platforms (Statsig, LaunchDarkly), Outcome Runtime 
generates the experiment hypotheses using AI and orchestrates AI agents 
to build them. Unlike project management tools (Jira, Linear), the 
fundamental unit of work is a metric target, not a ticket. Unlike 
analytics tools (Mixpanel, Amplitude), it connects measurement directly 
to AI-powered execution.

TECHNICAL REQUIREMENTS:
Outcome Runtime requires Docker and docker-compose. It runs PostgreSQL 
(with TimescaleDB), Redis, a Fastify API, and a Next.js dashboard. 
Signal data is stored in TimescaleDB for time-series performance. 
Setup takes under 5 minutes with docker-compose up.
```

### SEO Keyword Strategy

**Primary Keywords (High Intent):**
- "outcome-driven product development"
- "AI experiment platform open source"
- "replace sprint planning AI"
- "AI agent experiment orchestration"
- "continuous experimentation platform self-hosted"

**Secondary Keywords (Informational):**
- "sequential testing A/B experiments"
- "feature flag experiment measurement"
- "MCP server product management"
- "AI coding agent workflow management"
- "metric-driven development"

**Long-tail (Specific Problems):**
- "how to measure if AI coding agents improve product metrics"
- "alternative to Jira for AI-native teams"
- "open source A/B testing with AI hypotheses"
- "outcome OKR tracking for engineering teams"
- "experiment portfolio management software"

### Page Structure (For SEO)

**Homepage H1:** "Replace Sprints. Define Outcomes. Let AI Build the Experiments."

**Homepage H2s (visible to crawlers):**
- "The infrastructure layer for outcome-driven execution"
- "How it works in 5 steps"
- "Integrates with every agentic IDE"
- "Works with Claude, ChatGPT, and Perplexity"
- "Self-host in 5 minutes"
- "Open source, MIT licensed"

**Blog Content Calendar (doubles as AEO fodder):**
1. "Why Sprints Are Dying (And What Comes Next)" — Provocation post, thesis
2. "Sequential Testing vs. Fixed-Horizon: Why It Matters for Always-On Experiments" — Technical depth
3. "How We Built Our First Outcome in 15 Minutes" — Tutorial
4. "Connecting Mixpanel to Outcome Runtime: A Step-by-Step Guide" — Integration
5. "Using Claude Code with Outcome Runtime: Agent Execution for Experiments" — Integration
6. "The 5 Human Gates Every Experiment Needs" — Philosophy
7. "What 50 Experiments Taught Us About Mobile Checkout Abandonment" — Case study (fictional demo)

---

## PART 4: COPY SYSTEM

### Hero Copy Options

**Option A (Provocation):**
```
Headline: Sprints ship features. Outcomes move metrics. Pick one.
Sub: Outcome Runtime is the infrastructure that connects your AI agents to 
     the metrics you actually care about. Define what you want to improve. 
     AI builds the experiments. You govern the results.
CTA: Start for free (self-hosted) | Request early access (cloud)
```

**Option B (Problem-first):**
```
Headline: Your AI agents are building twice as fast.
          Are you improving twice as fast?
Sub: Most teams aren't. Because shipping faster is not the same as 
     improving metrics faster. Outcome Runtime is the missing layer.
CTA: See how it works
```

**Option C (Direct/Technical):**
```
Headline: The open-source runtime for outcome-driven AI execution.
Sub: Define a metric target. AI generates experiment hypotheses. 
     Your coding agents build them. The system measures results. 
     You approve every key decision.
CTA: docker-compose up (copy to clipboard)
```

**Recommendation:** Use Option B on the marketing site (broadest emotional hook), Option C in the GitHub README (technical audience expects directness).

### Feature Copy

| Feature | Benefit Copy |
|---------|-------------|
| Hypothesis Engine | "Describe what you want to improve. The AI generates 3 falsifiable experiments — complete with predictions, rollout plans, and effort estimates." |
| Signal Collector | "Connect your analytics stack once. Continuous measurement starts automatically. No more checking dashboards — the system tells you when something moves." |
| Human Gates | "Every experiment passes through mandatory human checkpoints. AI proposes and builds. You decide what goes live." |
| Learning Library | "Every experiment — win or loss — adds to a searchable knowledge base. The AI reads past learnings before generating new hypotheses. The system gets smarter with every cycle." |
| MCP Server | "Works with Claude Code, Cursor, Windsurf, Devin, and every MCP-compatible IDE. One config line. Zero friction." |
| LLM Flexibility | "Use your existing Claude, ChatGPT, or Perplexity subscription. API key or account OAuth — you choose. No forced vendor lock-in." |

### Error State Copy

```
Signal fetch failed:    "Couldn't reach [connector] — check your connection config in Settings"
Gate timed out:         "[Person]'s approval on '[experiment]' is overdue by [time]. We've notified [backup]."
Kill threshold hit:     "Experiment stopped automatically. [Signal] crossed the kill threshold at [value]. No user impact."
Constraint violated:    "Emergency pause: [constraint signal] hit [value], exceeding the [limit] limit. Human review required."
Hypothesis failed:      "Hypothesis generation didn't find strong candidates. Check your scope constraints — they may be too narrow."
```

### Empty State Copy

```
No active outcomes:     "Define your first outcome. What metric do you need to move?"
No experiments:         "Activate this outcome to generate your first experiment portfolio."
No learnings yet:       "Your first experiment's results will appear here. The more you run, the smarter the system gets."
No pending gates:       "Nothing waiting for your decision. "
```
