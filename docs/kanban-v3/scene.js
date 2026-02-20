// ============================================================
// GRACE COMMAND CENTER v3 — Solar System Layout
// Design by Grace + Sofia
// Rules: NO PlaneGeometry, NO additive blending on large meshes.
// Only spheres, rings (TorusGeometry), lines, and points.
// ============================================================

class KanbanScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.agentOrbs = [];
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-9999, -9999);
    this.selectedAgent = null;
    this.interactiveObjects = [];
    this.onAgentClick = null;
    this.animFrameId = null;
    this.labelEls = [];
    this._init();
  }

  _init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const w = this.canvas.parentElement ? this.canvas.parentElement.clientWidth : window.innerWidth;
    const h = this.canvas.parentElement ? this.canvas.parentElement.clientHeight : window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x060610, 1);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060610, 0.018);

    // Camera
    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 500);
    this.camera.position.set(0, 18, 32);
    this.camera.lookAt(0, 0, 0);

    this._setupOrbitControls();
    this._setupLighting();
    this._buildStarfield();
    this._buildGridLines();
    this._buildCenterOrb();

    window.addEventListener('resize', () => this._onResize());
    this.canvas.addEventListener('mousemove', e => this._onMouseMove(e));
    this.canvas.addEventListener('click', e => this._onClick(e));
    this.canvas.addEventListener('touchstart', e => this._onTouch(e), { passive: true });

    this._animate();
  }

  _setupOrbitControls() {
    this.orbit = {
      theta: 0, phi: 0.45,
      targetTheta: 0, targetPhi: 0.45,
      radius: 32, targetRadius: 32,
      isDown: false, startX: 0, startY: 0
    };
    const o = this.orbit;
    const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

    const down = (x, y) => { o.isDown = true; o.startX = x; o.startY = y; };
    const move = (x, y) => {
      if (!o.isDown) return;
      o.targetTheta -= (x - o.startX) * 0.005;
      o.targetPhi = clamp(o.targetPhi - (y - o.startY) * 0.005, 0.15, 1.2);
      o.startX = x; o.startY = y;
    };
    const up = () => { o.isDown = false; };

    this.canvas.addEventListener('mousedown', e => down(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', up);
    this.canvas.addEventListener('wheel', e => {
      o.targetRadius = clamp(o.targetRadius + e.deltaY * 0.04, 10, 70);
    }, { passive: true });
    this.canvas.addEventListener('touchstart', e => { if (e.touches[0]) down(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    this.canvas.addEventListener('touchmove', e => { if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    this.canvas.addEventListener('touchend', up, { passive: true });
  }

  _updateOrbitCamera() {
    const o = this.orbit;
    const lerp = (a, b, t) => a + (b - a) * t;
    // NO auto-rotation
    o.theta = lerp(o.theta, o.targetTheta, 0.07);
    o.phi   = lerp(o.phi,   o.targetPhi,   0.07);
    o.radius = lerp(o.radius, o.targetRadius, 0.07);
    const x = o.radius * Math.sin(o.phi) * Math.sin(o.theta);
    const y = o.radius * Math.cos(o.phi);
    const z = o.radius * Math.sin(o.phi) * Math.cos(o.theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  _setupLighting() {
    this.scene.add(new THREE.AmbientLight(0x111133, 3));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(10, 20, 15);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x4433aa, 0.6);
    fill.position.set(-10, 5, -10);
    this.scene.add(fill);
    // Static point lights — no movement
    const p1 = new THREE.PointLight(0x00fff0, 2, 40);
    p1.position.set(0, 10, 0);
    this.scene.add(p1);
  }

  _buildStarfield() {
    const count = 1200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 120 + Math.random() * 60;
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.cos(phi);
      pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.7 });
    this.scene.add(new THREE.Points(geo, mat));
  }

  _buildGridLines() {
    // Subtle perspective grid — lines only, no fill plane
    const mat = new THREE.LineBasicMaterial({ color: 0xff00aa, transparent: true, opacity: 0.15 });
    const matV = new THREE.LineBasicMaterial({ color: 0x4400aa, transparent: true, opacity: 0.18 });
    const y = -4;
    for (let z = -50; z <= 5; z += 3) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-50, y, z), new THREE.Vector3(50, y, z)]);
      this.scene.add(new THREE.Line(g, mat));
    }
    for (let x = -50; x <= 50; x += 5) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y, 5), new THREE.Vector3(x * 0.08, y, -50)]);
      this.scene.add(new THREE.Line(g, matV));
    }
  }

  _buildCenterOrb() {
    // Grace — large central sphere
    const geo = new THREE.SphereGeometry(2.2, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00fff0,
      emissive: 0x00fff0,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    });
    this.centerOrb = new THREE.Mesh(geo, mat);
    this.scene.add(this.centerOrb);

    // Outer halo torus — subtle, dark
    const haloGeo = new THREE.TorusGeometry(3.2, 0.08, 12, 60);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x00fff0, transparent: true, opacity: 0.35 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    this.scene.add(halo);
  }

  buildAgentOrbs(agents) {
    // Remove existing
    this.agentOrbs.forEach(o => {
      this.scene.remove(o.group);
      if (o.connLine) this.scene.remove(o.connLine);
    });
    this.agentOrbs = [];
    this.interactiveObjects = [];

    const count = agents.length;
    const radius = 13;

    agents.forEach((agent, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const group = new THREE.Group();
      group.position.set(x, 0, z);

      const agentColor = new THREE.Color(agent.color);

      // Agent sphere
      const orbGeo = new THREE.SphereGeometry(0.9, 24, 24);
      const orbMat = new THREE.MeshStandardMaterial({
        color: agentColor,
        emissive: agentColor,
        emissiveIntensity: 0.6,
        roughness: 0.25,
        metalness: 0.7
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.userData = { type: 'agentOrb', agentId: agent.id };
      group.add(orb);
      this.interactiveObjects.push(orb);

      // Task stack indicator — up to 4 torus rings below orb
      // (rendered as needed in updateAgentTasks)
      const taskRings = [];
      for (let r = 0; r < 4; r++) {
        const rGeo = new THREE.TorusGeometry(0.65 - r * 0.08, 0.045, 8, 32);
        const rMat = new THREE.MeshBasicMaterial({ color: agentColor, transparent: true, opacity: 0 });
        const ring = new THREE.Mesh(rGeo, rMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -1.3 - r * 0.28;
        group.add(ring);
        taskRings.push(ring);
      }

      // Connection line to center (thin, subtle)
      const linePts = [new THREE.Vector3(x * 0.18, 0, z * 0.18), new THREE.Vector3(x * 0.92, 0, z * 0.92)];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = new THREE.LineBasicMaterial({ color: agentColor, transparent: true, opacity: 0.18 });
      const connLine = new THREE.Line(lineGeo, lineMat);
      this.scene.add(connLine);

      this.scene.add(group);
      this.agentOrbs.push({ group, orb, orbMat, taskRings, agent, angle, x, z, connLine, taskCount: 0 });
    });
  }

  updateAgentTasks(agentId, tasks) {
    const orbData = this.agentOrbs.find(o => o.agent.id === agentId);
    if (!orbData) return;
    orbData.taskCount = tasks.length;
    const count = Math.min(tasks.length, 4);
    orbData.taskRings.forEach((ring, i) => {
      ring.material.opacity = i < count ? 0.7 : 0;
    });
    // Emissive intensity reflects workload
    orbData.orbMat.emissiveIntensity = 0.4 + Math.min(tasks.length * 0.12, 0.8);
  }

  buildAgentLabels(agents) {
    const container = document.getElementById('agent-labels');
    if (!container) return;
    container.innerHTML = '';
    this.labelEls = [];

    agents.forEach(agent => {
      const wrap = document.createElement('div');
      wrap.style.cssText = `
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: none;
        transform: translate(-50%, -50%);
        gap: 3px;
      `;

      const nameEl = document.createElement('div');
      nameEl.style.cssText = `
        font-family: 'Orbitron', monospace;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.15em;
        color: ${agent.color};
        text-shadow: 0 0 8px ${agent.color}88;
        white-space: nowrap;
        background: rgba(6,6,16,0.82);
        padding: 4px 10px;
        border: 1px solid ${agent.color}50;
        border-radius: 3px;
        display: flex;
        align-items: center;
        gap: 5px;
      `;
      nameEl.innerHTML = `${agent.emoji} ${agent.name.toUpperCase()} <span class="label-task-count" style="
        font-size: 10px;
        background: ${agent.color}22;
        border: 1px solid ${agent.color}70;
        border-radius: 2px;
        padding: 0 5px;
        min-width: 18px;
        text-align: center;
      ">0</span>`;

      const roleEl = document.createElement('div');
      roleEl.style.cssText = `
        font-family: 'Share Tech Mono', monospace;
        font-size: 9px;
        color: rgba(200,200,255,0.5);
        letter-spacing: 0.1em;
        white-space: nowrap;
      `;
      roleEl.textContent = agent.role.toUpperCase();

      wrap.appendChild(nameEl);
      wrap.appendChild(roleEl);
      container.appendChild(wrap);
      this.labelEls.push(wrap);
    });
  }

  updateLabelTaskCount(agentId, count) {
    const orbData = this.agentOrbs.find(o => o.agent.id === agentId);
    if (!orbData) return;
    const idx = this.agentOrbs.indexOf(orbData);
    const el = this.labelEls[idx];
    if (el) {
      const c = el.querySelector('.label-task-count');
      if (c) c.textContent = count;
    }
  }

  _updateLabels() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.agentOrbs.forEach((od, i) => {
      const el = this.labelEls[i];
      if (!el) return;
      const pos = new THREE.Vector3();
      od.orb.getWorldPosition(pos);
      pos.project(this.camera);
      const sx = ((pos.x + 1) / 2) * w;
      const sy = ((-pos.y + 1) / 2) * h;
      if (pos.z < 1) {
        el.style.left = sx + 'px';
        el.style.top = (sy - 38) + 'px';
        el.style.opacity = '1';
      } else {
        el.style.opacity = '0';
      }
    });
  }

  highlightAgent(agentId, on) {
    this.agentOrbs.forEach(od => {
      const isTarget = od.agent.id === agentId;
      od.orbMat.emissiveIntensity = on && isTarget ? 1.2 : 0.5;
    });
  }

  zoomToAgent(agentId) {
    const od = this.agentOrbs.find(o => o.agent.id === agentId);
    if (!od) return;
    this.orbit.targetTheta = Math.atan2(od.x, od.z);
    this.orbit.targetPhi = 0.5;
    this.orbit.targetRadius = 12;
    this.selectedAgent = agentId;
    this.highlightAgent(agentId, true);
  }

  resetView() {
    this.orbit.targetTheta = 0;
    this.orbit.targetPhi = 0.45;
    this.orbit.targetRadius = 32;
    this.selectedAgent = null;
    this.agentOrbs.forEach(od => { od.orbMat.emissiveIntensity = 0.5; });
  }

  updateBurndown() {} // no-op

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _onClick(e) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveObjects);
    if (hits.length > 0 && hits[0].object.userData.type === 'agentOrb') {
      if (this.onAgentClick) this.onAgentClick(hits[0].object.userData.agentId);
    } else if (this.selectedAgent) {
      if (this.onAgentClick) this.onAgentClick(null);
    }
  }

  _onTouch(e) {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((t.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((t.clientY - rect.top) / rect.height) * 2 + 1;
      setTimeout(() => this._onClick({}), 80);
    }
  }

  _onResize() {
    const p = this.canvas.parentElement;
    const w = p ? p.clientWidth : window.innerWidth;
    const h = p ? p.clientHeight : window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate() {
    this.animFrameId = requestAnimationFrame(() => this._animate());
    const elapsed = this.clock.getElapsedTime();

    this._updateOrbitCamera();

    // Center orb — very slow rotation only
    if (this.centerOrb) {
      this.centerOrb.rotation.y = elapsed * 0.15;
    }

    // Agent orbs — slow rotation, hover highlight only
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveObjects);
    const hoveredId = hits.length > 0 ? hits[0].object.userData.agentId : null;

    this.agentOrbs.forEach(od => {
      od.orb.rotation.y = elapsed * 0.2;
      // Hover: subtle brightness boost only
      const isHovered = od.agent.id === hoveredId;
      const isSelected = od.agent.id === this.selectedAgent;
      if (isHovered || isSelected) {
        od.orbMat.emissiveIntensity = 1.0;
        document.body.style.cursor = 'pointer';
      } else {
        od.orbMat.emissiveIntensity = 0.5;
      }
    });

    if (!hoveredId) document.body.style.cursor = 'default';

    this._updateLabels();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.renderer.dispose();
  }
}
