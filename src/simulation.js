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

    // 1. Ambient & Radiant Cyan Fill (Ensures shadows remain luminous, vibrant cyan)
    const amb = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(amb);

    const cyanAmb = new THREE.AmbientLight(0x00e5ff, 0.55);
    this.scene.add(cyanAmb);

    // 2. Camera Headlamp: Guarantees that whatever surface the user views is brightly lit
    this.cameraLight = new THREE.DirectionalLight(0xffffff, 0.85);
    this.perspCamera.add(this.cameraLight.clone());
    this.orthoCamera.add(this.cameraLight);
    this.scene.add(this.perspCamera);
    this.scene.add(this.orthoCamera);

    // 3. Studio Key Light (Front-Top-Right of workpiece, shining directly on face and contour)
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
    keyLight.position.set(200, 250, 180);
    this.scene.add(keyLight);

    // 4. Studio Soft Fill from bottom-front
    const fillLight = new THREE.DirectionalLight(0x38e8ff, 0.5);
    fillLight.position.set(100, -150, 120);
    this.scene.add(fillLight);

    // 5. Back rim light
    const rimLight = new THREE.DirectionalLight(0x70f5ff, 0.5);
    rimLight.position.set(-200, 180, -150);
    this.scene.add(rimLight);

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
    const radius = 5;
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
        ? new THREE.LineDashedMaterial({ color, dashSize: 4, gapSize: 3, opacity: 0.5, transparent: true })
        : new THREE.LineBasicMaterial({ color, opacity: 0.7, transparent: true });
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

    const { colorTex, bumpTex } = this.createLatheFinishTextures();

    const stockMat = new THREE.MeshPhongMaterial({
      color: 0x00e5ff,        // Pure vibrant electric cyan matching user's image
      emissive: 0x008da6,     // Bright cyan radiance keeping shadows luminous (no muddy dark tones)
      specular: 0x80f8ff,     // Soft cyan specular luster
      shininess: 18,          // Satin / semi-matte CAD finish (eliminates artificial AI glossy hotspots)
      map: colorTex,
      bumpMap: bumpTex,
      bumpScale: 0.022,       // Authentic crisp concentric turned feed grooves
      side: THREE.DoubleSide
    });

    if (this.mode === 'turn') {
      const res = 0.5; // 0.5mm station resolution along Z
      const nStations = Math.ceil(this.blank.l / res) + 1;
      // Initialize with large radius so uncut stock is purely rectangular cuboid
      const initialRadii = new Float32Array(nStations).fill(9999);
      this.turnStock = { res, n: nStations, radii: initialRadii };

      this.stockMesh = new THREE.Mesh(new THREE.BufferGeometry(), stockMat);
      this.scene.add(this.stockMesh);

      // Tool Mesh: Carbide insert holder (No chuck)
      this.createLatheToolMesh();

      const maxDim = Math.max(this.blank.w || this.blank.d || 80, this.blank.h || this.blank.d || 80, this.blank.l);
      this.target.set(-this.blank.l / 2, 0, 0);
      this.distance = maxDim * 2.3;
      this.setView('front'); // 2D view by default
      this.updateTurnMesh();
    } else {
      // Mill Mode
      const res = Math.max(1.0, Math.max(this.blank.x, this.blank.y) / 100);
      const nx = Math.ceil(this.blank.x / res) + 1;
      const ny = Math.ceil(this.blank.y / res) + 1;
      const initialHeights = new Float32Array(nx * ny).fill(0); // Top surface is Z=0
      this.millStock = { res, nx, ny, heights: initialHeights };

      this.stockMesh = new THREE.Mesh(new THREE.BufferGeometry(), stockMat);
      this.scene.add(this.stockMesh);

      this.createMillToolMesh(5); // Default Ø10mm (R=5)

      this.target.set(this.blank.x / 2, -this.blank.z / 2, -this.blank.y / 2);
      this.distance = Math.max(this.blank.x, this.blank.y) * 2.2;
      this.setView('front'); // 2D view by default
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

    // Steel Tool Shank (grey)
    const shankGeo = new THREE.BoxGeometry(20, 10, 10);
    const shankMat = new THREE.MeshStandardMaterial({ color: 0x3a424d, metalness: 0.5, roughness: 0.4 });
    const shank = new THREE.Mesh(shankGeo, shankMat);
    shank.position.set(0, 8, 0);
    group.add(shank);

    // Gold Carbide Rhombic Insert
    const insertGeo = new THREE.BoxGeometry(7, 3, 7);
    const insertMat = new THREE.MeshStandardMaterial({ color: 0xf2ba38, metalness: 0.7, roughness: 0.25 });
    const insert = new THREE.Mesh(insertGeo, insertMat);
    insert.position.set(0, 0, 0);
    insert.rotation.y = Math.PI / 4; // Rhombic angle
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

    // Spindle Holder (silver/grey)
    const holderGeo = new THREE.CylinderGeometry(12, 8, 20, 24);
    const holderMat = new THREE.MeshStandardMaterial({ color: 0x4f5866, metalness: 0.6, roughness: 0.3 });
    const holder = new THREE.Mesh(holderGeo, holderMat);
    holder.position.y = 20;
    group.add(holder);

    // Carbide Cutter Flutes (gold/bright metallic)
    const cutterGeo = new THREE.CylinderGeometry(toolRadius, toolRadius, 20, 24);
    const cutterMat = new THREE.MeshStandardMaterial({ color: 0xe0ad36, metalness: 0.7, roughness: 0.3 });
    const cutter = new THREE.Mesh(cutterGeo, cutterMat);
    cutter.position.y = 5;
    group.add(cutter);

    this.toolMesh = group;
    this.scene.add(this.toolMesh);
  }

  updateTurnMesh() {
    if (!this.turnStock || !this.stockMesh) return;
    const { res, n, radii } = this.turnStock;
    const halfW = (this.blank.w || this.blank.d || 80) / 2;
    const halfH = (this.blank.h || this.blank.thickness || this.blank.d || 80) / 2;

    const offsetX = this.blank.centerX || 0;
    const offsetY = this.blank.centerY || 0;
    const offsetZ = this.blank.centerZ || 0;

    const nTheta = 72; // 72 angular steps (5° steps for crisp cuboid faces)
    const P = [];
    const idx = (station, ang) => station * nTheta + ang;

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

    const UVs = [];

    // 1. Generate ring vertices for all Z stations
    for (let i = 0; i < n; i++) {
      const z = -i * res + offsetZ;
      const cutR = radii[i];
      const v = i / Math.max(1, n - 1);
      for (let j = 0; j < nTheta; j++) {
        const r = Math.min(rBoxTable[j], cutR);
        // Spindle axis is X = z (machine Z), Y = r*cos, Z = r*sin
        P.push(z, r * cosTable[j] + offsetY, r * sinTable[j] + offsetX);
        UVs.push(j / nTheta, v);
      }
    }

    const indices = [];

    // 2. Generate side quad triangles
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < nTheta; j++) {
        const nextJ = (j + 1) % nTheta;
        const v00 = idx(i, j);
        const v10 = idx(i + 1, j);
        const v11 = idx(i + 1, nextJ);
        const v01 = idx(i, nextJ);

        indices.push(v00, v10, v11);
        indices.push(v00, v11, v01);
      }
    }

    // 3. Front cap at z=offsetZ (station 0) - Crisp planar facing with sharp normal
    const frontCenterIdx = P.length / 3;
    P.push(offsetZ, offsetY, offsetX);
    UVs.push(0.5, 0.5);
    const cutR0 = radii[0];
    const frontRingStart = P.length / 3;
    for (let j = 0; j < nTheta; j++) {
      const r = Math.min(rBoxTable[j], cutR0);
      P.push(offsetZ, r * cosTable[j] + offsetY, r * sinTable[j] + offsetX);
      UVs.push(0.5 + 0.5 * cosTable[j] * (r / halfW), 0.5 + 0.5 * sinTable[j] * (r / halfH));
    }
    for (let j = 0; j < nTheta; j++) {
      const nextJ = (j + 1) % nTheta;
      indices.push(frontCenterIdx, frontRingStart + nextJ, frontRingStart + j);
    }

    // 4. Back cap at z=backZ (station n-1)
    const backZ = -(n - 1) * res + offsetZ;
    const backCenterIdx = P.length / 3;
    P.push(backZ, offsetY, offsetX);
    UVs.push(0.5, 0.5);
    const cutRLast = radii[n - 1];
    const backRingStart = P.length / 3;
    for (let j = 0; j < nTheta; j++) {
      const r = Math.min(rBoxTable[j], cutRLast);
      P.push(backZ, r * cosTable[j] + offsetY, r * sinTable[j] + offsetX);
      UVs.push(0.5 + 0.5 * cosTable[j] * (r / halfW), 0.5 + 0.5 * sinTable[j] * (r / halfH));
    }
    for (let j = 0; j < nTheta; j++) {
      const nextJ = (j + 1) % nTheta;
      indices.push(backCenterIdx, backRingStart + j, backRingStart + nextJ);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(UVs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    this.stockMesh.geometry.dispose();
    this.stockMesh.geometry = geo;
  }

  updateMillMesh() {
    if (!this.millStock || !this.stockMesh) return;
    const { nx, ny, res, heights } = this.millStock;
    const B = this.blank;
    const P = [];

    const getX = (i) => Math.min(i * res, B.x);
    const getY = (j) => Math.min(j * res, B.y);
    const floorZ = -B.z;

    const addVert = (pt) => P.push(pt[0], pt[2], -pt[1]);
    const addTri = (a, b, c) => {
      addVert(a); addVert(b); addVert(c);
    };

    // Top milled surface
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const A = [getX(i), getY(j), heights[j * nx + i]];
        const Bpt = [getX(i + 1), getY(j), heights[j * nx + i + 1]];
        const C = [getX(i + 1), getY(j + 1), heights[(j + 1) * nx + i + 1]];
        const D = [getX(i), getY(j + 1), heights[(j + 1) * nx + i]];
        addTri(A, Bpt, C);
        addTri(A, C, D);
      }
    }

    // Side walls
    const addWall = (topA, topB) => {
      const botA = [topA[0], topA[1], floorZ];
      const botB = [topB[0], topB[1], floorZ];
      addTri(topA, topB, botB);
      addTri(topA, botB, botA);
    };

    const rowLast = (ny - 1) * nx;
    for (let i = 0; i < nx - 1; i++) {
      addWall([getX(i), 0, heights[i]], [getX(i + 1), 0, heights[i + 1]]);
      addWall([getX(i + 1), B.y, heights[rowLast + i + 1]], [getX(i), B.y, heights[rowLast + i]]);
    }
    for (let j = 0; j < ny - 1; j++) {
      addWall([0, getY(j + 1), heights[(j + 1) * nx]], [0, getY(j), heights[j * nx]]);
      addWall([B.x, getY(j), heights[j * nx + nx - 1]], [B.x, getY(j + 1), heights[(j + 1) * nx + nx - 1]]);
    }

    // Bottom plate
    addTri([0, 0, floorZ], [B.x, 0, floorZ], [B.x, B.y, floorZ]);
    addTri([0, 0, floorZ], [B.x, B.y, floorZ], [0, B.y, floorZ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.computeVertexNormals();

    this.stockMesh.geometry.dispose();
    this.stockMesh.geometry = geo;
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
        const minI = Math.max(0, Math.floor((x - toolR) / res));
        const maxI = Math.min(nx - 1, Math.ceil((x + toolR) / res));
        const minJ = Math.max(0, Math.floor((y - toolR) / res));
        const maxJ = Math.min(ny - 1, Math.ceil((y + toolR) / res));

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
            }
          }
        }
      }

      if (this.toolMesh) {
        this.toolMesh.position.set(x, z + 5, -y);
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
