// ============================================================================
// CHRONOS: La Guerra por la Memoria — Árbol Tecnológico
// ============================================================================
(function () {
  const C = CHRONOS.Config;

  class TechManager {
    constructor() {
      this.factionTechs = {}; // { factionId: { researched: [], current: null } }
    }

    init(factionIds) {
      for (const fid of factionIds) {
        this.factionTechs[fid] = {
          researched: [],
          current: null // { id, turnsLeft }
        };
      }
    }

    getResearched(factionId) {
      return this.factionTechs[factionId]?.researched || [];
    }

    hasResearched(factionId, techId) {
      return this.getResearched(factionId).includes(techId);
    }

    // Returns computed mechanical bonuses for a faction based on researched techs
    getBonuses(factionId) {
      const researched = this.getResearched(factionId);
      const b = {
        atkMult: 1.0,        // attack multiplier
        defMult: 1.0,        // defense multiplier (all districts)
        defBorderBonus: 0,   // bonus defense for border districts
        movementBonus: 0,
        materialsMult: 1.0,
        foodMult: 1.0,
        creditsMult: 1.0,
        moraleFlat: 0,       // flat morale bonus per turn
        moraleFloor: 0,      // minimum morale
        visionBonus: 0,
        assimilationMult: 1.0,
        caminanteHPMult: 1.0,
        colosoAtkBonus: 0,
        colosoDefBonus: 0,
        farmMult: 1.0,       // granja output multiplier
        factoryMult: 1.0,    // fabrica output multiplier
        buildTurnsReduction: 0,
        biomasaPerTurn: 0,
        specialPerTurn: 0,
      };

      for (const tid of researched) {
        switch (tid) {
          // Resistencia
          case 'r_cripto': break; // sabotage effect - passive, checked in combat
          case 'r_red': b.visionBonus += 2; break;
          case 'r_virus': break; // district conversion - handled in UI
          case 'r_moral': b.moraleFlat += 10; break;
          case 'r_guerrilla': b.atkMult *= 1.2; break; // +20% atk on own terrain
          case 'r_emp': break; // active ability
          case 'r_bunker': b.defMult *= 1.0; b.defBorderBonus += 2; break;
          case 'r_recurso': b.materialsMult *= 1.2; break;

          // Synergia
          case 's_neural': b.materialsMult *= 1.15; b.creditsMult *= 1.15; break;
          case 's_hive': b.moraleFloor = Math.max(b.moraleFloor, 40); break;
          case 's_overdrive': b.factoryMult *= 2; break;
          case 's_nano': b.buildTurnsReduction += 1; break;
          case 's_laser': b.atkMult *= 1.3; break;
          case 's_titan': break; // unlocks unit type - checked in unitManager
          case 's_firewall': break; // immunity - passive
          case 's_vigil': b.visionBonus = 99; break; // no fog of war

          // Horda
          case 'h_hambre': b.assimilationMult *= 1.5; break;
          case 'h_plaga': break; // processed in turn logic
          case 'h_mutacion': b.caminanteHPMult *= 1.5; break;
          case 'h_regen': break; // HP regen - processed per turn
          case 'h_enjambre': b.movementBonus += 1; break;
          case 'h_terror': break; // morale debuff on attack - checked in combat
          case 'h_nido': b.biomasaPerTurn += 5; break;
          case 'h_coloso': b.colosoAtkBonus += 3; b.colosoDefBonus += 3; break;

          // Desconectados
          case 'd_irrigacion': b.farmMult *= 2; break;
          case 'd_semillas': b.foodMult *= 1.25; break;
          case 'd_trueque': b.creditsMult *= 1.3; break;
          case 'd_embajada': break; // alliance system - not fully implemented yet
          case 'd_milicia': break; // unit stat boost - handled in combat by checking
          case 'd_muro': b.defBorderBonus += 5; break;
          case 'd_radio': b.moraleFlat += 15; break;
          case 'd_fiesta': b.moraleFloor = Math.max(b.moraleFloor, 50); break;
        }
      }
      return b;
    }

    getCurrentResearch(factionId) {
      return this.factionTechs[factionId]?.current || null;
    }

    getAvailableTechs(factionId) {
      const tree = C.TECH_TREES[factionId];
      if (!tree) return [];
      const researched = this.getResearched(factionId);
      return tree.filter(tech => {
        if (researched.includes(tech.id)) return false;
        // Check requires
        for (const req of tech.requires) {
          if (!researched.includes(req)) return false;
        }
        return true;
      });
    }

    startResearch(factionId, techId, resources) {
      const tree = C.TECH_TREES[factionId];
      if (!tree) return { ok: false, msg: 'No hay árbol tecnológico' };

      const tech = tree.find(t => t.id === techId);
      if (!tech) return { ok: false, msg: 'Tecnología desconocida' };

      if (this.hasResearched(factionId, techId)) return { ok: false, msg: 'Ya investigado' };

      // Check current research
      if (this.factionTechs[factionId].current) {
        return { ok: false, msg: 'Ya hay una investigación en curso' };
      }

      // Check requirements
      for (const req of tech.requires) {
        if (!this.hasResearched(factionId, req)) {
          return { ok: false, msg: 'Requisitos no cumplidos' };
        }
      }

      // Check cost
      if (!resources.canAfford(factionId, tech.cost)) {
        return { ok: false, msg: 'Recursos insuficientes' };
      }

      resources.spend(factionId, tech.cost);

      this.factionTechs[factionId].current = {
        id: techId,
        turnsLeft: tech.turns,
        totalTurns: tech.turns
      };

      return { ok: true, msg: `Investigando: ${tech.name}` };
    }

    // Process research each turno
    processTurn(factionId, map) {
      const state = this.factionTechs[factionId];
      if (!state || !state.current) return null;

      // Research bonus from labs
      let bonus = 0;
      for (const d of map.getFactionsDistricts(factionId)) {
        bonus += d.getResearchBonus();
      }

      state.current.turnsLeft -= (1 + Math.floor(bonus / 3));

      if (state.current.turnsLeft <= 0) {
        const techId = state.current.id;
        state.researched.push(techId);
        state.current = null;

        const tree = C.TECH_TREES[factionId];
        const tech = tree ? tree.find(t => t.id === techId) : null;
        return tech;
      }
      return null;
    }

    getAllTechs(factionId) {
      return C.TECH_TREES[factionId] || [];
    }

    serialize() {
      return JSON.parse(JSON.stringify(this.factionTechs));
    }

    deserialize(data) {
      this.factionTechs = data;
    }
  }

  CHRONOS.TechManager = TechManager;
})();
