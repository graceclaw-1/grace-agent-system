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

    this.orbitState.lastInteraction = 0;

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

    // Auto-rotation disabled — was causing unwanted clockwise spin

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

    // No floor plane — grid lines only (plane caused a visible rectangle artifact)

    this.gridGroup = gridGroup;
    this.scene.add(gridGroup);
  }

  // _buildSunHorizon removed — was causing visible square/rectangle artifacts

  _buildCenterPlatform() {
    // Outer ring removed — was appearing as a pulse ring artifact

    // Inner ring — use a small sprite glow instead of RingGeometry (avoids rectangle artifact)
    const innerCanvas = document.createElement('canvas');
    innerCanvas.width = 64; innerCanvas.height = 64;
    const ictx = innerCanvas.getContext('2d');
    const ig = ictx.createRadialGradient(32, 32, 2, 32, 32, 32);
    ig.addColorStop(0, 'rgba(255,0,170,0.9)');
    ig.addColorStop(0.4, 'rgba(255,0,170,0.3)');
    ig.addColorStop(1, 'transparent');
    ictx.fillStyle = ig;
    ictx.fillRect(0, 0, 64, 64);
    const innerTex = new THREE.CanvasTexture(innerCanvas);
    const innerMat = new THREE.SpriteMaterial({ map: innerTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 });
    const innerSprite = new THREE.Sprite(innerMat);
    innerSprite.position.set(0, -2.5, 0);
    innerSprite.scale.set(4, 4, 1);
    this.centerInnerRing = innerSprite;
    this.scene.add(innerSprite);

    // Pulse rings removed — were causing visible expanding square artifacts
    this.pulseRings = [];

    // Vertical beam removed — caused a rectangular artifact on mobile
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
    // Remove existing panels and connection lines
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

      // Avatar orbit ring removed — appeared as spinning ring
      const ring = null; // kept as null ref for compatibility

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

      // --- Connection line to center ---
      const lineMat = new THREE.LineBasicMaterial({
        color: agentColor,
        transparent: true,
        opacity: 0.12
      });
      // Note: line is in world space so we add to scene, not group
      const linePts = [
        new THREE.Vector3(x * 0.1, -1.5, z * 0.1),
        new THREE.Vector3(x * 0.95, -0.5, z * 0.95)
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const connectionLine = new THREE.Line(lineGeo, lineMat);
      this.scene.add(connectionLine);

      this.scene.add(group);

      this.agentPanels.push({
        group, panel, panelMat, avatar, ring, statusDot, pLight,
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
    ctx.font = 'bold 18px monospace';
    const maxW = pixW - 16;
    let title = task.title;
    while (ctx.measureText(title).width > maxW && title.length > 3) {
      title = title.slice(0, -1);
    }
    if (title !== task.title) title += '…';
    ctx.fillText(title, 8, 22);

    // Priority badge
    ctx.fillStyle = priColor;
    ctx.font = '12px monospace';
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
        font-size: 18px;
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
        font-size: 15px;
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
        font-size: 14px;
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

  updateLabelTaskCounts(agentId, count) {
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

    // aurora removed

    // Grid scroll — removed (was distracting)

    // Connection lines — static opacity, no flicker
    this.agentPanels.forEach((pd) => {
      if (pd.connectionLine) {
        pd.connectionLine.material.opacity = 0.1;
      }
    });

    // Agent panels — minimal animation only
    this.agentPanels.forEach((pd, i) => {
      // No floating — panels stay still
      pd.group.position.y = pd.baseY;

      // Panel shader time (drives subtle scanline only, not rapid flash)
      pd.panelMat.uniforms.time.value = elapsed * 0.2; // slowed 5x

      // Slow avatar rotation
      pd.avatar.rotation.y = elapsed * 0.2 + i;
      if (pd.ring) pd.ring.rotation.z = elapsed * 0.1 + i;

      // Status dot — static glow, no pulse
      pd.statusDot.material.emissiveIntensity = 2.5;

      // Hover detection for cursor
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObject(pd.panel);
      if (hits.length > 0) {
        pd.panelMat.uniforms.hovered.value = 1.0;
        document.body.style.cursor = 'pointer';
      } else {
        pd.panelMat.uniforms.hovered.value = 0.0;
      }
    });

    // Dynamic lights — static positions, no swirl
    // (removed movement — was causing rapid light-flicker on panels)

    // Cursor reset
    const anyHovered = this.agentPanels.some(pd => pd.panelMat.uniforms.hovered.value > 0);
    if (!anyHovered) document.body.style.cursor = 'default';

    // Pulse rings — removed (was a visible expanding square ring)
    // Center glow — static
    if (this.centerInnerRing && this.centerInnerRing.material) {
      this.centerInnerRing.material.opacity = 0.6;
    }

    // Update HTML labels
    this._updateLabels();

    this.renderer.render(this.scene, this.camera);
  }

  // Alias for v2 app.js compatibility (singular vs plural naming)
  updateLabelTaskCount(agentId, count) {
    this.updateLabelTaskCounts(agentId, count);
  }

  // v2 app.js calls this for burndown chart — graceful no-op in v1 scene
  updateBurndown(stats) {}

  dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.renderer.dispose();
  }
}
