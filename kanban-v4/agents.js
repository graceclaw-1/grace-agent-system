// ============================================================
// GRACE COMMAND CENTER — Agent Definitions
// ============================================================

const AGENTS = [
  {
    id: 'grace',
    name: 'Grace',
    emoji: '🐙',
    role: 'Chief of Staff',
    description: 'Core orchestration and oversight. Delegates, coordinates, and ensures smooth operation.',
    status: 'online',
    color: '#00fff0',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'peter',
    name: 'Peter',
    emoji: '💰',
    role: 'Personal Finance',
    description: 'Financial planning, budgeting, and wealth management strategies.',
    status: 'online',
    color: '#f7c948',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'dr-maya',
    name: 'Dr. Maya',
    emoji: '🌿',
    role: 'Health & Wellness',
    description: 'Health monitoring, wellness optimization, and medical insights.',
    status: 'online',
    color: '#4ade80',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'liam',
    name: 'Liam',
    emoji: '⚖️',
    role: 'Legal',
    description: 'Legal advisory, compliance guidance, and contract analysis.',
    status: 'online',
    color: '#818cf8',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'nina',
    name: 'Nina',
    emoji: '📈',
    role: 'Trading & Investing',
    description: 'Market analysis, portfolio optimization, and trading strategy.',
    status: 'busy',
    color: '#f472b6',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'ivan',
    name: 'Ivan',
    emoji: '🛡️',
    role: 'Security & Insurance',
    description: 'Security infrastructure, risk mitigation, and insurance coverage.',
    status: 'busy',
    color: '#38bdf8',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'sofia',
    name: 'Sofia',
    emoji: '⚙️',
    role: 'Systems & Engineering',
    description: 'Technical architecture, development, and system optimization.',
    status: 'online',
    color: '#fb923c',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'mason',
    name: 'Mason',
    emoji: '📣',
    role: 'Marketing & Sales',
    description: 'Marketing strategy, brand development, and growth initiatives.',
    status: 'idle',
    color: '#a78bfa',
    model: 'claude-sonnet-4.6'
  }
];

// Column definitions
const COLUMNS = [
  { id: 'backlog', label: 'Backlog', icon: '📥' },
  { id: 'inprogress', label: 'In Progress', icon: '⚡' },
  { id: 'review', label: 'Review', icon: '🔍' },
  { id: 'done', label: 'Done', icon: '✅' }
];

// Priority levels and colors
const PRIORITIES = {
  critical: { label: 'CRITICAL', color: '#ff0055' },
  high:     { label: 'HIGH', color: '#f472b6' },
  medium:   { label: 'MEDIUM', color: '#f7c948' },
  low:      { label: 'LOW', color: '#4ade80' }
};