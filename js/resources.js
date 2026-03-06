// ============================================================================
// CHRONOS: La Guerra por la Memoria — Sistema de Recursos
// ============================================================================
(function () {
  const C = CHRONOS.Config;

  class ResourceManager {
    constructor() {
      this.factions = {};
    }

    init(factionIds, playerFaction) {
      this.factions = {};
      for (const fid of factionIds) {
        this.factions[fid] = {
          ...JSON.parse(JSON.stringify(C.STARTING_RESOURCES)),
          special: 0
        };
        // Faction starting bonuses
        if (fid === 'desconectados') this.factions[fid].food += 20;
        if (fid === 'resistencia') this.factions[fid].morale += 15;
        if (fid === 'synergia') this.factions[fid].materials += 15;
        if (fid === 'horda') this.factions[fid].population += 30;
      }
    }

    get(factionId) {
      return this.factions[factionId];
    }

    canAfford(factionId, cost) {
      const res = this.factions[factionId];
      if (!res) return false;
      for (const [k, v] of Object.entries(cost)) {
        if (k === 'biomasa' || k === 'datos' || k === 'neural' || k === 'influencia') {
          if ((res.special || 0) < v) return false;
        } else if ((res[k] || 0) < v) return false;
      }
      return true;
    }

    spend(factionId, cost) {
      const res = this.factions[factionId];
      if (!res) return false;
      for (const [k, v] of Object.entries(cost)) {
        if (k === 'biomasa' || k === 'datos' || k === 'neural' || k === 'influencia') {
          res.special -= v;
        } else {
          res[k] -= v;
        }
      }
      return true;
    }

    add(factionId, gains) {
      const res = this.factions[factionId];
      if (!res) return;
      for (const [k, v] of Object.entries(gains)) {
        if (k === 'biomasa' || k === 'datos' || k === 'neural' || k === 'influencia') {
          res.special = (res.special || 0) + v;
        } else if (res[k] !== undefined) {
          res[k] += v;
        }
      }
    }

    // Production phase: calculate all resource gains/losses for a faction
    processProduction(factionId, map, tech) {
      const res = this.factions[factionId];
      if (!res) return null;

      const districts = map.getFactionsDistricts(factionId);
      const report = { production: {}, consumption: {}, net: {} };
      const bonuses = tech ? tech.getBonuses(factionId) : {};

      // Calculate production from all districts
      let totalProd = { population: 0, food: 0, materials: 0, energy: 0, credits: 0, morale: 0 };
      for (const d of districts) {
        const prod = d.getProduction();
        for (const [k, v] of Object.entries(prod)) {
          totalProd[k] += v;
        }
      }

      // Faction bonuses
      if (factionId === 'resistencia') totalProd.morale = Math.round(totalProd.morale * 1.2);
      if (factionId === 'synergia') totalProd.materials = Math.round(totalProd.materials * 1.25);
      if (factionId === 'desconectados') totalProd.food = Math.round(totalProd.food * 1.3);

      // Tech bonuses
      if (bonuses.materialsMult) totalProd.materials = Math.round(totalProd.materials * bonuses.materialsMult);
      if (bonuses.foodMult) totalProd.food = Math.round(totalProd.food * bonuses.foodMult);
      if (bonuses.creditsMult) totalProd.credits = Math.round(totalProd.credits * bonuses.creditsMult);
      if (bonuses.moraleFlat) totalProd.morale += bonuses.moraleFlat;

      report.production = { ...totalProd };

      // Consumption
      let totalConsumption = { food: 0, energy: 0 };
      // Food: 1 per 10 population
      let totalPop = 0;
      for (const d of districts) totalPop += d.population;
      totalConsumption.food = Math.ceil(totalPop / 10);

      // Energy: 1 per military unit
      let totalMilitary = 0;
      for (const d of districts) {
        for (const u of d.units) totalMilitary += u.quantity;
      }
      totalConsumption.energy = Math.ceil(totalMilitary / 3);

      report.consumption = totalConsumption;

      // Apply production
      for (const [k, v] of Object.entries(totalProd)) {
        res[k] += v;
      }

      // Apply consumption
      res.food -= totalConsumption.food;
      res.energy -= totalConsumption.energy;

      // Population growth
      if (res.food > 0) {
        const growth = Math.floor(totalProd.population);
        // Distribute growth to districts
        for (const d of districts) {
          if (d.population < 200) d.population += Math.max(1, Math.floor(growth / districts.length));
        }
      }

      // Starvation
      if (res.food < 0) {
        res.morale -= 10;
        // Lose population
        for (const d of districts) {
          d.population = Math.max(1, d.population - 2);
        }
        res.food = 0;
      }

      // Energy shortage
      if (res.energy < 0) {
        res.morale -= 5;
        res.energy = 0;
      }

      // Morale effects
      if (res.morale < C.COMBAT.MORALE_THRESHOLD_LOW) {
        // Rebellion risk - lose some credits
        res.credits = Math.max(0, res.credits - 5);
      }
      if (res.morale > 100) res.morale = 100;
      if (bonuses.moraleFloor && res.morale < bonuses.moraleFloor) res.morale = bonuses.moraleFloor;
      if (res.morale < 0) res.morale = 0;

      // Special resource generation
      const specPerTurn = Math.max(1, Math.floor(districts.length / 2));
      res.special += specPerTurn;
      if (bonuses.biomasaPerTurn) res.special += bonuses.biomasaPerTurn;

      // Clamp resources
      res.population = Math.max(0, res.population);
      res.food = Math.max(0, res.food);
      res.materials = Math.max(0, res.materials);
      res.energy = Math.max(0, res.energy);
      res.credits = Math.max(0, res.credits);

      // Net
      for (const k of Object.keys(totalProd)) {
        report.net[k] = totalProd[k] - (totalConsumption[k] || 0);
      }

      return report;
    }

    serialize() {
      return JSON.parse(JSON.stringify(this.factions));
    }

    deserialize(data) {
      this.factions = data;
    }
  }

  CHRONOS.ResourceManager = ResourceManager;
})();
