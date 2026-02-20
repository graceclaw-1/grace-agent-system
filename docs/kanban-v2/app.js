// ============================================================
// GRACE COMMAND CENTER — Main Application
// ============================================================

class App {
  constructor() {
    this.taskManager = new TaskManager();
    this.ui = new KanbanUI(this);
    this.scene = new KanbanScene(document.getElementById('kanban-canvas'));

    // Bind scene events
    this.scene.onAgentClick = (agentId) => this._onAgentClick(agentId);

    // Subscribe to task changes
    this.taskManager.subscribe((tasks) => this._onTasksUpdate(tasks));

    // View mode (3D/2D)
    this.view = '3d';

    // Build 3D agent panels and labels
    this.scene.buildAgentPanels(AGENTS);
    this.scene.buildAgentLabels(AGENTS);

    // Start boot sequence
    this._bootSequence();
  }

  _bootSequence() {
    const loader = document.getElementById('boot-loader');
    const loaderText = document.getElementById('loader-text');
    const texts = [
      'INITIALIZING COMMAND CENTER...',
      'LOADING AGENT PROFILES...',
      'ESTABLISHING NEURAL LINKS...',
      'CALIBRATING ORBITAL RINGS...',
      'SYNCING TASK MATRIX...',
      'ACTIVATING HOLOPROJECTION...'
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < texts.length) {
        loaderText.textContent = texts[i++];
      } else {
        clearInterval(interval);
        loader.classList.add('fade-out');
        setTimeout(() => {
          loader.remove();
          // Start with cinematic camera sweep
          this.scene.orbitState.radius = 70;
          this.scene.orbitState.phi = 0.08;
          this.scene.orbitState.theta = Math.PI * 0.6;
          setTimeout(() => {
            this.scene.orbitState.targetRadius = 28;
            this.scene.orbitState.targetPhi = 0.3;
            this.scene.orbitState.targetTheta = 0;
          }, 300);
        }, 600);
      }
    }, 400);
  }

  _onTasksUpdate(tasks) {
    // Update 3D scene
    AGENTS.forEach(agent => {
      const agentTasks = tasks.filter(t => t.agentId === agent.id);
      this.scene.updateAgentTasks(agent.id, agentTasks);
      this.scene.updateLabelTaskCount(agent.id, agentTasks.length);
    });

    // Update 2D view
    this.ui.renderFlatView(tasks);

    // Update HUD stats
    const stats = this.taskManager.getStats();
    const costTotals = this.taskManager.getCostTotals();
    this.ui.updateHUD(stats, costTotals);
    this.scene.updateBurndown(stats);

    // Update agent count
    this.ui.updateAgentCount(AGENTS.length);
  }

  _onAgentClick(agentId) {
    if (agentId) {
      const agent = AGENTS.find(a => a.id === agentId);
      if (agent) {
        this.scene.zoomToAgent(agentId);
        this.ui.showAgentSidebar(agent, this.taskManager.getTasksByAgent(agentId));
      }
    } else {
      this.scene.resetView();
      this.ui.hideAgentSidebar();
    }
  }

  // ---- Task Management ----
  addTask(taskData) {
    const task = this.taskManager.addTask(taskData);
    this.ui.showToast(`Task added: ${task.title}`, 'success');
    return task;
  }

  editTask(id, updates) {
    if (this.taskManager.editTask(id, updates)) {
      this.ui.showToast('Task updated', 'success');
    }
  }

  deleteTaskById(id) {
    if (this.taskManager.deleteTask(id)) {
      this.ui.showToast('Task deleted', 'info');
    }
  }

  moveTask(id, toColumn, toAgentId = null) {
    if (this.taskManager.moveTask(id, toColumn, toAgentId)) {
      this.ui.showToast('Task moved', 'success');
    }
  }

  // ---- View Management ----
  setView(mode) {
    if (mode === this.view) return;
    this.view = mode;

    const scene3d = document.getElementById('scene-3d');
    const flatView = document.getElementById('flat-view-wrapper');
    const toggle3d = document.getElementById('toggle-3d');
    const toggle2d = document.getElementById('toggle-2d');

    if (mode === '3d') {
      scene3d.style.display = 'block';
      flatView.style.display = 'none';
      toggle3d.classList.add('active');
      toggle2d.classList.remove('active');
    } else {
      scene3d.style.display = 'none';
      flatView.style.display = 'block';
      toggle3d.classList.remove('active');
      toggle2d.classList.add('active');
    }
  }

  resetView() {
    this.scene.resetView();
    this.ui.hideAgentSidebar();
  }

  resetData() {
    this.taskManager.resetToSeed();
    this.ui.showToast('Data reset to defaults', 'info');
  }
}

// ---- Initialize ----
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});