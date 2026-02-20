// ============================================================
// GRACE COMMAND CENTER — UI Interactions (v4)
// ============================================================

class KanbanUI {
  constructor(app) {
    this.app = app;
    this._setupModal();
    this._setupClock();
    this._setupEventListeners();
  }

  // ---- Clock ----
  _setupClock() {
    this._updateClock();
    setInterval(() => this._updateClock(), 1000);
  }

  _updateClock() {
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    const el = document.getElementById('clock');
    if (el) el.textContent = `${hh}:${mm}:${ss} UTC`;
  }

  // ---- Modal ----
  _setupModal() {
    this.modal = document.getElementById('task-modal');
    this.modalForm = document.getElementById('task-form');
    this.modalTitle = document.getElementById('modal-title');
    this.editingTaskId = null;

    this.modal && this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    this.modalForm && this.modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleFormSubmit();
    });

    document.getElementById('modal-cancel') &&
      document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    document.getElementById('task-agent')?.addEventListener('change', (e) => {
      const agent = AGENTS.find(a => a.id === e.target.value);
      if (agent && document.getElementById('task-model')) {
        document.getElementById('task-model').value = agent.model;
      }
    });
  }

  openModal(taskId = null, defaults = {}) {
    this.editingTaskId = taskId;
    const task = taskId ? this.app.taskManager.tasks.find(t => t.id === parseInt(taskId)) : null;

    this.modalTitle.textContent = task ? '◈ EDIT TASK' : '◈ NEW TASK';

    const agentSel = document.getElementById('task-agent');
    if (agentSel) {
      agentSel.innerHTML = AGENTS.map(a =>
        `<option value="${a.id}" ${(task?.agentId || defaults.agentId) === a.id ? 'selected' : ''}>
           ${a.emoji} ${a.name} — ${a.role}
         </option>`
      ).join('');
    }

    const colSel = document.getElementById('task-column');
    if (colSel) {
      colSel.innerHTML = COLUMNS.map(c =>
        `<option value="${c.id}" ${(task?.column || defaults.column || 'backlog') === c.id ? 'selected' : ''}>
           ${c.icon} ${c.label}
         </option>`
      ).join('');
    }

    const priSel = document.getElementById('task-priority');
    if (priSel) {
      priSel.innerHTML = Object.entries(PRIORITIES).map(([k, v]) =>
        `<option value="${k}" ${(task?.priority || 'medium') === k ? 'selected' : ''}>
           ${v.label}
         </option>`
      ).join('');
    }

    document.getElementById('task-title').value = task?.title || '';
    document.getElementById('task-desc').value = task?.description || '';
    document.getElementById('task-time-est').value = task?.timeEstimated || '';
    document.getElementById('task-time-spent').value = task?.timeSpent || '';
    document.getElementById('task-model').value = task?.modelUsed || defaults?.model || AGENTS[0].model;
    document.getElementById('task-tokens').value = task?.tokenCost || '';
    document.getElementById('task-cost').value = task?.modelCost || '';

    this.modal.classList.add('active');
    setTimeout(() => document.getElementById('task-title')?.focus(), 100);
  }

  closeModal() {
    this.modal && this.modal.classList.remove('active');
    this.editingTaskId = null;
  }

  _handleFormSubmit() {
    const formData = {
      title: document.getElementById('task-title').value.trim(),
      description: document.getElementById('task-desc').value.trim(),
      agentId: document.getElementById('task-agent').value,
      column: document.getElementById('task-column').value,
      priority: document.getElementById('task-priority').value,
      timeEstimated: parseFloat(document.getElementById('task-time-est').value) || 0,
      timeSpent: parseFloat(document.getElementById('task-time-spent').value) || 0,
      modelUsed: document.getElementById('task-model').value,
      tokenCost: parseInt(document.getElementById('task-tokens').value, 10) || 0,
      modelCost: parseFloat(document.getElementById('task-cost').value) || 0
    };

    if (!formData.title) {
      document.getElementById('task-title').focus();
      return;
    }

    if (this.editingTaskId) {
      this.app.editTask(this.editingTaskId, formData);
    } else {
      this.app.addTask(formData);
    }

    this.closeModal();
  }

  // ---- HUD ----
  updateHUD(stats, costTotals) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('hud-total', stats.total);
    set('hud-backlog', stats.backlog);
    set('hud-inprogress', stats.inprogress);
    set('hud-review', stats.review);
    set('hud-done', stats.done);
    set('hud-total-hours', costTotals.totalHours.toFixed(1) + 'h');
    set('hud-total-cost', '$' + costTotals.totalCost.toFixed(2));

    const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    const bar = document.getElementById('hud-progress-fill');
    if (bar) bar.style.width = pct + '%';
    set('hud-pct', pct + '%');
  }

  updateAgentCount(count) {
    const el = document.getElementById('agent-count');
    if (el) el.textContent = count;
  }

  // ---- 2D Agile Kanban Board ----
  renderFlatView(tasks) {
    const container = document.getElementById('kanban-lanes');
    if (!container) return;
    container.innerHTML = '';

    AGENTS.forEach(agent => {
      const agentTasks = tasks.filter(t => t.agentId === agent.id);

      const lane = document.createElement('div');
      lane.className = 'board-lane';
      lane.style.setProperty('--agent-color', agent.color);

      // Lane info (left sidebar)
      const info = document.createElement('div');
      info.className = 'lane-info';
      info.style.borderLeftColor = agent.color;
      info.innerHTML = `
        <div class="lane-agent">
          <span class="lane-emoji">${agent.emoji}</span>
          <span class="lane-name" style="color: ${agent.color}; text-shadow: 0 0 10px ${agent.color}60">${agent.name}</span>
          <span class="lane-status status-${agent.status}"></span>
        </div>
        <div class="lane-role">${agent.role}</div>
        <div class="lane-model" style="color: ${agent.color}60">[${agent.model}]</div>
        <button class="lane-add-btn cyber-btn-sm" data-agent="${agent.id}" title="Add task to ${agent.name}">+</button>
      `;
      lane.appendChild(info);

      // Task columns
      const cols = document.createElement('div');
      cols.className = 'lane-columns';

      COLUMNS.forEach(col => {
        const colEl = document.createElement('div');
        colEl.className = 'lane-column';
        colEl.dataset.agent = agent.id;
        colEl.dataset.col = col.id;

        const colTasks = agentTasks.filter(t => t.column === col.id);

        const tasksEl = document.createElement('div');
        tasksEl.className = 'lane-col-tasks';
        tasksEl.id = `lane-col-${agent.id}-${col.id}`;

        colTasks.forEach(task => {
          tasksEl.appendChild(this._makeTaskCard(task, agent));
        });

        colEl.appendChild(tasksEl);
        cols.appendChild(colEl);
      });

      lane.appendChild(cols);
      container.appendChild(lane);
    });

    // Bind add-task buttons
    container.querySelectorAll('.lane-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const agentId = btn.dataset.agent;
        const agent = AGENTS.find(a => a.id === agentId);
        this.openModal(null, { agentId, column: 'backlog', model: agent?.model });
      });
    });

    this._setupDragDrop(container);
    this._bindCardButtons(container);
  }

  _makeTaskCard(task, agent) {
    const pri = PRIORITIES[task.priority] || PRIORITIES.medium;
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.task = task.id;
    card.dataset.agent = task.agentId;
    card.dataset.col = task.column;
    card.style.setProperty('--agent-color', agent.color);
    card.style.setProperty('--priority-color', pri.color);

    card.innerHTML = `
      <div class="task-card-priority-bar" style="background: ${pri.color}; box-shadow: 0 0 8px ${pri.color}80"></div>
      <div class="task-title">${this._escapeHtml(task.title)}</div>
      ${task.description ? `<div class="task-desc">${this._escapeHtml(task.description.substring(0, 70))}${task.description.length > 70 ? '…' : ''}</div>` : ''}
      <div class="task-meta">
        <span class="task-priority" style="color: ${pri.color}">${pri.label}</span>
        <span class="task-stats">
          ${task.timeSpent > 0 ? `<span>⏱ ${task.timeSpent}h</span>` : ''}
          ${task.modelCost > 0 ? `<span>💰 $${task.modelCost.toFixed(2)}</span>` : ''}
        </span>
      </div>
      <div class="task-actions">
        <button class="task-edit-btn" data-task="${task.id}" title="Edit">✎</button>
        <button class="task-del-btn" data-task="${task.id}" title="Delete">✕</button>
      </div>
    `;
    return card;
  }

  _bindCardButtons(container) {
    container.querySelectorAll('.task-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openModal(btn.dataset.task);
      });
    });

    container.querySelectorAll('.task-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this task?')) {
          this.app.deleteTaskById(parseInt(btn.dataset.task));
        }
      });
    });
  }

  _setupDragDrop(container) {
    let draggedTask = null;

    container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        draggedTask = { id: card.dataset.task, agentId: card.dataset.agent, column: card.dataset.col };
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        container.querySelectorAll('.lane-col-tasks').forEach(el => el.classList.remove('drop-target'));
      });
    });

    container.querySelectorAll('.lane-col-tasks').forEach(colEl => {
      colEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        colEl.classList.add('drop-target');
      });
      colEl.addEventListener('dragleave', () => colEl.classList.remove('drop-target'));
      colEl.addEventListener('drop', (e) => {
        e.preventDefault();
        colEl.classList.remove('drop-target');
        if (!draggedTask) return;

        // id format: lane-col-{agentId}-{colId}
        // agentId can have hyphens (e.g. "dr-maya"), colId is last segment
        const id = colEl.id.replace('lane-col-', '');
        const lastDash = id.lastIndexOf('-');
        const newAgent = id.slice(0, lastDash);
        const newCol = id.slice(lastDash + 1);

        this.app.moveTask(parseInt(draggedTask.id), newCol, newAgent);
        draggedTask = null;
      });
    });
  }

  // ---- Event Listeners ----
  _setupEventListeners() {
    document.getElementById('toggle-3d')?.addEventListener('click', () => this.app.setView('3d'));
    document.getElementById('toggle-2d')?.addEventListener('click', () => this.app.setView('2d'));
    document.getElementById('add-task-btn')?.addEventListener('click', () => this.openModal());
    document.getElementById('reset-view-btn')?.addEventListener('click', () => this.app.resetView());
    document.getElementById('reset-data-btn')?.addEventListener('click', () => {
      if (confirm('Reset all tasks to default seed data?')) this.app.resetData();
    });
  }

  // ---- Agent Sidebar ----
  showAgentSidebar(agent, tasks) {
    const sidebar = document.getElementById('agent-sidebar');
    if (!sidebar) return;

    const agentTasks = tasks.filter(t => t.agentId === agent.id);
    const stats = { backlog: 0, inprogress: 0, review: 0, done: 0 };
    agentTasks.forEach(t => { if (stats[t.column] !== undefined) stats[t.column]++; });

    sidebar.innerHTML = `
      <div class="sidebar-header" style="border-top: 2px solid ${agent.color}">
        <span class="sidebar-emoji">${agent.emoji}</span>
        <div>
          <div class="sidebar-name" style="color: ${agent.color}">${agent.name}</div>
          <div class="sidebar-role">${agent.role}</div>
        </div>
        <div style="font-family: var(--font-mono); font-size: 11px; color: ${agent.color}70; margin-left: auto; margin-right: 8px">[${agent.model}]</div>
        <button id="sidebar-close" class="cyber-btn-sm">✕</button>
      </div>
      <div class="sidebar-stats">
        ${COLUMNS.map(c => `
          <div class="sidebar-stat">
            <div class="sidebar-stat-num" style="color: ${agent.color}">${stats[c.id] || 0}</div>
            <div class="sidebar-stat-label">${c.label}</div>
          </div>
        `).join('')}
      </div>
      <div class="sidebar-desc">${agent.description}</div>
      <div class="sidebar-tasks">
        ${COLUMNS.map(col => {
          const colTasks = agentTasks.filter(t => t.column === col.id);
          if (colTasks.length === 0) return '';
          return `
            <div class="sidebar-col-section">
              <div class="sidebar-col-title" style="color: ${agent.color}">${col.icon} ${col.label}</div>
              ${colTasks.map(t => {
                const pri = PRIORITIES[t.priority] || PRIORITIES.medium;
                return `
                  <div class="sidebar-task-item">
                    <div class="sidebar-task-pri-dot" style="background: ${pri.color}; box-shadow: 0 0 6px ${pri.color}"></div>
                    <div class="sidebar-task-body">
                      <div class="sidebar-task-title">${this._escapeHtml(t.title)}</div>
                      ${t.description ? `<div class="sidebar-task-desc">${this._escapeHtml(t.description.substring(0, 60))}…</div>` : ''}
                      ${(t.timeSpent > 0 || t.modelCost > 0) ? `<div class="sidebar-task-desc" style="margin-top:3px; color: ${agent.color}80">
                        ${t.timeSpent > 0 ? `⏱ ${t.timeSpent}h/${t.timeEstimated}h` : ''}
                        ${t.modelCost > 0 ? `💰 $${t.modelCost.toFixed(2)}` : ''}
                      </div>` : ''}
                    </div>
                    <div class="sidebar-task-actions">
                      <button class="sidebar-edit-btn" data-task="${t.id}" title="Edit">✎</button>
                      <button class="sidebar-del-btn" data-task="${t.id}" title="Delete">✕</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('')}
      </div>
      <button class="cyber-btn sidebar-add-btn" data-agent="${agent.id}" style="margin: 12px 16px; color: ${agent.color}; border-color: ${agent.color}">+ ADD TASK</button>
    `;

    sidebar.classList.add('active');

    document.getElementById('sidebar-close')?.addEventListener('click', () => {
      this.hideAgentSidebar();
      this.app.resetView();
    });

    sidebar.querySelector('.sidebar-add-btn')?.addEventListener('click', () => {
      this.openModal(null, { agentId: agent.id });
    });

    sidebar.querySelectorAll('.sidebar-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); this.openModal(btn.dataset.task); });
    });
    sidebar.querySelectorAll('.sidebar-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this task?')) this.app.deleteTaskById(parseInt(btn.dataset.task));
      });
    });
  }

  hideAgentSidebar() {
    document.getElementById('agent-sidebar')?.classList.remove('active');
  }

  // ---- Toast ----
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
