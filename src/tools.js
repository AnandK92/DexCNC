// Tool library for CNC Turn and Mill with 42 Standard Fanuc Tools
// Exact specifications matching DexCNC standard tool database

export const DEFAULT_42_TOOLS = [
  // ── 1. Turning insert CNMG (4 tools) ──
  {
    station: 9,
    code: 'T0901',
    category: 'cnmg',
    categoryTitle: 'Turning insert CNMG',
    categoryDesc: '80° diamond. Strong all-rounder for roughing and general turning.',
    name: 'Turning insert CNMG, nose R0.2 mm',
    desc: 'Shank 20 × 20 mm, insert length 12 mm',
    type: 'turn_rough',
    shape: 'CNMG',
    noseRadius: 0.2,
    insertLength: 12,
    shank: '20 × 20 mm',
    leadAngle: 95
  },
  {
    station: 2,
    code: 'T0201',
    category: 'cnmg',
    categoryTitle: 'Turning insert CNMG',
    categoryDesc: '80° diamond. Strong all-rounder for roughing and general turning.',
    name: 'Turning insert CNMG, nose R0.4 mm',
    desc: 'Shank 20 × 20 mm, insert length 12 mm',
    type: 'turn_rough',
    shape: 'CNMG',
    noseRadius: 0.4,
    insertLength: 12,
    shank: '20 × 20 mm',
    leadAngle: 95
  },
  {
    station: 1,
    code: 'T0101',
    category: 'cnmg',
    categoryTitle: 'Turning insert CNMG',
    categoryDesc: '80° diamond. Strong all-rounder for roughing and general turning.',
    name: 'Turning insert CNMG, nose R0.8 mm',
    desc: 'Shank 20 × 20 mm, insert length 12 mm',
    type: 'turn_rough',
    shape: 'CNMG',
    noseRadius: 0.8,
    insertLength: 12,
    shank: '20 × 20 mm',
    leadAngle: 95
  },
  {
    station: 3,
    code: 'T0301',
    category: 'cnmg',
    categoryTitle: 'Turning insert CNMG',
    categoryDesc: '80° diamond. Strong all-rounder for roughing and general turning.',
    name: 'Turning insert CNMG, nose R1.2 mm',
    desc: 'Shank 20 × 20 mm, insert length 12 mm',
    type: 'turn_rough',
    shape: 'CNMG',
    noseRadius: 1.2,
    insertLength: 12,
    shank: '20 × 20 mm',
    leadAngle: 95
  },

  // ── 2. Turning insert DNMG (4 tools) ──
  {
    station: 10,
    code: 'T1001',
    category: 'dnmg',
    categoryTitle: 'Turning insert DNMG',
    categoryDesc: '55° diamond. Profiling and copying, reaches shoulders and contours.',
    name: 'Turning insert DNMG, nose R0.2 mm',
    desc: 'Shank 20 × 20 mm, insert length 12 mm',
    type: 'turn_profile',
    shape: 'DNMG',
    noseRadius: 0.2,
    insertLength: 12,
    shank: '20 × 20 mm',
    leadAngle: 93
  },
  {
    station: 4,
    code: 'T0401',
    category: 'dnmg',
    categoryTitle: 'Turning insert DNMG',
    categoryDesc: '55° diamond. Profiling and copying, reaches shoulders and contours.',
    name: 'Turning insert DNMG, nose R0.4 mm',
    desc: 'Shank 20 × 20 mm, insert length 12 mm',
    type: 'turn_profile',
    shape: 'DNMG',
    noseRadius: 0.4,
    insertLength: 12,
    shank: '20 × 20 mm',
    leadAngle: 93
  },
  {
    station: 5,
    code: 'T0501',
    category: 'dnmg',
    categoryTitle: 'Turning insert DNMG',
    categoryDesc: '55° diamond. Profiling and copying, reaches shoulders and contours.',
    name: 'Turning insert DNMG, nose R0.8 mm',
    desc: 'Shank 20 × 20 mm, insert length 12 mm',
    type: 'turn_profile',
    shape: 'DNMG',
    noseRadius: 0.8,
    insertLength: 12,
    shank: '20 × 20 mm',
    leadAngle: 93
  },
  {
    station: 8,
    code: 'T0801',
    category: 'dnmg',
    categoryTitle: 'Turning insert DNMG',
    categoryDesc: '55° diamond. Profiling and copying, reaches shoulders and contours.',
    name: 'Turning insert DNMG, nose R1.2 mm',
    desc: 'Shank 20 × 20 mm, insert length 12 mm',
    type: 'turn_profile',
    shape: 'DNMG',
    noseRadius: 1.2,
    insertLength: 12,
    shank: '20 × 20 mm',
    leadAngle: 93
  },

  // ── 3. Turning insert VNMG (3 tools) ──
  {
    station: 6,
    code: 'T0601',
    category: 'vnmg',
    categoryTitle: 'Turning insert VNMG',
    categoryDesc: '35° diamond. Fine finishing and detail, weakest edge.',
    name: 'Turning insert VNMG, nose R0.2 mm',
    desc: 'Shank 20 × 20 mm, insert length 16 mm',
    type: 'turn_fine',
    shape: 'VNMG',
    noseRadius: 0.2,
    insertLength: 16,
    shank: '20 × 20 mm',
    leadAngle: 93
  },
  {
    station: 7,
    code: 'T0701',
    category: 'vnmg',
    categoryTitle: 'Turning insert VNMG',
    categoryDesc: '35° diamond. Fine finishing and detail, weakest edge.',
    name: 'Turning insert VNMG, nose R0.4 mm',
    desc: 'Shank 20 × 20 mm, insert length 16 mm',
    type: 'turn_fine',
    shape: 'VNMG',
    noseRadius: 0.4,
    insertLength: 16,
    shank: '20 × 20 mm',
    leadAngle: 93
  },
  {
    station: 11,
    code: 'T1101',
    category: 'vnmg',
    categoryTitle: 'Turning insert VNMG',
    categoryDesc: '35° diamond. Fine finishing and detail, weakest edge.',
    name: 'Turning insert VNMG, nose R0.8 mm',
    desc: 'Shank 20 × 20 mm, insert length 16 mm',
    type: 'turn_fine',
    shape: 'VNMG',
    noseRadius: 0.8,
    insertLength: 16,
    shank: '20 × 20 mm',
    leadAngle: 93
  },

  // ── 4. Threading tool 60° (3 tools) ──
  {
    station: 12,
    code: 'T1201',
    category: 'thread',
    categoryTitle: 'Threading tool 60°',
    categoryDesc: '60° external threading insert for ISO metric and UN threads.',
    name: 'Threading tool 60°, nose R0.1 mm',
    desc: 'Shank 20 × 20 mm, 60° external threading insert',
    type: 'thread',
    noseRadius: 0.1,
    shank: '20 × 20 mm',
    threadAngle: 60
  },
  {
    station: 13,
    code: 'T1301',
    category: 'thread',
    categoryTitle: 'Threading tool 60°',
    categoryDesc: '60° external threading insert for ISO metric and UN threads.',
    name: 'Threading tool 60°, nose R0.2 mm',
    desc: 'Shank 20 × 20 mm, 60° external threading insert',
    type: 'thread',
    noseRadius: 0.2,
    shank: '20 × 20 mm',
    threadAngle: 60
  },
  {
    station: 14,
    code: 'T1401',
    category: 'thread',
    categoryTitle: 'Threading tool 60°',
    categoryDesc: '60° external threading insert for ISO metric and UN threads.',
    name: 'Threading tool 60°, nose R0.4 mm',
    desc: 'Shank 20 × 20 mm, 60° external threading insert',
    type: 'thread',
    noseRadius: 0.4,
    shank: '20 × 20 mm',
    threadAngle: 60
  },

  // ── 5. Grooving tool (5 tools) ──
  {
    station: 15,
    code: 'T1501',
    category: 'groove',
    categoryTitle: 'Grooving tool',
    categoryDesc: 'Radial grooving insert for recesses and circlip grooves.',
    name: 'Grooving tool, width 2 mm',
    desc: 'Shank 20 × 20 mm, grooving insert',
    type: 'groove',
    width: 2.0,
    shank: '20 × 20 mm',
    noseRadius: 0.2
  },
  {
    station: 16,
    code: 'T1601',
    category: 'groove',
    categoryTitle: 'Grooving tool',
    categoryDesc: 'Radial grooving insert for recesses and circlip grooves.',
    name: 'Grooving tool, width 3 mm',
    desc: 'Shank 20 × 20 mm, grooving insert',
    type: 'groove',
    width: 3.0,
    shank: '20 × 20 mm',
    noseRadius: 0.2
  },
  {
    station: 17,
    code: 'T1701',
    category: 'groove',
    categoryTitle: 'Grooving tool',
    categoryDesc: 'Radial grooving insert for recesses and circlip grooves.',
    name: 'Grooving tool, width 4 mm',
    desc: 'Shank 20 × 20 mm, grooving insert',
    type: 'groove',
    width: 4.0,
    shank: '20 × 20 mm',
    noseRadius: 0.2
  },
  {
    station: 18,
    code: 'T1801',
    category: 'groove',
    categoryTitle: 'Grooving tool',
    categoryDesc: 'Radial grooving insert for recesses and circlip grooves.',
    name: 'Grooving tool, width 5 mm',
    desc: 'Shank 20 × 20 mm, grooving insert',
    type: 'groove',
    width: 5.0,
    shank: '20 × 20 mm',
    noseRadius: 0.2
  },
  {
    station: 19,
    code: 'T1901',
    category: 'groove',
    categoryTitle: 'Grooving tool',
    categoryDesc: 'Radial grooving insert for recesses and circlip grooves.',
    name: 'Grooving tool, width 6 mm',
    desc: 'Shank 20 × 20 mm, grooving insert',
    type: 'groove',
    width: 6.0,
    shank: '20 × 20 mm',
    noseRadius: 0.2
  },

  // ── 6. Parting-off tool (4 tools) ──
  {
    station: 20,
    code: 'T2001',
    category: 'parting',
    categoryTitle: 'Parting-off tool',
    categoryDesc: 'Parting blade for cut-off operations and deep grooves.',
    name: 'Parting-off tool, width 2 mm',
    desc: 'Shank 20 × 20 mm, parting blade',
    type: 'parting',
    width: 2.0,
    shank: '20 × 20 mm',
    noseRadius: 0.1
  },
  {
    station: 21,
    code: 'T2101',
    category: 'parting',
    categoryTitle: 'Parting-off tool',
    categoryDesc: 'Parting blade for cut-off operations and deep grooves.',
    name: 'Parting-off tool, width 3 mm',
    desc: 'Shank 20 × 20 mm, parting blade',
    type: 'parting',
    width: 3.0,
    shank: '20 × 20 mm',
    noseRadius: 0.15
  },
  {
    station: 22,
    code: 'T2201',
    category: 'parting',
    categoryTitle: 'Parting-off tool',
    categoryDesc: 'Parting blade for cut-off operations and deep grooves.',
    name: 'Parting-off tool, width 4 mm',
    desc: 'Shank 20 × 20 mm, parting blade',
    type: 'parting',
    width: 4.0,
    shank: '20 × 20 mm',
    noseRadius: 0.2
  },
  {
    station: 23,
    code: 'T2301',
    category: 'parting',
    categoryTitle: 'Parting-off tool',
    categoryDesc: 'Parting blade for cut-off operations and deep grooves.',
    name: 'Parting-off tool, width 5 mm',
    desc: 'Shank 20 × 20 mm, parting blade',
    type: 'parting',
    width: 5.0,
    shank: '20 × 20 mm',
    noseRadius: 0.25
  },

  // ── 7. Boring bar (7 tools) ──
  {
    station: 24,
    code: 'T2401',
    category: 'boring',
    categoryTitle: 'Boring bar',
    categoryDesc: 'Round shank, for internal turning.',
    name: 'Boring bar, Ø6 mm',
    desc: 'Round shank, for internal turning',
    type: 'bore',
    diameter: 6.0,
    minBore: 7.0,
    noseRadius: 0.2,
    shank: 'Ø6 mm round'
  },
  {
    station: 25,
    code: 'T2501',
    category: 'boring',
    categoryTitle: 'Boring bar',
    categoryDesc: 'Round shank, for internal turning.',
    name: 'Boring bar, Ø8 mm',
    desc: 'Round shank, for internal turning',
    type: 'bore',
    diameter: 8.0,
    minBore: 9.5,
    noseRadius: 0.2,
    shank: 'Ø8 mm round'
  },
  {
    station: 26,
    code: 'T2601',
    category: 'boring',
    categoryTitle: 'Boring bar',
    categoryDesc: 'Round shank, for internal turning.',
    name: 'Boring bar, Ø10 mm',
    desc: 'Round shank, for internal turning',
    type: 'bore',
    diameter: 10.0,
    minBore: 12.0,
    noseRadius: 0.4,
    shank: 'Ø10 mm round'
  },
  {
    station: 27,
    code: 'T2701',
    category: 'boring',
    categoryTitle: 'Boring bar',
    categoryDesc: 'Round shank, for internal turning.',
    name: 'Boring bar, Ø12 mm',
    desc: 'Round shank, for internal turning',
    type: 'bore',
    diameter: 12.0,
    minBore: 14.0,
    noseRadius: 0.4,
    shank: 'Ø12 mm round'
  },
  {
    station: 28,
    code: 'T2801',
    category: 'boring',
    categoryTitle: 'Boring bar',
    categoryDesc: 'Round shank, for internal turning.',
    name: 'Boring bar, Ø16 mm',
    desc: 'Round shank, for internal turning',
    type: 'bore',
    diameter: 16.0,
    minBore: 18.0,
    noseRadius: 0.4,
    shank: 'Ø16 mm round'
  },
  {
    station: 29,
    code: 'T2901',
    category: 'boring',
    categoryTitle: 'Boring bar',
    categoryDesc: 'Round shank, for internal turning.',
    name: 'Boring bar, Ø20 mm',
    desc: 'Round shank, for internal turning',
    type: 'bore',
    diameter: 20.0,
    minBore: 23.0,
    noseRadius: 0.4,
    shank: 'Ø20 mm round'
  },
  {
    station: 30,
    code: 'T3001',
    category: 'boring',
    categoryTitle: 'Boring bar',
    categoryDesc: 'Round shank, for internal turning.',
    name: 'Boring bar, Ø25 mm',
    desc: 'Round shank, for internal turning',
    type: 'bore',
    diameter: 25.0,
    minBore: 28.0,
    noseRadius: 0.8,
    shank: 'Ø25 mm round'
  },

  // ── 8. Drill (12 tools) ──
  {
    station: 31,
    code: 'T3101',
    category: 'drill',
    categoryTitle: 'Drill',
    categoryDesc: 'Twist drill, cuts along the spindle axis.',
    name: 'Drill, Ø3 mm',
    desc: 'Twist drill, cuts along the spindle axis',
    type: 'drill',
    diameter: 3.0,
    pointAngle: 118
  },
  {
    station: 32,
    code: 'T3201',
    category: 'drill',
    categoryTitle: 'Drill',
    categoryDesc: 'Twist drill, cuts along the spindle axis.',
    name: 'Drill, Ø4 mm',
    desc: 'Twist drill, cuts along the spindle axis',
    type: 'drill',
    diameter: 4.0,
    pointAngle: 118
  },
  {
    station: 33,
    code: 'T3301',
    category: 'drill',
    categoryTitle: 'Drill',
    categoryDesc: 'Twist drill, cuts along the spindle axis.',
    name: 'Drill, Ø5 mm',
    desc: 'Twist drill, cuts along the spindle axis',
    type: 'drill',
    diameter: 5.0,
    pointAngle: 118
  },
  {
    station: 34,
    code: 'T3401',
    category: 'drill',
    categoryTitle: 'Drill',
    categoryDesc: 'Twist drill, cuts along the spindle axis.',
    name: 'Drill, Ø6 mm',
    desc: 'Twist drill, cuts along the spindle axis',
    type: 'drill',
    diameter: 6.0,
    pointAngle: 118
  },
  {
    station: 35,
    code: 'T3501',
    category: 'drill',
    categoryTitle: 'Drill',
    categoryDesc: 'Twist drill, cuts along the spindle axis.',
    name: 'Drill, Ø8 mm',
    desc: 'Twist drill, cuts along the spindle axis',
    type: 'drill',
    diameter: 8.0,
    pointAngle: 118
  },
  {
    station: 36,
    code: 'T3601',
    category: 'drill',
    categoryTitle: 'Drill',
    categoryDesc: 'Twist drill, cuts along the spindle axis.',
    name: 'Drill, Ø10 mm',
    desc: 'Twist drill, cuts along the spindle axis',
    type: 'drill',
    diameter: 10.0,
    pointAngle: 118
  },
  {
    station: 37,
    code: 'T3701',
    category: 'drill',
    categoryTitle: 'Drill',
    categoryDesc: 'Twist drill, cuts along the spindle axis.',
    name: 'Drill, Ø12 mm',
    desc: 'Twist drill, cuts along the spindle axis',
    type: 'drill',
    diameter: 12.0,
    pointAngle: 118
  },
  {
    station: 38,
    code: 'T3801',
    category: 'drill',
    categoryTitle: 'Drill',
    categoryDesc: 'Twist drill, cuts along the spindle axis.',
    name: 'Drill, Ø16 mm',
    desc: 'Twist drill, cuts along the spindle axis',
    type: 'drill',
    diameter: 16.0,
    pointAngle: 118
  },
  {
    station: 39,
    code: 'T3901',
    category: 'drill',
    categoryTitle: 'Drill',
    categoryDesc: 'Twist drill, cuts along the spindle axis.',
    name: 'Drill, Ø20 mm',
    desc: 'Twist drill, cuts along the spindle axis',
    type: 'drill',
    diameter: 20.0,
    pointAngle: 118
  },
  {
    station: 40,
    code: 'T4001',
    category: 'drill',
    categoryTitle: 'Drill',
    categoryDesc: 'Twist drill, cuts along the spindle axis.',
    name: 'Drill, Ø25 mm',
    desc: 'Twist drill, cuts along the spindle axis',
    type: 'drill',
    diameter: 25.0,
    pointAngle: 118
  },
  {
    station: 41,
    code: 'T4101',
    category: 'drill',
    categoryTitle: 'Drill',
    categoryDesc: 'Twist drill, cuts along the spindle axis.',
    name: 'Drill, Ø32 mm',
    desc: 'Twist drill, cuts along the spindle axis',
    type: 'drill',
    diameter: 32.0,
    pointAngle: 118
  },
  {
    station: 42,
    code: 'T4201',
    category: 'drill',
    categoryTitle: 'Drill',
    categoryDesc: 'Twist drill, cuts along the spindle axis.',
    name: 'Drill, Ø40 mm',
    desc: 'Twist drill, cuts along the spindle axis',
    type: 'drill',
    diameter: 40.0,
    pointAngle: 118
  }
];

// Ordered category metadata matching the UI
export const TOOL_CATEGORIES = [
  { id: 'cnmg', title: 'Turning insert CNMG', desc: '80° diamond. Strong all-rounder for roughing and general turning.' },
  { id: 'dnmg', title: 'Turning insert DNMG', desc: '55° diamond. Profiling and copying, reaches shoulders and contours.' },
  { id: 'vnmg', title: 'Turning insert VNMG', desc: '35° diamond. Fine finishing and detail, weakest edge.' },
  { id: 'thread', title: 'Threading tool 60°', desc: '60° external threading insert for ISO metric and UN threads.' },
  { id: 'groove', title: 'Grooving tool', desc: 'Radial grooving insert for recesses and circlip grooves.' },
  { id: 'parting', title: 'Parting-off tool', desc: 'Parting blade for cut-off operations and deep grooves.' },
  { id: 'boring', title: 'Boring bar', desc: 'Round shank, for internal turning.' },
  { id: 'drill', title: 'Drill', desc: 'Twist drill, cuts along the spindle axis.' }
];

// Legacy tool database compatibility for mill and turn
export const TOOL_DATABASE = {
  turn: {
    mm: DEFAULT_42_TOOLS.map(t => ({ id: t.code, name: `${t.code} ${t.name}`, desc: t.desc, ...t })),
    in: DEFAULT_42_TOOLS.map(t => ({ id: t.code, name: `${t.code} ${t.name}`, desc: t.desc, ...t }))
  },
  mill: {
    mm: [
      { station: 1, code: 'T01', name: 'Flat End Mill Ø10mm', desc: '4-Flute carbide end mill', type: 'endmill', diameter: 10, radius: 5, flutes: 4 },
      { station: 2, code: 'T02', name: 'Flat End Mill Ø6mm', desc: '3-Flute slotting cutter', type: 'endmill', diameter: 6, radius: 3, flutes: 3 },
      { station: 3, code: 'T03', name: 'Twist Drill Ø8mm', desc: 'Standard 118° HSS drill', type: 'drill', diameter: 8, radius: 4, flutes: 2 },
      { station: 4, code: 'T04', name: 'Twist Drill Ø5mm', desc: 'Tap drill for M6 thread', type: 'drill', diameter: 5, radius: 2.5, flutes: 2 },
      { station: 5, code: 'T05', name: 'Ball Nose Mill Ø8mm', desc: '2-Flute spherical 3D contouring', type: 'ballmill', diameter: 8, radius: 4, flutes: 2 },
      { station: 6, code: 'T06', name: 'Spot Drill 90° Ø10mm', desc: 'Spotting & chamfering tool', type: 'chamfer', diameter: 10, radius: 5, flutes: 2 },
      { station: 7, code: 'T07', name: 'Flat End Mill Ø12mm', desc: '4-Flute carbide rougher/finisher', type: 'endmill', diameter: 12, radius: 6, flutes: 4 },
      { station: 8, code: 'T08', name: 'Face Mill Ø50mm', desc: 'Indexable 45° face cutter', type: 'facemill', diameter: 50, radius: 25, flutes: 4 }
    ],
    in: [
      { station: 1, code: 'T01', name: 'Flat End Mill 1/2"', desc: 'Ø0.500" 4-Flute carbide', type: 'endmill', diameter: 12.7, radius: 6.35, flutes: 4 },
      { station: 2, code: 'T02', name: 'Flat End Mill 3/8"', desc: 'Ø0.375" 3-Flute end mill', type: 'endmill', diameter: 9.525, radius: 4.76, flutes: 3 },
      { station: 3, code: 'T03', name: 'Twist Drill 1/4"', desc: 'Ø0.250" Twist drill bit', type: 'drill', diameter: 6.35, radius: 3.175, flutes: 2 }
    ]
  }
};

export function createDefaultTurret() {
  const turnTurret = {};
  // Populate all 42 stations
  DEFAULT_42_TOOLS.forEach(tool => {
    turnTurret[tool.station] = { ...tool };
  });

  const millTurret = {};
  TOOL_DATABASE.mill.mm.forEach(tool => {
    millTurret[tool.station] = { ...tool };
  });

  return {
    turn: turnTurret,
    mill: millTurret
  };
}
