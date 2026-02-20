// ============================================================
// GRACE COMMAND CENTER — Task Management
// ============================================================

class TaskManager {
  constructor() {
    this.tasks = [];
    this.nextId = 1;
    this.subscribers = [];

    // Try to load from localStorage
    const saved = localStorage.getItem('grace-tasks-v3');
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
    localStorage.setItem('grace-tasks-v3', JSON.stringify({
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
    // Sample tasks with time/cost tracking
    [
      {
        title: 'Implement Security Protocol A-7',
        description: 'Advanced threat detection and response system.',
        agentId: 'ivan',
        column: 'inprogress',
        priority: 'critical',
        timeEstimated: 12,
        timeSpent: 8,
        tokenCost: 25000,
        modelCost: 0.15,
        modelUsed: 'claude-sonnet-4.6'
      },
      {
        title: 'Design New Interface Components',
        description: 'Modernized UI elements with cyberpunk aesthetic.',
        agentId: 'nina',
        column: 'review',
        priority: 'high',
        timeEstimated: 6,
        timeSpent: 5.5,
        tokenCost: 18000,
        modelCost: 0.12,
        modelUsed: 'claude-sonnet-4.6'
      },
      {
        title: 'Research Quantum Algorithms',
        description: 'Performance optimization via quantum computing.',
        agentId: 'maya',
        column: 'backlog',
        priority: 'medium',
        timeEstimated: 20,
        timeSpent: 0,
        tokenCost: 0,
        modelCost: 0,
        modelUsed: 'claude-sonnet-4.6'
      },
      {
        title: 'System Architecture Review',
        description: 'Quarterly review of core systems.',
        agentId: 'liam',
        column: 'done',
        priority: 'high',
        timeEstimated: 8,
        timeSpent: 10,
        tokenCost: 45000,
        modelCost: 0.28,
        modelUsed: 'claude-sonnet-4.6'
      }
      // Add more seed tasks as needed
    ].forEach(t => this.addTask(t));
  }

  resetToSeed() {
    this.tasks = [];
    this.nextId = 1;
    this.loadSeedData();
  }
}