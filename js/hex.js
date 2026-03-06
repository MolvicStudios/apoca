// ============================================================================
// CHRONOS: La Guerra por la Memoria — Utilidades Hexagonales
// ============================================================================
(function () {
  const C = CHRONOS.Config;

  // Flat-top hex, odd-q offset coordinates
  const SQRT3 = Math.sqrt(3);

  // Neighbor offsets for odd-q flat-top
  const NEIGHBORS_EVEN = [[+1, 0], [+1, -1], [0, -1], [-1, -1], [-1, 0], [0, +1]];
  const NEIGHBORS_ODD = [[+1, +1], [+1, 0], [0, -1], [-1, 0], [-1, +1], [0, +1]];

  CHRONOS.Hex = {
    // Offset (odd-q) → Cube {x,y,z}
    offsetToCube(q, r) {
      const x = q;
      const z = r - (q - (q & 1)) / 2;
      const y = -x - z;
      return { x, y, z };
    },

    // Cube → Offset (odd-q)
    cubeToOffset(x, y, z) {
      const q = x;
      const r = z + (x - (x & 1)) / 2;
      return { q, r };
    },

    // Cube round (for pixel→hex)
    cubeRound(fx, fy, fz) {
      let rx = Math.round(fx);
      let ry = Math.round(fy);
      let rz = Math.round(fz);
      const dx = Math.abs(rx - fx);
      const dy = Math.abs(ry - fy);
      const dz = Math.abs(rz - fz);
      if (dx > dy && dx > dz) rx = -ry - rz;
      else if (dy > dz) ry = -rx - rz;
      else rz = -rx - ry;
      return { x: rx, y: ry, z: rz };
    },

    // Hex center → pixel (flat-top, odd-q offset)
    hexToPixel(q, r, size, offsetX, offsetY) {
      size = size || C.HEX_SIZE;
      offsetX = offsetX || 0;
      offsetY = offsetY || 0;
      const x = size * 3 / 2 * q;
      const y = size * SQRT3 * (r + 0.5 * (q & 1));
      return { x: x + offsetX, y: y + offsetY };
    },

    // Pixel → hex (flat-top, odd-q offset)
    pixelToHex(px, py, size, offsetX, offsetY) {
      size = size || C.HEX_SIZE;
      offsetX = offsetX || 0;
      offsetY = offsetY || 0;
      const x = px - offsetX;
      const y = py - offsetY;
      // To cube float
      const fq = (2.0 / 3 * x) / size;
      const fr = (-1.0 / 3 * x + SQRT3 / 3 * y) / size;
      // fq, fr are axial; convert to cube
      const fx = fq;
      const fz = fr;
      const fy = -fx - fz;
      const cube = CHRONOS.Hex.cubeRound(fx, fy, fz);
      return CHRONOS.Hex.cubeToOffset(cube.x, cube.y, cube.z);
    },

    // Get neighbor positions
    getNeighbors(q, r) {
      const offsets = (q & 1) === 1 ? NEIGHBORS_ODD : NEIGHBORS_EVEN;
      const result = [];
      for (const [dq, dr] of offsets) {
        const nq = q + dq;
        const nr = r + dr;
        if (nq >= 0 && nq < C.GRID_COLS && nr >= 0 && nr < C.GRID_ROWS) {
          result.push({ q: nq, r: nr });
        }
      }
      return result;
    },

    // Cube distance
    cubeDistance(a, b) {
      return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
    },

    // Offset distance
    distance(q1, r1, q2, r2) {
      const a = CHRONOS.Hex.offsetToCube(q1, r1);
      const b = CHRONOS.Hex.offsetToCube(q2, r2);
      return CHRONOS.Hex.cubeDistance(a, b);
    },

    // Get all hexes within range N of (q,r)
    getRange(q, r, n) {
      const center = CHRONOS.Hex.offsetToCube(q, r);
      const results = [];
      for (let dx = -n; dx <= n; dx++) {
        for (let dy = Math.max(-n, -dx - n); dy <= Math.min(n, -dx + n); dy++) {
          const dz = -dx - dy;
          const cube = { x: center.x + dx, y: center.y + dy, z: center.z + dz };
          const off = CHRONOS.Hex.cubeToOffset(cube.x, cube.y, cube.z);
          if (off.q >= 0 && off.q < C.GRID_COLS && off.r >= 0 && off.r < C.GRID_ROWS) {
            results.push(off);
          }
        }
      }
      return results;
    },

    // Draw a single hexagon path (flat-top)
    drawHexPath(ctx, cx, cy, size) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i);
        const hx = cx + size * Math.cos(angle);
        const hy = cy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
    },

    // Check if offset coords are valid
    isValid(q, r) {
      return q >= 0 && q < C.GRID_COLS && r >= 0 && r < C.GRID_ROWS;
    }
  };
})();
