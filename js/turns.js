// ============================================================================
// CHRONOS: La Guerra por la Memoria — Sistema de Turnos
// ============================================================================
(function () {
  const C = CHRONOS.Config;

  class TurnManager {
    constructor(game) {
      this.game = game;
      this.turn = 1;
      this.phase = 'waiting'; // waiting, production, construction, movement, combat, diplomacy, events
      this.phases = ['production', 'construction', 'movement', 'combat', 'diplomacy', 'events'];
      this.log = [];
    }

    addLog(msg, q, r) {
      const entry = { turn: this.turn, msg };
      if (q !== undefined && r !== undefined) { entry.q = q; entry.r = r; }
      this.log.push(entry);
      if (this.log.length > 50) this.log.shift();
    }

    async endTurn() {
      const g = this.game;

      // In multiplayer, check if more human players need to play this turn
      if (g.humanPlayers.length > 1 && g.activePlayerIndex < g.humanPlayers.length - 1) {
        // More human players still need to play this turn
        g.activePlayerIndex++;
        const nextFaction = g.humanPlayers[g.activePlayerIndex];
        const f = C.FACTIONS[nextFaction];
        this.addLog(`${f.emoji} Turno de ${f.name}`);

        // Show pass-device screen, then switch to next player
        await g.ui.showPassDevice(nextFaction);
        g.switchToPlayer(nextFaction);
        g.ui.updateTechPanel();
        return;
      }

      // All human players have played — process automated phases

      // ---- Phase 1: Production ----
      this.phase = 'production';
      g.renderer.showPhaseBanner('📦 PRODUCCIÓN', '#D29922');
      this.addLog('📦 Fase de Producción');
      for (const fid of Object.keys(C.FACTIONS)) {
        const report = g.resources.processProduction(fid, g.map, g.tech);
        if (g.isHuman(fid) && report) {
          this.addLog(`  ${C.FACTIONS[fid].emoji} Producción: +${report.production.food}🌾 +${report.production.materials}⚙️ +${report.production.energy}⚡`);
        }
      }

      // ---- Phase 2: Construction ----
      this.phase = 'construction';
      g.renderer.showPhaseBanner('🔨 CONSTRUCCIÓN', '#A371F7');
      this.addLog('🔨 Fase de Construcción');
      for (const fid of Object.keys(C.FACTIONS)) {
        const completed = g.buildings.processTurn(g.map, fid, g.tech);
        for (const c of completed) {
          if (g.isHuman(fid)) {
            this.addLog(`  ✅ ${c.building.name} completado en (${c.district.q},${c.district.r})`, c.district.q, c.district.r);
          }
        }
      }

      // ---- Phase 3 & 4: AI Movement & Combat ----
      this.phase = 'movement';
      g.renderer.showPhaseBanner('🚶 MOVIMIENTO Y COMBATE', '#F85149');
      this.addLog('🚶 Fase de Movimiento y Combate');
      for (const fid of Object.keys(C.FACTIONS)) {
        if (g.isHuman(fid)) continue; // human players already moved
        g.ai.processTurn(fid, g.map, g.renderer);
      }

      // ---- Phase 5: Diplomacy (simplified) ----
      this.phase = 'diplomacy';
      g.renderer.showPhaseBanner('🤝 DIPLOMACIA', '#E6EDF3');
      for (const fid of Object.keys(C.FACTIONS)) {
        const res = g.resources.get(fid);
        if (fid === 'desconectados' && res) {
          const dCount = g.map.getFactionsDistricts(fid).filter(d => d.type === 'comercial').length;
          if (dCount > 0) res.special += dCount;
        }
      }

      // ---- Phase 6: Events ----
      this.phase = 'events';
      g.renderer.showPhaseBanner('🎲 EVENTOS', '#58A6FF');
      const event = g.events.rollEvent(this.turn);
      if (event) {
        // Apply event to each human player and show modal to first human
        const firstHuman = g.humanPlayers[0];
        if (event.choice) {
          // Switch view to first human for choice
          g.switchToPlayer(firstHuman);
          await g.ui.showEventChoice(event);
        } else {
          // Apply event globally (target logic handles 'player' vs 'all')
          g.events.applyEvent(event, firstHuman, g.resources, g.map);
          g.switchToPlayer(firstHuman);
          await g.ui.showEvent(event);
        }
        this.addLog(`🎲 Evento: ${event.name}`);
      }

      // ---- Tech progress ----
      for (const fid of Object.keys(C.FACTIONS)) {
        const completed = g.tech.processTurn(fid, g.map);
        if (completed) {
          if (g.isHuman(fid)) {
            this.addLog(`🔬 ${C.FACTIONS[fid].emoji} ¡Investigación completada: ${completed.name}!`);
            g.renderer.showPhaseBanner(`🔬 ${completed.name}`, '#A371F7');
            await g.ui.showNotification(`🔬 ${C.FACTIONS[fid].emoji} ¡${completed.name} investigado!`);
          }
        }

        // Apply per-turn tech effects
        if (g.tech.hasResearched(fid, 'h_plaga')) {
          for (const d of g.map.getFactionsDistricts(fid)) {
            for (const n of CHRONOS.Hex.getNeighbors(d.q, d.r)) {
              const nd = g.map.get(n.q, n.r);
              if (nd && nd.faction && nd.faction !== fid) {
                nd.population = Math.max(1, nd.population - 5);
              }
            }
          }
        }

        if (g.tech.hasResearched(fid, 'h_regen')) {
          for (const d of g.map.getFactionsDistricts(fid)) {
            for (const u of d.units) {
              if (u.faction === fid) {
                const ud = C.UNITS[u.type];
                if (ud) u.hp = Math.min(ud.hp, u.hp + 3);
              }
            }
          }
        }
      }

      // ---- Reset movement for ALL human players ----
      for (const fid of g.humanPlayers) {
        g.unitManager.resetMovement(g.map, fid);
      }

      // ---- Check victory/defeat ----
      const result = this._checkVictory();
      if (result) {
        // Switch to first human for showing result
        g.switchToPlayer(g.humanPlayers[0]);
        await g.ui.showGameEnd(result);
        return;
      }

      // ---- Next turn ----
      this.turn++;
      this.phase = 'waiting';
      g.activePlayerIndex = 0;
      const firstHuman = g.humanPlayers[0];
      this.addLog(`═══════ Turno ${this.turn} ═══════`);
      this.addLog(`${C.FACTIONS[firstHuman].emoji} Turno de ${C.FACTIONS[firstHuman].name}`);

      // In multiplayer, show pass-device screen for first player of new turn
      if (g.humanPlayers.length > 1) {
        await g.ui.showPassDevice(firstHuman);
      }

      g.switchToPlayer(firstHuman);
      g.ui.update();
      g.render();
    }

    _checkVictory() {
      const g = this.game;
      const total = g.map.getTotalDistricts();

      for (const [fid, cond] of Object.entries(C.VICTORY_CONDITIONS)) {
        const count = g.map.countFactionDistricts(fid);

        if (cond.type === 'domination' && count / total >= cond.threshold) {
          return { winner: fid, type: 'domination', turn: this.turn };
        }
        if (cond.type === 'liberation' && count / total >= cond.threshold) {
          return { winner: fid, type: 'liberation', turn: this.turn };
        }
        if (cond.type === 'annihilation') {
          const others = Object.keys(C.FACTIONS).filter(f => f !== fid);
          if (others.every(f => g.map.countFactionDistricts(f) === 0)) {
            return { winner: fid, type: 'annihilation', turn: this.turn };
          }
        }
        if (cond.type === 'survival' && g.isHuman(fid) && this.turn >= cond.threshold && count >= 5) {
          return { winner: fid, type: 'survival', turn: this.turn };
        }
      }

      // Check defeat for ALL human players (if all humans have 0 districts)
      const allHumansDefeated = g.humanPlayers.every(fid => g.map.countFactionDistricts(fid) === 0);
      if (allHumansDefeated) {
        return { winner: null, type: 'defeat', turn: this.turn };
      }

      return null;
    }

    serialize() {
      return { turn: this.turn, phase: this.phase, log: this.log };
    }

    deserialize(data) {
      this.turn = data.turn;
      this.phase = data.phase;
      this.log = data.log || [];
    }
  }

  CHRONOS.TurnManager = TurnManager;
})();
