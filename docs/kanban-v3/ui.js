// ============================================================
// GRACE COMMAND CENTER — UI Interactions (v2)
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

    // Close on backdrop
    this.modal && this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    // Form submit
    this.modalForm && this.modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleFormSubmit();
    });

    // Cancel btn
    document.getElementById('modal-cancel') &&
      document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    // Auto-update model when agent changes
    document.getElementById('task-agent')?.addEventListener('change', (e) => {
      const agentId = e.target.value;
      const agent = AGENTS.find(a => a.id === agentId);
      if (agent && document.getElementById('task-model')) {
        document.getElementById('task-model').value = agent.model;
      }
    });
  }

  openModal(taskId = null, defaults = {}) {
    this.editingTaskId = taskId;
    const task = taskId ? this.app.taskManager.tasks.find(t => t.id === taskId) : null;

    this.modalTitle.textContent = task ? '◈ EDIT TASK' : '◈ NEW TASK';

    // Populate agent dropdown
    const agentSel = document.getElementById('task-agent');
    if (agentSel) {
      agentSel.innerHTML = AGENTS.map(a =>
        `<option value="${a.id}" ${(task?.agentId || defaults.agentId) === a.id ? 'selected' : ''}>
           ${a.emoji} ${a.name} — ${a.role} [${a.model}]
         </option>`
      ).join('');
    }

    // Populate column dropdown
    const colSel = document.getElementById('task-column');
    if (colSel) {
      colSel.innerHTML = COLUMNS.map(c =>
        `<option value="${c.id}" ${(task?.column || defaults.column || 'backlog') === c.id ? 'selected' : ''}>
           ${c.icon} ${c.label}
         </option>`
      ).join('');
    }

    // Populate priority dropdown
    const priSel = document.getElementById('task-priority');
    if (priSel) {
      priSel.innerHTML = Object.entries(PRIORITIES).map(([k, v]) =>
        `<option value="${k}" ${(task?.priority || 'medium') === k ? 'selected' : ''}>
           ${v.label}
         </option>`
      ).join('');
    }

    // Fill values
    document.getElementById('task-title').value = task?.title || '';
    document.getElementById('task-desc').value = task?.description || '';
    document.getElementById('task-time-est').value = task?.timeEstimated || '';
    document.getElementById('task-time-spent').value = task?.timeSpent || '';
    document.getElementById('task-model').value = task?.modelUsed || defaults?.model || AGENTS[0].model;
    document.getElementById('task-tokens').value = task?.tokenCost || '';
    document.getElementById('task-cost').value = task?.modelCost || '';

    this.modal.classList.add('active');
    document.getElementById('task-title').focus();
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
      document.getElementById('task-title').classList.add('error');
      return;
    }

    if (this.editingTaskId) {
      this.app.editTask(this.editingTaskId, formData);
    } else {
      this.app.addTask(formData);
    }

    this.closeModal();
  }

  // ---- Stats HUD ----
  updateHUD(stats, costTotals) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    // Task counts
    set('hud-total', stats.total);
    set('hud-backlog', stats.backlog);
    set('hud-inprogress', stats.inprogress);
    set('hud-review', stats.review);
    set('hud-done', stats.done);

    // Cost totals
    set('hud-total-hours', costTotals.totalHours.toFixed(1) + 'h');
    set('hud-total-cost', '$' + costTotals.totalCost.toFixed(2));

    // Progress bar
    const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    const bar = document.getElementById('hud-progress-fill');
    if (bar) bar.style.width = pct + '%';
    set('hud-pct', pct + '%');
  }

  // ---- Agent Count ----
  updateAgentCount(count) {
    const el = document.getElementById('agent-count');
    if (el) el.textContent = count;
  }

  // ---- 2D View ----
  renderFlatView(tasks) {
    const container = document.getElementById('flat-view');
    if (!container) return;
    container.innerHTML = '';

    AGENTS.forEach(agent => {
      const agentTasks = tasks.filter(t => t.agentId === agent.id);
      const card = document.createElement('div');
      card.className = 'flat-agent-card';
      card.style.setProperty('--agent-color', agent.color);

      card.innerHTML = `
        <div class="flat-agent-header">
          <span class="flat-agent-emoji">${agent.emoji}</span>
          <div>
            <div class="flat-agent-name">${agent.name}</div>
            <div class="flat-agent-role">
              ${agent.role}
              <span class="model-badge" style="
                font-size: 9px;
                color: ${agent.color}80;
                border: 1px solid ${agent.color}40;
                padding: 1px 4px;
                margin-left: 6px;
                border-radius: 2px;
              ">[${agent.model}]</span>
            </div>
          </div>
          <div class="flat-status-dot status-${agent.status}"></div>
          <button class="flat-add-btn cyber-btn-sm" data-agent="${agent.id}" title="Add Task">+</button>
        </div>
        <div class="flat-columns">
          ${COLUMNS.map(col => `
            <div class="flat-column" data-agent="${agent.id}" data-col="${col.id}">
              <div class="flat-col-header">${col.icon} ${col.label}</div>
              <div class="flat-col-tasks" id="flat-col-${agent.id}-${col.id}">
                ${agentTasks.filter(t => t.column === col.id).map(t => this._renderFlatCard(t, agent)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;

      container.appendChild(card);
    });

    // Bind interactions
    container.querySelectorAll('.flat-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const agentId = btn.dataset.agent;
        const agent = AGENTS.find(a => a.id === agentId);
        this.openModal(null, { agentId, column: 'backlog', model: agent.model });
      });
    });

    container.querySelectorAll('.flat-card-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openModal(btn.dataset.task);
      });
    });

    container.querySelectorAll('.flat-card-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this task?')) {
          this.app.deleteTaskById(btn.dataset.task);
        }
      });
    });

    this._setupDragDrop(container);
  }

  _renderFlatCard(task, agent) {
    const pri = PRIORITIES[task.priority] || PRIORITIES.medium;
    return `
      <div class="flat-card" draggable="true" data-task="${task.id}" data-agent="${task.agentId}" data-col="${task.column}"
           style="--priority-color: ${pri.color}; --agent-color: ${agent.color}">
        <div class="flat-card-priority-bar"></div>
        <div class="flat-card-body">
          <div class="flat-card-title">${this._escapeHtml(task.title)}</div>
          ${task.description ? `<div class="flat-card-desc">${this._escapeHtml(task.description.substring(0, 60))}${task.description.length > 60 ? '…' : ''}</div>` : ''}
          <div class="flat-card-meta">
            <div class="flat-card-stats">
              <span class="flat-card-pri" style="color: ${pri.color}">${pri.label}</span>
              ${task.timeSpent > 0 ? `<span class="flat-time">⏱ ${task.timeSpent}h/${task.timeEstimated}h</span>` : ''}
              ${task.modelCost > 0 ? `<span class="flat-cost">💰 $${task.modelCost.toFixed(2)}</span>` : ''}
            </div>
            <div class="flat-card-actions">
              <button class="flat-card-edit" data-task="${task.id}" title="Edit">✎</button>
              <button class="flat-card-del" data-task="${task.id}" title="Delete">✕</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _setupDragDrop(container) {
    let draggedTask = null;

    container.querySelectorAll('.flat-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        draggedTask = {
          id: card.dataset.task,
          agentId: card.dataset.agent,
          column: card.dataset.col
        };
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        container.querySelectorAll('.flat-col-tasks').forEach(el => el.classList.remove('drop-target'));
      });
    });

    container.querySelectorAll('.flat-col-tasks').forEach(colEl => {
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

        // Parse new column and agent from element id: flat-col-{agentId}-{colId}
        const id = colEl.id; // e.g. flat-col-grace-backlog
        const parts = id.replace('flat-col-', '').split('-');
        const newCol = parts[parts.length - 1];
        const newAgent = parts.slice(0, -1).join('-');

        this.app.moveTask(draggedTask.id, newCol, newAgent);
        draggedTask = null;
      });
    });
  }

  // ---- Event Listeners ----
  _setupEventListeners() {
    // View toggle
    const toggle3D = document.getElementById('toggle-3d');
    const toggle2D = document.getElementById('toggle-2d');
    if (toggle3D) toggle3D.addEventListener('click', () => this.app.setView('3d'));
    if (toggle2D) toggle2D.addEventListener('click', () => this.app.setView('2d'));

    // Add task button
    const addBtn = document.getElementById('add-task-btn');
    if (addBtn) addBtn.addEventListener('click', () => this.openModal());

    // Reset view
    const resetBtn = document.getElementById('reset-view-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => this.app.resetView());

    // Reset data
    const resetDataBtn = document.getElementById('reset-data-btn');
    if (resetDataBtn) resetDataBtn.addEventListener('click', () => {
      if (confirm('Reset all tasks to default seed data?')) {
        this.app.resetData();
      }
    });
  }

  // ---- Agent Panel Sidebar ----
  showAgentSidebar(agent, tasks) {
    const sidebar = document.getElementById('agent-sidebar');
    if (!sidebar) return;

    const agentTasks = tasks.filter(t => t.agentId === agent.id);
    const stats = { backlog: 0, inprogress: 0, review: 0, done: 0 };
    agentTasks.forEach(t => { if (stats[t.column] !== undefined) stats[t.column]++; });

    sidebar.innerHTML = `
      <div class="sidebar-header" style="border-top-color: ${agent.color}">
        <span class="sidebar-emoji">${agent.emoji}</span>
        <div>
          <div class="sidebar-name" style="color: ${agent.color}">${agent.name}</div>
          <div class="sidebar-role">
            ${agent.role}
            <span style="font-size:9px; color:${agent.color}80; border:1px solid ${agent.color}40; padding:1px 4px; margin-left:6px; border-radius:2px;">[${agent.model}]</span>
          </div>
        </div>
        <div class="sidebar-status">
          <span class="status-dot-sidebar status-${agent.status}"></span>
          ${agent.status.toUpperCase()}
        </div>
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
                  <div class="sidebar-task-item" data-task="${t.id}">
                    <div class="sidebar-task-pri-dot" style="background: ${pri.color}"></div>
                    <div class="sidebar-task-body">
                      <div class="sidebar-task-title">${this._escapeHtml(t.title)}</div>
                      ${t.description ? `<div class="sidebar-task-desc">${this._escapeHtml(t.description.substring(0, 60))}…</div>` : ''}
                      ${(t.timeSpent > 0 || t.modelCost > 0) ? `<div class="sidebar-task-desc" style="margin-top:3px">
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
      <button class="cyber-btn sidebar-add-btn" data-agent="${agent.id}">+ ADD TASK</button>
    `;

    sidebar.classList.add('active');

    document.getElementById('sidebar-close') &&
      document.getElementById('sidebar-close').addEventListener('click', () => {
        this.hideAgentSidebar();
        this.app.resetView();
      });

    sidebar.querySelector('.sidebar-add-btn') &&
      sidebar.querySelector('.sidebar-add-btn').addEventListener('click', () => {
        this.openModal(null, { agentId: agent.id });
      });

    sidebar.querySelectorAll('.sidebar-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); this.openModal(btn.dataset.task); });
    });
    sidebar.querySelectorAll('.sidebar-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this task?')) this.app.deleteTaskById(btn.dataset.task);
      });
    });
  }

  hideAgentSidebar() {
    const sidebar = document.getElementById('agent-sidebar');
    if (sidebar) sidebar.classList.remove('active');
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
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}