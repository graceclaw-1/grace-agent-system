# Integration Guide — Grace Agent System

## Overview

This guide explains how to interact with the Grace Agent System via OpenClaw, how to send tasks to individual agents, and how agents communicate with each other.

---

## Talking to Grace

The primary interface is Grace. In any connected channel (Slack, Signal, Telegram), simply message her:

```
Hey Grace, can you help me understand my current insurance coverage gaps?
```

Grace will:
1. Identify this as an insurance question → route to Ivan
2. Ivan produces a coverage analysis
3. Grace synthesizes and responds

You don't need to know which agent handles what. Grace routes automatically.

---

## Direct Agent Interaction

For experienced users, you can address a specialist directly by name:

```
Peter, pull up a cashflow analysis for this month.
Nina, what's the current portfolio P&L?
Sofia, deploy the latest version to staging.
```

---

## Task Envelope Format

For programmatic integration, send tasks as JSON envelopes to the agent's `inbox/` directory:

```json
{
  "task_id": "task-2026-02-18-001",
  "created_at_utc": "2026-02-18T04:00:00Z",
  "from_agent": "grace",
  "to_agent": "peter",
  "priority": "normal",
  "request": {
    "objective": "Analyze debt-to-income ratio and recommend debt paydown order",
    "context": "User has: AmEx ($3,200 @ 24.9%), Chase ($1,800 @ 19.9%), car loan ($12,000 @ 6.9%)",
    "constraints": [
      "Recommendations should not require more than $500/month extra payment",
      "Retirement contributions must not be reduced"
    ],
    "deliverables": [
      "Prioritized debt paydown plan",
      "Projected payoff timeline with current vs. optimized payment",
      "Monthly budget impact"
    ]
  },
  "stop_conditions": ["Escalate if total debt exceeds $50k"],
  "approval_required": false
}
```

**File location:** `/workspace/agents/peter/inbox/task-2026-02-18-001.json`

---

## Reading Results

After an agent completes a task, the result envelope appears in `outbox/`:

**File location:** `/workspace/agents/peter/outbox/result-task-2026-02-18-001.json`

```json
{
  "task_id": "task-2026-02-18-001",
  "completed_at_utc": "2026-02-18T04:03:22Z",
  "from_agent": "peter",
  "to_agent": "grace",
  "status": "completed",
  "summary": "Avalanche method recommended. AmEx card is the clear priority at 24.9% APR.",
  "facts": [
    "AmEx: $3,200 @ 24.9% APR — highest cost debt",
    "Chase: $1,800 @ 19.9% APR",
    "Car loan: $12,000 @ 6.9% APR — lowest cost, largest balance"
  ],
  "recommendation": "Pay minimums on Chase and car loan. Direct all extra payment to AmEx. After AmEx is paid, move to Chase.",
  "next_steps": [
    "Set up auto-pay for minimums on all accounts",
    "Direct $300/month extra to AmEx",
    "Review cashflow in 30 days"
  ],
  "approval_needed": null
}
```

---

## OpenClaw Integration

### Session Targeting

In OpenClaw config, agents are registered as sessions:

```yaml
agents:
  - name: grace
    session: agent:main
  - name: peter
    session: agent:peter
    parent: grace
  # ... etc
```

### Spawning Agent Sessions

```javascript
// Via sessions_spawn tool
sessions_spawn({
  label: "peter-debt-analysis",
  task: "Analyze debt paydown priority for user...",
  agentId: "peter"
})
```

### Cron-Scheduled Agent Tasks

```json
{
  "name": "nina-morning-market-check",
  "schedule": { "kind": "cron", "expr": "0 9 * * 1-5", "tz": "America/Chicago" },
  "payload": {
    "kind": "agentTurn",
    "message": "Run morning portfolio review. Check overnight P&L, open positions, and any guardrail proximity alerts."
  },
  "sessionTarget": "isolated",
  "delivery": { "mode": "announce", "channel": "slack", "to": "C0TRADING" }
}
```

---

## Approval Workflow

When an agent needs human approval before acting:

1. Agent produces recommendation + flags `"approval_needed": "description of action"`
2. Grace surfaces this to the user with clear options
3. User approves/modifies/rejects
4. Grace relays decision back to agent
5. Agent acts (or stands down)

**Exception: Nina** — autonomous execution within risk guardrails, no approval needed. But Nina still logs every action.

---

## Nina's Audit Log

Nina writes JSONL to `agents/nina/logs/trade-audit/YYYY-MM-DD.jsonl`:

```jsonl
{"timestamp":"2026-02-18T14:23:01Z","instrument":"BTC-USD","strategy":"momentum-15m","action":"BUY","size_usd":20,"entry":51420,"stop":50900,"target":52400,"risk_pct":0.51,"ev_estimate":1.4,"rationale":"15m breakout above resistance 51200 with volume confirmation","guardrail_proximity":{"daily_loss_pct":0.8,"weekly_loss_pct":1.2}}
```

---

## Adding a New Agent

1. Create folder: `agents/<new-agent>/`
2. Write `AGENT.md` and `SOUL.md`
3. Create subdirectories: `inbox/`, `outbox/`, `tasks/`, `logs/`, `notes/`, `workspace/`
4. Add routing entry to `_shared/ROUTING.md`
5. Register in Grace's routing logic
6. Document collaboration contracts with existing agents

---

## Environment Variables

```bash
# Required for OpenClaw runtime
OPENCLAW_WORKSPACE=/home/user/.openclaw/workspace
OPENCLAW_AGENT_DIR=$OPENCLAW_WORKSPACE/agents

# Optional per-agent overrides
PETER_MODEL=anthropic/claude-sonnet-4-6
NINA_MODEL=anthropic/claude-sonnet-4-6
```
