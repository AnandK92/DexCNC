import './style.css';
import { CNCParser } from './parser.js';
import { CNCSimulator3D } from './simulation.js';
import { createDefaultTurret, TOOL_DATABASE, DEFAULT_42_TOOLS, TOOL_CATEGORIES } from './tools.js';

// Pre-packaged Fanuc Example Programs with Sketches & Dimensioned Specs
const SAMPLE_LIBRARY = {
  turn: [
    {
      id: 'turn-g71-roughing',
      title: 'OD Multi-Step Shaft Roughing & Finishing (G71/G70)',
      desc: 'Canned roughing cycle with stepped diameters (36, 46, 60, 75mm), 45° chamfers, convex and concave radii, followed by G70 finishing pass.',
      blank: { w: 80, h: 80, d: 80, l: 100, thickness: 80, bore: 0, centerX: 0, centerY: 0, centerZ: 0 },
      tools: 'T0101 (Roughing PCLNL R0.8), T0303 (Grooving 2mm)',
      svg: `<svg viewBox="0 0 200 100" class="sample-preview-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="100" fill="#0f172a" rx="4"/>
        <line x1="10" y1="50" x2="190" y2="50" stroke="#38bdf8" stroke-dasharray="3,3" stroke-width="1"/>
        <rect x="20" y="15" width="25" height="70" fill="#334155" stroke="#64748b"/>
        <polygon points="45,20 85,20 95,30 130,30 145,40 175,40 180,45 180,55 175,60 145,60 130,70 95,70 85,80 45,80" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="100" y="92" fill="#94a3b8" font-size="8" text-anchor="middle" font-family="sans-serif">⌀80 × 100mm Multi-Step</text>
      </svg>`,
      code: `(G71 EXTERNAL TURN CYCLE - FANUC 0i-T)
(BLANK: OD 80mm X LENGTH 100mm)
G21 G18 G99
G28 U0.0 W0.0
T0101 (ROUGHING TOOL PCLNL R0.8)
G50 S3000
G96 S220 M03
G00 X85.0 Z2.0 M08

(--- G71 ROUGHING CYCLE ---)
G71 U2.0 R1.0
G71 P30 Q75 U0.6 W0.2 F0.28
N30 G00 X36.0
N35 G01 Z0.0 F0.18
N40 X46.0 Z-5.0
N45 Z-30.0
N50 G02 X60.0 Z-40.0 I10.0 K0.0
N55 G01 Z-60.0
N60 G03 X75.0 Z-67.5 I0.0 K-7.5
N65 G01 Z-85.0
N70 X80.0
N75 X84.0 Z-85.0

(--- G70 FINISHING PASS ---)
G00 X85.0 Z2.0
G70 P30 Q75 F0.14
G00 X100.0 Z50.0

(--- PARTING OFF GROOVE ---)
T0303 (GROOVING BLADE 2MM)
G97 S1200 M03
G00 X82.0 Z-88.0
G01 X0.0 F0.08
G00 X85.0
G28 U0.0 W0.0
M05
M09
M30
`
    },
    {
      id: 'turn-spherical-contour',
      title: 'Spherical Ball-Nose & Taper Contour',
      desc: 'Precision spherical dome nose turned with G02 circular interpolation leading into a smooth taper and straight shoulder.',
      blank: { w: 60, h: 60, d: 60, l: 80, thickness: 60, bore: 0, centerX: 0, centerY: 0, centerZ: 0 },
      tools: 'T0101 (Finishing Tool VNMG R0.4)',
      svg: `<svg viewBox="0 0 200 100" class="sample-preview-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="100" fill="#0f172a" rx="4"/>
        <line x1="10" y1="50" x2="190" y2="50" stroke="#38bdf8" stroke-dasharray="3,3" stroke-width="1"/>
        <rect x="25" y="20" width="30" height="60" fill="#334155" stroke="#64748b"/>
        <path d="M 55,25 L 105,25 L 145,35 Q 175,35 175,50 Q 175,65 145,65 L 105,75 L 55,75 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="100" y="92" fill="#94a3b8" font-size="8" text-anchor="middle" font-family="sans-serif">⌀60 × 80mm Ball Nose</text>
      </svg>`,
      code: `(SPHERICAL DOME NOSE & TAPER - FANUC 0i-T)
(BLANK: OD 60mm X LENGTH 80mm)
G21 G18 G99
G28 U0.0 W0.0
T0101 (VNMG 35-DEG CONTOUR TOOL R0.4)
G50 S3500
G96 S240 M03
G00 X65.0 Z5.0 M08

(--- FACE FRONT ---)
G00 X62.0 Z0.0
G01 X0.0 F0.15
G00 X25.0 Z2.0

(--- SPHERICAL CONTOUR PROFILE ---)
G01 Z0.0 F0.12
G02 X35.0 Z-15.0 R12.0 F0.10
G01 Z-35.0
G01 X50.0 Z-55.0
G01 Z-70.0
G01 X60.0
G00 X70.0 Z50.0
G28 U0.0 W0.0
M05
M30
`
    },
    {
      id: 'turn-groove-thread',
      title: 'OD Grooving & O-Ring Reliefs',
      desc: 'Multiple snap-ring / O-ring relief grooves turned with precision dwell timing (G04) across cylindrical stepped body.',
      blank: { w: 50, h: 50, d: 50, l: 85, thickness: 50, bore: 0, centerX: 0, centerY: 0, centerZ: 0 },
      tools: 'T0101 (Turning), T0303 (Grooving 3mm)',
      svg: `<svg viewBox="0 0 200 100" class="sample-preview-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="100" fill="#0f172a" rx="4"/>
        <line x1="10" y1="50" x2="190" y2="50" stroke="#38bdf8" stroke-dasharray="3,3" stroke-width="1"/>
        <polygon points="30,22 80,22 80,32 90,32 90,22 110,22 110,32 120,32 120,22 165,22 165,78 120,78 120,68 110,68 110,78 90,78 90,68 80,68 80,78 30,78" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="100" y="92" fill="#94a3b8" font-size="8" text-anchor="middle" font-family="sans-serif">⌀50 × 85mm Twin Groove</text>
      </svg>`,
      code: `(OD MULTI-GROOVING & RELIEF - FANUC 0i-T)
(BLANK: OD 50mm X LENGTH 85mm)
G21 G18 G99
G28 U0.0 W0.0

(--- OP 1: TURN OD DIAMETER ---)
T0101
G97 S1800 M03
G00 X52.0 Z2.0 M08
G00 X40.0
G01 Z-60.0 F0.20
G01 X50.0
G00 X60.0 Z20.0

(--- OP 2: DUAL O-RING GROOVES ---)
T0303 (3MM PARTING/GROOVING INSERT)
G97 S1100 M03
G00 X44.0 Z-20.0
G01 X32.0 F0.06
G04 X1.0 (DWELL 1 SEC)
G00 X44.0

G00 Z-38.0
G01 X32.0 F0.06
G04 X1.0
G00 X44.0
G00 X70.0 Z50.0
G28 U0.0 W0.0
M05
M30
`
    }
  ],
  mill: [
    {
      id: 'mill-contour-pocket',
      title: '3-Axis Contour Perimeter & Center Pocket',
      desc: 'Outer boundary roughing and finishing with flat end mill, circular pocketing interpolation (G02) and 4-corner peck drilling pattern.',
      blank: { w: 100, h: 80, d: 20, l: 100, x: 100, y: 80, z: 20, thickness: 20, bore: 0, centerX: 0, centerY: 0, centerZ: 0 },
      tools: 'T01 (Flat End Mill 10mm), T03 (Twist Drill 8mm)',
      svg: `<svg viewBox="0 0 200 100" class="sample-preview-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="100" fill="#0f172a" rx="4"/>
        <rect x="30" y="15" width="140" height="70" fill="#1e293b" stroke="#64748b" stroke-width="1.5" rx="3"/>
        <rect x="45" y="25" width="110" height="50" fill="#0284c7" stroke="#38bdf8" stroke-width="1.2" rx="4"/>
        <circle cx="100" cy="50" r="16" fill="#0369a1" stroke="#7dd3fc" stroke-width="1.2"/>
        <circle cx="55" cy="35" r="3.5" fill="#f59e0b"/>
        <circle cx="145" cy="35" r="3.5" fill="#f59e0b"/>
        <circle cx="145" cy="65" r="3.5" fill="#f59e0b"/>
        <circle cx="55" cy="65" r="3.5" fill="#f59e0b"/>
        <text x="100" y="93" fill="#94a3b8" font-size="8" text-anchor="middle" font-family="sans-serif">100 × 80 × 20mm VMC</text>
      </svg>`,
      code: `(3-AXIS MILLING & DRILLING - FANUC 0i-M)
(BLANK: 100mm X 80mm X 20mm)
G21 G90 G17 G54
G28 Z0.0
T01 M06 (FLAT END MILL 10MM)
S3000 M03
G00 X-10.0 Y-10.0 Z10.0
G00 Z2.0

(--- RECTANGULAR PROFILE PASS ---)
G00 X15.0 Y15.0
G01 Z-4.0 F200
G01 X85.0 F500
G01 Y65.0
G01 X15.0
G01 Y15.0
G00 Z5.0

(--- CIRCULAR POCKET ---)
G00 X50.0 Y40.0
G01 Z-6.0 F150
G02 X50.0 Y40.0 I15.0 J0.0 F400
G00 Z5.0

(--- G83 PECK DRILLING PATTERN ---)
T03 M06 (TWIST DRILL 8MM)
S1800 M03
G00 X20.0 Y20.0
G83 X20.0 Y20.0 Z-18.0 R2.0 Q4.0 F100
X80.0 Y20.0
X80.0 Y60.0
X20.0 Y60.0
G80 (CANCEL DRILL CYCLE)
G00 Z30.0
M05
G28 X0.0 Y0.0
M30
`
    },
    {
      id: 'mill-facing-island',
      title: 'Face Milling & Raised Stepped Boss',
      desc: 'Zigzag planar face milling pass across top surface followed by stepped circular island boss and corner chamfers.',
      blank: { w: 110, h: 90, d: 25, l: 110, x: 110, y: 90, z: 25, thickness: 25, bore: 0, centerX: 0, centerY: 0, centerZ: 0 },
      tools: 'T02 (Face Mill 50mm), T01 (End Mill 12mm)',
      svg: `<svg viewBox="0 0 200 100" class="sample-preview-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="100" fill="#0f172a" rx="4"/>
        <rect x="35" y="15" width="130" height="70" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5" rx="3"/>
        <circle cx="100" cy="50" r="22" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="100" cy="50" r="10" fill="#0369a1" stroke="#7dd3fc" stroke-width="1.2"/>
        <text x="100" y="93" fill="#94a3b8" font-size="8" text-anchor="middle" font-family="sans-serif">110 × 90 × 25mm Boss Plate</text>
      </svg>`,
      code: `(FACE MILLING & RAISED BOSS - FANUC 0i-M)
(BLANK: 110mm X 90mm X 25mm)
G21 G90 G17 G54
G28 Z0.0
T02 M06 (FACE MILL 50MM)
S2200 M03
G00 X-30.0 Y20.0 Z10.0
G01 Z-1.5 F400

(--- ZIGZAG FACE MILLING PASSES ---)
G01 X140.0 F800
G00 Y50.0
G01 X-30.0
G00 Y80.0
G01 X140.0
G00 Z15.0

(--- RAISED STEPPED BOSS MILLING ---)
T01 M06 (END MILL 12MM)
S2800 M03
G00 X55.0 Y45.0 Z5.0
G01 Z-5.0 F250
G02 X55.0 Y45.0 I25.0 J0.0 F600
G00 Z20.0
M05
G28 X0.0 Y0.0
M30
`
    },
    {
      id: 'mill-pcd-drilling',
      title: 'Bolt Hole Circle PCD & Center Bore',
      desc: 'Bolt Hole Pitch Circle Diameter (PCD) polar drill array with central clearance bore and perimeter slots.',
      blank: { w: 90, h: 90, d: 20, l: 90, x: 90, y: 90, z: 20, thickness: 20, bore: 0, centerX: 0, centerY: 0, centerZ: 0 },
      tools: 'T01 (End Mill 10mm), T03 (Twist Drill 6mm)',
      svg: `<svg viewBox="0 0 200 100" class="sample-preview-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="100" fill="#0f172a" rx="4"/>
        <circle cx="100" cy="50" r="38" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="100" cy="50" r="26" fill="none" stroke="#38bdf8" stroke-dasharray="2,2" stroke-width="1"/>
        <circle cx="100" cy="50" r="12" fill="#0284c7" stroke="#38bdf8" stroke-width="1.2"/>
        <circle cx="126" cy="50" r="3" fill="#f59e0b"/>
        <circle cx="113" cy="72.5" r="3" fill="#f59e0b"/>
        <circle cx="87" cy="72.5" r="3" fill="#f59e0b"/>
        <circle cx="74" cy="50" r="3" fill="#f59e0b"/>
        <circle cx="87" cy="27.5" r="3" fill="#f59e0b"/>
        <circle cx="113" cy="27.5" r="3" fill="#f59e0b"/>
        <text x="100" y="95" fill="#94a3b8" font-size="8" text-anchor="middle" font-family="sans-serif">⌀75mm PCD 6-Hole Flange</text>
      </svg>`,
      code: `(PCD BOLT HOLE FLANGE - FANUC 0i-M)
(BLANK: 90mm X 90mm X 20mm)
G21 G90 G17 G54
G28 Z0.0
T01 M06 (END MILL 10MM)
S3200 M03
G00 X45.0 Y45.0 Z10.0

(--- CENTER BORE ---)
G01 Z-12.0 F150
G02 X45.0 Y45.0 I12.0 J0.0 F500
G00 Z10.0

(--- G81 6-HOLE PCD PATTERN ---)
T03 M06 (DRILL 6.0MM)
S2000 M03
G00 Z5.0
G81 X71.0 Y45.0 Z-18.0 R2.0 F120
X58.0 Y67.5
X32.0 Y67.5
X19.0 Y45.0
X32.0 Y22.5
X58.0 Y22.5
G80
G00 Z30.0
M05
G28 X0.0 Y0.0
M30
`
    }
  ]
};



class ModeSession {
  constructor(mode) {
    this.mode = mode;
    this.fileName = 'Untitled.nc';
    this.fileHandle = null;
    this.code = ''; // Starts completely blank
    this.isModified = false;

    if (mode === 'turn') {
      // Standard 100mm x 100mm Blank for Turning (100mm x 100mm x 100mm Length)
      this.blank = {
        w: 100,
        h: 100,
        d: 100,
        l: 100,
        thickness: 100,
        bore: 0,
        centerX: 0,
        centerY: 0,
        centerZ: 0
      };
    } else {
      // Standard 100mm x 100mm Blank for Milling (100mm x 100mm x 25mm Depth)
      this.blank = {
        x: 100,
        y: 100,
        z: 25,
        w: 100,
        h: 100,
        d: 25,
        thickness: 25,
        bore: 0,
        centerX: 0,
        centerY: 0,
        centerZ: 0
      };
    }

    this.tools = createDefaultTurret();
  }
}

class AppState {
  constructor() {
    this.mode = 'turn'; // 'turn' or 'mill'
    this.machineName = 'Fanuc 0iT - Type A';
    this.autoSaveEnabled = localStorage.getItem('cnc_autosave') !== 'false';

    // Completely isolated, independent workspaces for Turning and Milling
    this.sessions = {
      turn: new ModeSession('turn'),
      mill: new ModeSession('mill')
    };

    this.toolsList = [...DEFAULT_42_TOOLS];
    this.activeTab = 'sim'; // 'sim' or 'err'
    this.currentErrors = [];
    this.compiledSteps = [];
    this.totalTime = 0;
  }

  get session() {
    return this.sessions[this.mode];
  }

  get blank() {
    return this.session.blank;
  }

  get tools() {
    return this.session.tools;
  }
  set tools(t) {
    this.session.tools = t;
  }

  get currentFileName() {
    return this.session.fileName;
  }
  set currentFileName(fn) {
    this.session.fileName = fn;
  }

  get currentFileHandle() {
    return this.session.fileHandle;
  }
  set currentFileHandle(fh) {
    this.session.fileHandle = fh;
  }

  get isModified() {
    return this.session.isModified;
  }
  set isModified(m) {
    this.session.isModified = m;
  }
}

const state = new AppState();
let parser = new CNCParser(state.mode, state.blank, state.tools);
let sim3d = null;

// Build DOM
const appContainer = document.querySelector('#app');
appContainer.innerHTML = `
<div id="app-container">
  <!-- Title Bar -->
  <div class="window-titlebar">
    <div class="title-text">
      <span style="color:#ffd700;">⚙</span>
      <span id="win-title-text">Untitled.nc — DexCNC Turn (Fanuc 0i-T)</span>
    </div>
    <div class="win-btns">
      <div class="win-btn">_</div>
      <div class="win-btn">□</div>
      <div class="win-btn" style="background:#c0392b;color:#fff;">✕</div>
    </div>
  </div>

  <!-- Menu Bar -->
  <div class="menu-bar">
    <div class="menu-item" data-menu="file">
      <button class="menu-btn">File</button>
      <div class="dropdown-menu">
        <div class="dropdown-item" data-act="file-new">New Program</div>
        <div class="dropdown-item" data-act="file-open">Open... <span style="font-size:10px;color:#888;margin-left:12px;">Ctrl+O</span></div>
        <div class="dropdown-item" data-act="file-save">Save <span style="font-size:10px;color:#888;margin-left:12px;">Ctrl+S</span></div>
        <div class="dropdown-item" data-act="file-save-as">Save As... <span style="font-size:10px;color:#888;margin-left:12px;">Ctrl+Shift+S</span></div>
        <div class="dropdown-sep"></div>
        <div class="dropdown-item" data-act="toggle-autosave" id="menu-toggle-autosave">✓ Auto-Save</div>
        <div class="dropdown-sep"></div>
        <div class="dropdown-item" data-act="open-samples-modal">📁 Load Sample Program...</div>
        <div class="dropdown-sep"></div>
        <div class="dropdown-item" data-act="file-export-stl">Export 3D STL (Part)</div>
      </div>
    </div>

    <div class="menu-item" data-menu="edit">
      <button class="menu-btn">Edit</button>
      <div class="dropdown-menu">
        <div class="dropdown-item" data-act="edit-undo">Undo</div>
        <div class="dropdown-item" data-act="edit-redo">Redo</div>
        <div class="dropdown-sep"></div>
        <div class="dropdown-item" data-act="edit-renumber">Renumber Blocks (N10, N20...)</div>
        <div class="dropdown-item" data-act="edit-clear">Clear Editor</div>
      </div>
    </div>

    <!-- Process Mode Menu Dropdown -->
    <div class="menu-item" data-menu="mode">
      <button class="menu-btn" style="font-weight:bold;color:#0b57d0;">Mode ▾</button>
      <div class="dropdown-menu">
        <div class="dropdown-item" data-act="mode-turn"><span id="menu-check-turn" style="margin-right:6px;font-weight:bold;color:#0a7d24;">✔</span> Turning Center (Lathe — Fanuc 0i-T)</div>
        <div class="dropdown-item" data-act="mode-mill"><span id="menu-check-mill" style="margin-right:6px;font-weight:bold;color:#0a7d24;visibility:hidden;">✔</span> Milling Center (VMC — Fanuc 0i-M)</div>
      </div>
    </div>

    <div class="menu-item" data-menu="blank">
      <button class="menu-btn" data-act="open-blank">Blank</button>
    </div>

    <div class="menu-item" data-menu="machine">
      <button class="menu-btn" data-act="open-machine">Machine</button>
    </div>

    <div class="menu-item" data-menu="tools">
      <button class="menu-btn" data-act="open-tools">Tools</button>
    </div>

    <div class="menu-item" data-menu="error-check">
      <button class="menu-btn" data-act="run-error-check" style="font-weight:bold;color:#b22222;">Error-check</button>
    </div>

    <div class="menu-item" data-menu="simulate">
      <button class="menu-btn">Simulate</button>
      <div class="dropdown-menu">
        <div class="dropdown-item" data-act="sim-play">Run (Play)</div>
        <div class="dropdown-item" data-act="sim-pause">Pause</div>
        <div class="dropdown-item" data-act="sim-step">Single Step</div>
        <div class="dropdown-item" data-act="sim-stop">Reset</div>
      </div>
    </div>

    <div class="menu-item" data-menu="view">
      <button class="menu-btn">View</button>
      <div class="dropdown-menu">
        <div class="dropdown-item" data-act="view-iso">Isometric 3D</div>
        <div class="dropdown-item" data-act="view-front">Front (XZ / Lathe Plane)</div>
        <div class="dropdown-item" data-act="view-top">Top (XY / Milling Plane)</div>
        <div class="dropdown-item" data-act="view-side">Side (YZ)</div>
        <div class="dropdown-sep"></div>
        <div class="dropdown-item" data-act="toggle-origin" id="menu-toggle-origin">✓ Show Origin Point (G54)</div>
        <div class="dropdown-item" data-act="view-cross">Toggle 3/4 Cross-Section</div>
      </div>
    </div>
  </div>

  <!-- Action Toolbar -->
  <div class="toolbar">
    <!-- Separate Process Mode Dropdown Selector -->
    <div class="toolbar-mode-selector" title="Switch between CNC Turning and Milling modes">
      <span class="toolbar-mode-label">Mode:</span>
      <select id="mode-quick-select" class="mode-select-box">
        <option value="turn">Turning (Lathe — 0i-T)</option>
        <option value="mill">Milling (VMC — 0i-M)</option>
      </select>
    </div>
    <div class="toolbar-sep"></div>
    <button class="tool-btn" data-act="file-new" title="New Program">📄 New</button>
    <button class="tool-btn" data-act="file-open" title="Open Program">📂 Open</button>
    <button class="tool-btn" data-act="file-save" title="Save Program">💾 Save</button>
    <button class="tool-btn" data-act="open-samples-modal" title="Browse and Load Sample Programs" style="font-weight:600;color:#0b57d0;">📁 Load Sample</button>
    <div class="toolbar-sep"></div>
    <button class="tool-btn" data-act="edit-renumber" title="Renumber N-blocks">🔢 N#</button>
    <button class="tool-btn" data-act="run-error-check" title="Error-check G-Code" style="color:#b22222;font-weight:bold;">🔍 Check</button>
    <div class="toolbar-sep"></div>
    <button class="tool-btn" data-act="sim-play" id="btn-play" style="color:#0a7d24;font-weight:bold;">▶ Run</button>
    <button class="tool-btn" data-act="sim-pause" id="btn-pause">❚❚ Pause</button>
    <button class="tool-btn" data-act="sim-step" id="btn-step">⏭ Step</button>
    <button class="tool-btn" data-act="sim-stop" id="btn-reset">⏹ Reset</button>
    <div class="toolbar-sep"></div>
    <button class="tool-btn" data-act="view-front" title="2D Front Projection View">📐 2D View</button>
    <button class="tool-btn" data-act="view-iso" title="3D Isometric View">🧊 3D Iso</button>
    <button class="tool-btn" data-act="view-top" title="Top View">Top</button>
    <button class="tool-btn active" data-act="toggle-origin" id="btn-toggle-origin" title="Toggle G54 Origin Marker (Hotkey: O)">⊕ Origin</button>

    <div class="toolbar-slider-group">
      <span>Speed:</span>
      <input type="range" id="speed-slider" min="1" max="100" value="20" title="Simulation Speed">
      <span id="speed-val">20x</span>
    </div>
  </div>

  <!-- Workspace Split: Editor & 3D Viewport -->
  <div class="workspace-split">
    <!-- Left Column -->
    <div class="left-column">
      <div class="panel-header">Program editor</div>
      <div class="editor-container">
        <textarea id="gcode-editor" spellcheck="false" wrap="off"></textarea>
      </div>

      <!-- Bottom Parameter & Error Tabs -->
      <div class="bottom-tabs-panel">
        <div class="tab-headers">
          <button class="tab-btn" id="tab-err-btn" data-tab="err">Error status</button>
          <button class="tab-btn active" id="tab-sim-btn" data-tab="sim">Simulation</button>
        </div>

        <div class="tab-content" id="tab-sim-content">
          <table class="param-table">
            <tbody>
              <tr><th>Machine name</th><td class="val" id="row-machine">Fanuc 0iT - Type A</td></tr>
              <tr><th>Tool number</th><td class="val" id="row-tool-num">1</td></tr>
              <tr><th>Tool name</th><td class="val" id="row-tool-name">PCLNL 2020K09 R0.8</td></tr>
              <tr><th>Nose radius</th><td class="val" id="row-nose-rad">0.8000 mm</td></tr>
              <tr><th>Motion</th><td class="val" id="row-motion">Linear</td></tr>
              <tr><th>X coord</th><td class="val" id="row-x">50.7072</td></tr>
              <tr id="row-y-container" style="display:none;"><th>Y coord</th><td class="val" id="row-y">0.0000</td></tr>
              <tr><th>Z coord</th><td class="val" id="row-z">-1.6464</td></tr>
              <tr><th>Spindle speed</th><td class="val" id="row-spindle">3000.0000 rpm</td></tr>
              <tr><th>Cutting speed</th><td class="val" id="row-cutting-speed">700.0000 m/min</td></tr>
              <tr><th>Feed rate</th><td class="val" id="row-feed">0.3000 mm/rev</td></tr>
              <tr><th>Spindle status</th><td class="val" id="row-spindle-status">CW</td></tr>
            </tbody>
          </table>
          <div class="sim-notice">Press spacebar or click left mouse button to continue simulation.</div>
        </div>

        <div class="tab-content" id="tab-err-content" style="display:none;">
          <div id="error-list-container">
            <div class="no-errors-box">✓ No errors detected. Ready to simulate.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right 3D Viewport Column -->
    <div class="right-column">
      <div id="viewport-container"></div>
      <div class="viewport-hud" id="hud-status">
        Mode: Fanuc 0iT (Turn)<br>
        State: Ready
      </div>

      <div class="view-shortcuts-bar">
        <button class="view-shortcut-btn" data-act="view-front" title="2D View">2D</button>
        <button class="view-shortcut-btn" data-act="view-iso" title="3D Isometric">3D Iso</button>
        <button class="view-shortcut-btn" data-act="view-top" title="Top View">Top</button>
        <button class="view-shortcut-btn" data-act="view-cross" title="Cross Section">Cross-Sec</button>
        <button class="view-shortcut-btn active" data-act="toggle-origin" id="shortcut-toggle-origin" title="Toggle Origin Marker (Hotkey: O)">⊕ Origin</button>
      </div>
    </div>
  </div>

  <!-- Status Bar -->
  <div class="status-bar">
    <div class="status-cell" id="stat-mode">Mode: Turn</div>
    <div class="status-cell" id="stat-line">Line: 1</div>
    <div class="status-cell" id="stat-time">Est. Cycle Time: 0:00</div>
    <div class="status-cell cursor-pointer" data-act="toggle-autosave" id="stat-autosave" title="Click to Toggle Auto-Save" style="cursor:pointer;font-weight:600;color:#0b57d0;">⚡ Auto-Save: ON</div>
    <div style="margin-left:auto;" id="stat-pos">X: 0.000 | Z: 0.000</div>
  </div>
</div>

<!-- Modal Dialog Container -->
<div class="modal-overlay" id="modal-container" style="display:none;">
  <div class="modal-dialog">
    <div class="modal-title">
      <span id="modal-title-text">Dialog</span>
      <button class="modal-close-btn" id="modal-close-x">✕</button>
    </div>
    <div class="modal-body" id="modal-body-content"></div>
    <div class="modal-footer">
      <button class="dialog-btn" id="modal-cancel-btn">Cancel</button>
      <button class="dialog-btn primary" id="modal-apply-btn">Apply</button>
    </div>
  </div>
</div>

<input type="file" id="file-input" style="display:none;" accept=".txt,.nc,.gcode,.cnc">
`;

// Initialize 3D Viewport
const viewportContainer = document.querySelector('#viewport-container');
const editorEl = document.querySelector('#gcode-editor');

sim3d = new CNCSimulator3D(viewportContainer, (step, curIdx, totalSteps) => {
  updateSimulationReadouts(step);
  updateEditorHighlight(step?.lineIndex);
});

// Setup Initial Content
function loadProgram(code) {
  editorEl.value = code;
  recompileAndReset();
}

function updateTitleBar() {
  const isTurn = state.mode === 'turn';
  const modStar = state.isModified ? ' *' : '';
  const titleText = `${state.currentFileName}${modStar} — DexCNC ${isTurn ? 'Turn (Fanuc 0i-T)' : 'Mill (Fanuc 0i-M)'}`;
  const el = document.querySelector('#win-title-text');
  if (el) el.textContent = titleText;
}

async function saveFile(forceSaveAs = false) {
  const gcodeContent = editorEl.value;
  const isTurn = state.mode === 'turn';
  const defaultExt = '.nc';
  const isNew = !state.currentFileHandle || !state.currentFileName || state.currentFileName.startsWith('Untitled');
  const suggestedName = state.currentFileName && !state.currentFileName.startsWith('Untitled')
    ? state.currentFileName
    : (isTurn ? 'Program_Turn.nc' : 'Program_Mill.nc');

  // Modern File System Access API (writes directly in-place on Chrome/Edge)
  if ('showSaveFilePicker' in window) {
    try {
      if (forceSaveAs || isNew) {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggestedName,
          types: [{
            description: 'CNC G-Code Programs (*.nc, *.txt, *.cnc)',
            accept: {
              'text/plain': ['.nc', '.txt', '.cnc', '.gcode']
            }
          }]
        });
        state.currentFileHandle = handle;
        state.currentFileName = handle.name;
      }

      const writable = await state.currentFileHandle.createWritable();
      await writable.write(gcodeContent);
      await writable.close();

      state.isModified = false;
      updateTitleBar();
      updateHud(`✔ Saved: ${state.currentFileName}`);
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // User cancelled dialog
      console.warn('File System Access API failed, falling back to download:', err);
    }
  }

  // Fallback for browsers without File System Access API
  if (forceSaveAs || isNew) {
    const promptedName = prompt('Enter file name to save:', suggestedName);
    if (!promptedName) return;
    state.currentFileName = promptedName.includes('.') ? promptedName : promptedName + defaultExt;
  }

  const blob = new Blob([gcodeContent], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = state.currentFileName;
  a.click();
  URL.revokeObjectURL(a.href);

  state.isModified = false;
  updateTitleBar();
  updateHud(`✔ Saved: ${state.currentFileName}`);
}

async function openFile() {
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'CNC G-Code Programs (*.nc, *.txt, *.cnc, *.gcode)',
          accept: {
            'text/plain': ['.nc', '.txt', '.cnc', '.gcode']
          }
        }]
      });
      const file = await handle.getFile();
      const text = await file.text();
      state.currentFileHandle = handle;
      state.currentFileName = file.name;
      state.isModified = false;
      loadProgram(text);
      updateTitleBar();
      updateHud(`Opened: ${file.name}`);
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('Fallback to file input:', err);
    }
  }

  document.querySelector('#file-input').click();
}

function switchMode(newMode) {
  if (newMode === state.mode) return;

  // 1. Stash current mode's editor text and state into its dedicated session
  if (editorEl) {
    state.session.code = editorEl.value;
  }

  // 2. Switch mode
  state.mode = newMode;
  state.machineName = newMode === 'turn' ? 'Fanuc 0iT - Type A' : 'Fanuc 0iM - 3 Axis';
  const isTurn = newMode === 'turn';

  // 3. Restore the target mode's own isolated code (starts 100% blank if none entered yet)
  if (editorEl) {
    editorEl.value = state.session.code || '';
  }

  updateTitleBar();

  // Status bar mode text
  const statMode = document.querySelector('#stat-mode');
  if (statMode) {
    statMode.textContent = `Mode: ${isTurn ? 'Turn' : 'Mill'}`;
  }

  // Row Y container in param table
  const rowY = document.querySelector('#row-y-container');
  if (rowY) {
    rowY.style.display = isTurn ? 'none' : 'table-row';
  }

  // Row machine in param table
  const rowMach = document.querySelector('#row-machine');
  if (rowMach) {
    rowMach.textContent = state.machineName;
  }

  // Sync toolbar select dropdown
  const quickSelect = document.querySelector('#mode-quick-select');
  if (quickSelect && quickSelect.value !== newMode) {
    quickSelect.value = newMode;
  }

  // Sync menu checkmarks
  const checkTurn = document.querySelector('#menu-check-turn');
  const checkMill = document.querySelector('#menu-check-mill');
  if (checkTurn && checkMill) {
    checkTurn.style.visibility = isTurn ? 'visible' : 'hidden';
    checkMill.style.visibility = isTurn ? 'hidden' : 'visible';
  }

  // 4. Update parser and 3D simulation with target mode's independent blank & tools
  parser.setMode(state.mode, state.blank, state.tools);
  if (sim3d) {
    sim3d.setMode(state.mode, state.blank);
    sim3d.setView(isTurn ? 'front' : 'top');
  }

  recompileAndReset();
  updateHud(`Switched to ${isTurn ? 'CNC Turning (Lathe)' : 'CNC Milling (VMC)'} Mode`);
}

function recompileAndReset() {
  const result = parser.compile(editorEl.value);
  state.currentErrors = result.errors;
  state.compiledSteps = result.steps;
  state.totalTime = result.totalTimeSec;

  sim3d.loadSteps(result.steps, result.totalTimeSec);
  renderErrorTable(result.errors);
  updateHud(`Ready (${result.steps.length} motions compiled)`);
  document.querySelector('#stat-time').textContent = `Est. Cycle Time: ${formatTime(result.totalTimeSec)}`;
}

function updateSimulationReadouts(step) {
  if (!step) return;
  const isTurn = state.mode === 'turn';
  const p = step.p;
  const n = Math.round(step.rpm || 0);

  document.querySelector('#row-machine').textContent = state.machineName;
  document.querySelector('#row-tool-num').textContent = step.toolNum || 1;
  document.querySelector('#row-tool-name').textContent = step.tool?.name || 'Standard Cutter';

  const radiusLabel = isTurn ? `${(step.tool?.noseRadius || 0.8).toFixed(4)} mm` : `${(step.tool?.diameter || 10).toFixed(4)} mm`;
  document.querySelector('#row-nose-rad').textContent = radiusLabel;
  document.querySelector('#row-motion').textContent = step.motion || 'Linear';

  document.querySelector('#row-x').textContent = p[0].toFixed(4);
  if (!isTurn) {
    document.querySelector('#row-y').textContent = p[1].toFixed(4);
  }
  document.querySelector('#row-z').textContent = p[2].toFixed(4);

  document.querySelector('#row-spindle').textContent = `${n.toFixed(4)} rpm`;

  // Surface Speed (Vc = pi * D * n / 1000)
  const cutSpeed = isTurn ? ((Math.PI * Math.abs(p[0]) * n) / 1000).toFixed(4) : ((Math.PI * (step.tool?.diameter || 10) * n) / 1000).toFixed(4);
  document.querySelector('#row-cutting-speed').textContent = `${cutSpeed} m/min`;

  const feedUnit = isTurn ? 'mm/rev' : 'mm/min';
  document.querySelector('#row-feed').textContent = `${(step.feed || 0.25).toFixed(4)} ${feedUnit}`;
  document.querySelector('#row-spindle-status').textContent = n > 0 ? 'CW' : 'Stopped';

  // Bottom Status
  document.querySelector('#stat-pos').textContent = isTurn ? `X: ${p[0].toFixed(3)} | Z: ${p[2].toFixed(3)}` : `X: ${p[0].toFixed(3)} | Y: ${p[1].toFixed(3)} | Z: ${p[2].toFixed(3)}`;
}

function updateEditorHighlight(lineIndex) {
  if (lineIndex === undefined || lineIndex < 0) return;
  document.querySelector('#stat-line').textContent = `Line: ${lineIndex + 1}`;
}

function updateHud(statusText) {
  document.querySelector('#hud-status').innerHTML = `
    Mode: ${state.machineName}<br>
    State: ${statusText}
  `;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Diagnostics Render
function renderErrorTable(errors) {
  const container = document.querySelector('#error-list-container');
  if (!errors || errors.length === 0) {
    container.innerHTML = `<div class="no-errors-box">✓ No errors detected. Ready to simulate.</div>`;
    return;
  }

  let html = `<table class="error-table"><tbody>`;
  errors.forEach(err => {
    html += `
      <tr data-line="${err.line}">
        <td class="line-badge">Line ${err.line + 1}</td>
        <td class="${err.type === 'error' ? 'err-msg' : 'warn-msg'}">${err.message}</td>
      </tr>
    `;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;

  // Click to jump to line
  container.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => {
      const lineNo = parseInt(row.dataset.line, 10);
      focusEditorLine(lineNo);
    });
  });
}

function focusEditorLine(lineIndex) {
  const lines = editorEl.value.split('\n');
  let charStart = 0;
  for (let i = 0; i < lineIndex && i < lines.length; i++) {
    charStart += lines[i].length + 1;
  }
  const charEnd = charStart + (lines[lineIndex] || '').length;
  editorEl.focus();
  editorEl.setSelectionRange(charStart, charEnd);
}

// Tab Switching
function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelector('#tab-sim-btn').classList.toggle('active', tabId === 'sim');
  document.querySelector('#tab-err-btn').classList.toggle('active', tabId === 'err');
  document.querySelector('#tab-sim-content').style.display = tabId === 'sim' ? 'flex' : 'none';
  document.querySelector('#tab-err-content').style.display = tabId === 'err' ? 'flex' : 'none';
}

document.querySelector('#tab-sim-btn').onclick = () => switchTab('sim');
document.querySelector('#tab-err-btn').onclick = () => switchTab('err');

// Dropdown Menus Behavior
document.querySelectorAll('.menu-item').forEach(item => {
  const btn = item.querySelector('.menu-btn');
  btn.onclick = (e) => {
    e.stopPropagation();
    if (btn.dataset.act) {
      dispatchAction(btn.dataset.act);
      document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
      return;
    }
    const isActive = item.classList.contains('active');
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    if (!isActive) item.classList.add('active');
  };
});

document.querySelectorAll('.dropdown-item').forEach(item => {
  item.onclick = (e) => {
    e.stopPropagation();
    const act = item.dataset.act;
    if (act) dispatchAction(act);
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  };
});

window.addEventListener('click', () => {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
});

// Explicit toolbar button handlers
document.querySelector('#btn-play').onclick = () => dispatchAction('sim-play');
document.querySelector('#btn-pause').onclick = () => dispatchAction('sim-pause');
document.querySelector('#btn-step').onclick = () => dispatchAction('sim-step');
document.querySelector('#btn-reset').onclick = () => dispatchAction('sim-stop');

// Modals Handler
const modalContainer = document.querySelector('#modal-container');
const modalTitle = document.querySelector('#modal-title-text');
const modalBody = document.querySelector('#modal-body-content');
const modalCloseX = document.querySelector('#modal-close-x');
const modalCancel = document.querySelector('#modal-cancel-btn');
const modalApply = document.querySelector('#modal-apply-btn');

function openModal(title, bodyHTML, onApply, isWide = false, isToolLib = false, isSamples = false) {
  const dialog = document.querySelector('.modal-dialog');
  if (isWide) dialog.classList.add('modal-wide');
  else dialog.classList.remove('modal-wide');

  if (isToolLib) dialog.classList.add('modal-tool-lib');
  else dialog.classList.remove('modal-tool-lib');

  if (isSamples) dialog.classList.add('modal-samples');
  else dialog.classList.remove('modal-samples');

  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  modalContainer.style.display = 'flex';
  modalApply.onclick = () => {
    if (onApply) onApply();
    closeModal();
  };
}

function closeModal() {
  modalContainer.style.display = 'none';
  const dialog = document.querySelector('.modal-dialog');
  dialog.classList.remove('modal-wide');
  dialog.classList.remove('modal-tool-lib');
  dialog.classList.remove('modal-samples');
  const footer = document.querySelector('.modal-footer');
  if (footer) footer.style.display = 'flex';
}

modalCloseX.onclick = closeModal;
modalCancel.onclick = closeModal;

// Unsaved Work Confirmation Guard
function confirmUnsavedChanges(onProceed) {
  if (!state.isModified || !editorEl.value || editorEl.value.trim().length === 0) {
    onProceed();
    return;
  }
  const modalHTML = `
    <div style="padding:16px 20px;font-size:13px;line-height:1.5;">
      <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px;">
        <span style="font-size:30px;line-height:1;">⚠️</span>
        <div>
          <div style="font-weight:700;font-size:14px;color:#b91c1c;">Unsaved Project Changes</div>
          <div style="color:#4b5563;margin-top:3px;">You have unsaved changes in <strong>${state.currentFileName}</strong>.</div>
        </div>
      </div>
      <p style="margin:0 0 16px 0;color:#374151;">Would you like to save your current work before opening or loading another program?</p>
      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:12px;border-top:1px solid #e5e7eb;">
        <button id="unsaved-cancel-btn" class="dialog-btn">Cancel</button>
        <button id="unsaved-discard-btn" class="dialog-btn" style="background:#fee2e2;color:#991b1b;border-color:#fca5a5;">Discard Changes</button>
        <button id="unsaved-save-btn" class="dialog-btn primary">Save & Continue</button>
      </div>
    </div>
  `;
  openModal('Warning — Unsaved Program', modalHTML, null, false, false, false);
  const footer = document.querySelector('.modal-footer');
  if (footer) footer.style.display = 'none';

  document.querySelector('#unsaved-cancel-btn').onclick = () => {
    closeModal();
  };

  document.querySelector('#unsaved-discard-btn').onclick = () => {
    closeModal();
    onProceed();
  };

  document.querySelector('#unsaved-save-btn').onclick = async () => {
    closeModal();
    await saveFile(false);
    onProceed();
  };
}

// Sample G-Code Programs Library Dialog
function openSamplesModal(initialMode = null) {
  let activeTabMode = initialMode || state.mode;

  const renderModalContent = () => {
    const list = SAMPLE_LIBRARY[activeTabMode] || [];
    const isTurn = activeTabMode === 'turn';

    const tabsHTML = `
      <div class="samples-tabs">
        <button class="samples-tab-btn ${isTurn ? 'active' : ''}" id="tab-turn-samples">Turning Center (Lathe — Fanuc 0i-T)</button>
        <button class="samples-tab-btn ${!isTurn ? 'active' : ''}" id="tab-mill-samples">Milling Center (VMC — Fanuc 0i-M)</button>
      </div>
    `;

    const cardsHTML = `
      <div class="samples-grid">
        ${list.map(sample => `
          <div class="sample-card" data-sample-id="${sample.id}">
            <div class="sample-card-preview">
              ${sample.svg}
            </div>
            <div class="sample-card-body">
              <div class="sample-card-title">${sample.title}</div>
              <div class="sample-card-desc">${sample.desc}</div>
              <div class="sample-card-meta">
                <div><strong>Blank:</strong> ${isTurn ? `⌀${sample.blank.w} × ${sample.blank.l}mm` : `${sample.blank.w} × ${sample.blank.h} × ${sample.blank.d}mm`}</div>
                <div><strong>Tools:</strong> ${sample.tools}</div>
              </div>
              <button class="sample-card-load-btn" data-load-sample="${sample.id}">
                📥 Load This Sample
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    return tabsHTML + cardsHTML;
  };

  openModal('Sample G-Code Programs Library', renderModalContent(), null, false, false, true);
  const footer = document.querySelector('.modal-footer');
  if (footer) footer.style.display = 'none';

  const bindEvents = () => {
    const btnTurn = document.querySelector('#tab-turn-samples');
    const btnMill = document.querySelector('#tab-mill-samples');
    if (btnTurn) {
      btnTurn.onclick = () => {
        activeTabMode = 'turn';
        modalBody.innerHTML = renderModalContent();
        bindEvents();
      };
    }
    if (btnMill) {
      btnMill.onclick = () => {
        activeTabMode = 'mill';
        modalBody.innerHTML = renderModalContent();
        bindEvents();
      };
    }

    modalBody.querySelectorAll('[data-load-sample]').forEach(btn => {
      btn.onclick = () => {
        const sampleId = btn.dataset.loadSample;
        const all = [...SAMPLE_LIBRARY.turn, ...SAMPLE_LIBRARY.mill];
        const selected = all.find(s => s.id === sampleId);
        if (!selected) return;

        confirmUnsavedChanges(() => {
          closeModal();
          // If sample belongs to different mode, switch mode first
          if (activeTabMode !== state.mode) {
            switchMode(activeTabMode);
          }
          // Apply sample blank dimensions
          Object.assign(state.blank, selected.blank);
          state.currentFileHandle = null;
          state.currentFileName = `${selected.id}.nc`;
          state.isModified = false;
          loadProgram(selected.code);
          updateTitleBar();
          // Set mode-specific default viewpoint:
          sim3d.setView(state.mode === 'turn' ? 'front' : 'top');
          updateHud(`Loaded sample: ${selected.title}`);
        });
      };
    });
  };

  bindEvents();
}

// Auto-Save Management
function toggleAutoSave(forceVal = null) {
  if (forceVal !== null) {
    state.autoSaveEnabled = !!forceVal;
  } else {
    state.autoSaveEnabled = !state.autoSaveEnabled;
  }
  localStorage.setItem('cnc_autosave', state.autoSaveEnabled ? 'true' : 'false');
  updateAutoSaveUI();
  updateHud(`Auto-Save: ${state.autoSaveEnabled ? 'Enabled' : 'Disabled'}`);
}

function updateAutoSaveUI() {
  const menu = document.querySelector('#menu-toggle-autosave');
  const stat = document.querySelector('#stat-autosave');
  if (menu) {
    menu.textContent = state.autoSaveEnabled ? '✓ Auto-Save' : '   Auto-Save';
  }
  if (stat) {
    stat.textContent = state.autoSaveEnabled ? '⚡ Auto-Save: ON' : '⚡ Auto-Save: OFF';
    stat.style.color = state.autoSaveEnabled ? '#0b57d0' : '#888888';
  }
}

let autoSaveTimer = null;
function triggerAutoSave() {
  if (!state.autoSaveEnabled) return;
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    const code = editorEl.value;
    try {
      localStorage.setItem(`cnc_autosave_${state.mode}_code`, code);
      localStorage.setItem(`cnc_autosave_${state.mode}_file`, state.currentFileName);
      localStorage.setItem(`cnc_autosave_${state.mode}_time`, Date.now().toString());
    } catch (e) {
      console.warn('Local storage auto-save failed:', e);
    }

    if (state.currentFileHandle && !state.currentFileName.startsWith('Untitled')) {
      try {
        const writable = await state.currentFileHandle.createWritable();
        await writable.write(code);
        await writable.close();
        state.isModified = false;
        updateTitleBar();
      } catch (err) {
        console.warn('Direct file handle auto-save failed:', err);
      }
    }

    const stat = document.querySelector('#stat-autosave');
    if (stat) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      stat.textContent = `⚡ Saved (${timeStr})`;
      setTimeout(() => {
        if (state.autoSaveEnabled) stat.textContent = '⚡ Auto-Save: ON';
      }, 3000);
    }
  }, 2000);
}

// ── DexCNC Interactive Workpiece Blueprint Schematic (SVG) ──
function renderBlankSchematicSVG(mode, params) {
  const { w, h, l, bore, cx, cy, cz } = params;
  const isTurn = mode === 'turn';

  const ox = 180;
  const oy = 130;

  // Visual scaling to keep drawing clean and well-proportioned
  const maxDim = Math.max(l, Math.max(w, h), 10);
  const scale = 110 / maxDim;

  const bw = Math.max(25, l * scale);
  const bh = Math.max(20, h * scale);
  const bdepth = Math.max(12, w * scale * 0.35);

  // Blank position relative to G54 Datum Origin (ox, oy)
  // cz offsets the front face from datum
  const blankRight = ox - cz * scale;
  const blankLeft = blankRight - bw;
  const blankTop = oy - (bh / 2) - cy * scale;
  const blankBottom = blankTop + bh;

  const datumX = ox;
  const datumY = oy;

  return `
    <svg viewBox="0 0 360 260" class="blank-schematic-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444"/>
        </marker>
        <marker id="arr-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8"/>
        </marker>
        <marker id="arr-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#22c55e"/>
        </marker>
        <marker id="dim-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 2 L 10 5 L 0 8 z" fill="#94a3b8"/>
        </marker>
      </defs>

      <!-- Blueprint Grid Background -->
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.8"/>
      </pattern>
      <rect width="360" height="260" fill="url(#grid)" />

      <!-- Coordinate Axes with + and - Directions -->
      <!-- Z Axis (Horizontal) -->
      <line x1="15" y1="${oy}" x2="${datumX - 8}" y2="${oy}" stroke="#0284c7" stroke-width="1.2" stroke-dasharray="3,3" />
      <text x="20" y="${oy - 6}" fill="#7dd3fc" font-size="10" font-family="Consolas, monospace" font-weight="bold">-Z</text>
      <line x1="${datumX + 8}" y1="${oy}" x2="335" y2="${oy}" stroke="#38bdf8" stroke-width="1.8" marker-end="url(#arr-blue)" />
      <text x="340" y="${oy - 6}" fill="#38bdf8" font-size="10" font-family="Consolas, monospace" font-weight="bold">+Z</text>

      <!-- X Axis (Vertical Radial) -->
      <line x1="${ox}" y1="${datumY + 8}" x2="${ox}" y2="242" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="3,3" />
      <text x="${ox + 6}" y="242" fill="#fca5a5" font-size="10" font-family="Consolas, monospace" font-weight="bold">-X</text>
      <line x1="${ox}" y1="${datumY - 8}" x2="${ox}" y2="18" stroke="#ef4444" stroke-width="1.8" marker-end="url(#arr-red)" />
      <text x="${ox + 6}" y="20" fill="#ef4444" font-size="10" font-family="Consolas, monospace" font-weight="bold">+X</text>

      <!-- Y Axis (Perspective Depth) -->
      <line x1="${ox}" y1="${oy}" x2="${ox - 45}" y2="${oy + 30}" stroke="#15803d" stroke-width="1.2" stroke-dasharray="3,3" />
      <text x="${ox - 60}" y="${oy + 36}" fill="#86efac" font-size="10" font-family="Consolas, monospace" font-weight="bold">-Y</text>
      <line x1="${ox}" y1="${oy}" x2="${ox + 50}" y2="${oy - 35}" stroke="#22c55e" stroke-width="1.5" marker-end="url(#arr-green)" />
      <text x="${ox + 55}" y="${oy - 36}" fill="#22c55e" font-size="10" font-family="Consolas, monospace" font-weight="bold">+Y</text>

      <!-- Blank Workpiece Body -->
      <!-- 3D Isometric Extension -->
      <polygon points="${blankLeft},${blankTop} ${blankLeft + bdepth},${blankTop - bdepth*0.5} ${blankRight + bdepth},${blankTop - bdepth*0.5} ${blankRight},${blankTop}"
               fill="#0ea5e922" stroke="#38bdf8" stroke-width="1.2" />
      <polygon points="${blankRight},${blankTop} ${blankRight + bdepth},${blankTop - bdepth*0.5} ${blankRight + bdepth},${blankBottom - bdepth*0.5} ${blankRight},${blankBottom}"
               fill="#0284c733" stroke="#38bdf8" stroke-width="1.2" />

      <!-- Main Blank Face (Front Projection) -->
      <rect x="${blankLeft}" y="${blankTop}" width="${bw}" height="${bh}"
            fill="#06b6d433" stroke="#00e5ff" stroke-width="1.8" rx="1" />

      ${bore > 0 ? `
        <!-- Hollow Inner Bore Feature -->
        <rect x="${blankLeft}" y="${oy - (bore*scale/2)}" width="${bw}" height="${bore*scale}"
              fill="#0f172a" stroke="#f59e0b" stroke-width="1.4" stroke-dasharray="4,2" />
        <text x="${blankLeft + bw/2}" y="${oy + 3}" fill="#fbbf24" font-size="9" font-family="Consolas, monospace" text-anchor="middle">
          Bore Ø${bore}mm (Wall T=${((h-bore)/2).toFixed(1)}mm)
        </text>
      ` : ''}

      <!-- Dimension Lines & Callouts -->
      <!-- Length L dimension (bottom) -->
      <line x1="${blankLeft}" y1="${blankBottom + 12}" x2="${blankRight}" y2="${blankBottom + 12}" stroke="#94a3b8" stroke-width="1" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)" />
      <line x1="${blankLeft}" y1="${blankBottom}" x2="${blankLeft}" y2="${blankBottom + 16}" stroke="#64748b" stroke-width="0.8" />
      <line x1="${blankRight}" y1="${blankBottom}" x2="${blankRight}" y2="${blankBottom + 16}" stroke="#64748b" stroke-width="0.8" />
      <text x="${blankLeft + bw/2}" y="${blankBottom + 24}" fill="#e2e8f0" font-size="9" font-family="Consolas, monospace" text-anchor="middle" font-weight="bold">
        L = ${l} mm
      </text>

      <!-- Thickness / Height H dimension (left) -->
      <line x1="${blankLeft - 10}" y1="${blankTop}" x2="${blankLeft - 10}" y2="${blankBottom}" stroke="#94a3b8" stroke-width="1" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)" />
      <line x1="${blankLeft}" y1="${blankTop}" x2="${blankLeft - 14}" y2="${blankTop}" stroke="#64748b" stroke-width="0.8" />
      <line x1="${blankLeft}" y1="${blankBottom}" x2="${blankLeft - 14}" y2="${blankBottom}" stroke="#64748b" stroke-width="0.8" />
      <text x="${blankLeft - 14}" y="${blankTop + bh/2 + 3}" fill="#e2e8f0" font-size="9" font-family="Consolas, monospace" text-anchor="end" font-weight="bold">
        ${isTurn ? `T = ${h} mm` : `Z-Thick = ${h} mm`}
      </text>

      <!-- Workpiece Datum Origin Target Symbol (G54: 0,0,0) -->
      <g transform="translate(${datumX}, ${datumY})">
        <circle cx="0" cy="0" r="8" fill="#1e293b" stroke="#ffffff" stroke-width="1.5" />
        <path d="M 0 0 L 8 0 A 8 8 0 0 1 0 8 Z" fill="#ef4444" />
        <path d="M 0 0 L -8 0 A 8 8 0 0 1 0 -8 Z" fill="#ef4444" />
        <path d="M 0 0 L 0 -8 A 8 8 0 0 1 8 0 Z" fill="#facc15" />
        <path d="M 0 0 L 0 8 A 8 8 0 0 1 -8 0 Z" fill="#facc15" />
        <line x1="-12" y1="0" x2="12" y2="0" stroke="#ffffff" stroke-width="1.2" />
        <line x1="0" y1="-12" x2="0" y2="12" stroke="#ffffff" stroke-width="1.2" />
        <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
        <text x="14" y="-8" fill="#facc15" font-size="9" font-family="Consolas, monospace" font-weight="bold">G54 (0,0,0)</text>
      </g>
    </svg>
  `;
}

// Action Dispatcher
function dispatchAction(act) {
  switch (act) {
    case 'mode-turn':
      switchMode('turn');
      break;

    case 'mode-mill':
      switchMode('mill');
      break;

    case 'file-new':
      confirmUnsavedChanges(() => {
        state.currentFileHandle = null;
        state.currentFileName = 'Untitled.nc';
        state.isModified = false;
        editorEl.value = '';
        recompileAndReset();
        updateTitleBar();
        sim3d.setView(state.mode === 'turn' ? 'front' : 'top');
        updateHud('Ready (New File)');
      });
      break;

    case 'file-sample':
    case 'open-samples-modal':
      openSamplesModal();
      break;

    case 'toggle-autosave':
      toggleAutoSave();
      break;

    case 'file-open':
      confirmUnsavedChanges(() => openFile());
      break;

    case 'file-save':
      saveFile(false);
      break;

    case 'file-save-as':
      saveFile(true);
      break;

    case 'file-export-stl':
      alert('3D Workpiece exported as STL (feature simulated).');
      break;

    case 'edit-renumber': {
      const lines = editorEl.value.split('\n');
      let count = 10;
      const renumbered = lines.map(line => {
        const clean = line.replace(/^N\d+\s*/i, '');
        if (clean.trim().length > 0 && !clean.startsWith('(') && !clean.startsWith(';')) {
          const res = `N${count} ${clean}`;
          count += 5;
          return res;
        }
        return line;
      }).join('\n');
      editorEl.value = renumbered;
      break;
    }

    case 'edit-clear':
      editorEl.value = '';
      break;

    case 'open-blank': {
      const b = state.blank;
      const isTurn = state.mode === 'turn';

      const bodyHTML = isTurn ? `
        <div class="blank-dialog-container">
          <div class="blank-fields-col">
            <div class="modal-section-title">1. Blank Dimensions (mm)</div>
            <div class="modal-field">
              <label>Width (W):</label>
              <input type="number" id="inp-blank-w" value="${b.w || b.d || 80}" min="10" max="300" step="1">
            </div>
            <div class="modal-field">
              <label>Thickness / Height (T / H):</label>
              <input type="number" id="inp-blank-h" value="${b.h || b.thickness || b.d || 80}" min="10" max="300" step="1">
            </div>
            <div class="modal-field">
              <label>Length (L):</label>
              <input type="number" id="inp-blank-l" value="${b.l || 100}" min="10" max="500" step="1">
            </div>
            <div class="modal-field">
              <label>Inner Bore Ø (Wall T):</label>
              <input type="number" id="inp-blank-bore" value="${b.bore || 0}" min="0" max="250" step="1" title="0 for solid blank, >0 for hollow tube">
            </div>

            <div class="modal-section-title">2. Center Position & Datum Origin (±X, ±Y, ±Z)</div>
            <div class="modal-field">
              <label>Center X (Radial ±X):</label>
              <input type="number" id="inp-blank-cx" value="${b.centerX || 0}" step="0.5">
            </div>
            <div class="preset-btn-group">
              <button type="button" class="preset-btn" id="btn-pre-cx-0">Centered (X=0)</button>
              <button type="button" class="preset-btn" id="btn-pre-cx-top">+X Top Edge</button>
              <button type="button" class="preset-btn" id="btn-pre-cx-bot">-X Bottom Edge</button>
            </div>

            <div class="modal-field">
              <label>Center Y (Depth ±Y):</label>
              <input type="number" id="inp-blank-cy" value="${b.centerY || 0}" step="0.5">
            </div>
            <div class="preset-btn-group">
              <button type="button" class="preset-btn" id="btn-pre-cy-0">Centered (Y=0)</button>
            </div>

            <div class="modal-field">
              <label>Center Z (Datum Face ±Z):</label>
              <input type="number" id="inp-blank-cz" value="${b.centerZ || 0}" step="1">
            </div>
            <div class="preset-btn-group">
              <button type="button" class="preset-btn" id="btn-pre-cz-front">Front Face (Z=0)</button>
              <button type="button" class="preset-btn" id="btn-pre-cz-mid">Middle (Z=L/2)</button>
              <button type="button" class="preset-btn" id="btn-pre-cz-back">Back Face (Z=-L)</button>
            </div>
          </div>

          <div class="blank-schematic-box">
            <div class="blank-schematic-title">DexCNC Workpiece Blueprint Schematic</div>
            <div id="schematic-svg-container"></div>
            <div class="blank-schematic-legend">
              <span style="color:#ef4444;">● +X / -X</span>
              <span style="color:#38bdf8;">● +Z / -Z</span>
              <span style="color:#22c55e;">● +Y / -Y</span>
              <span style="color:#facc15;">⨁ Origin G54</span>
            </div>
          </div>
        </div>
      ` : `
        <div class="blank-dialog-container">
          <div class="blank-fields-col">
            <div class="modal-section-title">1. Milling Stock Dimensions (mm)</div>
            <div class="modal-field">
              <label>X Length:</label>
              <input type="number" id="inp-blank-x" value="${b.x || 100}" min="10" max="500">
            </div>
            <div class="modal-field">
              <label>Y Width:</label>
              <input type="number" id="inp-blank-y" value="${b.y || 80}" min="10" max="400">
            </div>
            <div class="modal-field">
              <label>Z Thickness (Depth):</label>
              <input type="number" id="inp-blank-z" value="${b.z || 20}" min="5" max="200">
            </div>

            <div class="modal-section-title">2. Center Position & Datum Origin (±X, ±Y, ±Z)</div>
            <div class="modal-field">
              <label>Center X (±X):</label>
              <input type="number" id="inp-blank-cx" value="${b.centerX || 0}" step="1">
            </div>
            <div class="preset-btn-group">
              <button type="button" class="preset-btn" id="btn-pre-cx-0">Corner (X=0)</button>
              <button type="button" class="preset-btn" id="btn-pre-cx-mid">Center (X=L/2)</button>
            </div>

            <div class="modal-field">
              <label>Center Y (±Y):</label>
              <input type="number" id="inp-blank-cy" value="${b.centerY || 0}" step="1">
            </div>
            <div class="preset-btn-group">
              <button type="button" class="preset-btn" id="btn-pre-cy-0">Corner (Y=0)</button>
              <button type="button" class="preset-btn" id="btn-pre-cy-mid">Center (Y=W/2)</button>
            </div>

            <div class="modal-field">
              <label>Center Z (Top Z=0):</label>
              <input type="number" id="inp-blank-cz" value="${b.centerZ || 0}" step="1">
            </div>
          </div>

          <div class="blank-schematic-box">
            <div class="blank-schematic-title">DexCNC Mill Stock Schematic</div>
            <div id="schematic-svg-container"></div>
            <div class="blank-schematic-legend">
              <span style="color:#ef4444;">● +X / -X</span>
              <span style="color:#22c55e;">● +Y / -Y</span>
              <span style="color:#38bdf8;">● +Z / -Z (Thick)</span>
              <span style="color:#facc15;">⨁ Origin G54</span>
            </div>
          </div>
        </div>
      `;

      openModal('Blank Dimensions, Thickness & Center Position (DexCNC Setup)', bodyHTML, () => {
        if (isTurn) {
          const w = parseFloat(document.querySelector('#inp-blank-w').value) || 80;
          const h = parseFloat(document.querySelector('#inp-blank-h').value) || 80;
          const l = parseFloat(document.querySelector('#inp-blank-l').value) || 100;
          const bore = parseFloat(document.querySelector('#inp-blank-bore').value) || 0;
          const cx = parseFloat(document.querySelector('#inp-blank-cx').value) || 0;
          const cy = parseFloat(document.querySelector('#inp-blank-cy').value) || 0;
          const cz = parseFloat(document.querySelector('#inp-blank-cz').value) || 0;
          state.blank.w = w;
          state.blank.h = h;
          state.blank.thickness = h;
          state.blank.d = Math.max(w, h);
          state.blank.l = l;
          state.blank.bore = bore;
          state.blank.centerX = cx;
          state.blank.centerY = cy;
          state.blank.centerZ = cz;
        } else {
          const x = parseFloat(document.querySelector('#inp-blank-x').value) || 100;
          const y = parseFloat(document.querySelector('#inp-blank-y').value) || 80;
          const z = parseFloat(document.querySelector('#inp-blank-z').value) || 20;
          const cx = parseFloat(document.querySelector('#inp-blank-cx').value) || 0;
          const cy = parseFloat(document.querySelector('#inp-blank-cy').value) || 0;
          const cz = parseFloat(document.querySelector('#inp-blank-cz').value) || 0;
          state.blank.x = x;
          state.blank.y = y;
          state.blank.z = z;
          state.blank.thickness = z;
          state.blank.centerX = cx;
          state.blank.centerY = cy;
          state.blank.centerZ = cz;
        }
        parser.setMode(state.mode, state.blank, state.tools);
        sim3d.setMode(state.mode, state.blank);
        recompileAndReset();
      }, true);

      // Bind live schematic updater and preset buttons
      const updateSchematic = () => {
        const svgContainer = document.querySelector('#schematic-svg-container');
        if (!svgContainer) return;
        if (isTurn) {
          const w = parseFloat(document.querySelector('#inp-blank-w').value) || 80;
          const h = parseFloat(document.querySelector('#inp-blank-h').value) || 80;
          const l = parseFloat(document.querySelector('#inp-blank-l').value) || 100;
          const bore = parseFloat(document.querySelector('#inp-blank-bore').value) || 0;
          const cx = parseFloat(document.querySelector('#inp-blank-cx').value) || 0;
          const cy = parseFloat(document.querySelector('#inp-blank-cy').value) || 0;
          const cz = parseFloat(document.querySelector('#inp-blank-cz').value) || 0;
          svgContainer.innerHTML = renderBlankSchematicSVG('turn', { w, h, l, bore, cx, cy, cz });
        } else {
          const x = parseFloat(document.querySelector('#inp-blank-x').value) || 100;
          const y = parseFloat(document.querySelector('#inp-blank-y').value) || 80;
          const z = parseFloat(document.querySelector('#inp-blank-z').value) || 20;
          const cx = parseFloat(document.querySelector('#inp-blank-cx').value) || 0;
          const cy = parseFloat(document.querySelector('#inp-blank-cy').value) || 0;
          const cz = parseFloat(document.querySelector('#inp-blank-cz').value) || 0;
          svgContainer.innerHTML = renderBlankSchematicSVG('mill', { w: y, h: z, l: x, bore: 0, cx, cy, cz });
        }
      };

      // Attach input event listeners
      modalBody.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', updateSchematic);
      });

      // Attach preset buttons
      if (isTurn) {
        document.querySelector('#btn-pre-cx-0')?.addEventListener('click', () => {
          document.querySelector('#inp-blank-cx').value = 0;
          updateSchematic();
        });
        document.querySelector('#btn-pre-cx-top')?.addEventListener('click', () => {
          const h = parseFloat(document.querySelector('#inp-blank-h').value) || 80;
          document.querySelector('#inp-blank-cx').value = (h / 2).toFixed(1);
          updateSchematic();
        });
        document.querySelector('#btn-pre-cx-bot')?.addEventListener('click', () => {
          const h = parseFloat(document.querySelector('#inp-blank-h').value) || 80;
          document.querySelector('#inp-blank-cx').value = (-h / 2).toFixed(1);
          updateSchematic();
        });
        document.querySelector('#btn-pre-cy-0')?.addEventListener('click', () => {
          document.querySelector('#inp-blank-cy').value = 0;
          updateSchematic();
        });
        document.querySelector('#btn-pre-cz-front')?.addEventListener('click', () => {
          document.querySelector('#inp-blank-cz').value = 0;
          updateSchematic();
        });
        document.querySelector('#btn-pre-cz-mid')?.addEventListener('click', () => {
          const l = parseFloat(document.querySelector('#inp-blank-l').value) || 100;
          document.querySelector('#inp-blank-cz').value = (l / 2).toFixed(1);
          updateSchematic();
        });
        document.querySelector('#btn-pre-cz-back')?.addEventListener('click', () => {
          const l = parseFloat(document.querySelector('#inp-blank-l').value) || 100;
          document.querySelector('#inp-blank-cz').value = (-l).toFixed(1);
          updateSchematic();
        });
      } else {
        document.querySelector('#btn-pre-cx-0')?.addEventListener('click', () => {
          document.querySelector('#inp-blank-cx').value = 0;
          updateSchematic();
        });
        document.querySelector('#btn-pre-cx-mid')?.addEventListener('click', () => {
          const x = parseFloat(document.querySelector('#inp-blank-x').value) || 100;
          document.querySelector('#inp-blank-cx').value = (x / 2).toFixed(1);
          updateSchematic();
        });
        document.querySelector('#btn-pre-cy-0')?.addEventListener('click', () => {
          document.querySelector('#inp-blank-cy').value = 0;
          updateSchematic();
        });
        document.querySelector('#btn-pre-cy-mid')?.addEventListener('click', () => {
          const y = parseFloat(document.querySelector('#inp-blank-y').value) || 80;
          document.querySelector('#inp-blank-cy').value = (y / 2).toFixed(1);
          updateSchematic();
        });
      }

      updateSchematic();
      break;
    }

    case 'open-machine': {
      const isTurn = state.mode === 'turn';
      const bodyHTML = isTurn ? `
        <div class="modal-section-title">CNC Turning Center — Machine Specifications</div>
        <div class="modal-field">
          <label>Machine Model:</label>
          <input type="text" id="inp-mach-name" value="${state.machineName}">
        </div>
        <div class="modal-field">
          <label>Machine Type:</label>
          <input type="text" value="2-Axis Horizontal / Slant-Bed CNC Lathe" readonly style="background:#f4f4f4;color:#444;">
        </div>
        <div class="modal-field">
          <label>CNC Controller:</label>
          <select id="sel-mach-ctrl">
            <option selected>Fanuc Series 0i-TF Plus (Lathe)</option>
            <option>Fanuc Series 0i-TC</option>
            <option>Fanuc Series 31i-B</option>
          </select>
        </div>
        <div class="modal-field">
          <label>Max Spindle Speed (RPM):</label>
          <input type="number" id="inp-mach-maxrpm" value="4000" min="500" max="10000" step="100">
        </div>
        <div class="modal-field">
          <label>Chuck / Spindle Type:</label>
          <input type="text" value="Ø250 mm 3-Jaw Hydraulic Chuck (A2-6 Spindle)" readonly style="background:#f4f4f4;color:#444;">
        </div>
        <div class="modal-field">
          <label>Turret Capacity:</label>
          <input type="text" value="8 / 12 Station Radial Hydraulic Turret" readonly style="background:#f4f4f4;color:#444;">
        </div>
        <div class="modal-field">
          <label>Axis Travels:</label>
          <input type="text" value="X: Ø350 mm, Z: 500 mm" readonly style="background:#f4f4f4;color:#444;">
        </div>
        <div class="modal-field">
          <label>Spindle Speed Modes:</label>
          <input type="text" value="G96 (CSS Constant Surface Speed) & G97 (Direct RPM)" readonly style="background:#f4f4f4;color:#444;">
        </div>
        <div style="margin-top:12px;padding:8px 10px;background:#eef4fd;border-left:3px solid #1a73e8;font-size:11px;color:#1e3a8a;border-radius:2px;">
          💡 <strong>Current Machine:</strong> Turning Center (Lathe).<br>
          To switch between Turning and Milling, use the <strong>Mode</strong> dropdown on the top toolbar or menu bar.
        </div>
      ` : `
        <div class="modal-section-title">CNC Milling Center — Machine Specifications</div>
        <div class="modal-field">
          <label>Machine Model:</label>
          <input type="text" id="inp-mach-name" value="${state.machineName}">
        </div>
        <div class="modal-field">
          <label>Machine Type:</label>
          <input type="text" value="3-Axis Vertical Machining Center (VMC)" readonly style="background:#f4f4f4;color:#444;">
        </div>
        <div class="modal-field">
          <label>CNC Controller:</label>
          <select id="sel-mach-ctrl">
            <option selected>Fanuc Series 0i-MF Plus (Machining Center)</option>
            <option>Fanuc Series 0i-MD</option>
            <option>Fanuc Series 31i-B5</option>
          </select>
        </div>
        <div class="modal-field">
          <label>Max Spindle Speed (RPM):</label>
          <input type="number" id="inp-mach-maxrpm" value="10000" min="1000" max="24000" step="500">
        </div>
        <div class="modal-field">
          <label>Work Table Size:</label>
          <input type="text" value="850 mm × 450 mm (T-Slot)" readonly style="background:#f4f4f4;color:#444;">
        </div>
        <div class="modal-field">
          <label>ATC Tool Capacity:</label>
          <input type="text" value="20 Tools (Carousel Automatic Tool Changer — BT40)" readonly style="background:#f4f4f4;color:#444;">
        </div>
        <div class="modal-field">
          <label>Axis Travels:</label>
          <input type="text" value="X: 600 mm, Y: 400 mm, Z: 350 mm" readonly style="background:#f4f4f4;color:#444;">
        </div>
        <div class="modal-field">
          <label>Coordinate Systems:</label>
          <input type="text" value="G54, G55, G56, G57, G58, G59, G17 (XY Plane)" readonly style="background:#f4f4f4;color:#444;">
        </div>
        <div style="margin-top:12px;padding:8px 10px;background:#eef4fd;border-left:3px solid #1a73e8;font-size:11px;color:#1e3a8a;border-radius:2px;">
          💡 <strong>Current Machine:</strong> Vertical Machining Center (VMC).<br>
          To switch between Turning and Milling, use the <strong>Mode</strong> dropdown on the top toolbar or menu bar.
        </div>
      `;

      openModal(`Machine Details — ${isTurn ? 'Fanuc 0i-T Lathe' : 'Fanuc 0i-M VMC'}`, bodyHTML, () => {
        const inpName = document.querySelector('#inp-mach-name');
        if (inpName && inpName.value.trim()) {
          state.machineName = inpName.value.trim();
          document.querySelector('#row-machine').textContent = state.machineName;
        }
      });
      break;
    }

    case 'open-tools': {
      let searchQuery = '';
      let activeFilterCat = 'all';
      const expandedCategories = {
        cnmg: false,
        dnmg: false,
        vnmg: false,
        thread: false,
        groove: false,
        parting: false,
        boring: false,
        drill: false
      };
      let showAddForm = false;
      let showInfoGuide = false;

      if (!state.toolsList) {
        state.toolsList = [...DEFAULT_42_TOOLS];
      }

      const escapeHtml = (s) => String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      // Open the dark modal
      openModal('Tool Library — DexCNC Fanuc Standard Tools', `
        <div class="tool-lib-subtitle">
          <span id="tool-lib-count-text">${state.toolsList.length}</span> tools are loaded by default. Call one in the program with T0101, T0201 ...
        </div>

        <div class="tool-lib-actions-row">
          <button type="button" class="btn-add-tool" id="btn-toggle-add-tool">Add a tool...</button>
          <a class="link-restore-default" id="btn-restore-tools">Restore default library</a>
        </div>

        <div>
          <a class="link-insert-info" id="btn-toggle-insert-info">What are CNMG / DNMG / VNMG?</a>
        </div>

        <div id="tool-info-guide-slot"></div>
        <div id="tool-add-form-slot"></div>

        <div class="tool-search-box">
          <input type="text" class="tool-search-input" id="tool-search-input"
                 placeholder="Search tools: T5, ball, Ø10, M8 ..."
                 autocomplete="off" spellcheck="false">
        </div>

        <div class="tool-filter-pills" id="tool-pills-container"></div>

        <div class="tool-accordion-container" id="tool-accordion-container"></div>

        <div class="tool-library-footer">
          <a class="tool-lib-close-link" id="link-close-tool-lib">Close</a>
        </div>
      `, () => {
        parser.setMode(state.mode, state.blank, state.tools);
        recompileAndReset();
      }, false, true);

      // DOM Elements
      const infoGuideSlot = modalBody.querySelector('#tool-info-guide-slot');
      const addFormSlot = modalBody.querySelector('#tool-add-form-slot');
      const searchInput = modalBody.querySelector('#tool-search-input');
      const pillsContainer = modalBody.querySelector('#tool-pills-container');
      const accordionContainer = modalBody.querySelector('#tool-accordion-container');
      const countText = modalBody.querySelector('#tool-lib-count-text');
      const toggleAddBtn = modalBody.querySelector('#btn-toggle-add-tool');
      const restoreBtn = modalBody.querySelector('#btn-restore-tools');
      const toggleInfoBtn = modalBody.querySelector('#btn-toggle-insert-info');
      const closeLink = modalBody.querySelector('#link-close-tool-lib');

      // Update Info Guide View
      const renderInfoGuide = () => {
        if (!showInfoGuide) {
          infoGuideSlot.innerHTML = '';
          return;
        }
        infoGuideSlot.innerHTML = `
          <div class="insert-info-box">
            <h4>ISO Lathe Insert Geometry & Designation Guide:</h4>
            <p style="margin:4px 0;">• <b>CNMG (80° Diamond)</b>: Heavy-duty 80° rhombic insert. Robust cutting edge, strong all-rounder for heavy roughing, facing, and general turning.</p>
            <p style="margin:4px 0;">• <b>DNMG (55° Diamond)</b>: Versatile 55° rhombic insert. Profiling and copying, reaches 93° square shoulders and contours.</p>
            <p style="margin:4px 0;">• <b>VNMG (35° Diamond)</b>: Acute 35° rhombic insert. Maximum clearance for fine finishing, intricate undercuts, and detail turning.</p>
            <p style="margin:4px 0;">• <b>Nose Radius (R)</b>: R0.2 (fine finish, low vibration), R0.4 (standard finish), R0.8 (standard rough/finish), R1.2 (heavy roughing, high feed).</p>
          </div>
        `;
      };

      // Update Add Form View
      const renderAddForm = () => {
        if (!showAddForm) {
          addFormSlot.innerHTML = '';
          return;
        }
        // Next available station
        const usedStations = new Set(state.toolsList.map(t => t.station));
        let nextStation = 1;
        while (usedStations.has(nextStation)) nextStation++;
        const nextCode = nextStation < 10 ? `T0${nextStation}01` : `T${nextStation}01`;

        addFormSlot.innerHTML = `
          <div class="add-tool-form">
            <h4>Add a Custom Tool</h4>
            <div class="add-tool-grid">
              <div class="add-tool-field">
                <label>Tool Station & Call Code:</label>
                <input type="text" id="inp-add-code" value="${nextCode}" placeholder="e.g. T4301">
              </div>
              <div class="add-tool-field">
                <label>Category:</label>
                <select id="sel-add-cat">
                  ${TOOL_CATEGORIES.map(c => `<option value="${c.id}">${c.title}</option>`).join('')}
                </select>
              </div>
              <div class="add-tool-field" style="grid-column: span 2;">
                <label>Tool Name:</label>
                <input type="text" id="inp-add-name" placeholder="e.g. Turning insert CNMG, nose R0.6 mm">
              </div>
              <div class="add-tool-field">
                <label>Shank / Description:</label>
                <input type="text" id="inp-add-desc" value="Shank 20 × 20 mm, insert length 12 mm">
              </div>
              <div class="add-tool-field">
                <label>Radius / Width / Diameter (mm):</label>
                <input type="number" id="inp-add-dim" step="0.1" value="0.4">
              </div>
            </div>
            <div class="add-tool-actions">
              <button type="button" class="dialog-btn" id="btn-cancel-add-tool">Cancel</button>
              <button type="button" class="btn-add-tool" id="btn-save-add-tool" style="padding:4px 14px;">Save Tool</button>
            </div>
          </div>
        `;

        addFormSlot.querySelector('#btn-cancel-add-tool').onclick = () => {
          showAddForm = false;
          renderAddForm();
        };

        addFormSlot.querySelector('#btn-save-add-tool').onclick = () => {
          const codeInput = addFormSlot.querySelector('#inp-add-code').value.trim().toUpperCase() || nextCode;
          const catId = addFormSlot.querySelector('#sel-add-cat').value;
          const nameInput = addFormSlot.querySelector('#inp-add-name').value.trim() || `Custom Tool (${codeInput})`;
          const descInput = addFormSlot.querySelector('#inp-add-desc').value.trim() || 'Custom shank tool';
          const dimVal = parseFloat(addFormSlot.querySelector('#inp-add-dim').value) || 0.4;

          const numMatch = codeInput.match(/T0?(\d+)/i);
          const stationNum = numMatch ? parseInt(numMatch[1], 10) : nextStation;
          const catMeta = TOOL_CATEGORIES.find(c => c.id === catId) || TOOL_CATEGORIES[0];

          const newTool = {
            station: stationNum,
            code: codeInput,
            category: catId,
            categoryTitle: catMeta.title,
            categoryDesc: catMeta.desc,
            name: nameInput,
            desc: descInput,
            type: catId.includes('drill') ? 'drill' : catId.includes('groove') ? 'groove' : catId.includes('bore') ? 'bore' : 'turn_rough',
            noseRadius: dimVal,
            diameter: dimVal,
            width: dimVal,
            shank: descInput
          };

          state.toolsList.push(newTool);
          if (!state.tools.turn) state.tools.turn = {};
          state.tools.turn[stationNum] = { ...newTool };

          parser.setMode(state.mode, state.blank, state.tools);
          showAddForm = false;
          expandedCategories[catId] = true;
          updateView();
          updateHud(`Added ${codeInput} (${nameInput})`);
        };
      };

      // Filter tool predicate
      const matchesSearch = (tool, q) => {
        if (!q) return true;
        const lowerCode = tool.code.toLowerCase();
        const lowerName = tool.name.toLowerCase();
        const lowerDesc = tool.desc.toLowerCase();
        const lowerCat = (tool.categoryTitle || '').toLowerCase();
        const stationStr = String(tool.station);

        if (lowerCode.includes(q) || lowerName.includes(q) || lowerDesc.includes(q) || lowerCat.includes(q)) return true;
        if (`t${stationStr}`.includes(q) || `t0${stationStr}`.includes(q)) return true;

        // Dimension queries like Ø10, R0.4, 12mm, 20x20
        if (tool.diameter !== undefined && (`ø${tool.diameter}`.includes(q) || `${tool.diameter}mm`.includes(q) || `${tool.diameter}` === q)) return true;
        if (tool.noseRadius !== undefined && (`r${tool.noseRadius}`.includes(q) || `${tool.noseRadius}mm`.includes(q) || `${tool.noseRadius}` === q)) return true;
        if (tool.width !== undefined && (`${tool.width}mm`.includes(q) || `width ${tool.width}`.includes(q) || `${tool.width}` === q)) return true;

        return false;
      };

      // Main Render Function for dynamic content
      const updateView = () => {
        countText.textContent = state.toolsList.length;

        // Calculate count per category
        const catCounts = {};
        TOOL_CATEGORIES.forEach(cat => {
          catCounts[cat.id] = state.toolsList.filter(t => t.category === cat.id).length;
        });

        // 1. Render Filter Pills
        let pillsHTML = `
          <div class="tool-pill ${activeFilterCat === 'all' ? 'active' : ''}" data-cat="all">
            All <span class="pill-badge">${state.toolsList.length}</span>
          </div>
        `;
        TOOL_CATEGORIES.forEach(cat => {
          const count = catCounts[cat.id] || 0;
          pillsHTML += `
            <div class="tool-pill ${activeFilterCat === cat.id ? 'active' : ''}" data-cat="${cat.id}">
              ${cat.title} <span class="pill-badge">${count}</span>
            </div>
          `;
        });
        pillsContainer.innerHTML = pillsHTML;

        // 2. Filter tools
        const q = searchQuery.trim().toLowerCase();
        const matchingTools = state.toolsList.filter(t => {
          if (activeFilterCat !== 'all' && t.category !== activeFilterCat) return false;
          return matchesSearch(t, q);
        });

        // 3. Render Categories Accordion
        let accordionHTML = '';
        let totalRendered = 0;

        TOOL_CATEGORIES.forEach(cat => {
          if (activeFilterCat !== 'all' && activeFilterCat !== cat.id) return;

          const catTools = matchingTools.filter(t => t.category === cat.id);
          // When actively searching, hide categories with 0 matches
          if (q && catTools.length === 0) return;

          // Auto-expand if user is searching or clicked this category's pill
          const isExpanded = q.length > 0 || activeFilterCat === cat.id || !!expandedCategories[cat.id];
          const arrow = isExpanded ? '▼' : '▶';

          totalRendered += catTools.length;

          accordionHTML += `
            <div class="tool-cat-block" data-cat="${cat.id}">
              <div class="tool-cat-header" data-cat="${cat.id}">
                <span class="tool-cat-arrow">${arrow}</span>
                <span class="tool-cat-title">${cat.title}</span>
                <span class="tool-cat-count">${catTools.length}</span>
              </div>
              ${isExpanded ? `
                <div class="tool-cat-body">
                  ${cat.desc ? `<div class="tool-cat-desc">${cat.desc}</div>` : ''}
                  <div class="tool-cards-grid">
                    ${catTools.map(t => `
                      <div class="tool-card-item" data-code="${t.code}" data-station="${t.station}">
                        <div class="tool-card-info">
                          <div class="tool-card-title">
                            <strong>${t.code}</strong> ${t.name}
                          </div>
                          <div class="tool-card-meta">${t.desc}</div>
                        </div>
                        <button type="button" class="tool-card-del-btn" data-code="${t.code}" title="Delete tool">✕</button>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        });

        if (totalRendered === 0) {
          accordionHTML = `
            <div style="padding:28px 16px;text-align:center;color:#64748b;font-size:13px;">
              No tools match your search "${escapeHtml(searchQuery)}".
            </div>
          `;
        }

        accordionContainer.innerHTML = accordionHTML;

        // Re-bind interactive events inside pills and accordion
        bindDynamicEvents();
      };

      const bindDynamicEvents = () => {
        // Pills click
        pillsContainer.querySelectorAll('.tool-pill').forEach(pill => {
          pill.onclick = () => {
            const cat = pill.dataset.cat;
            activeFilterCat = cat;
            if (cat !== 'all') {
              expandedCategories[cat] = true;
            }
            updateView();
          };
        });

        // Category Accordion header toggle
        accordionContainer.querySelectorAll('.tool-cat-header').forEach(hdr => {
          hdr.onclick = () => {
            const cat = hdr.dataset.cat;
            expandedCategories[cat] = !expandedCategories[cat];
            updateView();
          };
        });

        // Delete button click
        accordionContainer.querySelectorAll('.tool-card-del-btn').forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const code = btn.dataset.code;
            const idx = state.toolsList.findIndex(t => t.code === code);
            if (idx >= 0) {
              const removed = state.toolsList.splice(idx, 1)[0];
              if (state.tools.turn && state.tools.turn[removed.station]) {
                delete state.tools.turn[removed.station];
              }
              parser.setMode(state.mode, state.blank, state.tools);
              updateView();
              updateHud(`Removed tool ${code}`);
            }
          };
        });

        // Tool card click to select
        accordionContainer.querySelectorAll('.tool-card-item').forEach(card => {
          card.onclick = () => {
            const code = card.dataset.code;
            const station = parseInt(card.dataset.station, 10);
            accordionContainer.querySelectorAll('.tool-card-item').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            // Select active tool
            if (state.tools.turn && state.tools.turn[station]) {
              state.activeToolNum = station;
              updateHud(`Selected tool ${code} (Station ${station})`);
            }
          };
        });
      };

      // Search input live filtering (retains input focus and cursor)
      searchInput.oninput = (e) => {
        searchQuery = e.target.value;
        updateView();
      };

      // Top action buttons
      toggleAddBtn.onclick = () => {
        showAddForm = !showAddForm;
        renderAddForm();
      };

      restoreBtn.onclick = () => {
        state.toolsList = [...DEFAULT_42_TOOLS];
        state.tools = createDefaultTurret();
        parser.setMode(state.mode, state.blank, state.tools);
        recompileAndReset();
        searchQuery = '';
        searchInput.value = '';
        activeFilterCat = 'all';
        showAddForm = false;
        renderAddForm();
        updateView();
        updateHud('Default 42-tool library restored');
      };

      toggleInfoBtn.onclick = () => {
        showInfoGuide = !showInfoGuide;
        renderInfoGuide();
      };

      closeLink.onclick = () => {
        closeModal();
      };

      // Initial render
      renderInfoGuide();
      renderAddForm();
      updateView();
      break;
    }

    case 'run-error-check': {
      recompileAndReset();
      switchTab('err');
      break;
    }

    case 'sim-play':
      switchTab('sim');
      sim3d.play();
      updateHud('Running...');
      break;

    case 'sim-pause':
      sim3d.pause();
      updateHud('Paused');
      break;

    case 'sim-step':
      switchTab('sim');
      sim3d.stepNext();
      updateHud('Single Step');
      break;

    case 'sim-stop':
      sim3d.stop();
      recompileAndReset();
      updateHud('Reset');
      break;

    case 'view-iso':
      sim3d.setView('iso');
      break;

    case 'view-front':
    case 'view-2d':
      sim3d.setView('front');
      break;

    case 'view-top':
      sim3d.setView('top');
      break;

    case 'view-side':
      sim3d.setView('side');
      break;

    case 'view-cross':
      sim3d.setView('cross_section');
      break;

    case 'toggle-origin': {
      const isVis = sim3d.toggleOriginVisible();
      updateOriginButtons(isVis);
      updateHud(`Origin (G54): ${isVis ? 'Shown' : 'Hidden'}`);
      break;
    }
  }
}

function updateOriginButtons(isVis) {
  const btn = document.querySelector('#btn-toggle-origin');
  const sc = document.querySelector('#shortcut-toggle-origin');
  const menu = document.querySelector('#menu-toggle-origin');
  if (btn) btn.classList.toggle('active', isVis);
  if (sc) sc.classList.toggle('active', isVis);
  if (menu) menu.textContent = isVis ? '✓ Show Origin Point (G54)' : '   Show Origin Point (G54)';
}

// Global button listeners
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (btn) {
    const act = btn.dataset.act;
    dispatchAction(act);
  }
});

// Speed slider
const speedSlider = document.querySelector('#speed-slider');
const speedVal = document.querySelector('#speed-val');
speedSlider.oninput = (e) => {
  const val = parseInt(e.target.value, 10);
  sim3d.speed = val;
  speedVal.textContent = `${val}x`;
};

// Mode Quick-Select Dropdown on Toolbar
const modeQuickSelect = document.querySelector('#mode-quick-select');
if (modeQuickSelect) {
  modeQuickSelect.onchange = (e) => {
    switchMode(e.target.value);
  };
}

// File open input fallback
document.querySelector('#file-input').onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    state.currentFileHandle = null;
    state.currentFileName = file.name;
    state.isModified = false;
    const reader = new FileReader();
    reader.onload = (evt) => {
      loadProgram(evt.target.result);
      updateTitleBar();
      updateHud(`Opened: ${file.name}`);
    };
    reader.readAsText(file);
  }
  e.target.value = '';
};

// Track changes in editor and trigger auto-save
editorEl.addEventListener('input', () => {
  if (!state.isModified) {
    state.isModified = true;
    updateTitleBar();
  }
  triggerAutoSave();
});

// Keyboard shortcuts (Ctrl+S for save, Space for pause, F-keys)
window.addEventListener('keydown', (e) => {
  // Ctrl+S / Cmd+S (Save / Save As)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (e.shiftKey) {
      saveFile(true);  // Ctrl+Shift+S -> Save As
    } else {
      saveFile(false); // Ctrl+S -> Save
    }
    return;
  }

  // Ctrl+O / Cmd+O (Open)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
    e.preventDefault();
    confirmUnsavedChanges(() => openFile());
    return;
  }

  // If editing inside textarea, allow standard typing
  if (document.activeElement === editorEl) return;

  if (e.key.toLowerCase() === 'o') {
    e.preventDefault();
    dispatchAction('toggle-origin');
    return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
    sim3d.togglePlayPause();
    updateHud(sim3d.isRunning ? 'Running...' : 'Paused');
  } else if (e.code === 'F5') {
    e.preventDefault();
    dispatchAction('sim-play');
  } else if (e.code === 'F8') {
    e.preventDefault();
    dispatchAction('sim-stop');
  } else if (e.code === 'F10') {
    e.preventDefault();
    dispatchAction('sim-step');
  }
});

// Click viewport to toggle play/pause as indicated in notice
viewportContainer.addEventListener('dblclick', () => {
  sim3d.togglePlayPause();
  updateHud(sim3d.isRunning ? 'Running...' : 'Paused');
});

// Initial UI & Auto-Save Setup
updateAutoSaveUI();

// Initial Clean App Startup: Start with a 100% blank editor (no code) in 2D Front View
state.currentFileHandle = null;
state.currentFileName = 'Untitled.nc';
state.isModified = false;
editorEl.value = '';
recompileAndReset();
updateTitleBar();
sim3d.setView(state.mode === 'turn' ? 'front' : 'top');
updateHud('Ready (New Program)');
