// ============================================================
// GRACE COMMAND CENTER — Three.js 3D Scene
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
    this.scene.background = new THREE.Color(0x0a0a0f);
    this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.025);

    // --- Camera ---
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);
    this.camera.position.set(0, 12, 28);
    this.camera.lookAt(0, 0, 0);

    // --- Orbit Controls (manual, lightweight) ---
    this._setupOrbitControls();

    // --- Lighting ---
    this._setupLighting();

    // --- Environment ---
    this._buildSynthwaveGrid();
    this._buildCenterPlatform();
    this._buildParticleSystem();
    this._buildStarfield();
    this._buildSunHorizon();

    // --- Events ---
    window.addEventListener('resize', () => this._onResize());
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('click', (e) => this._onClick(e));
    this.canvas.addEventListener('touchstart', (e) => this._onTouch(e), { passive: true });

    // Start cinematic intro animation
    this.orbitState.radius = 70;
    this.orbitState.phi = 0.08;
    this.orbitState.theta = Math.PI * 0.6;
    // Delay then sweep to default
    setTimeout(() => {
      this.orbitState.targetRadius = 28;
      this.orbitState.targetPhi = 0.3;
      this.orbitState.targetTheta = 0;
    }, 300);

    this._animate();
  }

  _setupOrbitControls() {
    this.orbitState = {
      isDown: false,
      startX: 0,
      startY: 0,
      theta: 0,
      phi: 0.3,
      targetTheta: 0,
      targetPhi: 0.3,
      radius: 28,
      targetRadius: 28,
      lookAt: new THREE.Vector3(0, 0, 0)
    };

    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

    const onDown = (x, y) => {
      this.orbitState.isDown = true;
      this.orbitState.startX = x;
      this.orbitState.startY = y;
    };
    const onMove = (x, y) => {
      if (!this.orbitState.isDown) return;
      const dx = (x - this.orbitState.startX) * 0.005;
      const dy = (y - this.orbitState.startY) * 0.005;
      this.orbitState.startX = x;
      this.orbitState.startY = y;
      this.orbitState.targetTheta -= dx;
      this.orbitState.targetPhi = clamp(this.orbitState.targetPhi - dy, 0.05, 1.2);
    };
    const onUp = () => { this.orbitState.isDown = false; };
    const onWheel = (e) => {
      this.orbitState.targetRadius = clamp(this.orbitState.targetRadius + e.deltaY * 0.03, 8, 60);
    };

    this.canvas.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => { if (this.orbitState.isDown) onMove(e.clientX, e.clientY); });
    window.addEventListener('mouseup', onUp);
    this.canvas.addEventListener('wheel', onWheel, { passive: true });
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

  _setupLighting() {
    const ambient = new THREE.AmbientLight(0x111133, 2);
    this.scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0x00fff0, 1.5);
    mainLight.position.set(10, 20, 10);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xff00aa, 0.8);
    fillLight.position.set(-10, 5, -5);
    this.scene.add(fillLight);

    const pointCyan = new THREE.PointLight(0x00fff0, 3, 30);
    pointCyan.position.set(-15, 8, 0);
    this.scene.add(pointCyan);

    const pointPink = new THREE.PointLight(0xff00aa, 3, 30);
    pointPink.position.set(15, 8, 0);
    this.scene.add(pointPink);

    this.dynamicLights = [pointCyan, pointPink];
  }

  _buildSynthwaveGrid() {
    // Perspective grid floor
    const gridGroup = new THREE.Group();

    // Horizontal lines
    const hMat = new THREE.LineBasicMaterial({ color: 0xff00aa, transparent: true, opacity: 0.4 });
    for (let z = -50; z <= 10; z += 2) {
      const pts = [new THREE.Vector3(-40, -3, z), new THREE.Vector3(40, -3, z)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      gridGroup.add(new THREE.Line(geo, hMat));
    }

    // Vertical lines (perspective convergence)
    const vMat = new THREE.LineBasicMaterial({ color: 0x6600ff, transparent: true, opacity: 0.5 });
    for (let x = -40; x <= 40; x += 4) {
      const pts = [new THREE.Vector3(x, -3, 10), new THREE.Vector3(x * 0.1, -3, -50)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      gridGroup.add(new THREE.Line(geo, vMat));
    }

    // Floor plane
    const floorGeo = new THREE.PlaneGeometry(120, 80);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x000011,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.01;
    gridGroup.add(floor);

    this.gridGroup = gridGroup;
    this.scene.add(gridGroup);
  }

  _buildSunHorizon() {
    // Synthwave sun semi-circle on the horizon
    const sunGroup = new THREE.Group();
    sunGroup.position.set(0, 2, -45);

    // Sun disk
    const sunGeo = new THREE.CircleGeometry(8, 32, 0, Math.PI);
    const sunMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          float y = vUv.y;
          vec3 top = vec3(1.0, 0.85, 0.0);
          vec3 bot = vec3(1.0, 0.05, 0.4);
          vec3 col = mix(bot, top, y);
          // Scanlines on sun
          float lines = step(0.5, fract(vUv.y * 8.0));
          col = mix(col * 0.3, col, lines);
          gl_FragColor = vec4(col, 0.95);
        }
      `,
      side: THREE.DoubleSide
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.rotation.x = Math.PI;
    sunGroup.add(sun);

    // Glow ring around sun
    const glowGeo = new THREE.RingGeometry(7.8, 9.2, 32, 1, 0, Math.PI);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = Math.PI;
    sunGroup.add(glow);

    this.scene.add(sunGroup);
  }

  _buildCenterPlatform() {
    // Glowing circle at center
    const ringGeo = new THREE.RingGeometry(12.5, 13, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00fff0, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2.99;
    this.scene.add(ring);

    // Inner ring
    const ring2Geo = new THREE.RingGeometry(1.5, 1.8, 32);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xff00aa, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = -2.99;
    this.centerInnerRing = ring2;
    this.scene.add(ring2);

    // Pulse ring system
    this.pulseRings = [];
    for (let i = 0; i < 3; i++) {
      const pGeo = new THREE.RingGeometry(1, 1.05, 32);
      const pMat = new THREE.MeshBasicMaterial({ color: 0x00fff0, transparent: true, opacity: 0.0, side: THREE.DoubleSide });
      const pRing = new THREE.Mesh(pGeo, pMat);
      pRing.rotation.x = -Math.PI / 2;
      pRing.position.y = -2.98;
      pRing.userData.phase = i / 3; // stagger phases
      this.pulseRings.push(pRing);
      this.scene.add(pRing);
    }

    // Vertical beam at center
    const beamGeo = new THREE.CylinderGeometry(0.05, 0.3, 6, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x00fff0, transparent: true, opacity: 0.15 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 0;
    this.scene.add(beam);
  }

  _buildParticleSystem() {
    const count = 600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const palette = [
      new THREE.Color(0x00fff0),
      new THREE.Color(0xff00aa),
      new THREE.Color(0x7700ff),
      new THREE.Color(0xf7c948),
      new THREE.Color(0x4ade80)
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 30 - 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;

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
          gl_PointSize = size * (200.0 / -mvPosition.z);
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
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
    this.particlePositions = positions;
  }

  _buildStarfield() {
    const count = 1000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 150 + Math.random() * 50;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, transparent: true, opacity: 0.6 });
    this.scene.add(new THREE.Points(geo, mat));
  }

  // ---- Agent Panels ----

  buildAgentPanels(agents) {
    // Remove existing panels
    this.agentPanels.forEach(p => this.scene.remove(p.group));
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

      // --- Panel backing ---
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
            // Border glow
            float border = 0.04;
            float bx = step(border, vUv.x) * step(border, 1.0 - vUv.x);
            float by = step(border, vUv.y) * step(border, 1.0 - vUv.y);
            float inner = bx * by;

            // Scanlines
            float scan = 0.9 + 0.1 * sin(vUv.y * 120.0 + time * 2.0);

            // Base panel color
            vec3 panelColor = mix(vec3(0.02, 0.02, 0.06), color * 0.12, inner);
            panelColor += color * (1.0 - inner) * (0.6 + 0.4 * selected);

            // Shimmer on hover
            float shimmer = (hovered + selected * 0.5) * 0.2 * sin(vUv.y * 40.0 + time * 5.0);
            panelColor += color * shimmer;

            // Scanline overlay
            panelColor *= scan;

            float alpha = inner * 0.7 + (1.0 - inner) * (0.8 + 0.2 * selected);
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

      // --- Holographic frame lines ---
      const frameMat = new THREE.LineBasicMaterial({
        color: agentColor,
        transparent: true,
        opacity: 0.9,
        linewidth: 2
      });
      const hw = panelW / 2, hh = panelH / 2;
      const corners = [
        new THREE.Vector3(-hw, -hh, 0.01),
        new THREE.Vector3(hw, -hh, 0.01),
        new THREE.Vector3(hw, hh, 0.01),
        new THREE.Vector3(-hw, hh, 0.01),
        new THREE.Vector3(-hw, -hh, 0.01)
      ];
      const frameGeo = new THREE.BufferGeometry().setFromPoints(corners);
      group.add(new THREE.Line(frameGeo, frameMat));

      // Corner tick marks
      const tickLen = 0.3;
      const ticks = [
        [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]
      ];
      ticks.forEach(([cx, cy]) => {
        const sx = Math.sign(cx), sy = Math.sign(cy);
        const tickPts = [
          new THREE.Vector3(cx - sx * tickLen, cy, 0.02),
          new THREE.Vector3(cx, cy, 0.02),
          new THREE.Vector3(cx, cy - sy * tickLen, 0.02)
        ];
        const tGeo = new THREE.BufferGeometry().setFromPoints(tickPts);
        group.add(new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })));
      });

      // --- Divider lines for 4 columns ---
      const divMat = new THREE.LineBasicMaterial({ color: agentColor, transparent: true, opacity: 0.35 });
      const colLabels = ['B', 'IP', 'R', 'D'];
      for (let d = 0; d < 4; d++) {
        if (d > 0) {
          const dx = -hw + (panelW / 4) * d;
          const divPts = [new THREE.Vector3(dx, -hh + 0.8, 0.01), new THREE.Vector3(dx, hh * 0.82, 0.01)];
          group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(divPts), divMat));
        }
        // Column top indicator dot
        const dotGeo = new THREE.CircleGeometry(0.07, 6);
        const dotMat = new THREE.MeshBasicMaterial({ color: agentColor, transparent: true, opacity: 0.6 });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(-hw + (panelW / 4) * (d + 0.5), hh * 0.82, 0.02);
        group.add(dot);
      }

      // --- Point light at panel ---
      const pLight = new THREE.PointLight(agentColor, 1.5, 8);
      pLight.position.set(0, 0, 1);
      group.add(pLight);

      // --- Floating sphere (avatar) ---
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

      // Orbit ring around avatar
      const ringGeo = new THREE.RingGeometry(0.5, 0.55, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: agentColor, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(avatar.position);
      ring.rotation.x = Math.PI / 4;
      group.add(ring);

      // --- Status indicator ---
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

      this.scene.add(group);

      this.agentPanels.push({
        group, panel, panelMat, avatar, ring, statusDot, pLight,
        agent, angle, x, z,
        baseY: 0,
        taskCards: []
      });
    });
  }

  _makeTaskCardTexture(task, agentColor, pixW = 128, pixH = 64) {
    const canvas = document.createElement('canvas');
    canvas.width = pixW;
    canvas.height = pixH;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = 'rgba(5, 5, 20, 0.9)';
    ctx.fillRect(0, 0, pixW, pixH);

    // Border
    ctx.strokeStyle = agentColor + '55';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.75, 0.75, pixW - 1.5, pixH - 1.5);

    // Priority stripe color
    const priColors = { critical: '#ff0055', high: '#f472b6', medium: '#f7c948', low: '#4ade80' };
    const priColor = priColors[task.priority] || '#808080';
    ctx.fillStyle = priColor;
    ctx.fillRect(0, 0, 3, pixH);

    // Task title (truncate)
    ctx.fillStyle = '#e0e0ff';
    ctx.font = 'bold 11px monospace';
    const maxW = pixW - 16;
    let title = task.title;
    while (ctx.measureText(title).width > maxW && title.length > 3) {
      title = title.slice(0, -1);
    }
    if (title !== task.title) title += '…';
    ctx.fillText(title, 8, 22);

    // Priority badge
    ctx.fillStyle = priColor;
    ctx.font = '8px monospace';
    ctx.fillText(task.priority.toUpperCase(), 8, pixH - 10);

    // Scanline effect
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = 0; y < pixH; y += 4) {
      ctx.fillRect(0, y, pixW, 2);
    }

    return new THREE.CanvasTexture(canvas);
  }

  updateAgentTasks(agentId, tasks) {
    const panelData = this.agentPanels.find(p => p.agent.id === agentId);
    if (!panelData) return;

    // Dispose old card textures & remove
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

        // Use canvas texture for rich card display
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
      if (selected && isSelected) {
        p.group.position.z += 0;
      }
    });
  }

  zoomToAgent(agentId) {
    const panelData = this.agentPanels.find(p => p.agent.id === agentId);
    if (!panelData) return;
    const { x, z } = panelData;
    const dir = new THREE.Vector3(x, 0, z).normalize();
    const targetRadius = 10;
    this.orbitState.targetRadius = targetRadius;
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
        const agentId = obj.userData.agentId;
        if (this.onAgentClick) this.onAgentClick(agentId);
      }
    } else if (this.selectedAgent) {
      // Click empty space — reset
      if (this.onAgentClick) this.onAgentClick(null);
    }
  }

  _onTouch(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      // Simulate click
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

  buildAgentLabels(agents) {
    const container = document.getElementById('agent-labels');
    if (!container) return;
    container.innerHTML = '';
    this.labelEls = [];

    agents.forEach((agent, i) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = `
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: none;
        transform: translate(-50%, -50%);
        transition: opacity 0.3s;
      `;

      const nameEl = document.createElement('div');
      nameEl.style.cssText = `
        font-family: 'Orbitron', monospace;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.18em;
        color: ${agent.color};
        text-shadow: 0 0 8px ${agent.color}, 0 0 20px ${agent.color}40;
        white-space: nowrap;
        background: rgba(0,0,0,0.6);
        padding: 2px 8px;
        border: 1px solid ${agent.color}50;
        border-radius: 2px;
        backdrop-filter: blur(4px);
      `;
      nameEl.textContent = `${agent.emoji} ${agent.name.toUpperCase()}`;

      const roleEl = document.createElement('div');
      roleEl.style.cssText = `
        font-family: 'Share Tech Mono', monospace;
        font-size: 7px;
        color: rgba(200,200,255,0.55);
        letter-spacing: 0.12em;
        white-space: nowrap;
        margin-top: 2px;
      `;
      roleEl.textContent = agent.role.toUpperCase();

      wrap.appendChild(nameEl);
      wrap.appendChild(roleEl);
      container.appendChild(wrap);
      this.labelEls.push(wrap);
    });
  }

  _updateLabels() {
    if (!this.labelEls || !this.agentPanels.length) return;
    const canvas = this.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    this.agentPanels.forEach((pd, i) => {
      const el = this.labelEls[i];
      if (!el) return;

      // Project avatar position to screen
      const pos = new THREE.Vector3();
      pd.avatar.getWorldPosition(pos);
      pos.project(this.camera);

      const x = ((pos.x + 1) / 2) * w;
      const y = ((-pos.y + 1) / 2) * h;

      // Only show if in front of camera
      if (pos.z < 1) {
        el.style.left = x + 'px';
        el.style.top = (y - 32) + 'px';
        el.style.opacity = '1';
      } else {
        el.style.opacity = '0';
      }
    });
  }

  _animate() {
    this.animFrameId = requestAnimationFrame(() => this._animate());
    const elapsed = this.clock.getElapsedTime();

    // Update orbit camera
    this._updateOrbitCamera();

    // Animate particle system
    if (this.particles) {
      this.particles.material.uniforms.time.value = elapsed;
    }

    // Animate grid scroll
    if (this.gridGroup) {
      this.gridGroup.position.z = (elapsed * 1.5) % 2;
    }

    // Animate agent panels
    this.agentPanels.forEach((pd, i) => {
      // Gentle float
      pd.group.position.y = pd.baseY + Math.sin(elapsed * 0.7 + i * 0.8) * 0.15;

      // Animate panel shader
      pd.panelMat.uniforms.time.value = elapsed;

      // Rotate avatar sphere
      pd.avatar.rotation.y = elapsed * 0.8 + i;
      pd.ring.rotation.z = elapsed * 0.4 + i;

      // Pulse status dot
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 3 + i);
      pd.statusDot.material.emissiveIntensity = 2 + pulse * 3;

      // Hover detection
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObject(pd.panel);
      if (hits.length > 0) {
        pd.panelMat.uniforms.hovered.value = 1.0;
        document.body.style.cursor = 'pointer';
      } else {
        pd.panelMat.uniforms.hovered.value = 0.0;
      }
    });

    // Animate dynamic lights
    if (this.dynamicLights) {
      this.dynamicLights[0].position.x = Math.sin(elapsed * 0.4) * 20;
      this.dynamicLights[0].position.z = Math.cos(elapsed * 0.4) * 20;
      this.dynamicLights[1].position.x = Math.cos(elapsed * 0.3) * 20;
      this.dynamicLights[1].position.z = Math.sin(elapsed * 0.3) * 20;
    }

    // Check if any panel hovered for cursor
    const anyHovered = this.agentPanels.some(pd => pd.panelMat.uniforms.hovered.value > 0);
    if (!anyHovered) document.body.style.cursor = 'default';

    // Animate pulse rings
    if (this.pulseRings) {
      this.pulseRings.forEach(ring => {
        const phase = ring.userData.phase;
        const t = ((elapsed * 0.5 + phase) % 1.0);
        const maxR = 14;
        const r = t * maxR;
        ring.scale.set(r, r, r);
        ring.material.opacity = (1 - t) * 0.25;
      });
    }

    // Rotate center inner ring
    if (this.centerInnerRing) {
      this.centerInnerRing.rotation.z = elapsed * 0.8;
    }

    // Update HTML labels
    this._updateLabels();

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.renderer.dispose();
  }
}
