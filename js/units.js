// ============================================================================
// CHRONOS: La Guerra por la Memoria — Unidades y Combate
// ============================================================================
(function () {
  const C = CHRONOS.Config;
  const H = CHRONOS.Hex;

  class UnitManager {
    getAvailableUnits(factionId) {
      const available = [];
      for (const [uid, udata] of Object.entries(C.UNITS)) {
        if (udata.faction === 'all' || udata.faction === factionId) {
          available.push({ id: uid, ...udata });
        }
      }
      return available;
    }

    recruit(district, unitId, factionId, resources) {
      const udata = C.UNITS[unitId];
      if (!udata) return { ok: false, msg: 'Unidad desconocida' };
      if (district.faction !== factionId) return { ok: false, msg: 'No es tu distrito' };
      if (udata.faction !== 'all' && udata.faction !== factionId) return { ok: false, msg: 'Unidad no disponible para tu facción' };

      // Horda free recruitment for caminantes
      const cost = (factionId === 'horda' && unitId === 'caminante') ? {} : { ...udata.cost };

      if (!resources.canAfford(factionId, cost)) {
        return { ok: false, msg: 'Recursos insuficientes' };
      }

      resources.spend(factionId, cost);

      // Check if unit type already exists in district
      const existing = district.units.find(u => u.type === unitId && u.faction === factionId);
      if (existing) {
        existing.quantity += (unitId === 'caminante' ? 5 : 1);
      } else {
        district.units.push({
          type: unitId,
          faction: factionId,
          quantity: (unitId === 'caminante' ? 5 : 1),
          hp: udata.hp,
          hasMoved: true // can't move on recruit turn
        });
      }

      // Spend population
      if (cost.population) {
        district.population = Math.max(1, district.population - cost.population);
      }

      return { ok: true, msg: `${udata.name} reclutado(s)` };
    }

    // Get valid movement targets
    getMovementRange(q, r, factionId, map, tech) {
      const district = map.get(q, r);
      if (!district) return [];

      // Find best movement value among unmoved units
      let maxMove = 0;
      for (const u of district.units) {
        if (u.faction === factionId && !u.hasMoved) {
          const udata = C.UNITS[u.type];
          if (udata && udata.move > maxMove) maxMove = udata.move;
        }
      }

      // Tech movement bonus
      const bonuses = tech ? tech.getBonuses(factionId) : {};
      maxMove += (bonuses.movementBonus || 0);

      if (maxMove === 0) return [];

      // BFS with terrain costs
      const visited = new Map();
      const queue = [{ q, r, cost: 0 }];
      visited.set(`${q},${r}`, 0);
      const results = [];

      const getTerrainCost = (d) => {
        if (!d) return 1;
        if (d.type === 'paramo') return 2;
        if (d.type === 'ruinas') return 1.5;
        if (d.type === 'militar' && d.faction && d.faction !== factionId) return 2;
        return 1;
      };

      while (queue.length > 0) {
        const cur = queue.shift();
        if (cur.cost > 0) results.push({ q: cur.q, r: cur.r });
        if (cur.cost < maxMove) {
          for (const n of H.getNeighbors(cur.q, cur.r)) {
            const key = `${n.q},${n.r}`;
            const nd = map.get(n.q, n.r);
            if (!nd) continue;
            const moveCost = cur.cost + getTerrainCost(nd);
            if (moveCost <= maxMove && (!visited.has(key) || visited.get(key) > moveCost)) {
              visited.set(key, moveCost);
              queue.push({ q: n.q, r: n.r, cost: moveCost });
            }
          }
        }
      }
      return results;
    }

    // Move units from one hex to another
    // unitsSpec: optional {[unitType]: quantity} to move only a subset (split groups)
    moveUnits(fromQ, fromR, toQ, toR, factionId, map, renderer, resources, tech, unitsSpec = null) {
      const from = map.get(fromQ, fromR);
      const to = map.get(toQ, toR);
      if (!from || !to) return { ok: false, msg: 'Hexágono inválido' };

      // Collect unmoved units of this faction
      let movingUnits = from.units.filter(u => u.faction === factionId && !u.hasMoved);
      if (movingUnits.length === 0) return { ok: false, msg: 'No hay unidades disponibles para mover' };

      // Handle split: if unitsSpec provided, move only the specified quantities
      if (unitsSpec !== null) {
        const selected = [];
        for (const u of movingUnits) {
          const qty = unitsSpec[u.type] || 0;
          if (qty <= 0) continue;
          if (qty >= u.quantity) {
            selected.push(u); // move the whole stack
          } else {
            // Split off the requested quantity into a new stack
            const split = { type: u.type, faction: u.faction, quantity: qty, hp: u.hp, hasMoved: false };
            u.quantity -= qty;
            from.units.push(split);
            selected.push(split);
          }
        }
        if (selected.length === 0) return { ok: false, msg: 'No se seleccionaron unidades' };
        movingUnits = selected;
      }

      // Check distance
      const dist = H.distance(fromQ, fromR, toQ, toR);
      const validUnits = movingUnits.filter(u => {
        const ud = C.UNITS[u.type];
        return ud && ud.move >= dist;
      });

      if (validUnits.length === 0) return { ok: false, msg: 'Unidades fuera de rango' };

      // Enemy hex → combat
      if (to.faction && to.faction !== factionId && to.units.length > 0) {
        return this.resolveCombat(from, to, validUnits, factionId, map, renderer, resources, tech);
      }

      // Empty/neutral/own hex → just move
      // Remove from origin
      from.units = from.units.filter(u => !validUnits.includes(u));

      // Add to destination
      for (const u of validUnits) {
        u.hasMoved = true;
        const existing = to.units.find(eu => eu.type === u.type && eu.faction === u.faction);
        if (existing) {
          existing.quantity += u.quantity;
        } else {
          to.units.push(u);
        }
      }

      // Conquer neutral hex
      if (!to.faction || to.faction !== factionId) {
        if (!to.faction || to.units.filter(u => u.faction !== factionId).length === 0) {
          to.faction = factionId;
          to.justConquered = true;
          if (renderer) renderer.addConquestAnimation(toQ, toR, C.FACTIONS[factionId].color);
        }
      }

      return { ok: true, msg: 'Unidades movidas', combat: false };
    }

    resolveCombat(from, to, attackingUnits, attackerFaction, map, renderer, resources, tech) {
      const defenderFaction = to.faction;
      const attackerRes = resources.get(attackerFaction);
      const defenderRes = resources.get(defenderFaction);
      const atkBonuses = tech ? tech.getBonuses(attackerFaction) : {};
      const defBonuses = tech ? tech.getBonuses(defenderFaction) : {};

      // Calculate attack power
      let atkPower = 0;
      for (const u of attackingUnits) {
        const ud = C.UNITS[u.type];
        if (ud) {
          let unitAtk = ud.atk;
          // d_milicia tech: +2 ATK for milicia/granjero
          if (attackerFaction === 'desconectados' && tech && tech.hasResearched(attackerFaction, 'd_milicia')
              && (u.type === 'milicia' || u.type === 'granjero')) {
            unitAtk += 2;
          }
          // h_coloso tech: +3 ATK for coloso
          if (u.type === 'coloso') unitAtk += (atkBonuses.colosoAtkBonus || 0);
          atkPower += unitAtk * u.quantity;
        }
      }
      // Tech attack multiplier
      atkPower = Math.round(atkPower * (atkBonuses.atkMult || 1));
      // Morale modifier
      const atkMorale = attackerRes ? attackerRes.morale : 50;
      atkPower = Math.round(atkPower * (atkMorale / 100));

      // Calculate defense power
      let defPower = 0;
      for (const u of to.units) {
        const ud = C.UNITS[u.type];
        if (ud) {
          let unitDef = ud.def;
          // d_milicia tech: +2 DEF for milicia/granjero
          if (defenderFaction === 'desconectados' && tech && tech.hasResearched(defenderFaction, 'd_milicia')
              && (u.type === 'milicia' || u.type === 'granjero')) {
            unitDef += 2;
          }
          if (u.type === 'coloso') unitDef += (defBonuses.colosoDefBonus || 0);
          defPower += unitDef * u.quantity;
        }
      }
      defPower += to.getDefense();
      // Tech defense bonus (border districts)
      defPower += (defBonuses.defBorderBonus || 0);
      const defMorale = defenderRes ? defenderRes.morale : 50;
      defPower = Math.round(defPower * (defMorale / 100));

      // Fortified district check (siege)
      if (to.getDefense() >= 3 && to.siegeTurns < C.COMBAT.SIEGE_TURNS) {
        to.siegeTurns++;
        // Mark units as moved
        for (const u of attackingUnits) u.hasMoved = true;
        if (renderer) renderer.addCombatAnimation(to.q, to.r, 0, true);
        return { ok: true, msg: `Asedio en progreso (${to.siegeTurns}/${C.COMBAT.SIEGE_TURNS} turnos)`, combat: true, siege: true };
      }

      // Damage calculation: Daño = (Ataque × Moral/100) - Defensa
      const damageToDefender = Math.max(1, atkPower - Math.floor(defPower * 0.5));
      const damageToAttacker = Math.max(1, defPower - Math.floor(atkPower * 0.3));

      // Apply damage to defender
      let defLosses = this._applyDamage(to.units, damageToDefender);

      // Apply damage to attacker
      let atkLosses = this._applyDamage(attackingUnits, damageToAttacker);

      // Animations
      if (renderer) {
        renderer.addCombatAnimation(to.q, to.r, damageToDefender, true);
        renderer.addCombatAnimation(from.q, from.r, damageToAttacker, false);
      }

      // Remove dead units
      to.units = to.units.filter(u => u.quantity > 0);
      from.units = from.units.filter(u => !attackingUnits.includes(u) || u.quantity > 0);

      // Mark as moved
      for (const u of attackingUnits) u.hasMoved = true;

      // Horda assimilation (20% base, increased by tech)
      if (attackerFaction === 'horda' && defLosses > 0) {
        const assimRate = 0.2 * (atkBonuses.assimilationMult || 1);
        const assimilated = Math.floor(defLosses * assimRate);
        if (assimilated > 0) {
          const caminante = from.units.find(u => u.type === 'caminante' && u.faction === 'horda');
          if (caminante) caminante.quantity += assimilated;
          else from.units.push({ type: 'caminante', faction: 'horda', quantity: assimilated, hp: C.UNITS.caminante.hp, hasMoved: true });
        }
      }

      // h_terror: enemies lose morale when attacked
      if (attackerFaction === 'horda' && tech && tech.hasResearched('horda', 'h_terror') && defenderRes) {
        defenderRes.morale = Math.max(0, defenderRes.morale - 10);
      }

      // Did attackers win?
      const defenderAlive = to.units.filter(u => u.faction === defenderFaction).length > 0;

      let msg;
      if (!defenderAlive) {
        // Attacker conquers
        // Move surviving attackers to target
        const survivors = attackingUnits.filter(u => u.quantity > 0);
        from.units = from.units.filter(u => !survivors.includes(u));
        for (const u of survivors) {
          to.units.push(u);
        }
        to.faction = attackerFaction;
        to.siegeTurns = 0;
        to.justConquered = true;
        if (renderer) renderer.addConquestAnimation(to.q, to.r, C.FACTIONS[attackerFaction].color);

        // Morale effects
        if (attackerRes) attackerRes.morale = Math.min(100, attackerRes.morale + 3);
        if (defenderRes) defenderRes.morale = Math.max(0, defenderRes.morale - 5);

        msg = `¡Victoria! Distrito conquistado. Bajas: ATK ${atkLosses}, DEF ${defLosses}`;
      } else {
        msg = `Combate sin conquista. Bajas: ATK ${atkLosses}, DEF ${defLosses}`;
        if (attackerRes) attackerRes.morale = Math.max(0, attackerRes.morale - 2);
      }

      return { ok: true, msg, combat: true, siege: false, won: !defenderAlive, atkLosses, defLosses };
    }

    _applyDamage(units, totalDamage) {
      let remaining = totalDamage;
      let totalLosses = 0;
      for (const u of units) {
        if (remaining <= 0) break;
        const ud = C.UNITS[u.type];
        if (!ud) continue;
        const killsNeeded = Math.ceil(remaining / Math.max(1, ud.hp));
        const kills = Math.min(u.quantity, killsNeeded);
        u.quantity -= kills;
        totalLosses += kills;
        remaining -= kills * ud.hp;
      }
      return totalLosses;
    }

    // Reset movement for all units of a faction
    resetMovement(map, factionId) {
      for (const d of map.getFactionsDistricts(factionId)) {
        for (const u of d.units) {
          if (u.faction === factionId) u.hasMoved = false;
        }
      }
    }
  }

  CHRONOS.UnitManager = UnitManager;
})();
