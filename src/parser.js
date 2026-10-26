// Fanuc CNC Parser & Motion Compiler for Lathe and Mill

export class CNCParser {
  constructor(mode = 'turn', blank = null, tools = {}) {
    this.mode = mode; // 'turn' or 'mill'
    this.blank = blank || (mode === 'turn' ? { d: 80, l: 100 } : { x: 100, y: 80, z: 20 });
    this.tools = tools;
  }

  setMode(mode, blank, tools) {
    this.mode = mode;
    this.blank = blank;
    this.tools = tools;
  }

  compile(gcodeText) {
    const lines = gcodeText.split('\n');
    const errors = [];
    const blocks = [];
    const nMap = {}; // Maps N block numbers to block array index

    // 1. Lexical Tokenization
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      // Strip comments
      let clean = raw.replace(/\(.*?\)/g, '').replace(/;.*/, '').toUpperCase().trim();
      if (!clean || clean.startsWith('%') || /^O\d+$/.test(clean)) {
        blocks.push(null);
        continue;
      }

      const block = { lineIndex: i, rawText: raw, g: [], m: [], words: {} };
      let ptr = 0;
      let parseFailed = false;

      while (ptr < clean.length) {
        if (clean[ptr] === ' ' || clean[ptr] === '\t' || clean[ptr] === ',') {
          ptr++;
          continue;
        }

        // Match address letter + optional sign + number (supports decimals like X50.5 or Z-20.)
        const match = /^([A-Z])\s*([+-]?(?:\d+\.?\d*|\.\d+))/.exec(clean.slice(ptr));
        if (!match) {
          errors.push({
            line: i,
            type: 'error',
            message: `Syntax error near '${clean.slice(ptr, ptr + 8)}'. Expected letter followed by number.`
          });
          parseFailed = true;
          break;
        }

        const letter = match[1];
        const val = parseFloat(match[2]);
        ptr += match[0].length;

        if (!'NGMXYZUVWIJKRFSTPQDHL'.includes(letter)) {
          errors.push({
            line: i,
            type: 'warning',
            message: `Unrecognized G-code word '${letter}' ignored.`
          });
          continue;
        }

        if (letter === 'G') {
          block.g.push(val);
        } else if (letter === 'M') {
          block.m.push(val);
        } else {
          block.words[letter] = val;
        }
      }

      if (!parseFailed) {
        blocks.push(block);
        if (block.words.N !== undefined) {
          nMap[Math.round(block.words.N)] = blocks.length - 1;
        }
      } else {
        blocks.push(null);
      }
    }

    // 2. Kinematics & State Machine Compilation
    const isTurn = this.mode === 'turn';
    const homePos = isTurn ? [this.blank.d + 30, 0, 30] : [0, 0, 30]; // [X, Y, Z]

    const state = {
      p: [...homePos],
      abs: true,
      unitScale: 1.0, // 1.0 for G21 (mm), 25.4 for G20 (inch)
      feed: null,
      spindleSpeed: 0,
      spindleOn: false,
      spindleCW: true,
      spindleMode: 97, // G97 direct RPM, G96 CSS
      cssLimit: 3000,  // G50 S ceiling
      activeTool: null,
      activeToolNum: 1,
      motionMode: 0, // 0=G00, 1=G01, 2=G02, 3=G03
      cannedCycle: null,
      totalTimeSec: 0,
      totalCutDist: 0,
      totalRapidDist: 0,
      g71RoughDepth: 2.0,
      g71Retract: 1.0,
      steps: []
    };

    const getRPM = (st, pos) => {
      if (!st.spindleOn) return 0;
      if (isTurn && st.spindleMode === 96) {
        const diam = Math.max(Math.abs(pos[0]), 1.0);
        const cssRPM = (st.spindleSpeed * 1000) / (Math.PI * diam);
        return Math.min(st.cssLimit, cssRPM);
      }
      return st.spindleSpeed;
    };

    const emitPoints = (st, lineIndex, points, isRapid) => {
      for (const pt of points) {
        const prev = st.p;
        const dist = isTurn
          ? Math.hypot((pt[0] - prev[0]) / 2, pt[2] - prev[2])
          : Math.hypot(pt[0] - prev[0], pt[1] - prev[1], pt[2] - prev[2]);

        const rpm = getRPM(st, pt);
        const feedMmMin = isRapid
          ? 10000 // Rapid rate
          : isTurn
            ? (st.feed || 0.1) * (rpm || 1)
            : (st.feed || 100);

        const duration = (dist / Math.max(feedMmMin, 0.001)) * 60;
        st.totalTimeSec += duration;
        if (isRapid) st.totalRapidDist += dist;
        else st.totalCutDist += dist;

        st.steps.push({
          lineIndex,
          p: [...pt],
          isCut: !isRapid,
          tool: st.activeTool,
          toolNum: st.activeToolNum,
          rpm,
          feed: st.feed,
          motion: isRapid ? 'Rapid' : 'Feed'
        });
        st.p = [...pt];
      }
    };

    const interpolateLinear = (st, lineIndex, targetPos, isRapid) => {
      const prev = st.p;
      const dist = isTurn
        ? Math.hypot((targetPos[0] - prev[0]) / 2, targetPos[2] - prev[2])
        : Math.hypot(targetPos[0] - prev[0], targetPos[1] - prev[1], targetPos[2] - prev[2]);

      const segments = Math.max(1, Math.ceil(dist / (isRapid ? 4.0 : 0.5)));
      const pts = [];
      for (let k = 1; k <= segments; k++) {
        const frac = k / segments;
        pts.push([
          prev[0] + (targetPos[0] - prev[0]) * frac,
          prev[1] + (targetPos[1] - prev[1]) * frac,
          prev[2] + (targetPos[2] - prev[2]) * frac
        ]);
      }
      emitPoints(st, lineIndex, pts, isRapid);
    };

    // Execute block
    const executeBlock = (st, blk, isSubBlock = false) => {
      if (!blk) return;
      const li = blk.lineIndex;
      const w = blk.words;
      const scale = st.unitScale;

      const reportError = (msg, isWarn = false) => {
        if (!isSubBlock) {
          errors.push({ line: li, type: isWarn ? 'warning' : 'error', message: msg });
        }
      };

      // Modal G-codes
      for (const g of blk.g) {
        if (g <= 3) {
          st.motionMode = g;
        } else if (g === 17 || g === 18 || g === 19) {
          st.plane = g === 17 ? 'XY' : g === 18 ? 'XZ' : 'YZ';
        } else if (g === 20) {
          st.unitScale = 25.4;
        } else if (g === 21) {
          st.unitScale = 1.0;
        } else if (g === 90) {
          st.abs = true;
        } else if (g === 91) {
          st.abs = false;
        } else if (g === 96) {
          st.spindleMode = 96; // CSS
        } else if (g === 97) {
          st.spindleMode = 97; // Direct RPM
        } else if (g === 80) {
          st.cannedCycle = null;
          st.motionMode = 0;
        } else if (g === 81 || g === 82 || g === 83) {
          st.motionMode = g;
        }
      }

      // M-codes
      for (const m of blk.m) {
        if (m === 3 || m === 4) {
          st.spindleOn = true;
          st.spindleCW = m === 3;
        } else if (m === 5) {
          st.spindleOn = false;
        } else if (m === 6) {
          // Tool change executed
        } else if (m === 30 || m === 2) {
          st.programEnd = true;
        }
      }

      // S (Spindle) and F (Feed)
      if (w.S !== undefined) {
        if (blk.g.includes(50) || blk.g.includes(92)) {
          st.cssLimit = w.S;
        } else {
          st.spindleSpeed = w.S;
        }
      }

      if (w.F !== undefined) {
        st.feed = w.F * scale;
      }

      // T (Tool Selection)
      if (w.T !== undefined) {
        const rawT = Math.round(w.T);
        const slot = isTurn && rawT > 99 ? Math.floor(rawT / 100) : rawT;
        st.activeToolNum = slot;
        st.activeTool = this.tools[this.mode]?.[slot] || null;
        if (!st.activeTool) {
          reportError(`Tool Station T${slot} is not configured in Tool Library.`, true);
        }
      }

      // Check cutting prerequisites
      const verifyCutting = (cutZ, cutD) => {
        if (!st.spindleOn) {
          reportError('Cutting move commanded while spindle is OFF (add M03/M04 first).', true);
        }
        if (st.feed === null || st.feed <= 0) {
          reportError('No feed rate defined for cutting move (specify F value).');
        }
        if (!isTurn && cutZ < -this.blank.z - 0.05) {
          reportError(`Z depth (${cutZ.toFixed(2)}mm) exceeds blank thickness (${this.blank.z}mm).`);
        }
        if (isTurn && cutD < 0) {
          reportError('X coordinate (diameter) is negative.');
        }
      };

      // G28 Return to Home
      if (blk.g.includes(28)) {
        interpolateLinear(st, li, homePos, true);
        return;
      }

      // Fanuc G70 Finishing Cycle
      if (blk.g.includes(70)) {
        if (!isTurn) {
          reportError('G70 finishing cycle is only supported in Turn mode.');
          return;
        }
        const pBlock = nMap[Math.round(w.P)];
        const qBlock = nMap[Math.round(w.Q)];
        if (pBlock === undefined || qBlock === undefined || qBlock < pBlock) {
          reportError('G70 requires valid P and Q block numbers existing in the program.');
          return;
        }
        for (let bIdx = pBlock; bIdx <= qBlock; bIdx++) {
          if (blocks[bIdx]) executeBlock(st, blocks[bIdx], true);
        }
        return;
      }

      // Fanuc G71 Roughing Cycle
      if (blk.g.includes(71)) {
        if (!isTurn) {
          reportError('G71 roughing cycle is for Turning only.');
          return;
        }
        // First line of G71: U(depth of cut), R(retract)
        if (w.P === undefined && w.Q === undefined) {
          if (w.U !== undefined) st.g71RoughDepth = w.U * scale;
          if (w.R !== undefined) st.g71Retract = w.R * scale;
          return;
        }

        // Second line of G71: P, Q, U(finish allowance X), W(finish allowance Z), F
        const pBlock = nMap[Math.round(w.P)];
        const qBlock = nMap[Math.round(w.Q)];
        if (pBlock === undefined || qBlock === undefined || qBlock < pBlock) {
          reportError('G71 P and Q must point to valid program N-blocks, with P preceding Q.');
          return;
        }

        verifyCutting(0, 1);
        this.solveG71Roughing(st, blk, pBlock, qBlock, blocks, executeBlock);
        st.skipToBlock = qBlock;
        return;
      }

      // Standard Coordinate Calculation
      const target = [...st.p];
      if (isTurn) {
        if (w.X !== undefined) target[0] = w.X * scale;
        if (w.U !== undefined) target[0] = (w.X !== undefined ? target[0] : st.p[0]) + w.U * scale;
        if (w.Z !== undefined) target[2] = w.Z * scale;
        if (w.W !== undefined) target[2] = (w.Z !== undefined ? target[2] : st.p[2]) + w.W * scale;
      } else {
        ['X', 'Y', 'Z'].forEach((axis, idx) => {
          if (w[axis] !== undefined) {
            target[idx] = st.abs ? w[axis] * scale : target[idx] + w[axis] * scale;
          }
        });
      }

      const hasMove = ['X', 'Y', 'Z', 'U', 'W'].some(axis => w[axis] !== undefined);
      if (!hasMove) return;

      // Motion Execution
      if (st.motionMode === 0) {
        // G00 Rapid
        interpolateLinear(st, li, target, true);
        return;
      }

      if (st.motionMode === 1) {
        // G01 Linear Feed
        verifyCutting(target[2], target[0]);
        interpolateLinear(st, li, target, false);
        return;
      }

      if (st.motionMode === 2 || st.motionMode === 3) {
        // G02 (CW) / G03 (CCW) Arcs
        verifyCutting(target[2], target[0]);
        const isCW = st.motionMode === 2;
        const start = st.p;

        const sa = isTurn ? start[2] : start[0];
        const sb = isTurn ? start[0] / 2 : start[1]; // lathe radius
        const ea = isTurn ? target[2] : target[0];
        const eb = isTurn ? target[0] / 2 : target[1];

        let ca, cb;
        const hasCenter = isTurn ? (w.I !== undefined || w.K !== undefined) : (w.I !== undefined || w.J !== undefined);

        if (hasCenter) {
          ca = sa + (isTurn ? (w.K || 0) : (w.I || 0)) * scale;
          cb = sb + (isTurn ? (w.I || 0) : (w.J || 0)) * scale;
        } else if (w.R !== undefined) {
          const dx = ea - sa;
          const dy = eb - sb;
          const chord = Math.hypot(dx, dy);
          const radius = Math.abs(w.R * scale);
          if (chord < 1e-6 || chord > 2 * radius + 1e-4) {
            reportError(`Arc radius R=${w.R} is too small to reach endpoint.`);
            return;
          }
          const h = Math.sqrt(Math.max(0, radius * radius - (chord * chord) / 4));
          const sign = (isCW ? -1 : 1) * (w.R < 0 ? -1 : 1);
          ca = (sa + ea) / 2 - (sign * h * dy) / chord;
          cb = (sb + eb) / 2 + (sign * h * dx) / chord;
        } else {
          reportError(`Circular arc requires ${isTurn ? 'I and K' : 'I and J'} offsets or R radius.`);
          return;
        }

        const r0 = Math.hypot(sa - ca, sb - cb);
        const r1 = Math.hypot(ea - ca, eb - cb);
        if (Math.abs(r0 - r1) > 0.08) {
          reportError(`Arc radius discrepancy (${Math.abs(r0 - r1).toFixed(3)}mm). Start and end radii do not match.`);
        }

        const theta0 = Math.atan2(sb - cb, sa - ca);
        let deltaTheta = Math.atan2(eb - cb, ea - ca) - theta0;

        if (isCW) {
          while (deltaTheta > -1e-6) deltaTheta -= 2 * Math.PI;
        } else {
          while (deltaTheta < 1e-6) deltaTheta += 2 * Math.PI;
        }

        const arcLen = Math.abs(deltaTheta) * r0;
        const segments = Math.max(3, Math.ceil(arcLen / 0.4));
        const pts = [];

        for (let k = 1; k <= segments; k++) {
          const frac = k / segments;
          const angle = theta0 + deltaTheta * frac;
          const currentA = k === segments ? ea : ca + r0 * Math.cos(angle);
          const currentB = k === segments ? eb : cb + r0 * Math.sin(angle);

          pts.push(
            isTurn
              ? [2 * currentB, 0, currentA]
              : [currentA, currentB, start[2] + (target[2] - start[2]) * frac]
          );
        }
        emitPoints(st, li, pts, false);
        return;
      }

      // Canned Drilling Cycles (Mill G81, G83)
      if (st.motionMode === 81 || st.motionMode === 83) {
        if (isTurn) {
          reportError('Drilling canned cycles (G81/G83) are for Milling mode.');
          return;
        }
        st.cannedCycle = st.cannedCycle || {};
        if (w.Z !== undefined) st.cannedCycle.z = w.Z * scale;
        if (w.R !== undefined) st.cannedCycle.r = w.R * scale;
        if (w.Q !== undefined) st.cannedCycle.q = w.Q * scale;

        const cyc = st.cannedCycle;
        if (cyc.z === undefined || cyc.r === undefined) {
          reportError('Drill cycle requires Z (hole depth) and R (clearance plane).');
          return;
        }
        if (st.motionMode === 83 && !(cyc.q > 0)) {
          reportError('G83 peck drilling requires Q (peck increment > 0).');
          return;
        }

        if (w.X === undefined && w.Y === undefined) return;

        verifyCutting(cyc.z, 1);
        const zSafe = Math.max(st.p[2], cyc.r);
        const holeX = target[0];
        const holeY = target[1];

        // Rapid to clearance position over hole
        interpolateLinear(st, li, [st.p[0], st.p[1], zSafe], true);
        interpolateLinear(st, li, [holeX, holeY, zSafe], true);
        interpolateLinear(st, li, [holeX, holeY, cyc.r], true);

        if (st.motionMode === 83) {
          // Peck Drilling
          let currentZ = cyc.r;
          while (currentZ > cyc.z + 1e-4) {
            const nextZ = Math.max(cyc.z, currentZ - cyc.q);
            interpolateLinear(st, li, [holeX, holeY, nextZ], false); // Cut peck
            interpolateLinear(st, li, [holeX, holeY, cyc.r], true);  // Full retract chip clear
            currentZ = nextZ;
          }
        } else {
          // G81 Straight Drill
          interpolateLinear(st, li, [holeX, holeY, cyc.z], false);
          interpolateLinear(st, li, [holeX, holeY, cyc.r], true);
        }
      }
    };

    // Main interpreter loop
    for (let i = 0; i < blocks.length; i++) {
      const blk = blocks[i];
      if (!blk) continue;
      executeBlock(state, blk);
      if (state.skipToBlock !== undefined) {
        i = state.skipToBlock;
        delete state.skipToBlock;
      }
      if (state.programEnd) break;
    }

    if (!state.programEnd) {
      errors.push({
        line: Math.max(0, lines.length - 1),
        type: 'warning',
        message: 'Program has no M30 or M02 end code.'
      });
    }

    if (state.steps.length === 0 && errors.length === 0) {
      errors.push({
        line: 0,
        type: 'warning',
        message: 'No tool movement found in the program.'
      });
    }

    errors.sort((a, b) => a.line - b.line);

    return {
      errors,
      steps: state.steps,
      totalTimeSec: state.totalTimeSec,
      totalCutDist: state.totalCutDist,
      totalRapidDist: state.totalRapidDist
    };
  }

  // Fanuc G71 stock-removal roughing trajectory generation
  solveG71Roughing(st, blk, pBlock, qBlock, blocks, executeBlock) {
    const scale = st.unitScale;
    const w = blk.words;
    const finishAllowanceU = (w.U || 0) * scale;
    const finishAllowanceW = (w.W || 0) * scale;
    const roughDepth = st.g71RoughDepth || 2.0;
    const retract = st.g71Retract || 1.0;
    const li = blk.lineIndex;

    // Simulate finish contour in temporary state to extract profile points
    const tempState = { ...st, out: [], p: [...st.p], steps: [] };
    for (let i = pBlock; i <= qBlock; i++) {
      if (blocks[i]) executeBlock(tempState, blocks[i], true);
    }

    if (!tempState.steps.length) return;
    const profile = tempState.steps.map(s => s.p);

    // Map profile diameter as function of Z
    const zMap = {};
    let minZ = 1e9, maxZ = -1e9;
    profile.forEach(pt => {
      const zKey = Math.round(pt[2] * 4);
      zMap[zKey] = Math.max(zMap[zKey] ?? -1e9, pt[0]);
      minZ = Math.min(minZ, zKey);
      maxZ = Math.max(maxZ, zKey);
    });

    for (let k = maxZ; k >= minZ; k--) {
      if (zMap[k] === undefined) zMap[k] = zMap[k + 1];
    }

    const getProfileDiameterAtZ = (z) => {
      const k = Math.round(z * 4);
      if (k > maxZ) return -1e9;
      if (k < minZ) return 1e9;
      return zMap[k] + finishAllowanceU;
    };

    const initialX = st.p[0];
    const initialZ = st.p[2];
    const minDiameter = Math.min(...profile.map(p => p[0])) + finishAllowanceU;
    const endZ = minZ / 4 + finishAllowanceW;

    let currentCutDiam = initialX;
    const maxPasses = 150;

    for (let pass = 0; pass < maxPasses; pass++) {
      currentCutDiam -= 2 * roughDepth;
      const isFinalRough = currentCutDiam <= minDiameter + 1e-4;
      if (isFinalRough) currentCutDiam = minDiameter;

      if (getProfileDiameterAtZ(initialZ) < currentCutDiam - 1e-4) {
        let cutZ = initialZ;
        while (cutZ > endZ && getProfileDiameterAtZ(cutZ - 0.25) < currentCutDiam - 1e-4) {
          cutZ -= 0.25;
        }

        // Rapid in to cut depth
        this.rawLinearMove(st, li, [currentCutDiam, 0, initialZ], true);
        // Feed cut along Z
        this.rawLinearMove(st, li, [currentCutDiam, 0, cutZ], false);
        // 45° safety retract
        this.rawLinearMove(st, li, [currentCutDiam + 2 * retract, 0, cutZ], true);
        // Rapid back along Z to start
        this.rawLinearMove(st, li, [currentCutDiam + 2 * retract, 0, initialZ], true);
      }

      if (isFinalRough) break;
    }

    // Semi-finishing pass along the profile contour with allowance
    this.rawLinearMove(st, li, [profile[0][0] + finishAllowanceU, 0, profile[0][2] + finishAllowanceW], true);
    for (let i = 1; i < profile.length; i++) {
      this.rawLinearMove(st, li, [profile[i][0] + finishAllowanceU, 0, profile[i][2] + finishAllowanceW], false);
    }
    // Retract back home
    this.rawLinearMove(st, li, [initialX, 0, initialZ], true);
  }

  rawLinearMove(st, lineIndex, target, isRapid) {
    const prev = st.p;
    const isTurn = this.mode === 'turn';
    const dist = isTurn
      ? Math.hypot((target[0] - prev[0]) / 2, target[2] - prev[2])
      : Math.hypot(target[0] - prev[0], target[1] - prev[1], target[2] - prev[2]);

    const segs = Math.max(1, Math.ceil(dist / (isRapid ? 5 : 0.8)));
    for (let k = 1; k <= segs; k++) {
      const frac = k / segs;
      const pt = [
        prev[0] + (target[0] - prev[0]) * frac,
        prev[1] + (target[1] - prev[1]) * frac,
        prev[2] + (target[2] - prev[2]) * frac
      ];
      st.steps.push({
        lineIndex,
        p: pt,
        isCut: !isRapid,
        tool: st.activeTool,
        toolNum: st.activeToolNum,
        rpm: st.spindleSpeed,
        feed: st.feed,
        motion: isRapid ? 'Rapid' : 'Feed'
      });
      st.p = pt;
    }
  }
}
