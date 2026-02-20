// ============================================================
// GRACE COMMAND CENTER — Enhanced Three.js Scene (v4)
// ============================================================

class KanbanScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.agentPanels = [];
    this.particleSystems = [];
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredObject = null;
    this.selectedAgent = null;
    this.interactiveObjects = [];
    this.onAgentClick = null;
    this.animFrameId = null;

    this._init();
  }

  _init() {
    // --- Renderer ---
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const w = this.canvas.parentElement ? this.canvas.parentElement.clientWidth : window.innerWidth;
    const h = this.canvas.parentElement ? this.canvas.parentElement.clientHeight : window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // --- Scene ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1f);
    this.scene.fog = new THREE.FogExp2(0x0a0a1f, 0.015);

    // --- Camera ---
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);
    this.camera.position.set(0, 12, 28);
    this.camera.lookAt(0, 0, 0);

    // --- Orbit Controls ---
    this._setupOrbitControls();

    // --- Environment ---
    this._setupLighting();
    this._buildRetrowaveGrid();
    this._buildRetrowaveSun();
    this._buildMountains();
    this._buildParticleSystem();
    this._buildStarfield();

    // --- Events ---
    window.addEventListener('resize', () => this._onResize());
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('click', (e) => this._onClick(e));
    this.canvas.addEventListener('touchstart', (e) => this._onTouch(e), { passive: true });

    this._animate();
  }

  _setupLighting() {
    const ambient = new THREE.AmbientLight(0x111133, 2);
    this.scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xff3366, 1.5);
    mainLight.position.set(0, 10, -20);
    this.scene.add(mainLight);

    const cyanLight = new THREE.DirectionalLight(0x00fff0, 1.2);
    cyanLight.position.set(20, 5, 0);
    this.scene.add(cyanLight);

    const purpleLight = new THREE.DirectionalLight(0x7c3aed, 1.2);
    purpleLight.position.set(-20, 5, 0);
    this.scene.add(purpleLight);

    const pointCyan = new THREE.PointLight(0x00fff0, 3, 30);
    pointCyan.position.set(-15, 8, 0);
    this.scene.add(pointCyan);

    const pointPink = new THREE.PointLight(0xff00aa, 3, 30);
    pointPink.position.set(15, 8, 0);
    this.scene.add(pointPink);

    this.dynamicLights = [pointCyan, pointPink];
  }

  _buildRetrowaveGrid() {
    const gridGroup = new THREE.Group();

    // Horizontal lines (pink)
    const hMat = new THREE.LineBasicMaterial({
      color: 0xff00aa,
      transparent: true,
      opacity: 0.4
    });
    for (let z = -80; z <= 10; z += 2) {
      const pts = [
        new THREE.Vector3(-60, -3, z),
        new THREE.Vector3(60, -3, z)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      gridGroup.add(new THREE.Line(geo, hMat.clone()));
    }

    // Vertical lines (purple) with perspective convergence
    const vMat = new THREE.LineBasicMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.5
    });
    for (let x = -60; x <= 60; x += 4) {
      const pts = [
        new THREE.Vector3(x, -3, 10),
        new THREE.Vector3(x * 0.05, -3, -80)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      gridGroup.add(new THREE.Line(geo, vMat.clone()));
    }

    this.gridGroup = gridGroup;
    this.scene.add(gridGroup);
  }

  _buildRetrowaveSun() {
    // Sun sphere
    const sunGeo = new THREE.SphereGeometry(12, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xff3366,
      transparent: true,
      opacity: 0.85
    });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(0, 2, -65);
    this.scene.add(this.sun);

    // Sun stripes (horizontal bands)
    this.sunStripes = [];
    const stripeMat = new THREE.MeshBasicMaterial({
      color: 0x0a0a1f,
      transparent: true,
      opacity: 0.95
    });
    for (let i = 0; i < 7; i++) {
      const stripeGeo = new THREE.PlaneGeometry(30, 0.8 + i * 0.18);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat.clone());
      stripe.position.set(0, -4 + i * 1.5, -64.5);
      this.sunStripes.push(stripe);
      this.scene.add(stripe);
    }

    // Glow ring around sun
    const glowGeo = new THREE.RingGeometry(12.5, 18, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff00aa,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(this.sun.position);
    this.sunGlow = glow;
    this.scene.add(glow);
  }

  _buildMountains() {
    const mountainGroup = new THREE.Group();
    const mountainMat = new THREE.MeshBasicMaterial({
      color: 0x1a0a3a,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });

    const createMountain = (x, z, height, width) => {
      const shape = new THREE.Shape();
      shape.moveTo(-width / 2, 0);
      shape.lineTo(0, height);
      shape.lineTo(width / 2, 0);
      shape.lineTo(-width / 2, 0);
      const geo = new THREE.ShapeGeometry(shape);
      const mountain = new THREE.Mesh(geo, mountainMat.clone());
      mountain.position.set(x, -3, z);
      return mountain;
    };

    const mountains = [
      createMountain(-45, -55, 18, 28),
      createMountain(-20, -50, 22, 30),
      createMountain(5, -52, 16, 22),
      createMountain(28, -48, 20, 26),
      createMountain(50, -55, 14, 20)
    ];
    mountains.forEach(m => mountainGroup.add(m));

    // Mountain outlines in neon pink
    const outlineMat = new THREE.LineBasicMaterial({ color: 0xff00aa, transparent: true, opacity: 0.5 });
    mountains.forEach(m => {
      const h = m.position.y;
      const pts = m.geometry.attributes.position;
      const positions = [];
      for (let i = 0; i < pts.count; i++) {
        positions.push(new THREE.Vector3(
          m.position.x + pts.getX(i),
          m.position.y + pts.getY(i),
          m.position.z + pts.getZ(i)
        ));
      }
    });

    this.mountains = mountainGroup;
    this.scene.add(mountainGroup);
  }

  _buildParticleSystem() {
    const count = 800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const palette = [
      new THREE.Color(0x00fff0),
      new THREE.Color(0xff00aa),
      new THREE.Color(0x7c3aed),
      new THREE.Color(0xf7c948),
      new THREE.Color(0x4ade80)
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 40 - 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = Math.random() * 3 + 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        void main() {
          vColor = color;
          vec3 pos = position;
          pos.y += sin(time * 0.5 + position.x * 0.1) * 0.5;
          pos.x += cos(time * 0.3 + position.z * 0.1) * 0.3;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (250.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d);
          gl_FragColor = vec4(vColor, alpha * 0.85);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  _buildStarfield() {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 150 + Math.random() * 100;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.4,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    this.scene.add(new THREE.Points(geo, mat));
  }

  // ---- Orbit Controls ----

  _setupOrbitControls() {
    this.orbitState = {
      isDown: false,
      startX: 0, startY: 0,
      theta: 0, phi: 0.3,
      targetTheta: 0, targetPhi: 0.3,
      radius: 28, targetRadius: 28,
      lookAt: new THREE.Vector3(0, 0, 0),
      lastInteraction: 0
    };

    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

    const onDown = (x, y) => {
      this.orbitState.isDown = true;
      this.orbitState.startX = x;
      this.orbitState.startY = y;
      this.orbitState.lastInteraction = Date.now();
    };
    const onMove = (x, y) => {
      if (!this.orbitState.isDown) return;
      const dx = (x - this.orbitState.startX) * 0.005;
      const dy = (y - this.orbitState.startY) * 0.005;
      this.orbitState.startX = x;
      this.orbitState.startY = y;
      this.orbitState.targetTheta -= dx;
      this.orbitState.targetPhi = clamp(this.orbitState.targetPhi - dy, 0.05, 1.2);
      this.orbitState.lastInteraction = Date.now();
    };
    const onUp = () => {
      this.orbitState.isDown = false;
      this.orbitState.lastInteraction = Date.now();
    };

    this.canvas.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onUp);
    this.canvas.addEventListener('wheel', (e) => {
      this.orbitState.targetRadius = clamp(this.orbitState.targetRadius + e.deltaY * 0.03, 8, 60);
    }, { passive: true });
    this.canvas.addEventListener('touchstart', (e) => { if (e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    this.canvas.addEventListener('touchmove', (e) => { if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    this.canvas.addEventListener('touchend', onUp, { passive: true });
  }

  _updateOrbitCamera() {
    const o = this.orbitState;
    const lerp = (a, b, t) => a + (b - a) * t;
    o.theta = lerp(o.theta, o.targetTheta, 0.08);
    o.phi = lerp(o.phi, o.targetPhi, 0.08);
    o.radius = lerp(o.radius, o.targetRadius, 0.08);
    const x = o.radius * Math.sin(o.phi) * Math.sin(o.theta);
    const y = o.radius * Math.cos(o.phi);
    const z = o.radius * Math.sin(o.phi) * Math.cos(o.theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(o.lookAt);
  }

  // ---- Agent Panels ----

  buildAgentPanels(agents) {
    this.agentPanels.forEach(p => {
      this.scene.remove(p.group);
      if (p.connectionLine) this.scene.remove(p.connectionLine);
    });
    this.agentPanels = [];
    this.interactiveObjects = [];

    const count = agents.length;
    const radius = 14;
    const panelW = 4.5;
    const panelH = 6;

    agents.forEach((agent, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.lookAt(0, 0, 0);

      const panelGeo = new THREE.PlaneGeometry(panelW, panelH);
      const agentColor = new THREE.Color(agent.color);

      const panelMat = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: agentColor },
          time: { value: 0 },
          selected: { value: 0.0 },
          hovered: { value: 0.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: `
          uniform vec3 color;
          uniform float time;
          uniform float selected;
          uniform float hovered;
          varying vec2 vUv;
          void main() {
            float border = 0.04;
            float bx = step(border, vUv.x) * step(border, 1.0 - vUv.x);
            float by = step(border, vUv.y) * step(border, 1.0 - vUv.y);
            float inner = bx * by;
            float scan = 0.9 + 0.1 * sin(vUv.y * 120.0 + time * 2.0);
            vec3 panelColor = mix(vec3(0.02, 0.02, 0.08), color * 0.12, inner);
            panelColor += color * (1.0 - inner) * (0.7 + 0.3 * selected);
            float shimmer = (hovered + selected * 0.5) * 0.2 * sin(vUv.y * 40.0 + time * 5.0);
            panelColor += color * shimmer;
            panelColor *= scan;
            float alpha = inner * 0.75 + (1.0 - inner) * (0.85 + 0.15 * selected);
            gl_FragColor = vec4(panelColor, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.userData = { type: 'agentPanel', agentId: agent.id, agentIndex: i };
      group.add(panel);
      this.interactiveObjects.push(panel);

      // Holographic frame
      const frameMat = new THREE.LineBasicMaterial({ color: agentColor, transparent: true, opacity: 0.9, linewidth: 2 });
      const hw = panelW / 2, hh = panelH / 2;
      const corners = [
        new THREE.Vector3(-hw, -hh, 0.01), new THREE.Vector3(hw, -hh, 0.01),
        new THREE.Vector3(hw, hh, 0.01),   new THREE.Vector3(-hw, hh, 0.01),
        new THREE.Vector3(-hw, -hh, 0.01)
      ];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(corners), frameMat));

      // Corner ticks
      const tickLen = 0.3;
      [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].forEach(([cx, cy]) => {
        const sx = Math.sign(cx), sy = Math.sign(cy);
        const tickPts = [
          new THREE.Vector3(cx - sx * tickLen, cy, 0.02),
          new THREE.Vector3(cx, cy, 0.02),
          new THREE.Vector3(cx, cy - sy * tickLen, 0.02)
        ];
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tickPts),
          new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })));
      });

      // Column dividers
      const divMat = new THREE.LineBasicMaterial({ color: agentColor, transparent: true, opacity: 0.35 });
      for (let d = 0; d < 4; d++) {
        if (d > 0) {
          const dx = -hw + (panelW / 4) * d;
          const divPts = [new THREE.Vector3(dx, -hh + 0.8, 0.01), new THREE.Vector3(dx, hh * 0.82, 0.01)];
          group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(divPts), divMat));
        }
        const dotGeo = new THREE.CircleGeometry(0.07, 6);
        const dotMat = new THREE.MeshBasicMaterial({ color: agentColor, transparent: true, opacity: 0.6 });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(-hw + (panelW / 4) * (d + 0.5), hh * 0.82, 0.02);
        group.add(dot);
      }

      // Point light
      const pLight = new THREE.PointLight(agentColor, 1.5, 8);
      pLight.position.set(0, 0, 1);
      group.add(pLight);

      // Avatar sphere
      const avatarGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const avatarMat = new THREE.MeshStandardMaterial({
        color: agentColor,
        emissive: agentColor,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        metalness: 0.8
      });
      const avatar = new THREE.Mesh(avatarGeo, avatarMat);
      avatar.position.set(0, panelH / 2 + 0.6, 0);
      group.add(avatar);

      // Status dot
      const statusColors = { online: 0x00fff0, busy: 0xff00aa, idle: 0x818cf8 };
      const statusGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const statusMat = new THREE.MeshStandardMaterial({
        color: statusColors[agent.status] || 0x00fff0,
        emissive: statusColors[agent.status] || 0x00fff0,
        emissiveIntensity: 3
      });
      const statusDot = new THREE.Mesh(statusGeo, statusMat);
      statusDot.position.set(0.4, panelH / 2 + 0.6, 0.4);
      group.add(statusDot);

      // Connection line
      const lineMat = new THREE.LineBasicMaterial({ color: agentColor, transparent: true, opacity: 0.12 });
      const linePts = [
        new THREE.Vector3(x * 0.1, -1.5, z * 0.1),
        new THREE.Vector3(x * 0.95, -0.5, z * 0.95)
      ];
      const connectionLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts), lineMat);
      this.scene.add(connectionLine);

      this.scene.add(group);

      this.agentPanels.push({
        group, panel, panelMat, avatar, ring: null, statusDot, pLight,
        agent, angle, x, z,
        baseY: 0,
        taskCards: [],
        connectionLine
      });
    });
  }

  _makeTaskCardTexture(task, agentColor, pixW = 128, pixH = 64) {
    const canvas = document.createElement('canvas');
    canvas.width = pixW;
    canvas.height = pixH;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(5, 5, 20, 0.9)';
    ctx.fillRect(0, 0, pixW, pixH);

    ctx.strokeStyle = agentColor + '55';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.75, 0.75, pixW - 1.5, pixH - 1.5);

    const priColors = { critical: '#ff0055', high: '#f472b6', medium: '#f7c948', low: '#4ade80' };
    const priColor = priColors[task.priority] || '#808080';
    ctx.fillStyle = priColor;
    ctx.fillRect(0, 0, 3, pixH);

    ctx.fillStyle = '#e0e0ff';
    ctx.font = 'bold 18px monospace';
    const maxW = pixW - 16;
    let title = task.title;
    while (ctx.measureText(title).width > maxW && title.length > 3) {
      title = title.slice(0, -1);
    }
    if (title !== task.title) title += '…';
    ctx.fillText(title, 8, 22);

    ctx.fillStyle = priColor;
    ctx.font = '12px monospace';
    ctx.fillText(task.priority.toUpperCase(), 8, pixH - 10);

    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = 0; y < pixH; y += 4) {
      ctx.fillRect(0, y, pixW, 2);
    }

    return new THREE.CanvasTexture(canvas);
  }

  updateAgentTasks(agentId, tasks) {
    const panelData = this.agentPanels.find(p => p.agent.id === agentId);
    if (!panelData) return;

    panelData.taskCards.forEach(c => {
      if (c.material && c.material.map) c.material.map.dispose();
      if (c.material) c.material.dispose();
      panelData.group.remove(c);
    });
    panelData.taskCards = [];

    const panelW = 4.5;
    const panelH = 6;
    const hw = panelW / 2;
    const hh = panelH / 2;
    const colWidth = panelW / 4;
    const cols = ['backlog', 'inprogress', 'review', 'done'];

    cols.forEach((col, ci) => {
      const colTasks = tasks.filter(t => t.column === col).slice(0, 4);
      const colX = -hw + colWidth * (ci + 0.5);

      colTasks.forEach((task, ti) => {
        const cardW = colWidth - 0.12;
        const cardH = 0.52;
        const cardY = hh * 0.78 - 0.1 - ti * (cardH + 0.1);

        const tex = this._makeTaskCardTexture(task, panelData.agent.color);
        const cardGeo = new THREE.PlaneGeometry(cardW, cardH);
        const cardMat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const card = new THREE.Mesh(cardGeo, cardMat);
        card.position.set(colX, cardY, 0.06);
        card.userData = { type: 'taskCard', taskId: task.id, agentId };
        panelData.group.add(card);
        panelData.taskCards.push(card);
      });
    });
  }

  highlightAgent(agentId, selected = true) {
    this.agentPanels.forEach(p => {
      const isSelected = p.agent.id === agentId;
      p.panelMat.uniforms.selected.value = (selected && isSelected) ? 1.0 : 0.0;
      p.pLight.intensity = (selected && isSelected) ? 4.0 : 1.5;
    });
  }

  zoomToAgent(agentId) {
    const panelData = this.agentPanels.find(p => p.agent.id === agentId);
    if (!panelData) return;
    const { x, z } = panelData;
    this.orbitState.targetRadius = 10;
    this.orbitState.targetTheta = Math.atan2(x, z);
    this.orbitState.targetPhi = 0.5;
    this.selectedAgent = agentId;
    this.highlightAgent(agentId, true);
  }

  resetView() {
    this.orbitState.targetRadius = 28;
    this.orbitState.targetTheta = 0;
    this.orbitState.targetPhi = 0.3;
    this.selectedAgent = null;
    this.agentPanels.forEach(p => {
      p.panelMat.uniforms.selected.value = 0.0;
      p.pLight.intensity = 1.5;
    });
  }

  buildAgentLabels(agents) {
    const container = document.getElementById('agent-labels');
    if (!container) return;
    container.innerHTML = '';
    this.labelEls = [];

    agents.forEach((agent) => {
      const wrap = document.createElement('div');
      wrap.dataset.agentId = agent.id;
      wrap.style.cssText = `
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: none;
        transform: translate(-50%, -50%);
        transition: opacity 0.3s;
        gap: 2px;
      `;

      const nameEl = document.createElement('div');
      nameEl.style.cssText = `
        font-family: 'Orbitron', monospace;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.18em;
        color: ${agent.color};
        text-shadow: 0 0 8px ${agent.color}, 0 0 20px ${agent.color}40;
        white-space: nowrap;
        background: rgba(0,0,0,0.65);
        padding: 3px 8px;
        border: 1px solid ${agent.color}60;
        border-radius: 2px;
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        gap: 5px;
      `;
      nameEl.innerHTML = `${agent.emoji} ${agent.name.toUpperCase()} <span class="label-task-count" style="
        font-size: 11px;
        background: ${agent.color}25;
        border: 1px solid ${agent.color}80;
        border-radius: 2px;
        padding: 0 4px;
        font-weight: 600;
        letter-spacing: 0.05em;
        min-width: 18px;
        text-align: center;
      ">0</span>`;

      const roleEl = document.createElement('div');
      roleEl.style.cssText = `
        font-family: 'Share Tech Mono', monospace;
        font-size: 10px;
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
    if (!this.labelEls) return;
    const pd = this.agentPanels.find(p => p.agent.id === agentId);
    if (!pd) return;
    const idx = this.agentPanels.indexOf(pd);
    const el = this.labelEls[idx];
    if (el) {
      const countEl = el.querySelector('.label-task-count');
      if (countEl) countEl.textContent = count;
    }
  }

  updateBurndown(stats) {}

  _updateLabels() {
    if (!this.labelEls || !this.agentPanels.length) return;
    const canvas = this.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    this.agentPanels.forEach((pd, i) => {
      const el = this.labelEls[i];
      if (!el) return;
      const pos = new THREE.Vector3();
      pd.avatar.getWorldPosition(pos);
      pos.project(this.camera);
      const x = ((pos.x + 1) / 2) * w;
      const y = ((-pos.y + 1) / 2) * h;
      if (pos.z < 1) {
        el.style.left = x + 'px';
        el.style.top = (y - 32) + 'px';
        el.style.opacity = '1';
      } else {
        el.style.opacity = '0';
      }
    });
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _onClick(e) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveObjects);
    if (hits.length > 0) {
      const obj = hits[0].object;
      if (obj.userData.type === 'agentPanel') {
        if (this.onAgentClick) this.onAgentClick(obj.userData.agentId);
      }
    } else if (this.selectedAgent) {
      if (this.onAgentClick) this.onAgentClick(null);
    }
  }

  _onTouch(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      setTimeout(() => this._onClick({ clientX: touch.clientX, clientY: touch.clientY }), 50);
    }
  }

  _onResize() {
    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate() {
    this.animFrameId = requestAnimationFrame(() => this._animate());
    const elapsed = this.clock.getElapsedTime();

    this._updateOrbitCamera();

    if (this.particles) {
      this.particles.material.uniforms.time.value = elapsed;
    }

    // Grid pulse
    if (this.gridGroup) {
      this.gridGroup.children.forEach((line, i) => {
        if (line.material) {
          line.material.opacity = 0.3 + Math.sin(elapsed * 0.5 + i * 0.05) * 0.1;
        }
      });
    }

    // Sun glow pulse
    if (this.sunGlow && this.sunGlow.material) {
      this.sunGlow.material.opacity = 0.1 + Math.sin(elapsed * 0.8) * 0.05;
    }

    // Agent panels
    this.agentPanels.forEach((pd, i) => {
      pd.group.position.y = pd.baseY;
      pd.panelMat.uniforms.time.value = elapsed * 0.2;
      pd.avatar.rotation.y = elapsed * 0.2 + i;
      pd.statusDot.material.emissiveIntensity = 2.5;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObject(pd.panel);
      pd.panelMat.uniforms.hovered.value = hits.length > 0 ? 1.0 : 0.0;
    });

    const anyHovered = this.agentPanels.some(pd => pd.panelMat.uniforms.hovered.value > 0);
    document.body.style.cursor = anyHovered ? 'pointer' : 'default';

    this._updateLabels();

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.renderer.dispose();
  }
}
