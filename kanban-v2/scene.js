// ============================================================
// GRACE COMMAND CENTER — Three.js 3D Scene (v2 - Orbital)
// ============================================================

class KanbanScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.agentPanels = [];
    this.orbitRings = [];
    this.particleSystems = [];
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredObject = null;
    this.selectedAgent = null;
    this.interactiveObjects = [];
    this.onAgentClick = null;
    this.animFrameId = null;
    this.burndownChart = null;

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
    this.camera.position.set(0, 20, 28);
    this.camera.lookAt(0, 0, 0);

    // --- Orbit Controls (manual) ---
    this._setupOrbitControls();

    // --- Environment ---
    this._setupLighting();
    this._buildSynthwaveGrid();
    this._buildCenterCore(); // New: icosahedron core
    this._buildOrbitalRings(); // New: orbital ring system
    this._buildParticleSystem();
    this._buildStarfield();
    this._buildBurndownChart(); // New: 3D bar chart

    // --- Events ---
    window.addEventListener('resize', () => this._onResize());
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('click', (e) => this._onClick(e));
    this.canvas.addEventListener('touchstart', (e) => this._onTouch(e), { passive: true });

    // Start animation
    this._animate();
  }

  _buildCenterCore() {
    // Icosahedron core for Grace
    const coreGeo = new THREE.IcosahedronGeometry(2, 1);
    const coreMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00fff0) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        uniform float time;
        
        void main() {
          vNormal = normal;
          vPos = position;
          vec3 pos = position;
          pos += normal * (sin(time * 0.5 + position.y * 2.0) * 0.1);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        uniform float time;
        uniform vec3 color;
        
        void main() {
          float edge = 1.0 - pow(abs(dot(normalize(vNormal), normalize(vec3(1,2,3)))), 2.0);
          vec3 glowColor = mix(color * 0.5, color, edge);
          float pulse = 0.8 + 0.2 * sin(time * 0.5);
          gl_FragColor = vec4(glowColor * pulse, 0.9);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.centerCore = new THREE.Mesh(coreGeo, coreMat);
    this.scene.add(this.centerCore);

    // Glow effect
    const glowGeo = new THREE.IcosahedronGeometry(2.2, 1);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform float time;
        void main() {
          float edge = pow(1.0 - abs(dot(vNormal, vec3(0,0,1))), 2.0);
          vec3 glow = vec3(0,1,0.94) * edge * (0.8 + 0.2 * sin(time * 0.5));
          gl_FragColor = vec4(glow, edge * 0.5);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });

    const glow = new THREE.Mesh(glowGeo, glowMat);
    this.centerGlow = glow;
    this.scene.add(glow);
  }

  _buildOrbitalRings() {
    const ringRadii = [8, 12, 16, 20]; // One per column
    const ringLabels = ['BACKLOG', 'IN PROGRESS', 'REVIEW', 'DONE'];
    
    ringRadii.forEach((radius, i) => {
      const ring = new THREE.Group();
      
      // Main orbital ring
      const ringGeo = new THREE.TorusGeometry(radius, 0.1, 16, 100);
      const ringMat = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          baseColor: { value: new THREE.Color(0x00fff0) }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float time;
          uniform vec3 baseColor;
          void main() {
            float flow = sin(vUv.x * 30.0 + time * 0.5);
            vec3 color = baseColor * (0.6 + 0.4 * flow);
            gl_FragColor = vec4(color, 0.7);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ring.add(ringMesh);
      
      // Label floating above
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, 256, 64);
      
      ctx.font = 'bold 24px "Share Tech Mono"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Outer glow
      ctx.strokeStyle = '#00fff0';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.3;
      ctx.strokeText(ringLabels[i], 128, 32);
      
      // Inner text
      ctx.fillStyle = '#00fff0';
      ctx.globalAlpha = 1;
      ctx.fillText(ringLabels[i], 128, 32);
      
      const texture = new THREE.CanvasTexture(canvas);
      const labelGeo = new THREE.PlaneGeometry(4, 1);
      const labelMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      
      const label = new THREE.Mesh(labelGeo, labelMat);
      label.position.y = 2;
      label.rotation.x = -Math.PI / 2;
      ring.add(label);
      
      // Apply tilt
      ring.rotation.x = Math.PI / 6;
      ring.rotation.y = (i * Math.PI / 2); // Spread rings around
      
      this.scene.add(ring);
      this.orbitRings.push({ group: ring, mesh: ringMesh, radius });
    });
  }

  _buildBurndownChart() {
    const chart = new THREE.Group();
    chart.position.set(12, 0, 12); // Position in corner
    
    // Base platform
    const baseGeo = new THREE.BoxGeometry(6, 0.2, 6);
    const baseMat = new THREE.MeshPhongMaterial({
      color: 0x00fff0,
      transparent: true,
      opacity: 0.3
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    chart.add(base);
    
    // Create bars (will update heights dynamically)
    const bars = [];
    const barColors = [0x00fff0, 0xff00aa, 0x7c3aed, 0x4ade80];
    
    for (let i = 0; i < 4; i++) {
      const barGeo = new THREE.BoxGeometry(0.8, 1, 0.8);
      const barMat = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(barColors[i]) }
        },
        vertexShader: `
          varying vec2 vUv;
          uniform float time;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float time;
          uniform vec3 color;
          void main() {
            float edge = pow(1.0 - vUv.y, 2.0);
            vec3 finalColor = mix(color * 0.5, color, edge);
            float pulse = 0.8 + 0.2 * sin(time * 0.5 + vUv.y * 3.0);
            gl_FragColor = vec4(finalColor * pulse, 0.9);
          }
        `,
        transparent: true
      });
      
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(-2.25 + (i * 1.5), 0.5, 0);
      chart.add(bar);
      bars.push(bar);
    }
    
    this.burndownChart = { group: chart, bars };
    this.scene.add(chart);
  }

  updateBurndown(stats) {
    if (!this.burndownChart) return;
    
    const values = [
      stats.backlog || 0,
      stats.inprogress || 0,
      stats.review || 0,
      stats.done || 0
    ];
    
    const maxVal = Math.max(...values, 1);
    const scale = 5 / maxVal; // Max height of 5 units
    
    this.burndownChart.bars.forEach((bar, i) => {
      const targetHeight = values[i] * scale;
      bar.scale.y = targetHeight;
      bar.position.y = targetHeight / 2 + 0.1;
    });
  }

  // ... [The rest of the class remains largely the same, with animation speeds reduced] ...

  _animate() {
    this.animFrameId = requestAnimationFrame(() => this._animate());
    const elapsed = this.clock.getElapsedTime();

    // Update orbit camera
    this._updateOrbitCamera();

    // Rotate center core slowly
    if (this.centerCore) {
      this.centerCore.rotation.y = elapsed * 0.2;
      this.centerCore.rotation.z = elapsed * 0.1;
      this.centerCore.material.uniforms.time.value = elapsed;
    }
    if (this.centerGlow) {
      this.centerGlow.material.uniforms.time.value = elapsed;
    }

    // Animate orbital rings
    this.orbitRings.forEach((ring, i) => {
      ring.mesh.material.uniforms.time.value = elapsed;
      ring.group.rotation.y = (i * Math.PI / 2) + elapsed * 0.1; // Slow rotation
    });

    // Update burndown chart
    if (this.burndownChart) {
      this.burndownChart.bars.forEach(bar => {
        bar.material.uniforms.time.value = elapsed;
      });
    }

    // Agent orbs and cards updated in buildAgentPanels()

    this.renderer.render(this.scene, this.camera);
  }
}