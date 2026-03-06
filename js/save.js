// ============================================================================
// CHRONOS v2.0: La Guerra por la Memoria — Guardado/Cargado
// ============================================================================
(function () {
  const SAVE_KEY = 'chronos_save';
  const CURRENT_VERSION = 2;

  CHRONOS.Save = {
    save(game) {
      try {
        const data = {
          version: CURRENT_VERSION,
          timestamp: Date.now(),
          playerFaction: game.playerFaction,
          playerConfig: game.playerConfig,
          humanPlayers: game.humanPlayers,
          activePlayerIndex: game.activePlayerIndex,
          turn: game.turnManager.serialize(),
          map: game.map.serialize(),
          resources: game.resources.serialize(),
          tech: game.tech.serialize()
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('Error al guardar:', e);
        return false;
      }
    },

    load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        // Migrate v1 → v2
        if (!data.version || data.version < 2) {
          data.version = CURRENT_VERSION;
          // v1 saves lack timestamp
          if (!data.timestamp) data.timestamp = Date.now();
        }
        return data;
      } catch (e) {
        console.error('Error al cargar:', e);
        return null;
      }
    },

    hasSave() {
      return !!localStorage.getItem(SAVE_KEY);
    },

    deleteSave() {
      localStorage.removeItem(SAVE_KEY);
    },

    getSaveInfo() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return {
          faction: data.playerFaction,
          turn: data.turn?.turn || 1,
          timestamp: data.timestamp || null,
          version: data.version || 1,
          humanPlayers: data.humanPlayers || [data.playerFaction]
        };
      } catch (e) {
        return null;
      }
    }
  };
})();
