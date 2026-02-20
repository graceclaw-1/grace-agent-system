// ============================================================
// GRACE COMMAND CENTER — Main Application (v4)
// ============================================================

class App {
  constructor() {
    this.taskManager = new TaskManager();
    this.ui = new KanbanUI(this);
    this.scene = null;
    this.view = '2d';

    this._bootSequence(() => this._initScene());
  }

  _bootSequence(onComplete) {
    const loader = document.getElementById('boot-loader');
    const loaderText = document.getElementById('loader-text');
    const texts = [
      'INITIALIZING COMMAND CENTER...',
      'LOADING AGENT PROFILES...',
      'ESTABLISHING NEURAL LINKS...',
      'CALIBRATING RETROWAVE GRID...',
      'SYNCING TASK MATRIX...',
      'ACTIVATING HOLOPROJECTION...'
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < texts.length) {
        if (loaderText) loaderText.textContent = texts[i++];
      } else {
        clearInterval(interval);
        if (loader) loader.classList.add('fade-out');
        setTimeout(() => {
          if (loader) loader.remove();
          if (onComplete) onComplete();
        }, 600);
      }
    }, 350);
  }

  _initScene() {
    const canvas = document.getElementById('kanban-canvas');

    try {
      this.scene = new KanbanScene(canvas);
      this.scene.onAgentClick = (agentId) => this._onAgentClick(agentId);
      this.scene.buildAgentPanels(AGENTS);
      this.scene.buildAgentLabels(AGENTS);

    } catch (err) {
      console.warn('3D scene init failed, falling back to 2D:', err);
      this.scene = this._makeNoopScene();
      this.setView('2d');
      const hint = document.getElementById('controls-hint');
      if (hint) hint.style.display = 'none';
    }

    // Default to 2D view
    this.setView('2d');

    this.taskManager.subscribe((tasks) => this._onTasksUpdate(tasks));
  }

  _makeNoopScene() {
    return {
      onAgentClick: null,
      orbitState: { radius: 28, phi: 0.3, theta: 0, targetRadius: 28, targetPhi: 0.3, targetTheta: 0 },
      buildAgentPanels: () => {},
      buildAgentLabels: () => {},
      updateAgentTasks: () => {},
      updateLabelTaskCount: () => {},
      updateBurndown: () => {},
      zoomToAgent: () => {},
      resetView: () => {},
      highlightAgent: () => {}
    };
  }

  _onTasksUpdate(tasks) {
    if (this.scene) {
      AGENTS.forEach(agent => {
        const agentTasks = tasks.filter(t => t.agentId === agent.id);
        this.scene.updateAgentTasks(agent.id, agentTasks);
        this.scene.updateLabelTaskCount(agent.id, agentTasks.length);
      });
    }

    this.ui.renderFlatView(tasks);

    const stats = this.taskManager.getStats();
    const costTotals = this.taskManager.getCostTotals();
    this.ui.updateHUD(stats, costTotals);

    if (this.scene) this.scene.updateBurndown(stats);

    this.ui.updateAgentCount(AGENTS.length);
  }

  _onAgentClick(agentId) {
    if (agentId) {
      const agent = AGENTS.find(a => a.id === agentId);
      if (agent) {
        if (this.scene) this.scene.zoomToAgent(agentId);
        this.ui.showAgentSidebar(agent, this.taskManager.tasks);
      }
    } else {
      if (this.scene) this.scene.resetView();
      this.ui.hideAgentSidebar();
    }
  }

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

  setView(mode) {
    if (mode === this.view) return;
    this.view = mode;

    const scene3d = document.getElementById('scene-3d');
    const flatView = document.getElementById('flat-view-wrapper');
    const toggle3d = document.getElementById('toggle-3d');
    const toggle2d = document.getElementById('toggle-2d');

    if (mode === '3d') {
      if (scene3d) scene3d.style.display = 'block';
      if (flatView) { flatView.style.display = 'none'; flatView.classList.add('hidden'); }
      if (toggle3d) toggle3d.classList.add('active');
      if (toggle2d) toggle2d.classList.remove('active');
    } else {
      if (scene3d) scene3d.style.display = 'none';
      if (flatView) { flatView.style.display = 'block'; flatView.classList.remove('hidden'); }
      if (toggle3d) toggle3d.classList.remove('active');
      if (toggle2d) toggle2d.classList.add('active');
    }
  }

  resetView() {
    if (this.scene) this.scene.resetView();
    this.ui.hideAgentSidebar();
  }

  resetData() {
    this.taskManager.resetToSeed();
    this.ui.showToast('Data reset to defaults', 'info');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
