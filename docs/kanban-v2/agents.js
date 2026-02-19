// ============================================================
// GRACE COMMAND CENTER — Agent Definitions
// ============================================================

const AGENTS = [
  {
    id: 'grace',
    name: 'Grace',
    emoji: '🌟',
    role: 'Command Center Core',
    description: 'Core orchestration and oversight. Delegates, coordinates, and ensures smooth operation.',
    status: 'online',
    color: '#00fff0',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'peter',
    name: 'Peter',
    emoji: '📊',
    role: 'Project Manager',
    description: 'Project planning, resource allocation, and timeline management.',
    status: 'online',
    color: '#f472b6',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'maya',
    name: 'Dr. Maya',
    emoji: '🔬',
    role: 'Research Lead',
    description: 'Scientific research, data analysis, and technical investigations.',
    status: 'online',
    color: '#7c3aed',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'liam',
    name: 'Liam',
    emoji: '⚙️',
    role: 'Tech Engineer',
    description: 'Technical implementation, systems architecture, and tooling.',
    status: 'busy',
    color: '#38bdf8',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'nina',
    name: 'Nina',
    emoji: '🎨',
    role: 'Creative Director',
    description: 'Visual design, user experience, and creative direction.',
    status: 'online',
    color: '#f7c948',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'ivan',
    name: 'Ivan',
    emoji: '🛡️',
    role: 'Security Expert',
    description: 'Security audits, threat modeling, and protective measures.',
    status: 'busy',
    color: '#4ade80',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'sofia',
    name: 'Sofia',
    emoji: '🤝',
    role: 'Communications',
    description: 'Inter-agent communication, external relations, and knowledge sharing.',
    status: 'online',
    color: '#fb923c',
    model: 'claude-sonnet-4.6'
  },
  {
    id: 'mason',
    name: 'Mason',
    emoji: '📈',
    role: 'Data Analyst',
    description: 'Performance monitoring, analytics, and optimization.',
    status: 'idle',
    color: '#818cf8',
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