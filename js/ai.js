// ============================================================================
// CHRONOS: La Guerra por la Memoria — IA de Facciones
// ============================================================================
(function () {
  const C = CHRONOS.Config;
  const H = CHRONOS.Hex;

  class AIManager {
    constructor(unitManager, buildingManager, techManager, resources) {
      this.units = unitManager;
      this.buildings = buildingManager;
      this.tech = techManager;
      this.resources = resources;
    }

    processTurn(factionId, map, renderer) {
      const districts = map.getFactionsDistricts(factionId);
      if (districts.length === 0) return; // faction eliminated

      const res = this.resources.get(factionId);
      const priority = C.FACTIONS[factionId]?.aiPriority || 'defender';

      // 1. Build buildings if we have resources
      this._aiBuild(factionId, districts, map);

      // 2. Recruit units
      this._aiRecruit(factionId, districts, map);

      // 3. Research
      this._aiResearch(factionId, map);

      // 4. Move & Attack
      this._aiMove(factionId, districts, map, renderer, priority);
    }

    _aiBuild(factionId, districts, map) {
      for (const d of districts) {
        if (!d.canBuild()) continue;
        const available = this.buildings.getAvailableBuildings(d, factionId);
        if (available.length === 0) continue;

        // Priority: granja if food low, generador if energy low, fabrica for materials
        const res = this.resources.get(factionId);
        let target = null;

        if (res.food < 20 && available.find(b => b.id === 'granja')) target = 'granja';
        else if (res.energy < 15 && available.find(b => b.id === 'generador')) target = 'generador';
        else if (res.materials < 20 && available.find(b => b.id === 'fabrica')) target = 'fabrica';
        else if (res.morale < 40 && available.find(b => b.id === 'propaganda')) target = 'propaganda';
        else if (available.find(b => b.id === 'barricada') && this._isFrontline(d, factionId, map)) target = 'barricada';
        else {
          // Random useful building
          const useful = available.filter(b => this.resources.canAfford(factionId, b.cost));
          if (useful.length > 0) target = useful[Math.floor(Math.random() * useful.length)].id;
        }

        if (target) {
          this.buildings.build(d, target, factionId, this.resources);
        }
      }
    }

    _aiRecruit(factionId, districts, map) {
      const res = this.resources.get(factionId);
      const totalUnits = districts.reduce((sum, d) => sum + d.getTotalUnits(), 0);

      // Recruit if we have fewer units
      let recruitBudget = 3; // max recruitments per turn

      for (const d of districts) {
        if (recruitBudget <= 0) break;

        // Prefer recruiting at non-frontline districts
        let unitId;
        if (factionId === 'horda') {
          unitId = 'caminante';
        } else {
          // Choose based on needs
          if (totalUnits < 10) unitId = 'milicia';
          else if (totalUnits < 5) unitId = 'scout';
          else unitId = Math.random() > 0.5 ? 'milicia' : 'vehiculo';

          // Try faction-specific
          const factionUnits = this.units.getAvailableUnits(factionId).filter(u => u.faction === factionId);
          if (factionUnits.length > 0 && Math.random() > 0.6) {
            unitId = factionUnits[Math.floor(Math.random() * factionUnits.length)].id;
          }
        }

        const result = this.units.recruit(d, unitId, factionId, this.resources);
        if (result.ok) recruitBudget--;
      }
    }

    _aiResearch(factionId, map) {
      if (this.tech.getCurrentResearch(factionId)) return;
      const available = this.tech.getAvailableTechs(factionId);
      if (available.length === 0) return;

      // Priorizar ramas según el estilo de juego de cada facción
      const priority = C.FACTIONS[factionId]?.aiPriority || 'defender';
      const branchPriority = {
        atacar:   ['tacticas', 'asimilacion', 'mutacion', 'expansion', 'militar'],
        expandir: ['produccion', 'control', 'militar', 'defensa'],
        liberar:  ['hacking', 'combate', 'moral', 'defensa'],
        defender: ['defensa', 'agricultura', 'moral', 'comercio']
      }[priority] || [];

      // Puntuar: rama prioritaria +10, coste en turnos penaliza
      let best = available[0];
      let bestScore = -Infinity;
      for (const tech of available) {
        const branchIdx = branchPriority.indexOf(tech.branch);
        const score = (branchIdx === -1 ? -5 : 10 - branchIdx) - tech.turns * 0.5;
        if (score > bestScore) { bestScore = score; best = tech; }
      }

      this.tech.startResearch(factionId, best.id, this.resources);
    }

    _aiMove(factionId, districts, map, renderer, priority) {
      // Reset movement
      this.units.resetMovement(map, factionId);

      // Collect districts with movable units
      const withUnits = districts.filter(d => d.units.some(u => u.faction === factionId && !u.hasMoved && u.quantity > 0));

      for (const d of withUnits) {
        const unmovedUnits = d.units.filter(u => u.faction === factionId && !u.hasMoved);
        if (unmovedUnits.length === 0) continue;

        const movRange = this.units.getMovementRange(d.q, d.r, factionId, map, this.tech);
        if (movRange.length === 0) continue;

        // Evaluate targets
        let bestTarget = null;
        let bestScore = -Infinity;

        for (const hex of movRange) {
          const target = map.get(hex.q, hex.r);
          if (!target) continue;

          let score = 0;

          if (!target.faction) {
            // Neutral - always interesting to expand
            score = 10;
            if (target.type === 'sigma7') score = 50;
            if (target.type === 'tecnologico') score = 20;
            if (target.type === 'agricola') score = 15;
          } else if (target.faction !== factionId) {
            // Enemy
            const myStr = d.getMilitaryStrength();
            const enemyStr = target.getMilitaryStrength() + target.getDefense() * 2;

            if (priority === 'atacar') {
              // Horda: attack if not suicidal
              score = myStr > enemyStr * 0.8 ? 30 : -10;
            } else if (priority === 'expandir') {
              // Synergia: attack with advantage
              score = myStr > enemyStr * C.COMBAT.ADVANTAGE_RATIO ? 40 : -5;
            } else if (priority === 'liberar') {
              // Resistencia: prefer neutrals, attack synergia
              if (target.faction === 'synergia') score = myStr > enemyStr ? 35 : 0;
              else score = myStr > enemyStr * 1.5 ? 20 : -5;
            } else {
              // Desconectados: very defensive
              score = myStr > enemyStr * 2.5 ? 15 : -20;
            }
          } else {
            // Own territory - maybe reinforce frontline
            if (this._isFrontline(target, factionId, map) && target.getMilitaryStrength() < d.getMilitaryStrength() * 0.5) {
              score = 5;
            } else {
              score = -50; // don't move to own non-frontline
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestTarget = hex;
          }
        }

        if (bestTarget && bestScore > 0) {
          this.units.moveUnits(d.q, d.r, bestTarget.q, bestTarget.r, factionId, map, renderer, this.resources, this.tech);
        }
      }
    }

    _isFrontline(district, factionId, map) {
      const neighbors = H.getNeighbors(district.q, district.r);
      for (const n of neighbors) {
        const nd = map.get(n.q, n.r);
        if (nd && nd.faction !== factionId) return true;
      }
      return false;
    }
  }

  CHRONOS.AIManager = AIManager;
})();
