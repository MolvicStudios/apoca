// ============================================================================
// CHRONOS: La Guerra por la Memoria — Eventos Aleatorios
// ============================================================================
(function () {
  const C = CHRONOS.Config;

  class EventManager {
    constructor() {
      this.lastEvent = null;
      this.recentEventIds = []; // evita repetir los últimos 5 eventos
    }

    rollEvent(turn) {
      // Probabilidad escala: 30% en turno 1 → 50% en turno 41+
      const probability = Math.min(0.5, 0.3 + (turn - 1) * 0.005);
      if (Math.random() > probability) return null;

      // Filtrar eventos recientes para evitar repeticiones inmediatas
      let pool = C.EVENTS.filter(e => !this.recentEventIds.includes(e.id));
      if (pool.length < 5) {
        pool = C.EVENTS; // fallback si el pool es muy pequeño
        this.recentEventIds = [];
      }

      const event = pool[Math.floor(Math.random() * pool.length)];

      this.recentEventIds.push(event.id);
      if (this.recentEventIds.length > 5) this.recentEventIds.shift();

      this.lastEvent = event;
      return event;
    }

    applyEvent(event, playerFaction, resources, map) {
      if (!event) return;

      const targets = [];
      if (event.target === 'player') {
        targets.push(playerFaction);
      } else if (event.target === 'all') {
        for (const fid of Object.keys(C.FACTIONS)) {
          if (event.except && fid === event.except) continue;
          targets.push(fid);
        }
      } else if (event.target) {
        targets.push(event.target);
      }

      if (event.effect && !event.choice) {
        for (const fid of targets) {
          resources.add(fid, event.effect);
        }
      }

      // Apply penalty to specific faction if exists
      if (event.penalty && event.penalty.faction) {
        resources.add(event.penalty.faction, event.penalty.effect);
      }
    }

    applyChoice(event, choiceIndex, playerFaction, resources, enemyFactions) {
      if (!event || !event.choice || !event.options) return;
      const option = event.options[choiceIndex];
      if (!option) return;

      if (option.cost) resources.spend(playerFaction, option.cost);
      if (option.gain) resources.add(playerFaction, option.gain);

      // If option has a penalty that should target enemy
      if (option.penalty && option.penalty.effect) {
        // Apply to random enemy
        if (enemyFactions.length > 0) {
          const target = enemyFactions[Math.floor(Math.random() * enemyFactions.length)];
          resources.add(target, option.penalty.effect);
        }
      }
    }
  }

  CHRONOS.EventManager = EventManager;
})();
