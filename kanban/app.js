// ============================================================
// GRACE COMMAND CENTER — Main Application
// ============================================================

class GraceKanban {
  constructor() {
    this.tasks = [];
    this.currentView = '3d';
    this.selectedAgentId = null;
    this.scene = null;
    this.ui = null;

    this._init();
  }

  _init() {
    // Load tasks
    this.tasks = loadTasks();

    // Init UI
    this.ui = new KanbanUI(this);

    // Init 3D scene
    const canvas = document.getElementById('kanban-canvas');
    if (canvas) {
      this.scene = new KanbanScene(canvas);
      this.scene.buildAgentPanels(AGENTS);
      this.scene.buildAgentLabels(AGENTS);
      this.scene.onAgentClick = (agentId) => this.onAgentClick(agentId);

      // Populate initial task cards in 3D
      AGENTS.forEach(agent => {
        const agentTasks = this.tasks.filter(t => t.agentId === agent.id);
        this.scene.updateAgentTasks(agent.id, agentTasks);
      });
    }

    // Update HUD and agent count
    this.ui.updateHUD(getTaskStats(this.tasks));
    this.ui.updateAgentCount(AGENTS.length);

    // Start scanline animation
    this._animateScanline();

    // Show welcome flash
    setTimeout(() => {
      this.ui.showToast('⚡ GRACE COMMAND CENTER ONLINE', 'success');
    }, 800);

    console.log('%c⚡ GRACE KANBAN INITIALIZED', 'color: #00fff0; font-size: 16px; font-weight: bold;');
    console.log(`%c${AGENTS.length} agents loaded. ${this.tasks.length} tasks tracked.`, 'color: #f472b6;');
  }

  // ---- Task Operations ----

  addTask(data) {
    const task = createTask(data);
    this.tasks.push(task);
    saveTasks(this.tasks);
    this._refresh();
    this.ui.showToast(`✦ Task added: ${task.title}`, 'success');
  }

  editTask(id, changes) {
    this.tasks = updateTask(this.tasks, id, changes);
    saveTasks(this.tasks);
    this._refresh();
    this.ui.showToast('✎ Task updated', 'info');
  }

  deleteTaskById(id) {
    this.tasks = deleteTask(this.tasks, id);
    saveTasks(this.tasks);
    this._refresh();
    this.ui.showToast('✕ Task deleted', 'warn');
  }

  moveTask(id, newColumn, newAgentId) {
    const changes = { column: newColumn };
    if (newAgentId) changes.agentId = newAgentId;
    this.tasks = updateTask(this.tasks, id, changes);
    saveTasks(this.tasks);
    this._refresh();
  }

  resetData() {
    this.tasks = resetTasks();
    this._refresh();
    this.ui.showToast('◈ Tasks reset to default', 'info');
  }

  _refresh() {
    // Update 3D scene
    if (this.scene) {
      AGENTS.forEach(agent => {
        const agentTasks = this.tasks.filter(t => t.agentId === agent.id);
        this.scene.updateAgentTasks(agent.id, agentTasks);
      });
    }

    // Update flat view if visible
    if (this.currentView === '2d') {
      this.ui.renderFlatView(this.tasks);
    }

    // Update HUD
    this.ui.updateHUD(getTaskStats(this.tasks));

    // Refresh sidebar if open
    if (this.selectedAgentId) {
      const agent = AGENTS.find(a => a.id === this.selectedAgentId);
      if (agent) this.ui.showAgentSidebar(agent, this.tasks);
    }
  }

  // ---- View Management ----

  setView(view) {
    this.currentView = view;
    const scene3d = document.getElementById('scene-3d');
    const flatView = document.getElementById('flat-view-wrapper');
    const btn3d = document.getElementById('toggle-3d');
    const btn2d = document.getElementById('toggle-2d');

    if (view === '3d') {
      scene3d && (scene3d.style.display = 'block');
      flatView && (flatView.style.display = 'none');
      btn3d && btn3d.classList.add('active');
      btn2d && btn2d.classList.remove('active');
    } else {
      scene3d && (scene3d.style.display = 'none');
      flatView && (flatView.style.display = 'flex');
      btn3d && btn3d.classList.remove('active');
      btn2d && btn2d.classList.add('active');
      this.ui.renderFlatView(this.tasks);
    }
  }

  resetView() {
    this.selectedAgentId = null;
    if (this.scene) this.scene.resetView();
    this.ui.hideAgentSidebar && this.ui.hideAgentSidebar();
  }

  // ---- Agent Interaction ----

  onAgentClick(agentId) {
    if (!agentId || agentId === this.selectedAgentId) {
      // Deselect
      this.selectedAgentId = null;
      if (this.scene) this.scene.resetView();
      this.ui.hideAgentSidebar();
      return;
    }

    this.selectedAgentId = agentId;
    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) return;

    if (this.scene) this.scene.zoomToAgent(agentId);
    this.ui.showAgentSidebar(agent, this.tasks);
  }

  // ---- Scanline CRT effect ----
  _animateScanline() {
    const scanline = document.getElementById('scanline');
    if (!scanline) return;
    let y = 0;
    const animate = () => {
      y = (y + 0.5) % 100;
      scanline.style.backgroundPositionY = y + 'px';
      requestAnimationFrame(animate);
    };
    animate();
  }
}

// ---- Boot ----
window.addEventListener('DOMContentLoaded', () => {
  // Small boot delay for dramatic effect
  const loader = document.getElementById('boot-loader');
  if (loader) {
    let dots = 0;
    const loaderText = document.getElementById('loader-text');
    const bootInterval = setInterval(() => {
      if (loaderText) {
        const msgs = [
          'INITIALIZING NEURAL LINK',
          'LOADING AGENT PROTOCOLS',
          'SYNCING COMMAND CENTER',
          'ESTABLISHING UPLINK',
          'GRACE COMMAND CENTER ONLINE'
        ];
        loaderText.textContent = msgs[Math.min(dots, msgs.length - 1)];
        dots++;
      }
    }, 300);

    setTimeout(() => {
      clearInterval(bootInterval);
      loader.classList.add('fade-out');
      setTimeout(() => {
        loader.style.display = 'none';
        window.graceApp = new GraceKanban();
      }, 600);
    }, 1800);
  } else {
    window.graceApp = new GraceKanban();
  }
});
