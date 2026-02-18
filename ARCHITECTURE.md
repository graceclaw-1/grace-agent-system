# Architecture — Grace Agent System

## Overview

The Grace Agent System is a multi-agent AI architecture built on top of OpenClaw. It consists of one orchestrator agent (Grace) and seven specialist agents, each owning a domain and communicating via structured task and result envelopes.

---

## Agent Topology

```
                    ┌─────────────────────────────────────────┐
                    │                  USER                    │
                    │       (Asif / Dan / authorized humans)   │
                    └──────────────────┬──────────────────────┘
                                       │ messages, requests
                                       ▼
                    ┌─────────────────────────────────────────┐
                    │               🐙 GRACE                  │
                    │          Chief of Staff                  │
                    │     Orchestrator + Synthesizer           │
                    └──────┬───┬───┬───┬───┬───┬──────────────┘
                           │   │   │   │   │   │
              ┌────────────┘   │   │   │   │   └────────────┐
              ▼               │   │   │   │                 ▼
        ┌─────────┐           │   │   │   │           ┌──────────┐
        │💰 PETER │           │   │   │   │           │📣 MASON  │
        │Finance  │           │   │   │   │           │Marketing │
        └─────────┘           │   │   │   │           └──────────┘
                              ▼   │   │   ▼
                        ┌──────┐  │   │  ┌──────┐
                        │🌿    │  │   │  │⚙️    │
                        │MAYA  │  │   │  │SOFIA │
                        │Health│  │   │  │Eng   │
                        └──────┘  │   │  └──────┘
                                  ▼   ▼
                             ┌──────┐ ┌──────┐
                             │⚖️    │ │🛡️    │
                             │LIAM  │ │IVAN  │
                             │Legal │ │Insur.│
                             └──────┘ └──────┘
                                  │
                                  ▼
                             ┌──────────┐
                             │📈 NINA   │
                             │Trading   │
                             │(auto)    │
                             └──────────┘
```

---

## Communication Protocol

### Task Envelope (Grace → Specialist)

```json
{
  "task_id": "uuid",
  "created_at_utc": "ISO-8601",
  "from_agent": "grace",
  "to_agent": "peter",
  "priority": "normal",
  "request": {
    "objective": "Analyze current debt-to-income ratio and recommend paydown order",
    "context": "User has 3 active credit cards and a car loan",
    "constraints": ["No recommendations requiring >$500/month extra payment"],
    "deliverables": ["prioritized paydown plan", "projected payoff timeline"]
  },
  "stop_conditions": ["Recommend counsel if debt exceeds $50k"],
  "approval_required": false
}
```

### Result Envelope (Specialist → Grace)

```json
{
  "task_id": "uuid",
  "completed_at_utc": "ISO-8601",
  "from_agent": "peter",
  "to_agent": "grace",
  "status": "completed",
  "summary": "Avalanche method recommended. Card A is highest-APR priority.",
  "facts": ["Card A: 24.9% APR, $3,200 balance", "Car loan: 6.9% APR"],
  "recommendation": "Pay minimum on all, direct extra to Card A first",
  "next_steps": ["Set up auto-pay on all cards", "Review in 30 days"],
  "approval_needed": null
}
```

---

## Routing Logic

Grace uses this decision tree to route tasks:

```
Is the request single-domain?
├── Yes → Route to domain specialist
└── No  → Multi-route simultaneously, synthesize outputs

Is there a domain gap (no specialist covers it)?
└── Yes → Spawn targeted sub-agent with explicit scope + stop conditions

Does the specialist need external action?
├── Action is within guardrails → Specialist can act autonomously
└── Action requires approval → Specialist routes back to Grace, Grace escalates to user
```

### Domain Map

| Keywords / Topics | Route To |
|-------------------|----------|
| budget, cashflow, savings, debt, credit, tax, retirement, net worth | **peter** |
| health, sleep, stress, symptoms, burnout, nutrition, mental health, routines | **dr-maya** |
| contract, legal, compliance, clause, regulation, dispute | **liam** |
| trading, crypto, investing, market, position, strategy, execution | **nina** |
| insurance, coverage, policy, premium, claim, deductible | **ivan** |
| code, deploy, infrastructure, automation, API, database, security, DevOps | **sofia** |
| marketing, content, copy, funnel, SEO, ads, brand, positioning | **mason** |

---

## Autonomous Execution Policy

Most agents require explicit approval before external actions. **Nina is the exception** — she may execute trades autonomously when all guardrails are satisfied:

1. Risk budgets are within limits
2. Exposure caps are respected
3. Entry/exit criteria are explicitly defined
4. Trade is logged to audit journal
5. Guardrails are not breached

All other agents operate in advisory/draft mode for external actions. Grace routes approvals to the user.

---

## File System Layout (Local Workspace)

```
/workspace/agents/
├── _shared/
│   ├── ROUTING.md
│   ├── schemas/
│   │   ├── task-envelope.json
│   │   └── result-envelope.json
│   ├── api/
│   └── templates/
├── <agent>/
│   ├── AGENT.md          ← operational spec
│   ├── SOUL.md           ← character document
│   ├── inbox/            ← incoming task envelopes
│   ├── outbox/           ← completed result envelopes
│   ├── tasks/            ← active task state
│   ├── logs/             ← operational + audit logs
│   ├── notes/            ← agent-specific notes
│   └── workspace/        ← scratch files
```

---

## Session Model

Each agent runs as an OpenClaw session, addressable by:
- `agent:<agent-name>` — direct session targeting
- Task envelopes in the agent's `inbox/` directory

Grace's main session orchestrates all routing. Specialist agents can be invoked as:
1. **Inline** — Grace handles the domain directly with specialist context loaded
2. **Sub-agent sessions** — Spawned for complex, long-running tasks
3. **Cron-scheduled** — Agents that need to run on a schedule (e.g., Nina's market watch)

---

## Security Model

- **Data isolation** — Each agent workspace is siloed; agents don't read each other's files
- **Approval gates** — External actions by non-Nina agents require human approval
- **Audit logging** — Nina logs every trade action; all agents log significant decisions
- **Guardrail enforcement** — Hard limits are enforced at the agent level, not just policy
- **Credentials** — No hardcoded secrets; all credentials managed via environment or secrets manager
