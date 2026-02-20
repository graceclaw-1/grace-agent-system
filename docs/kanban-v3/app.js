// ============================================================
// GRACE COMMAND CENTER v3 — App
// ============================================================

class App {
  constructor() {
    this.taskManager = new TaskManager();
    this.ui = new KanbanUI(this);
    this.scene = null;
    this.view = '3d';
    this._bootSequence(() => this._initScene());
  }

  _bootSequence(onComplete) {
    const loader = document.getElementById('boot-loader');
    const loaderText = document.getElementById('loader-text');
    const texts = [
      'INITIALIZING COMMAND CENTER...',
      'LOADING AGENT PROFILES...',
      'ESTABLISHING NEURAL LINKS...',
      'SYNCING TASK MATRIX...',
      'ACTIVATING HOLOPROJECTION...'
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i < texts.length) {
        if (loaderText) loaderText.textContent = texts[i++];
      } else {
        clearInterval(iv);
        if (loader) loader.classList.add('fade-out');
        setTimeout(() => { if (loader) loader.remove(); if (onComplete) onComplete(); }, 600);
      }
    }, 400);
  }

  _initScene() {
    try {
      this.scene = new KanbanScene(document.getElementById('kanban-canvas'));
      this.scene.onAgentClick = id => this._onAgentClick(id);
      this.scene.buildAgentOrbs(AGENTS);
      this.scene.buildAgentLabels(AGENTS);
    } catch (e) {
      console.warn('3D failed, falling back to 2D', e);
      this.scene = this._noopScene();
      this.setView('2d');
    }
    this.taskManager.subscribe(tasks => this._onTasksUpdate(tasks));
  }

  _noopScene() {
    return {
      buildAgentOrbs:()=>{}, buildAgentLabels:()=>{},
      updateAgentTasks:()=>{}, updateLabelTaskCount:()=>{},
      zoomToAgent:()=>{}, resetView:()=>{}, updateBurndown:()=>{}
    };
  }

  _onTasksUpdate(tasks) {
    AGENTS.forEach(a => {
      const t = tasks.filter(t => t.agentId === a.id);
      this.scene.updateAgentTasks(a.id, t);
      this.scene.updateLabelTaskCount(a.id, t.length);
    });
    this.ui.renderFlatView(tasks);
    const stats = this.taskManager.getStats();
    this.ui.updateHUD(stats, this.taskManager.getCostTotals());
    this.scene.updateBurndown(stats);
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

  addTask(d)      { const t = this.taskManager.addTask(d); this.ui.showToast(`Added: ${t.title}`, 'success'); return t; }
  editTask(id, u) { if (this.taskManager.editTask(id, u)) this.ui.showToast('Updated', 'success'); }
  deleteTaskById(id) { if (this.taskManager.deleteTask(id)) this.ui.showToast('Deleted', 'info'); }
  moveTask(id, col, agentId) { if (this.taskManager.moveTask(id, col, agentId)) this.ui.showToast('Moved', 'success'); }

  setView(mode) {
    if (mode === this.view) return;
    this.view = mode;
    const s3 = document.getElementById('scene-3d');
    const fv = document.getElementById('flat-view-wrapper');
    const t3 = document.getElementById('toggle-3d');
    const t2 = document.getElementById('toggle-2d');
    if (mode === '3d') {
      if (s3) s3.style.display = 'block';
      if (fv) { fv.style.display = 'none'; fv.classList.add('hidden'); }
      if (t3) t3.classList.add('active');
      if (t2) t2.classList.remove('active');
    } else {
      if (s3) s3.style.display = 'none';
      if (fv) { fv.style.display = 'block'; fv.classList.remove('hidden'); }
      if (t3) t3.classList.remove('active');
      if (t2) t2.classList.add('active');
    }
  }

  resetView() { this.scene.resetView(); this.ui.hideAgentSidebar(); }
  resetData()  { this.taskManager.resetToSeed(); this.ui.showToast('Reset', 'info'); }
}

window.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
