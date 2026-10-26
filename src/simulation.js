import * as THREE from 'three';

export class CNCSimulator3D {
  constructor(canvasContainer, onStateChange = () => {}) {
    this.container = canvasContainer;
    this.onStateChange = onStateChange;

    this.mode = 'turn'; // 'turn' or 'mill'
    this.blank = { d: 80, l: 100, x: 100, y: 80, z: 20 };
    this.isRunning = false;
    this.isPaused = false;
    this.speed = 18; // 1 - 100 slider
    this.stepIndex = 0;
    this.steps = [];
    this.totalCycleTime = 0;
    this.lastLineIndex = -1;

    // View angles
    this.azimuth = 0.75;
    this.elevation = 0.45;
    this.distance = 220;
    this.target = new THREE.Vector3(0, 0, 0);

    // Three.js instances
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.stockMesh = null;
    this.toolMesh = null;
    this.chuckMesh = null;
    this.triadGroup = null;

    // Stock data
    this.turnStock = null; // { res, n, radii: Float32Array }
    this.millStock = null; // { res, nx, ny, heights: Float32Array }
    this.isMeshDirty = false;
    this.crossSectionMode = false;
    this.showOrigin = true;

    this.initScene();
    this.setupInteractions();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e131b);

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    const aspect = width / Math.max(height, 1);

    this.perspCamera = new THREE.PerspectiveCamera(40, aspect, 1, 5000);
    this.orthoCamera = new THREE.OrthographicCamera(-100, 100, 100, -100, -2000, 2000);

    // Default to Orthographic camera for 2D View (eliminates perspective taper distortion at cylinder ends)
    this.isOrtho = true;
    this.camera = this.orthoCamera;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // 1. Ambient & Radiant Lights (adapted per mode)
    this.amb = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(this.amb);

    this.cyanAmb = new THREE.AmbientLight(0x00e5ff, 0.55);
    this.scene.add(this.cyanAmb);

    // 2. Camera Headlamp: Guarantees that whatever surface the user views is brightly lit
    this.cameraLight = new THREE.DirectionalLight(0xffffff, 0.85);
    this.perspCamera.add(this.cameraLight.clone());
    this.orthoCamera.add(this.cameraLight);
    this.scene.add(this.perspCamera);
    this.scene.add(this.orthoCamera);

    // 3. Studio Key Light (Front-Top-Right of workpiece, shining directly on face and contour)
    this.keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
    this.keyLight.position.set(200, 250, 180);
    this.scene.add(this.keyLight);

    // 4. Studio Soft Fill from bottom-front
    this.fillLight = new THREE.DirectionalLight(0x38e8ff, 0.5);
    this.fillLight.position.set(100, -150, 120);
    this.scene.add(this.fillLight);

    // 5. Back rim light
    this.rimLight = new THREE.DirectionalLight(0x70f5ff, 0.5);
    this.rimLight.position.set(-200, 180, -150);
    this.scene.add(this.rimLight);

    // Coordinate Triad
    this.createTriad();

    // Resize observer
    const ro = new ResizeObserver(() => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w > 0 && h > 0) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
      }
    });
    ro.observe(this.container);

    this.resetStock();
  }

  createAxisLabelSprite(text, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 28px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colorHex;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(text, 32, 32);
    ctx.fillText(text, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(6, 6, 1);
    return sprite;
  }

  createTriad() {
    if (this.triadGroup) {
      this.scene.remove(this.triadGroup);
    }
    this.triadGroup = new THREE.Group();
    const len = 22;

    const makeArrow = (dir, color, isDashed = false) => {
      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), len, color, 3.5, 2.2);
      if (isDashed) {
        arrow.line.material = new THREE.LineDashedMaterial({
          color,
          dashSize: 2,
          gapSize: 1.5,
          opacity: 0.65,
          transparent: true
        });
        arrow.line.computeLineDistances();
      }
      this.triadGroup.add(arrow);
    };

    const makeLabel = (text, dir, colorStr) => {
      const sprite = this.createAxisLabelSprite(text, colorStr);
      sprite.position.copy(dir).multiplyScalar(len + 4.5);
      this.triadGroup.add(sprite);
    };

    if (this.mode === 'turn') {
      // In CNC Lathe: Machine Z is horizontal (Three.js X), Machine X is vertical radial (Three.js Y)
      makeArrow(new THREE.Vector3(1, 0, 0), 0x0088ff);
      makeLabel('+Z', new THREE.Vector3(1, 0, 0), '#38a8ff');
      makeArrow(new THREE.Vector3(-1, 0, 0), 0x004488, true);
      makeLabel('-Z', new THREE.Vector3(-1, 0, 0), '#70b5ff');

      makeArrow(new THREE.Vector3(0, 1, 0), 0xff3b30);
      makeLabel('+X', new THREE.Vector3(0, 1, 0), '#ff4d4d');
      makeArrow(new THREE.Vector3(0, -1, 0), 0x882020, true);
      makeLabel('-X', new THREE.Vector3(0, -1, 0), '#ff8888');

      makeArrow(new THREE.Vector3(0, 0, 1), 0x34c759);
      makeLabel('+Y', new THREE.Vector3(0, 0, 1), '#4cd964');
      makeArrow(new THREE.Vector3(0, 0, -1), 0x186028, true);
      makeLabel('-Y', new THREE.Vector3(0, 0, -1), '#80e090');
    } else {
      // In CNC Mill: Table X is horizontal, Spindle Z is vertical, Saddle Y is depth
      makeArrow(new THREE.Vector3(1, 0, 0), 0xff3b30);
      makeLabel('+X', new THREE.Vector3(1, 0, 0), '#ff4d4d');
      makeArrow(new THREE.Vector3(-1, 0, 0), 0x882020, true);
      makeLabel('-X', new THREE.Vector3(-1, 0, 0), '#ff8888');

      makeArrow(new THREE.Vector3(0, 1, 0), 0x0088ff);
      makeLabel('+Z', new THREE.Vector3(0, 1, 0), '#38a8ff');
      makeArrow(new THREE.Vector3(0, -1, 0), 0x004488, true);
      makeLabel('-Z', new THREE.Vector3(0, -1, 0), '#70b5ff');

      makeArrow(new THREE.Vector3(0, 0, 1), 0x34c759);
      makeLabel('+Y', new THREE.Vector3(0, 0, 1), '#4cd964');
      makeArrow(new THREE.Vector3(0, 0, -1), 0x186028, true);
      makeLabel('-Y', new THREE.Vector3(0, 0, -1), '#80e090');
    }

    this.scene.add(this.triadGroup);
    this.createOriginDatumMarker();
  }

  createOriginDatumMarker() {
    if (this.datumGroup) {
      this.scene.remove(this.datumGroup);
    }
    this.datumGroup = new THREE.Group();

    // 1. Datum Target: Circular quadrant disc (Classic CAD / CAM datum target W / G54)
    // Scaled down to subtle, proportional diameter (radius = 2.0 mm) so it does not obstruct workpiece or cut tip
    const radius = 2.0;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);

    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    const colors = ['#e74c3c', '#f1c40f', '#e74c3c', '#f1c40f'];
    for (let q = 0; q < 4; q++) {
      ctx.beginPath();
      ctx.moveTo(64, 64);
      ctx.arc(64, 64, 56, q * Math.PI / 2, (q + 1) * Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = colors[q];
      ctx.fill();
    }

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(64, 0); ctx.lineTo(64, 128);
    ctx.moveTo(0, 64); ctx.lineTo(128, 64);
    ctx.stroke();

    const datumTex = new THREE.CanvasTexture(canvas);
    const datumMat = new THREE.SpriteMaterial({ map: datumTex, depthTest: false, depthWrite: false });
    const datumSprite = new THREE.Sprite(datumMat);
    datumSprite.scale.set(radius * 2, radius * 2, 1);
    datumSprite.position.set(0, 0, 0);
    this.datumGroup.add(datumSprite);

    // 2. Full Axis Centerline Guides through the Origin extending in + and - directions
    const axisLen = 140;
    const createLine = (p1, p2, color, dashed = false) => {
      const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const mat = dashed
        ? new THREE.LineDashedMaterial({ color, dashSize: 4, gapSize: 3, opacity: 0.45, transparent: true })
        : new THREE.LineBasicMaterial({ color, opacity: 0.65, transparent: true });
      const line = new THREE.Line(geo, mat);
      if (dashed) line.computeLineDistances();
      this.datumGroup.add(line);
    };

    // Longitudinal axis (+Z and -Z)
    createLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(axisLen, 0, 0), 0x0099ff);
    createLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-axisLen, 0, 0), 0x0055aa, true);

    // Radial axis (+X and -X)
    createLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, axisLen, 0), 0xff3b30);
    createLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -axisLen, 0), 0x992222, true);

    // Depth axis (+Y and -Y)
    createLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, axisLen), 0x34c759);
    createLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -axisLen), 0x207038, true);

    this.scene.add(this.datumGroup);
    this.datumGroup.visible = this.showOrigin !== false;
  }

  setOriginVisible(visible) {
    this.showOrigin = !!visible;
    if (this.datumGroup) {
      this.datumGroup.visible = this.showOrigin;
    }
    return this.showOrigin;
  }

  toggleOriginVisible() {
    return this.setOriginVisible(!this.showOrigin);
  }

  setupInteractions() {
    const dom = this.renderer.domElement;
    let isDragging = false;
    let isPanning = false;
    let prevX = 0;
    let prevY = 0;

    dom.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dom.setPointerCapture(e.pointerId);
      if (e.button === 2 || e.shiftKey) {
        isPanning = true;
      } else {
        isDragging = true;
      }
      prevX = e.clientX;
      prevY = e.clientY;
    });

    dom.addEventListener('pointermove', (e) => {
      if (!isDragging && !isPanning) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      if (isDragging) {
        this.azimuth -= dx * 0.008;
        this.elevation = Math.max(-1.52, Math.min(1.52, this.elevation + dy * 0.008));
        if (Math.abs(this.azimuth) > 0.04 || Math.abs(this.elevation) > 0.04) {
          if (this.isOrtho) {
            this.isOrtho = false;
            this.camera = this.perspCamera;
          }
        }
      } else if (isPanning) {
        const panSpeed = this.distance * 0.0015;
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();

        this.target.addScaledVector(right, -dx * panSpeed);
        this.target.addScaledVector(up, dy * panSpeed);
      }
    });

    const endDrag = () => {
      isDragging = false;
      isPanning = false;
    };

    dom.addEventListener('pointerup', endDrag);
    dom.addEventListener('pointercancel', endDrag);

    // Zoom on wheel
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.distance = Math.max(20, Math.min(1200, this.distance * (e.deltaY > 0 ? 1.08 : 0.92)));
    }, { passive: false });

    // Prevent context menu
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setMode(mode, blank) {
    this.mode = mode;
    this.blank = blank;
    this.resetStock();
  }

  resetStock() {
    this.stop();
    this.stepIndex = 0;
    this.lastLineIndex = -1;

    // Clean existing meshes
    if (this.stockMesh) {
      this.scene.remove(this.stockMesh);
      if (this.stockMesh.geometry) this.stockMesh.geometry.dispose();
      this.stockMesh = null;
    }
    if (this.toolMesh) {
      this.scene.remove(this.toolMesh);
      this.toolMesh.traverse(child => {
        if (child.isMesh && child.geometry) child.geometry.dispose();
      });
      this.toolMesh = null;
    }
    if (this.turnEdgesMesh) {
      this.scene.remove(this.turnEdgesMesh);
      if (this.turnEdgesMesh.geometry) this.turnEdgesMesh.geometry.dispose();
      this.turnEdgesMesh = null;
    }
    if (this.millEdgesMesh) {
      this.scene.remove(this.millEdgesMesh);
      if (this.millEdgesMesh.geometry) this.millEdgesMesh.geometry.dispose();
      this.millEdgesMesh = null;
    }

    const { colorTex, bumpTex } = this.createLatheFinishTextures();

    // Turning Stock Material: Precision-machined industrial steel/aluminum with vertex colors for cut contrast (identical to mill)
    const latheStockMat = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.38,
      vertexColors: true,
      side: THREE.DoubleSide
    });

    // Mill material: Precision-machined industrial steel/aluminum with vertex colors for cut contrast
    const millStockMat = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.38,
      vertexColors: true,
      side: THREE.DoubleSide
    });

    // Configure lighting: Studio fixed lighting anchored in world space (no angle-dependent wobble or cyan tint)
    if (this.cyanAmb) this.cyanAmb.intensity = 0.0;
    if (this.cameraLight) this.cameraLight.intensity = 0.0; // Turn off headlamp to prevent angle-dependent glare
    if (this.amb) this.amb.intensity = 0.70;

    // Studio Fixed Key Light (Top-Right-Front in world space)
    if (this.keyLight) {
      this.keyLight.color.setHex(0xffffff);
      this.keyLight.intensity = 1.10;
      this.keyLight.position.set(160, 320, 180);
    }
    // Studio Fixed Fill Light (Top-Left-Back in world space)
    if (this.fillLight) {
      this.fillLight.color.setHex(0xdbeafe);
      this.fillLight.intensity = 0.50;
      this.fillLight.position.set(-160, 220, -140);
    }
    // Top overhead light for constant cavity illumination
    if (this.rimLight) {
      this.rimLight.color.setHex(0xffffff);
      this.rimLight.intensity = 0.40;
      this.rimLight.position.set(0, 380, 0);
    }

    if (this.mode === 'turn') {
      const res = 0.5; // 0.5mm station resolution along Z
      const nStations = Math.ceil(this.blank.l / res) + 1;
      const initialRadii = new Float32Array(nStations).fill(9999);
      this.turnStock = { res, n: nStations, radii: initialRadii };

      this.stockMesh = new THREE.Mesh(new THREE.BufferGeometry(), latheStockMat);
      this.scene.add(this.stockMesh);

      // Tool Mesh: Carbide insert holder
      this.createLatheToolMesh();

      const maxDim = Math.max(this.blank.w || this.blank.d || 100, this.blank.h || this.blank.d || 100, this.blank.l || 100);
      this.target.set(-this.blank.l / 2, 0, 0);
      this.distance = maxDim * 2.3;
      this.setView('front');
      this.updateTurnMesh();
    } else {
      // Mill Mode: High-density resolution for smooth SolidWorks curves & crisp features
      const res = Math.max(0.32, Math.max(this.blank.x, this.blank.y) / 280);
      const nx = Math.ceil(this.blank.x / res) + 1;
      const ny = Math.ceil(this.blank.y / res) + 1;
      const initialHeights = new Float32Array(nx * ny).fill(0); // Top surface is Z=0
      this.millStock = { res, nx, ny, heights: initialHeights };

      this.stockMesh = new THREE.Mesh(new THREE.BufferGeometry(), millStockMat);
      this.scene.add(this.stockMesh);

      this.createMillToolMesh(5); // Default Ø10mm (R=5)

      this.target.set(this.blank.x / 2, -this.blank.z / 2, -this.blank.y / 2);
      this.distance = Math.max(this.blank.x, this.blank.y) * 2.2;
      this.setView('top'); // Default Top view (XY) for mill
      this.updateMillMesh();
    }

    this.isMeshDirty = false;
  }

  createLatheFinishTextures() {
    // 1. Color / Diffuse texture: Provides subtle concentric circular feed-line shading
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = 512;
    colorCanvas.height = 1024;
    const cctx = colorCanvas.getContext('2d');

    // Base pure white (multiplied by stockMat.color 0x00e5ff)
    cctx.fillStyle = '#ffffff';
    cctx.fillRect(0, 0, 512, 1024);

    // Regular lathe feed grooves (pitch = 10px, gives authentic ~100 turned rings along length)
    const pitch = 10;
    for (let y = 0; y < 1024; y += pitch) {
      const grad = cctx.createLinearGradient(0, y, 0, y + pitch);
      grad.addColorStop(0.0, 'rgba(0, 165, 195, 0.20)'); // subtle feed mark valley
      grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.08)');
      grad.addColorStop(0.70, 'rgba(255, 255, 255, 0.35)'); // cusp peak reflection
      grad.addColorStop(1.0, 'rgba(0, 165, 195, 0.20)');
      cctx.fillStyle = grad;
      cctx.fillRect(0, y, 512, pitch);
    }

    // Very fine circumferential micro-grain (turning marks along rotation)
    cctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let i = 0; i < 40; i++) {
      const rx = (i * 13) % 512;
      cctx.fillRect(rx, 0, 2, 1024);
    }

    const colorTex = new THREE.CanvasTexture(colorCanvas);
    colorTex.wrapS = THREE.RepeatWrapping;
    colorTex.wrapT = THREE.RepeatWrapping;
    colorTex.repeat.set(1, 1);

    // 2. Bump map: physical micro-cusps for realistic directional light reflection
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 256;
    bumpCanvas.height = 1024;
    const bctx = bumpCanvas.getContext('2d');

    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, 256, 1024);

    for (let y = 0; y < 1024; y++) {
      const phase = (y % pitch) / pitch; // 0 to 1
      // Smooth scallop curve: tool nose radius parabolic cusp profile
      const scallop = Math.sin(phase * Math.PI);
      const val = Math.round(128 + scallop * 42);
      bctx.fillStyle = `rgb(${val},${val},${val})`;
      bctx.fillRect(0, y, 256, 1);
    }

    const bumpTex = new THREE.CanvasTexture(bumpCanvas);
    bumpTex.wrapS = THREE.RepeatWrapping;
    bumpTex.wrapT = THREE.RepeatWrapping;
    bumpTex.repeat.set(1, 1);

    return { colorTex, bumpTex };
  }

  createLatheToolMesh() {
    const group = new THREE.Group();

    // Pure Standalone Carbide Rhombic Insert (matching genuine seeNC Turn)
    // No horizontal tool shank or shoulder block obstructing the workpiece
    const insertGeo = new THREE.BoxGeometry(6.5, 3.2, 6.5);
    const insertMat = new THREE.MeshStandardMaterial({
      color: 0xc89632, // TiN coated golden carbide
      metalness: 0.78,
      roughness: 0.28
    });
    const insert = new THREE.Mesh(insertGeo, insertMat);
    insert.position.set(0, 0, 0);
    insert.rotation.y = Math.PI / 4; // Rhombic cutting orientation
    group.add(insert);

    this.toolMesh = group;
    this.scene.add(this.toolMesh);
  }

  createMillToolMesh(toolRadius = 5) {
    if (this.toolMesh) {
      this.scene.remove(this.toolMesh);
      this.toolMesh.traverse(child => {
        if (child.isMesh && child.geometry) child.geometry.dispose();
      });
    }
    const group = new THREE.Group();

    // Pure Standalone Cylindrical Cutting Tool (matching genuine seeNC)
    // No bulky shoulder or spindle collar obstructing the view
    const cutterLength = 36;
    const cutterGeo = new THREE.CylinderGeometry(toolRadius, toolRadius, cutterLength, 32);
    const cutterMat = new THREE.MeshStandardMaterial({
      color: 0xc89632,        // Rich golden carbide (TiN coated)
      metalness: 0.78,
      roughness: 0.28
    });
    const cutter = new THREE.Mesh(cutterGeo, cutterMat);
    cutter.position.y = cutterLength / 2; // Tip sits exactly at y = 0
    group.add(cutter);

    this.toolMesh = group;
    this.scene.add(this.toolMesh);
  }

  updateTurnMesh() {
    if (!this.turnStock || !this.stockMesh) return;
    const { res, n, radii } = this.turnStock;
    const halfW = (this.blank.w || this.blank.d || 100) / 2;
    const halfH = (this.blank.h || this.blank.thickness || this.blank.d || 100) / 2;

    const offsetX = this.blank.centerX || 0;
    const offsetY = this.blank.centerY || 0;
    const offsetZ = this.blank.centerZ || 0;

    const nTheta = 72; // 72 angular steps (5° steps for crisp cylinder & cuboid faces)
    const P = [];
    const C = [];
    const N = [];
    const L = []; // Line segments for CAD boundary edges

    const addVert = (p, c, norm) => {
      P.push(p[0], p[1], p[2]);
      C.push(c[0], c[1], c[2]);
      N.push(norm[0], norm[1], norm[2]);
    };

    const addTri = (p0, p1, p2, c0, c1, c2, n0, n1, n2) => {
      addVert(p0, c0, n0);
      addVert(p1, c1, n1);
      addVert(p2, c2, n2);
    };

    const addEdgeLine = (p1, p2) => {
      L.push(p1[0], p1[1], p1[2]);
      L.push(p2[0], p2[1], p2[2]);
    };

    // Color definitions (matching milling exactly):
    // Uncut raw bar stock surface: Sleek satin titanium/aluminum silver
    const cUncut = [0.80, 0.83, 0.88];

    // Machined/Turned cut surface: Vibrant electric CNC Royal Blue
    const getMachinedColor = (depthRatio) => {
      const r = 0.07 * (1.0 - depthRatio * 0.35);
      const g = 0.50 * (1.0 - depthRatio * 0.25);
      const b = 0.92 * (1.0 - depthRatio * 0.15);
      return [r, g, b];
    };

    // Precalculate Box distance at each angle
    const rBoxTable = new Float32Array(nTheta);
    const cosTable = new Float32Array(nTheta);
    const sinTable = new Float32Array(nTheta);
    for (let j = 0; j < nTheta; j++) {
      const theta = (j * 2 * Math.PI) / nTheta;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      rBoxTable[j] = Math.min(
        halfW / Math.max(Math.abs(cos), 1e-5),
        halfH / Math.max(Math.abs(sin), 1e-5)
      );
      cosTable[j] = cos;
      sinTable[j] = sin;
    }

    // Helper to calculate exact vertex position at (station i, angle j)
    const getPoint = (i, j) => {
      const z = -i * res + offsetZ;
      const cutR = radii[i];
      const r = Math.min(rBoxTable[j], cutR);
      return [z, r * cosTable[j] + offsetY, r * sinTable[j] + offsetX];
    };

    // 1. Generate side quad triangles with split planar normals on uncut stock & smooth normals on turned parts
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < nTheta; j++) {
        const nextJ = (j + 1) % nTheta;

        const p00 = getPoint(i, j);
        const p10 = getPoint(i + 1, j);
        const p11 = getPoint(i + 1, nextJ);
        const p01 = getPoint(i, nextJ);

        const isCut0 = radii[i] < rBoxTable[j] - 0.03;
        const isCut1 = radii[i + 1] < rBoxTable[j] - 0.03;
        const isCutNext0 = radii[i] < rBoxTable[nextJ] - 0.03;
        const isCutNext1 = radii[i + 1] < rBoxTable[nextJ] - 0.03;
        const isAnyCut = isCut0 || isCut1 || isCutNext0 || isCutNext1;

        if (isAnyCut) {
          // Turned cylindrical / conical surface: smooth radial cylinder normals
          const depthRatio = Math.min(1, Math.max(0, (rBoxTable[j] - Math.min(radii[i], radii[i + 1])) / Math.max(rBoxTable[j], 1)));
          const col = getMachinedColor(depthRatio);

          const dr0 = (radii[i + 1] - radii[i]) / res;
          const nx0 = -dr0 / Math.sqrt(1 + dr0 * dr0);
          const radScale0 = 1 / Math.sqrt(1 + dr0 * dr0);

          const n00 = [nx0, cosTable[j] * radScale0, sinTable[j] * radScale0];
          const n10 = [nx0, cosTable[j] * radScale0, sinTable[j] * radScale0];
          const n01 = [nx0, cosTable[nextJ] * radScale0, sinTable[nextJ] * radScale0];
          const n11 = [nx0, cosTable[nextJ] * radScale0, sinTable[nextJ] * radScale0];

          addTri(p00, p10, p11, col, col, col, n00, n10, n11);
          addTri(p00, p11, p01, col, col, col, n00, n11, n01);
        } else {
          // Uncut raw rectangular stock: Planar normal based on the active face (preserves razor-sharp 90° corners)
          const midTheta = ((j + 0.5) * 2 * Math.PI) / nTheta;
          const midCos = Math.cos(midTheta);
          const midSin = Math.sin(midTheta);

          let faceNorm;
          if (Math.abs(midCos) >= Math.abs(midSin)) {
            faceNorm = midCos > 0 ? [0, 1, 0] : [0, -1, 0]; // Top or Bottom flat face
          } else {
            faceNorm = midSin > 0 ? [0, 0, 1] : [0, 0, -1]; // Front or Back flat side
          }

          addTri(p00, p10, p11, cUncut, cUncut, cUncut, faceNorm, faceNorm, faceNorm);
          addTri(p00, p11, p01, cUncut, cUncut, cUncut, faceNorm, faceNorm, faceNorm);
        }
      }
    }

    // 2. Front cap at z=offsetZ (station 0) - Flat planar facing normal [1, 0, 0]
    const cutR0 = radii[0];
    const isFrontCut = cutR0 < halfW - 0.03;
    const cFront = isFrontCut ? getMachinedColor(0.2) : cUncut;
    const nFront = [1, 0, 0];
    const pCenterFront = [offsetZ, offsetY, offsetX];

    for (let j = 0; j < nTheta; j++) {
      const nextJ = (j + 1) % nTheta;
      const r0 = Math.min(rBoxTable[j], cutR0);
      const r1 = Math.min(rBoxTable[nextJ], cutR0);
      const p0 = [offsetZ, r0 * cosTable[j] + offsetY, r0 * sinTable[j] + offsetX];
      const p1 = [offsetZ, r1 * cosTable[nextJ] + offsetY, r1 * sinTable[nextJ] + offsetX];
      addTri(pCenterFront, p1, p0, cFront, cFront, cFront, nFront, nFront, nFront);
    }

    // 3. Back cap at z=backZ (station n-1) - Flat planar normal [-1, 0, 0]
    const backZ = -(n - 1) * res + offsetZ;
    const cutRLast = radii[n - 1];
    const cBack = [0.55, 0.60, 0.66];
    const nBack = [-1, 0, 0];
    const pCenterBack = [backZ, offsetY, offsetX];

    for (let j = 0; j < nTheta; j++) {
      const nextJ = (j + 1) % nTheta;
      const r0 = Math.min(rBoxTable[j], cutRLast);
      const r1 = Math.min(rBoxTable[nextJ], cutRLast);
      const p0 = [backZ, r0 * cosTable[j] + offsetY, r0 * sinTable[j] + offsetX];
      const p1 = [backZ, r1 * cosTable[nextJ] + offsetY, r1 * sinTable[nextJ] + offsetX];
      addTri(pCenterBack, p0, p1, cBack, cBack, cBack, nBack, nBack, nBack);
    }

    // 4. CAD Edge Lines for Turning (SolidWorks "Shaded with Edges" style)
    // Front face rim
    for (let j = 0; j < nTheta; j++) {
      const nextJ = (j + 1) % nTheta;
      const r0 = Math.min(rBoxTable[j], cutR0);
      const r1 = Math.min(rBoxTable[nextJ], cutR0);
      addEdgeLine(
        [offsetZ, r0 * cosTable[j] + offsetY, r0 * sinTable[j] + offsetX],
        [offsetZ, r1 * cosTable[nextJ] + offsetY, r1 * sinTable[nextJ] + offsetX]
      );
    }

    // Back face rim
    for (let j = 0; j < nTheta; j++) {
      const nextJ = (j + 1) % nTheta;
      const r0 = Math.min(rBoxTable[j], cutRLast);
      const r1 = Math.min(rBoxTable[nextJ], cutRLast);
      addEdgeLine(
        [backZ, r0 * cosTable[j] + offsetY, r0 * sinTable[j] + offsetX],
        [backZ, r1 * cosTable[nextJ] + offsetY, r1 * sinTable[nextJ] + offsetX]
      );
    }

    // Circular ring outlines on turned steps / sharp shoulders:
    // Only where there is an actual steep shoulder step (diff > 0.75mm)
    // AND strictly within the machined interior (never drawing lines across the raw box planar faces)
    for (let i = 0; i < n - 1; i++) {
      const diff = Math.abs(radii[i] - radii[i + 1]);
      if (diff > Math.max(res * 1.5, 0.75)) {
        const stepZ = -(i + 1) * res + offsetZ;
        const stepR = Math.min(radii[i], radii[i + 1]);
        for (let j = 0; j < nTheta; j++) {
          const nextJ = (j + 1) % nTheta;
          if (stepR < rBoxTable[j] - 0.25 && stepR < rBoxTable[nextJ] - 0.25) {
            addEdgeLine(
              [stepZ, stepR * cosTable[j] + offsetY, stepR * sinTable[j] + offsetX],
              [stepZ, stepR * cosTable[nextJ] + offsetY, stepR * sinTable[nextJ] + offsetX]
            );
          }
        }
      }
    }

    // Four longitudinal CAD corner edges of the rectangular stock (at 45°, 135°, 225°, 315°)
    const cornerIndices = [
      Math.round(nTheta * 1 / 8), // 45°
      Math.round(nTheta * 3 / 8), // 135°
      Math.round(nTheta * 5 / 8), // 225°
      Math.round(nTheta * 7 / 8)  // 315°
    ];

    for (const cj of cornerIndices) {
      for (let i = 0; i < n - 1; i++) {
        const isCut0 = radii[i] < rBoxTable[cj] - 0.05;
        const isCut1 = radii[i + 1] < rBoxTable[cj] - 0.05;
        if (!isCut0 && !isCut1) {
          const z0 = -i * res + offsetZ;
          const z1 = -(i + 1) * res + offsetZ;
          const r0 = rBoxTable[cj];
          const r1 = rBoxTable[cj];
          addEdgeLine(
            [z0, r0 * cosTable[cj] + offsetY, r0 * sinTable[cj] + offsetX],
            [z1, r1 * cosTable[cj] + offsetY, r1 * sinTable[cj] + offsetX]
          );
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));

    this.stockMesh.geometry.dispose();
    this.stockMesh.geometry = geo;

    // Update CAD Edge lines mesh for turning
    if (!this.turnEdgesMesh) {
      const lineMat = new THREE.LineBasicMaterial({ color: 0x0a1d33, transparent: true, opacity: 0.90 });
      this.turnEdgesMesh = new THREE.LineSegments(new THREE.BufferGeometry(), lineMat);
      this.scene.add(this.turnEdgesMesh);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
    this.turnEdgesMesh.geometry.dispose();
    this.turnEdgesMesh.geometry = lineGeo;
    this.turnEdgesMesh.visible = this.mode === 'turn';
    if (this.millEdgesMesh) this.millEdgesMesh.visible = false;
  }

  updateMillMesh() {
    if (!this.millStock || !this.stockMesh) return;
    const { nx, ny, res, heights } = this.millStock;
    const B = this.blank;
    const P = [];
    const C = [];
    const L = []; // Line segments for CAD boundary edges

    const getX = (i) => Math.min(i * res, B.x);
    const getY = (j) => Math.min(j * res, B.y);
    const floorZ = -B.z;

    const addVert = (pt, c) => {
      P.push(pt[0], pt[2], -pt[1]);
      C.push(c[0], c[1], c[2]);
    };
    const addTri = (a, b, c, ca, cb, cc) => {
      addVert(a, ca);
      addVert(b, cb);
      addVert(c, cc);
    };
    const addEdgeLine = (p1, p2) => {
      L.push(p1[0], p1[2], -p1[1]);
      L.push(p2[0], p2[2], -p2[1]);
    };

    // Color definitions (RGB in 0..1):
    // Uncut raw stock top surface: Sleek satin titanium/aluminum silver
    const cUncut = [0.80, 0.83, 0.88];

    // Machined surface: Vibrant electric CNC Royal Blue (user specified: mill area in blue colour)
    const getMachinedFloorColor = (h) => {
      const depthRatio = Math.min(1, Math.abs(h) / Math.max(B.z, 1));
      const r = 0.07 * (1.0 - depthRatio * 0.35);
      const g = 0.50 * (1.0 - depthRatio * 0.25);
      const b = 0.92 * (1.0 - depthRatio * 0.15);
      return [r, g, b];
    };

    // Exterior side/bottom stock faces: Machine frame steel
    const cExt = [0.55, 0.60, 0.66];

    // 1. Surface Triangulation: smooth continuous 2-manifold surface with Delaunay ridge selection
    for (let j = 0; j < ny - 1; j++) {
      const y0 = getY(j);
      const y1 = getY(j + 1);
      for (let i = 0; i < nx - 1; i++) {
        const x0 = getX(i);
        const x1 = getX(i + 1);

        const h00 = heights[j * nx + i];
        const h10 = heights[j * nx + (i + 1)];
        const h11 = heights[(j + 1) * nx + (i + 1)];
        const h01 = heights[(j + 1) * nx + i];

        const p00 = [x0, y0, h00];
        const p10 = [x1, y0, h10];
        const p11 = [x1, y1, h11];
        const p01 = [x0, y1, h01];

        const c00 = h00 < -0.015 ? getMachinedFloorColor(h00) : cUncut;
        const c10 = h10 < -0.015 ? getMachinedFloorColor(h10) : cUncut;
        const c11 = h11 < -0.015 ? getMachinedFloorColor(h11) : cUncut;
        const c01 = h01 < -0.015 ? getMachinedFloorColor(h01) : cUncut;

        // Adaptive diagonal: connect vertices with closest heights to preserve sharp circular & contour ridges
        if (Math.abs(h00 - h11) <= Math.abs(h10 - h01)) {
          addTri(p00, p10, p11, c00, c10, c11);
          addTri(p00, p11, p01, c00, c11, c01);
        } else {
          addTri(p10, p11, p01, c10, c11, c01);
          addTri(p10, p01, p00, c10, c01, c00);
        }
      }
    }

    // 2. Exterior stock side walls (from surface height down to floorZ)
    for (let i = 0; i < nx - 1; i++) {
      const x0 = getX(i);
      const x1 = getX(i + 1);
      const hFront0 = heights[i];
      const hFront1 = heights[i + 1];
      addTri([x0, 0, floorZ], [x1, 0, floorZ], [x1, 0, hFront1], cExt, cExt, cExt);
      addTri([x0, 0, floorZ], [x1, 0, hFront1], [x0, 0, hFront0], cExt, cExt, cExt);

      const hBack0 = heights[(ny - 1) * nx + i];
      const hBack1 = heights[(ny - 1) * nx + (i + 1)];
      addTri([x1, B.y, floorZ], [x0, B.y, floorZ], [x0, B.y, hBack0], cExt, cExt, cExt);
      addTri([x1, B.y, floorZ], [x0, B.y, hBack0], [x1, B.y, hBack1], cExt, cExt, cExt);
    }

    for (let j = 0; j < ny - 1; j++) {
      const y0 = getY(j);
      const y1 = getY(j + 1);
      const hLeft0 = heights[j * nx];
      const hLeft1 = heights[(j + 1) * nx];
      addTri([0, y1, floorZ], [0, y0, floorZ], [0, y0, hLeft0], cExt, cExt, cExt);
      addTri([0, y1, floorZ], [0, y0, hLeft0], [0, y1, hLeft1], cExt, cExt, cExt);

      const hRight0 = heights[j * nx + (nx - 1)];
      const hRight1 = heights[(j + 1) * nx + (nx - 1)];
      addTri([B.x, y0, floorZ], [B.x, y1, floorZ], [B.x, y1, hRight1], cExt, cExt, cExt);
      addTri([B.x, y0, floorZ], [B.x, y1, hRight1], [B.x, y0, hRight0], cExt, cExt, cExt);
    }

    // 3. Bottom plate (Z = floorZ)
    const cBottom = [cExt[0] * 0.75, cExt[1] * 0.75, cExt[2] * 0.75];
    addTri([0, 0, floorZ], [B.x, 0, floorZ], [B.x, B.y, floorZ], cBottom, cBottom, cBottom);
    addTri([0, 0, floorZ], [B.x, B.y, floorZ], [0, B.y, floorZ], cBottom, cBottom, cBottom);

    // 4. CAD Edge lines: Outer stock box + Marching Squares smooth contour curves
    addEdgeLine([0, 0, 0], [B.x, 0, 0]);
    addEdgeLine([B.x, 0, 0], [B.x, B.y, 0]);
    addEdgeLine([B.x, B.y, 0], [0, B.y, 0]);
    addEdgeLine([0, B.y, 0], [0, 0, 0]);

    addEdgeLine([0, 0, floorZ], [B.x, 0, floorZ]);
    addEdgeLine([B.x, 0, floorZ], [B.x, B.y, floorZ]);
    addEdgeLine([B.x, B.y, floorZ], [0, B.y, floorZ]);
    addEdgeLine([0, B.y, floorZ], [0, 0, floorZ]);

    addEdgeLine([0, 0, 0], [0, 0, floorZ]);
    addEdgeLine([B.x, 0, 0], [B.x, 0, floorZ]);
    addEdgeLine([B.x, B.y, 0], [B.x, B.y, floorZ]);
    addEdgeLine([0, B.y, 0], [0, B.y, floorZ]);

    // Marching Squares contour lines for cut boundaries (SolidWorks silhouette curves)
    for (let j = 0; j < ny - 1; j++) {
      const y0 = getY(j);
      const y1 = getY(j + 1);
      for (let i = 0; i < nx - 1; i++) {
        const x0 = getX(i);
        const x1 = getX(i + 1);
        const h00 = heights[j * nx + i];
        const h10 = heights[j * nx + (i + 1)];
        const h11 = heights[(j + 1) * nx + (i + 1)];
        const h01 = heights[(j + 1) * nx + i];

        const minH = Math.min(h00, h10, h11, h01);
        const maxH = Math.max(h00, h10, h11, h01);

        // Detect if this cell contains a cut boundary wall (cliff)
        if (maxH - minH > 0.35) {
          const isoH = (maxH + minH) * 0.5;
          const crossings = [];

          // Edge 0: bottom (x0, y0) -> (x1, y0)
          if ((h00 >= isoH) !== (h10 >= isoH)) {
            const t = (isoH - h00) / (h10 - h00);
            crossings.push([x0 + t * (x1 - x0), y0, isoH]);
          }
          // Edge 1: right (x1, y0) -> (x1, y1)
          if ((h10 >= isoH) !== (h11 >= isoH)) {
            const t = (isoH - h10) / (h11 - h10);
            crossings.push([x1, y0 + t * (y1 - y0), isoH]);
          }
          // Edge 2: top (x1, y1) -> (x0, y1)
          if ((h11 >= isoH) !== (h01 >= isoH)) {
            const t = (isoH - h11) / (h01 - h11);
            crossings.push([x1 + t * (x0 - x1), y1, isoH]);
          }
          // Edge 3: left (x0, y1) -> (x0, y0)
          if ((h01 >= isoH) !== (h00 >= isoH)) {
            const t = (isoH - h01) / (h00 - h01);
            crossings.push([x0, y1 + t * (y0 - y1), isoH]);
          }

          if (crossings.length === 2) {
            addEdgeLine(crossings[0], crossings[1]);
          } else if (crossings.length === 4) {
            addEdgeLine(crossings[0], crossings[1]);
            addEdgeLine(crossings[2], crossings[3]);
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    geo.computeVertexNormals();

    this.stockMesh.geometry.dispose();
    this.stockMesh.geometry = geo;

    // Update CAD Edge lines mesh
    if (!this.millEdgesMesh) {
      const lineMat = new THREE.LineBasicMaterial({ color: 0x0a1d33, transparent: true, opacity: 0.90 });
      this.millEdgesMesh = new THREE.LineSegments(new THREE.BufferGeometry(), lineMat);
      this.scene.add(this.millEdgesMesh);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
    this.millEdgesMesh.geometry.dispose();
    this.millEdgesMesh.geometry = lineGeo;
    this.millEdgesMesh.visible = this.mode === 'mill';
    if (this.turnEdgesMesh) this.turnEdgesMesh.visible = false;
  }

  applyCut(step) {
    if (!step) return;
    const [x, y, z] = step.p;

    if (this.mode === 'turn') {
      const radiusAtTool = x / 2;
      const zIndex = Math.round(-z / this.turnStock.res);

      if (step.isCut) {
        if (zIndex >= 0 && zIndex < this.turnStock.n) {
          if (radiusAtTool < this.turnStock.radii[zIndex]) {
            this.turnStock.radii[zIndex] = Math.max(0, radiusAtTool);
            this.isMeshDirty = true;
          }
        }
      }

      // Position tool mesh: Z is along bar (negative into work), X is radius
      if (this.toolMesh) {
        this.toolMesh.position.set(z, radiusAtTool, 0);
      }
    } else {
      // Mill Mode
      const toolR = step.tool?.radius || 5;
      const { res, nx, ny, heights } = this.millStock;
      const B = this.blank;

      if (step.isCut) {
        const rOuter = toolR + res * 0.75;
        const minI = Math.max(0, Math.floor((x - rOuter) / res));
        const maxI = Math.min(nx - 1, Math.ceil((x + rOuter) / res));
        const minJ = Math.max(0, Math.floor((y - rOuter) / res));
        const maxJ = Math.min(ny - 1, Math.ceil((y + rOuter) / res));

        for (let j = minJ; j <= maxJ; j++) {
          for (let i = minI; i <= maxI; i++) {
            const gridX = Math.min(i * res, B.x);
            const gridY = Math.min(j * res, B.y);
            const distSq = (gridX - x) ** 2 + (gridY - y) ** 2;

            if (distSq <= toolR * toolR) {
              const idx = j * nx + i;
              if (heights[idx] > z) {
                heights[idx] = Math.max(z, -B.z);
                this.isMeshDirty = true;
              }
            } else if (distSq < rOuter * rOuter) {
              // Sub-cell radial boundary smoothing to eliminate staircase steps on circles
              const dist = Math.sqrt(distSq);
              const frac = (dist - toolR) / (rOuter - toolR);
              const rampH = z * (1 - frac);
              const idx = j * nx + i;
              if (rampH < heights[idx]) {
                heights[idx] = Math.max(z, rampH);
                this.isMeshDirty = true;
              }
            }
          }
        }
      }

      if (this.toolMesh) {
        this.toolMesh.position.set(x, z, -y);
      }
    }
  }

  loadSteps(steps, totalTimeSec) {
    this.stop();
    this.steps = steps;
    this.totalCycleTime = totalTimeSec;
    this.stepIndex = 0;
    this.resetStock();
  }

  play() {
    if (!this.steps || this.steps.length === 0) return;
    if (this.stepIndex >= this.steps.length) {
      this.stepIndex = 0;
      this.resetStock();
    }
    this.isRunning = true;
    this.isPaused = false;
  }

  pause() {
    this.isPaused = true;
    this.isRunning = false;
  }

  togglePlayPause() {
    if (this.isRunning) this.pause();
    else this.play();
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
  }

  stepNext() {
    if (!this.steps || this.stepIndex >= this.steps.length) return null;
    const currentStep = this.steps[this.stepIndex++];
    this.applyCut(currentStep);

    if (this.isMeshDirty) {
      if (this.mode === 'turn') this.updateTurnMesh();
      else this.updateMillMesh();
      this.isMeshDirty = false;
    }

    this.onStateChange(currentStep, this.stepIndex, this.steps.length);
    return currentStep;
  }

  setView(viewName) {
    const views = {
      iso: [0.75, 0.45],
      front: [0, 0],
      '2d': [0, 0],
      top: [0, 1.55],
      side: [Math.PI / 2, 0],
      back: [Math.PI, 0]
    };

    if (viewName === 'cross_section') {
      this.crossSectionMode = !this.crossSectionMode;
      if (this.mode === 'turn') this.updateTurnMesh();
      return;
    }

    if (viewName === 'iso') {
      this.isOrtho = false;
      this.camera = this.perspCamera;
    } else if (views[viewName]) {
      // 2D, Front, Top, Side views use true Orthographic CAD projection
      // Eliminates perspective foreshortening & conical edge distortion at ends of cylinder
      this.isOrtho = true;
      this.camera = this.orthoCamera;
    }

    if (views[viewName]) {
      this.azimuth = views[viewName][0];
      this.elevation = views[viewName][1];
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    if (this.isRunning && !this.isPaused && this.steps.length > 0) {
      // Speed curve: 1 to 100 slider translates to step burst
      const burst = Math.max(1, Math.round(Math.pow(this.speed, 2) / 120));
      let lastStep = null;

      for (let k = 0; k < burst && this.stepIndex < this.steps.length; k++) {
        lastStep = this.steps[this.stepIndex++];
        this.applyCut(lastStep);
      }

      if (lastStep) {
        this.onStateChange(lastStep, this.stepIndex, this.steps.length);
      }

      if (this.isMeshDirty) {
        if (this.mode === 'turn') this.updateTurnMesh();
        else this.updateMillMesh();
        this.isMeshDirty = false;
      }

      if (this.stepIndex >= this.steps.length) {
        this.isRunning = false;
      }
    }

    // Camera positioning based on orbital angles
    const cx = this.target.x + this.distance * Math.cos(this.elevation) * Math.sin(this.azimuth);
    const cy = this.target.y + this.distance * Math.sin(this.elevation);
    const cz = this.target.z + this.distance * Math.cos(this.elevation) * Math.cos(this.azimuth);

    if (this.isOrtho) {
      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 600;
      const aspect = width / Math.max(height, 1);
      // Matching perspective field of view at this.distance
      const frustumH = this.distance * 0.7279;
      this.orthoCamera.left = -frustumH * aspect / 2;
      this.orthoCamera.right = frustumH * aspect / 2;
      this.orthoCamera.top = frustumH / 2;
      this.orthoCamera.bottom = -frustumH / 2;
      this.orthoCamera.updateProjectionMatrix();

      this.orthoCamera.position.set(cx, cy, cz);
      this.orthoCamera.lookAt(this.target);
    } else {
      this.perspCamera.position.set(cx, cy, cz);
      this.perspCamera.lookAt(this.target);
    }

    // Update Triad in corner
    if (this.triadGroup) {
      this.triadGroup.position.copy(this.target).add(new THREE.Vector3(-this.distance * 0.35, this.distance * 0.3, 0));
    }

    this.renderer.render(this.scene, this.camera);
  }
}
