// ============================================================================
// CHRONOS: La Guerra por la Memoria — Mapa y Distritos
// ============================================================================
(function () {
  const C = CHRONOS.Config;
  const H = CHRONOS.Hex;

  class District {
    constructor(q, r, type, faction) {
      this.q = q;
      this.r = r;
      this.type = type;             // key from DISTRICT_TYPES
      this.faction = faction;       // faction id or null
      this.population = faction ? 20 : (type === 'paramo' ? 0 : 5);
      this.buildings = [];          // [{type, turnsLeft}]
      this.units = [];              // [{type, faction, quantity, hp, hasMoved}]
      this.isVisible = false;       // currently in vision range
      this.wasDiscovered = false;   // ever been seen (persistent fog)
      this.bonusResources = null;   // resources granted on first discovery
      this.siegeTurns = 0;          // siege counter
      this.justConquered = false;
    }

    getDefense() {
      let def = C.COMBAT.TERRAIN_BONUS[this.type] || 0;
      for (const b of this.buildings) {
        if (b.turnsLeft <= 0) {
          const bdata = C.BUILDINGS[b.type];
          if (bdata && bdata.effect.defense) def += bdata.effect.defense;
        }
      }
      return def;
    }

    getProduction() {
      const base = { ...C.DISTRICT_TYPES[this.type].production };
      // Add building bonuses
      for (const b of this.buildings) {
        if (b.turnsLeft <= 0) {
          const bd = C.BUILDINGS[b.type];
          if (bd) {
            for (const [k, v] of Object.entries(bd.effect)) {
              if (k !== 'defense' && k !== 'research' && base[k] !== undefined) {
                base[k] += v;
              }
            }
          }
        }
      }
      return base;
    }

    getResearchBonus() {
      let bonus = 0;
      for (const b of this.buildings) {
        if (b.turnsLeft <= 0 && C.BUILDINGS[b.type] && C.BUILDINGS[b.type].effect.research) {
          bonus += C.BUILDINGS[b.type].effect.research;
        }
      }
      return bonus;
    }

    canBuild() {
      const built = this.buildings.filter(b => b.turnsLeft <= 0).length;
      const building = this.buildings.filter(b => b.turnsLeft > 0).length;
      return (built + building) < 3;
    }

    getMilitaryStrength() {
      let total = 0;
      for (const u of this.units) {
        const ud = C.UNITS[u.type];
        if (ud) total += ud.atk * u.quantity;
      }
      return total;
    }

    getTotalUnits() {
      let total = 0;
      for (const u of this.units) total += u.quantity;
      return total;
    }
  }

  class GameMap {
    constructor() {
      this.grid = [];
      this.width = C.GRID_COLS;
      this.height = C.GRID_ROWS;
    }

    generate() {
      // Build pool of district types
      const pool = [];
      const dist = C.MAP_DISTRIBUTION;
      for (const [type, count] of Object.entries(dist)) {
        if (type === 'sigma7') continue; // placed manually
        for (let i = 0; i < count; i++) pool.push(type);
      }
      // Fill remaining spots with random
      const total = this.width * this.height - 1; // -1 for sigma7
      while (pool.length < total) {
        const types = Object.keys(dist).filter(t => t !== 'sigma7');
        pool.push(types[Math.floor(Math.random() * types.length)]);
      }
      // Shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      // Create grid
      this.grid = [];
      let poolIdx = 0;
      for (let q = 0; q < this.width; q++) {
        this.grid[q] = [];
        for (let r = 0; r < this.height; r++) {
          if (q === 3 && r === 3) {
            this.grid[q][r] = new District(q, r, 'sigma7', null);
          } else {
            this.grid[q][r] = new District(q, r, pool[poolIdx++], null);
          }
        }
      }

      // Place factions at corners
      for (const [fid, fdata] of Object.entries(C.FACTIONS)) {
        for (const [sq, sr] of fdata.startPositions) {
          const d = this.grid[sq][sr];
          d.faction = fid;
          d.population = 30;
          // Give starting faction reasonable district types
          if (d.type === 'paramo' || d.type === 'ruinas') {
            d.type = 'residencial';
          }
          // Starting units
          d.units.push({ type: 'milicia', faction: fid, quantity: 5, hp: C.UNITS.milicia.hp, hasMoved: false });
          d.units.push({ type: 'scout', faction: fid, quantity: 2, hp: C.UNITS.scout.hp, hasMoved: false });
        }
      }

      // Ensure some neutral districts near sigma-7 have variety
      this.grid[3][3].population = 50;

      // Assign bonus resources to ~22% of neutral non-paramo tiles
      const bonusPools = [
        { food: 30 }, { food: 25, morale: 5 },
        { materials: 35 }, { materials: 20, energy: 10 },
        { energy: 25 }, { energy: 15, credits: 15 },
        { credits: 30 }, { food: 20, materials: 15 },
        { materials: 25, credits: 10 }, { energy: 20, materials: 10 }
      ];
      for (let q = 0; q < this.width; q++) {
        for (let r = 0; r < this.height; r++) {
          const d = this.grid[q][r];
          if (!d.faction && d.type !== 'paramo' && Math.random() < 0.22) {
            d.bonusResources = { ...bonusPools[Math.floor(Math.random() * bonusPools.length)] };
          }
        }
      }
    }

    get(q, r) {
      if (q >= 0 && q < this.width && r >= 0 && r < this.height) return this.grid[q][r];
      return null;
    }

    getFactionsDistricts(factionId) {
      const result = [];
      for (let q = 0; q < this.width; q++) {
        for (let r = 0; r < this.height; r++) {
          if (this.grid[q][r].faction === factionId) result.push(this.grid[q][r]);
        }
      }
      return result;
    }

    getAllDistricts() {
      const result = [];
      for (let q = 0; q < this.width; q++) {
        for (let r = 0; r < this.height; r++) {
          result.push(this.grid[q][r]);
        }
      }
      return result;
    }

    updateVisibility(playerFaction, tech) {
      // Reset current visibility (preserving wasDiscovered for persistent fog)
      for (const d of this.getAllDistricts()) d.isVisible = false;

      const bonuses = tech ? tech.getBonuses(playerFaction) : {};
      const extraVision = bonuses.visionBonus || 0;
      const newlyDiscovered = [];

      const markVisible = (d) => {
        if (!d.wasDiscovered) newlyDiscovered.push(d);
        d.isVisible = true;
        d.wasDiscovered = true;
      };

      // Full map vision tech (s_vigil)
      if (extraVision >= 99) {
        for (const d of this.getAllDistricts()) markVisible(d);
        return newlyDiscovered;
      }

      // Player's districts + adjacent (+ extra range from tech)
      for (const d of this.getFactionsDistricts(playerFaction)) {
        markVisible(d);
        // BFS for vision range
        const visited = new Set();
        const queue = [{ q: d.q, r: d.r, dist: 0 }];
        visited.add(`${d.q},${d.r}`);
        while (queue.length > 0) {
          const cur = queue.shift();
          if (cur.dist <= 1 + extraVision) {
            for (const n of H.getNeighbors(cur.q, cur.r)) {
              const key = `${n.q},${n.r}`;
              if (!visited.has(key)) {
                visited.add(key);
                const nd = this.get(n.q, n.r);
                if (nd) {
                  markVisible(nd);
                  if (cur.dist + 1 < 1 + extraVision) {
                    queue.push({ q: n.q, r: n.r, dist: cur.dist + 1 });
                  }
                }
              }
            }
          }
        }
      }
      return newlyDiscovered;
    }

    countFactionDistricts(factionId) {
      return this.getFactionsDistricts(factionId).length;
    }

    getTotalDistricts() {
      return this.width * this.height;
    }

    serialize() {
      const data = [];
      for (let q = 0; q < this.width; q++) {
        data[q] = [];
        for (let r = 0; r < this.height; r++) {
          const d = this.grid[q][r];
          data[q][r] = {
            q: d.q, r: d.r, type: d.type, faction: d.faction,
            population: d.population, buildings: [...d.buildings],
            units: d.units.map(u => ({ ...u })),
            siegeTurns: d.siegeTurns,
            wasDiscovered: d.wasDiscovered,
            bonusResources: d.bonusResources
          };
        }
      }
      return data;
    }

    deserialize(data) {
      this.grid = [];
      for (let q = 0; q < this.width; q++) {
        this.grid[q] = [];
        for (let r = 0; r < this.height; r++) {
          const s = data[q][r];
          const d = new District(s.q, s.r, s.type, s.faction);
          d.population = s.population;
          d.buildings = s.buildings || [];
          d.units = s.units || [];
          d.siegeTurns = s.siegeTurns || 0;
          d.wasDiscovered = s.wasDiscovered || false;
          d.bonusResources = s.bonusResources || null;
          this.grid[q][r] = d;
        }
      }
    }
  }

  CHRONOS.District = District;
  CHRONOS.GameMap = GameMap;
})();
