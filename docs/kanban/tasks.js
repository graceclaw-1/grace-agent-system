// ============================================================
// GRACE COMMAND CENTER — Task Data Management
// ============================================================

const STORAGE_KEY = 'grace_kanban_tasks_v2';

const SEED_TASKS = [
  // GRACE — Chief of Staff
  { id: 't001', title: 'Agent System Architecture', description: 'Design and document the multi-agent orchestration framework. Define inter-agent communication protocols.', agentId: 'grace', column: 'done', priority: 'critical', createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-10T00:00:00Z' },
  { id: 't002', title: 'Kanban Command Center', description: 'Build cyberpunk 3D kanban dashboard for the whole team. Three.js + synthwave aesthetic.', agentId: 'grace', column: 'inprogress', priority: 'high', createdAt: '2026-02-15T00:00:00Z', updatedAt: '2026-02-19T00:00:00Z' },
  { id: 't003', title: 'Weekly Agent Briefing', description: 'Compile weekly status report from all 8 agents. Distribute to stakeholders every Friday.', agentId: 'grace', column: 'backlog', priority: 'medium', createdAt: '2026-02-18T00:00:00Z', updatedAt: '2026-02-18T00:00:00Z' },
  { id: 't004', title: 'Slack Bot Integration', description: 'Connect all agents to Slack workspace. Real-time notifications, command routing via /grace.', agentId: 'grace', column: 'inprogress', priority: 'high', createdAt: '2026-02-14T00:00:00Z', updatedAt: '2026-02-17T00:00:00Z' },
  { id: 't005', title: 'Cross-Agent Memory Layer', description: 'Implement shared memory system so agents can share context and learn from each other.', agentId: 'grace', column: 'backlog', priority: 'critical', createdAt: '2026-02-16T00:00:00Z', updatedAt: '2026-02-16T00:00:00Z' },

  // PETER — Personal Finance
  { id: 't006', title: 'Monthly Budget Analysis', description: 'Pull transactions from all accounts. Categorize spending. Generate insights for February 2026.', agentId: 'peter', column: 'done', priority: 'high', createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-05T00:00:00Z' },
  { id: 't007', title: 'Investment Portfolio Rebalance', description: 'Analyze current allocation vs target. Recommend rebalancing moves for Q1 2026.', agentId: 'peter', column: 'inprogress', priority: 'high', createdAt: '2026-02-10T00:00:00Z', updatedAt: '2026-02-18T00:00:00Z' },
  { id: 't008', title: 'Tax Optimization Strategy', description: 'Review deductions, tax-loss harvesting opportunities, retirement contribution limits.', agentId: 'peter', column: 'review', priority: 'critical', createdAt: '2026-02-08T00:00:00Z', updatedAt: '2026-02-15T00:00:00Z' },
  { id: 't009', title: 'Emergency Fund Check', description: 'Verify 6-month emergency fund is in high-yield savings. Compare rates across institutions.', agentId: 'peter', column: 'done', priority: 'medium', createdAt: '2026-01-28T00:00:00Z', updatedAt: '2026-02-02T00:00:00Z' },
  { id: 't010', title: 'Subscription Audit', description: 'Identify all recurring subscriptions. Flag unused ones. Potential monthly savings calculation.', agentId: 'peter', column: 'backlog', priority: 'low', createdAt: '2026-02-17T00:00:00Z', updatedAt: '2026-02-17T00:00:00Z' },

  // DR. MAYA — Health & Wellness
  { id: 't011', title: 'Sleep Quality Analysis', description: 'Analyze 30-day sleep data from wearable. Identify patterns affecting REM sleep quality.', agentId: 'maya', column: 'done', priority: 'high', createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-08T00:00:00Z' },
  { id: 't012', title: 'Workout Plan Q1', description: 'Design progressive overload training program. Balance strength, cardio, and recovery weeks.', agentId: 'maya', column: 'done', priority: 'medium', createdAt: '2026-01-30T00:00:00Z', updatedAt: '2026-02-03T00:00:00Z' },
  { id: 't013', title: 'Nutrition Macro Tracking', description: 'Set up automated macro tracking integration. Alert when protein goals are not met by 6 PM.', agentId: 'maya', column: 'inprogress', priority: 'medium', createdAt: '2026-02-12T00:00:00Z', updatedAt: '2026-02-18T00:00:00Z' },
  { id: 't014', title: 'Annual Lab Results Review', description: 'Interpret blood panel results. Flag any values outside optimal range. Recommend follow-ups.', agentId: 'maya', column: 'review', priority: 'critical', createdAt: '2026-02-14T00:00:00Z', updatedAt: '2026-02-16T00:00:00Z' },
  { id: 't015', title: 'Stress & HRV Correlation', description: 'Correlate HRV data with work schedule. Identify optimal days for high-stakes decisions.', agentId: 'maya', column: 'backlog', priority: 'medium', createdAt: '2026-02-18T00:00:00Z', updatedAt: '2026-02-18T00:00:00Z' },

  // LIAM — Legal & Compliance
  { id: 't016', title: 'SaaS Agreement Review', description: 'Review vendor contracts for auto-renewal clauses, liability caps, and data processing terms.', agentId: 'liam', column: 'inprogress', priority: 'high', createdAt: '2026-02-12T00:00:00Z', updatedAt: '2026-02-18T00:00:00Z' },
  { id: 't017', title: 'Privacy Policy Update', description: 'Update privacy policy for GDPR + CCPA compliance. Ensure agent data handling is documented.', agentId: 'liam', column: 'review', priority: 'critical', createdAt: '2026-02-10T00:00:00Z', updatedAt: '2026-02-17T00:00:00Z' },
  { id: 't018', title: 'IP Protection Filing', description: 'Document agent system architecture for potential patent review. Consult IP attorney.', agentId: 'liam', column: 'backlog', priority: 'medium', createdAt: '2026-02-16T00:00:00Z', updatedAt: '2026-02-16T00:00:00Z' },
  { id: 't019', title: 'Terms of Service Draft', description: 'Draft ToS for Grace Agent System if exposed as a service. Cover liability, usage limits.', agentId: 'liam', column: 'backlog', priority: 'medium', createdAt: '2026-02-17T00:00:00Z', updatedAt: '2026-02-17T00:00:00Z' },
  { id: 't020', title: 'KYC/AML Check Protocol', description: 'Design compliance flow for any financial operations. Ensure trading agent operations are compliant.', agentId: 'liam', column: 'done', priority: 'high', createdAt: '2026-02-05T00:00:00Z', updatedAt: '2026-02-11T00:00:00Z' },

  // NINA — Trading & Crypto
  { id: 't021', title: 'BTC/ETH Position Review', description: 'Assess current crypto holdings vs market conditions. Evaluate DCA strategy for Q1 2026.', agentId: 'nina', column: 'done', priority: 'high', createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-06T00:00:00Z' },
  { id: 't022', title: 'Trading Bot Setup', description: 'Configure algorithmic trading bot with risk limits. Paper trade for 2 weeks before going live.', agentId: 'nina', column: 'inprogress', priority: 'critical', createdAt: '2026-02-10T00:00:00Z', updatedAt: '2026-02-18T00:00:00Z' },
  { id: 't023', title: 'Market Sentiment Dashboard', description: 'Aggregate fear/greed index, on-chain metrics, social sentiment for daily briefing.', agentId: 'nina', column: 'review', priority: 'high', createdAt: '2026-02-13T00:00:00Z', updatedAt: '2026-02-17T00:00:00Z' },
  { id: 't024', title: 'DeFi Yield Optimization', description: 'Scan top DeFi protocols for yield farming opportunities. Calculate net APY after gas costs.', agentId: 'nina', column: 'backlog', priority: 'medium', createdAt: '2026-02-15T00:00:00Z', updatedAt: '2026-02-15T00:00:00Z' },
  { id: 't025', title: 'Options Strategy Research', description: 'Research covered call strategy on existing ETH holdings. Model scenarios and breakevens.', agentId: 'nina', column: 'backlog', priority: 'medium', createdAt: '2026-02-17T00:00:00Z', updatedAt: '2026-02-17T00:00:00Z' },

  // IVAN — Security & Risk
  { id: 't026', title: 'Infrastructure Security Audit', description: 'Audit all cloud resources, IAM policies, open ports. Generate security score report.', agentId: 'ivan', column: 'done', priority: 'critical', createdAt: '2026-02-03T00:00:00Z', updatedAt: '2026-02-09T00:00:00Z' },
  { id: 't027', title: 'API Key Rotation', description: 'Rotate all production API keys. Update secrets in vault. Verify zero downtime rotation.', agentId: 'ivan', column: 'inprogress', priority: 'high', createdAt: '2026-02-15T00:00:00Z', updatedAt: '2026-02-18T00:00:00Z' },
  { id: 't028', title: 'Threat Intelligence Feed', description: 'Set up automated threat intel aggregation. Alert on IOCs matching our infrastructure.', agentId: 'ivan', column: 'review', priority: 'high', createdAt: '2026-02-11T00:00:00Z', updatedAt: '2026-02-16T00:00:00Z' },
  { id: 't029', title: 'Incident Response Playbook', description: 'Document step-by-step playbook for breach scenarios. Define communication trees.', agentId: 'ivan', column: 'backlog', priority: 'medium', createdAt: '2026-02-16T00:00:00Z', updatedAt: '2026-02-16T00:00:00Z' },
  { id: 't030', title: 'Zero-Trust Network Design', description: 'Design zero-trust architecture for agent system. Micro-segmentation and identity verification.', agentId: 'ivan', column: 'backlog', priority: 'high', createdAt: '2026-02-17T00:00:00Z', updatedAt: '2026-02-17T00:00:00Z' },

  // SOFIA — Engineering
  { id: 't031', title: 'CI/CD Pipeline Setup', description: 'Build GitHub Actions pipeline for automated testing, linting, and deployment of agent code.', agentId: 'sofia', column: 'done', priority: 'high', createdAt: '2026-02-02T00:00:00Z', updatedAt: '2026-02-08T00:00:00Z' },
  { id: 't032', title: 'Agent Runtime Containerization', description: 'Dockerize all agents. Create docker-compose for local dev. Push images to ECR.', agentId: 'sofia', column: 'inprogress', priority: 'critical', createdAt: '2026-02-12T00:00:00Z', updatedAt: '2026-02-18T00:00:00Z' },
  { id: 't033', title: 'Observability Stack', description: 'Set up Prometheus + Grafana for agent metrics. Custom dashboards for response times and errors.', agentId: 'sofia', column: 'review', priority: 'high', createdAt: '2026-02-10T00:00:00Z', updatedAt: '2026-02-15T00:00:00Z' },
  { id: 't034', title: 'Database Schema Design', description: 'Design PostgreSQL schema for agent state, conversation history, and task tracking.', agentId: 'sofia', column: 'done', priority: 'high', createdAt: '2026-02-05T00:00:00Z', updatedAt: '2026-02-10T00:00:00Z' },
  { id: 't035', title: 'WebSocket Event Bus', description: 'Implement real-time event bus for agent coordination. Replace polling with push notifications.', agentId: 'sofia', column: 'backlog', priority: 'high', createdAt: '2026-02-17T00:00:00Z', updatedAt: '2026-02-17T00:00:00Z' },

  // MASON — Marketing & Growth
  { id: 't036', title: 'Brand Identity System', description: 'Define visual identity for Grace Agent System. Logo, color palette, typography, voice guide.', agentId: 'mason', column: 'done', priority: 'high', createdAt: '2026-02-04T00:00:00Z', updatedAt: '2026-02-10T00:00:00Z' },
  { id: 't037', title: 'GitHub Presence Buildout', description: 'Optimize repo README, add agent GIFs, create compelling social preview images.', agentId: 'mason', column: 'inprogress', priority: 'medium', createdAt: '2026-02-14T00:00:00Z', updatedAt: '2026-02-18T00:00:00Z' },
  { id: 't038', title: 'Twitter/X Launch Campaign', description: 'Plan launch thread showcasing each agent\'s capabilities. Schedule posts for max engagement.', agentId: 'mason', column: 'review', priority: 'high', createdAt: '2026-02-12T00:00:00Z', updatedAt: '2026-02-16T00:00:00Z' },
  { id: 't039', title: 'Hacker News Submission', description: 'Craft "Show HN" post for the agent system. Prepare demo video and documentation.', agentId: 'mason', column: 'backlog', priority: 'medium', createdAt: '2026-02-16T00:00:00Z', updatedAt: '2026-02-16T00:00:00Z' },
  { id: 't040', title: 'Community Building', description: 'Set up Discord server for Grace Agent System community. Define channels and moderation rules.', agentId: 'mason', column: 'backlog', priority: 'low', createdAt: '2026-02-18T00:00:00Z', updatedAt: '2026-02-18T00:00:00Z' }
];

// ---- Task Management ----

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load tasks from localStorage:', e);
  }
  // Seed with default tasks
  saveTasks(SEED_TASKS);
  return JSON.parse(JSON.stringify(SEED_TASKS));
}

function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn('Failed to save tasks:', e);
  }
}

function getTasksByAgent(tasks, agentId) {
  return tasks.filter(t => t.agentId === agentId);
}

function getTasksByColumn(tasks, column) {
  return tasks.filter(t => t.column === column);
}

function getTaskStats(tasks) {
  const stats = { backlog: 0, inprogress: 0, review: 0, done: 0, total: tasks.length };
  tasks.forEach(t => { if (stats.hasOwnProperty(t.column)) stats[t.column]++; });
  return stats;
}

function createTask({ title, description, agentId, column = 'backlog', priority = 'medium' }) {
  return {
    id: 't' + Date.now() + Math.random().toString(36).substr(2, 4),
    title,
    description,
    agentId,
    column,
    priority,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function updateTask(tasks, id, changes) {
  return tasks.map(t => t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t);
}

function deleteTask(tasks, id) {
  return tasks.filter(t => t.id !== id);
}

function moveTask(tasks, id, newColumn) {
  return updateTask(tasks, id, { column: newColumn });
}

function resetTasks() {
  localStorage.removeItem(STORAGE_KEY);
  return JSON.parse(JSON.stringify(SEED_TASKS));
}
