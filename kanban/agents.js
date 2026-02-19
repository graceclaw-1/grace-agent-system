// ============================================================
// GRACE COMMAND CENTER — Agent Definitions
// ============================================================

const AGENTS = [
  {
    id: 'grace',
    name: 'Grace',
    emoji: '🐙',
    role: 'Chief of Staff',
    color: '#00fff0',
    glowColor: '#00fff0',
    status: 'online',
    description: 'Orchestrates all agents, manages priorities, ensures mission alignment'
  },
  {
    id: 'peter',
    name: 'Peter',
    emoji: '💰',
    role: 'Personal Finance',
    color: '#f7c948',
    glowColor: '#f7c948',
    status: 'online',
    description: 'Budget tracking, expense analysis, financial planning & net worth'
  },
  {
    id: 'maya',
    name: 'Dr. Maya',
    emoji: '🌿',
    role: 'Health & Wellness',
    color: '#4ade80',
    glowColor: '#4ade80',
    status: 'busy',
    description: 'Health metrics, sleep tracking, nutrition analysis, workout planning'
  },
  {
    id: 'liam',
    name: 'Liam',
    emoji: '⚖️',
    role: 'Legal & Compliance',
    color: '#818cf8',
    glowColor: '#818cf8',
    status: 'idle',
    description: 'Contract review, compliance monitoring, regulatory analysis'
  },
  {
    id: 'nina',
    name: 'Nina',
    emoji: '📈',
    role: 'Trading & Crypto',
    color: '#f472b6',
    glowColor: '#f472b6',
    status: 'busy',
    description: 'Market analysis, crypto portfolio, trading signals & risk management'
  },
  {
    id: 'ivan',
    name: 'Ivan',
    emoji: '🛡️',
    role: 'Security & Risk',
    color: '#fb923c',
    glowColor: '#fb923c',
    status: 'online',
    description: 'Threat monitoring, security audits, incident response, risk scoring'
  },
  {
    id: 'sofia',
    name: 'Sofia',
    emoji: '⚙️',
    role: 'Engineering',
    color: '#38bdf8',
    glowColor: '#38bdf8',
    status: 'busy',
    description: 'Code reviews, architecture design, CI/CD, infrastructure management'
  },
  {
    id: 'mason',
    name: 'Mason',
    emoji: '📣',
    role: 'Marketing & Growth',
    color: '#a78bfa',
    glowColor: '#a78bfa',
    status: 'online',
    description: 'Content strategy, growth hacking, social media, brand analytics'
  }
];

const AGENT_STATUS_COLORS = {
  online: '#00fff0',
  busy: '#f472b6',
  idle: '#818cf8'
};

const COLUMNS = [
  { id: 'backlog',     label: 'BACKLOG',     icon: '◈' },
  { id: 'inprogress',  label: 'IN PROGRESS', icon: '◉' },
  { id: 'review',      label: 'REVIEW',      icon: '◎' },
  { id: 'done',        label: 'DONE',        icon: '✦' }
];

const PRIORITIES = {
  critical: { label: 'CRITICAL', color: '#ff0055' },
  high:     { label: 'HIGH',     color: '#f472b6' },
  medium:   { label: 'MEDIUM',   color: '#f7c948' },
  low:      { label: 'LOW',      color: '#4ade80' }
};

if (typeof module !== 'undefined') {
  module.exports = { AGENTS, COLUMNS, PRIORITIES, AGENT_STATUS_COLORS };
}
