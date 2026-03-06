// ============================================================================
// CHRONOS: La Guerra por la Memoria — Sistema de Construcción
// ============================================================================
(function () {
  const C = CHRONOS.Config;

  class BuildingManager {
    getAvailableBuildings(district, factionId) {
      const available = [];
      for (const [bid, bdata] of Object.entries(C.BUILDINGS)) {
        // Horda can't build labs
        if (factionId === 'horda' && bid === 'laboratorio') continue;
        // Check max per district
        const existing = district.buildings.filter(b => b.type === bid).length;
        if (existing >= bdata.maxPerDistrict) continue;
        // Check district can build
        if (!district.canBuild()) continue;
        available.push({ id: bid, ...bdata });
      }
      return available;
    }

    build(district, buildingId, factionId, resources) {
      const bdata = C.BUILDINGS[buildingId];
      if (!bdata) return { ok: false, msg: 'Edificio desconocido' };
      if (!district.canBuild()) return { ok: false, msg: 'Máximo 3 edificios por distrito' };
      if (district.faction !== factionId) return { ok: false, msg: 'No es tu distrito' };

      // Check cost
      if (!resources.canAfford(factionId, bdata.cost)) {
        return { ok: false, msg: 'Recursos insuficientes' };
      }

      // Spend
      resources.spend(factionId, bdata.cost);

      // Add building (with construction time)
      district.buildings.push({ type: buildingId, turnsLeft: bdata.turns });
      return { ok: true, msg: `Construyendo ${bdata.name}...` };
    }

    // Process construction progress each turn
    processTurn(map, factionId, tech) {
      const districts = map.getFactionsDistricts(factionId);
      const bonuses = tech ? tech.getBonuses(factionId) : {};
      const completed = [];
      for (const d of districts) {
        for (const b of d.buildings) {
          if (b.turnsLeft > 0) {
            b.turnsLeft -= (1 + (bonuses.buildTurnsReduction || 0));
            if (b.turnsLeft <= 0) {
              b.turnsLeft = 0;
              completed.push({ district: d, building: C.BUILDINGS[b.type] });
            }
          }
        }
      }
      return completed;
    }
  }

  CHRONOS.BuildingManager = BuildingManager;
})();
