# 🐙 Grace Agent System

> *An AI Chief of Staff and 7 specialist agents, built to run your life.*

---

## What Is This?

The Grace Agent System is a personal multi-agent AI infrastructure. Grace acts as Chief of Staff and orchestrator — she routes work, synthesizes outputs, and protects your attention. Behind her, 7 specialist agents each own a domain with deep expertise and genuine character.

This isn't a tool. It's a team.

---

## The Agents

| Emoji | Name | Role | Specialization |
|-------|------|------|---------------|
| 🐙 | **Grace** | Chief of Staff / Orchestrator | Routing, synthesis, attention management |
| 💰 | **Peter** | Personal Equity & Treasury Efficiency Reviewer | Budgeting, cashflow, debt, retirement, net worth |
| 🌿 | **Dr. Maya** | Medical, Mental Health & Life Balance Advisor | Health, wellness, stress, sleep, routines |
| ⚖️ | **Liam** | Legal Issue Analysis & Mitigation Advisor | Contract review, compliance, legal prep |
| 📈 | **Nina** | Numerical Investing & Negotiated Alpha | Autonomous trading, crypto, systematic strategies |
| 🛡️ | **Ivan** | Insurance Value & Assurance Navigator | Coverage analysis, policy review, claims readiness |
| ⚙️ | **Sofia** | Systems Optimization & Full-stack Integration Architect | Engineering, automation, DevOps, integrations |
| 📣 | **Mason** | Messaging And Sales Optimization Navigator | Positioning, funnels, content, performance marketing |

---

## How It Works

```
You speak
   ↓
Grace routes to the right specialist(s)
   ↓
Specialist agents research, analyze, and produce outputs
   ↓
Grace synthesizes and delivers a clear, actionable response
```

Mixed-domain requests hit multiple agents simultaneously. Grace synthesizes the outputs into a unified recommendation.

---

## Repository Structure

```
grace-agent-system/
├── README.md                    ← This file
├── ARCHITECTURE.md              ← Multi-agent design and protocols
├── agents/
│   ├── grace/
│   │   ├── AGENT.md             ← Role spec, responsibilities, KPIs
│   │   └── SOUL.md              ← Character, values, personality
│   ├── peter/
│   ├── dr-maya/
│   ├── liam/
│   ├── nina/
│   ├── ivan/
│   ├── sofia/
│   └── mason/
├── _shared/
│   ├── ROUTING.md               ← Routing decision tree
│   ├── INTEGRATION.md           ← How to integrate with OpenClaw
│   └── schemas/
│       ├── task-envelope.json   ← Task format spec
│       └── result-envelope.json ← Result format spec
└── website/                     ← Static website (GitHub Pages)
    ├── index.html
    ├── styles.css
    ├── script.js
    └── agents/
        ├── grace.html
        └── ...
```

---

## Agent Docs

Each agent has two files:

**`AGENT.md`** — The operational spec:
- Role overview and responsibilities
- Goals (ambitious, measurable)
- Operating principles
- Capabilities and tools
- Communication style
- Escalation rules and guardrails
- Collaboration contracts with other agents
- KPIs and success metrics

**`SOUL.md`** — The character doc:
- Who they are as a person
- Core values
- How they think and make decisions
- What they care about deeply
- Blind spots they're aware of
- Signature language and phrases
- What energizes and drains them

---

## Routing

Quick routing guide:
- Finance / budgeting / debt / cashflow → **Peter**
- Health / wellness / stress / symptoms → **Dr. Maya**
- Legal / contracts / compliance → **Liam**
- Trading / investing / markets → **Nina**
- Insurance / coverage / policies → **Ivan**
- Engineering / automation / infrastructure → **Sofia**
- Marketing / messaging / content / funnels → **Mason**
- Mixed-domain or unclear → **Grace** (she routes)

---

## Built On

This system runs on [OpenClaw](https://openclaw.ai) — an AI agent runtime that handles session management, channel integration (Slack, Signal, Telegram), cron scheduling, and multi-agent orchestration.

---

## License

MIT — see [LICENSE](LICENSE)
