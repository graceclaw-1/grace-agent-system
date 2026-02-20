// ============================================================
// GRACE COMMAND CENTER — Task Management
// ============================================================

class TaskManager {
  constructor() {
    this.tasks = [];
    this.nextId = 1;
    this.subscribers = [];

    // Try to load from localStorage
    const saved = localStorage.getItem('grace-tasks-v4');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.tasks = data.tasks || [];
        this.nextId = data.nextId || 1;
      } catch (e) {
        console.error('Failed to load tasks:', e);
        this.loadSeedData();
      }
    } else {
      this.loadSeedData();
    }
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    callback(this.tasks); // Initial call
  }

  notify() {
    this.subscribers.forEach(cb => cb(this.tasks));
    localStorage.setItem('grace-tasks-v4', JSON.stringify({
      tasks: this.tasks,
      nextId: this.nextId
    }));
  }

  addTask({ title, description = '', agentId, column = 'backlog', priority = 'medium',
            timeEstimated = 0, timeSpent = 0, tokenCost = 0, modelCost = 0, modelUsed = '' }) {
    const task = {
      id: this.nextId++,
      title,
      description,
      agentId,
      column,
      priority,
      timeEstimated,
      timeSpent,
      tokenCost,
      modelCost,
      modelUsed,
      created: Date.now()
    };
    this.tasks.push(task);
    this.notify();
    return task;
  }

  editTask(id, updates) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return false;
    Object.assign(task, updates);
    task.updated = Date.now();
    this.notify();
    return true;
  }

  deleteTask(id) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.tasks.splice(idx, 1);
    this.notify();
    return true;
  }

  moveTask(id, toColumn, toAgentId = null) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return false;
    task.column = toColumn;
    if (toAgentId) task.agentId = toAgentId;
    task.updated = Date.now();
    this.notify();
    return true;
  }

  getTasksByAgent(agentId) {
    return this.tasks.filter(t => t.agentId === agentId);
  }

  getStats() {
    const stats = { total: 0, backlog: 0, inprogress: 0, review: 0, done: 0 };
    this.tasks.forEach(t => {
      stats.total++;
      if (stats[t.column] !== undefined) stats[t.column]++;
    });
    return stats;
  }

  getCostTotals() {
    return this.tasks.reduce((acc, task) => {
      acc.totalHours += task.timeSpent || 0;
      acc.totalCost += task.modelCost || 0;
      return acc;
    }, { totalHours: 0, totalCost: 0 });
  }

  loadSeedData() {
    // Initial tasks for each agent
    [
      {
        title: 'Coordinate Weekly Strategy Review',
        description: 'Prepare and lead multi-agent sync meeting.',
        agentId: 'grace',
        column: 'inprogress',
        priority: 'high',
        timeEstimated: 4,
        timeSpent: 2,
        modelUsed: 'claude-sonnet-4.6'
      },
      {
        title: 'Portfolio Rebalancing Analysis',
        description: 'Q1 investment allocation adjustment.',
        agentId: 'peter',
        column: 'review',
        priority: 'critical',
        timeEstimated: 8,
        timeSpent: 7.5,
        modelUsed: 'claude-sonnet-4.6'
      },
      {
        title: 'Wellness Program Development',
        description: 'Holistic health optimization strategy.',
        agentId: 'dr-maya',
        column: 'inprogress',
        priority: 'medium',
        timeEstimated: 12,
        timeSpent: 4,
        modelUsed: 'claude-sonnet-4.6'
      },
      {
        title: 'Contract Template Updates',
        description: 'Revise standard agreements with new clauses.',
        agentId: 'liam',
        column: 'backlog',
        priority: 'high',
        timeEstimated: 6,
        modelUsed: 'claude-sonnet-4.6'
      },
      {
        title: 'Market Analysis Report',
        description: 'Weekly market trends and opportunities.',
        agentId: 'nina',
        column: 'inprogress',
        priority: 'high',
        timeEstimated: 5,
        timeSpent: 3,
        modelUsed: 'claude-sonnet-4.6'
      },
      {
        title: 'Security Audit Review',
        description: 'Quarterly security assessment.',
        agentId: 'ivan',
        column: 'review',
        priority: 'critical',
        timeEstimated: 10,
        timeSpent: 8,
        modelUsed: 'claude-sonnet-4.6'
      },
      {
        title: 'Agent System Architecture',
        description: 'Design next-gen interaction framework.',
        agentId: 'sofia',
        column: 'inprogress',
        priority: 'high',
        timeEstimated: 15,
        timeSpent: 6,
        modelUsed: 'claude-sonnet-4.6'
      },
      {
        title: 'Growth Strategy Planning',
        description: 'Q2 marketing and expansion roadmap.',
        agentId: 'mason',
        column: 'backlog',
        priority: 'medium',
        timeEstimated: 8,
        modelUsed: 'claude-sonnet-4.6'
      }
    ].forEach(t => this.addTask(t));
  }

  resetToSeed() {
    this.tasks = [];
    this.nextId = 1;
    this.loadSeedData();
  }
}