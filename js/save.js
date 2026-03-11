// ============================================================================
// CHRONOS v2.0: La Guerra por la Memoria — Guardado/Cargado
// ============================================================================
(function () {
  const SAVE_KEY_BASE = 'chronos_save';
  const AUTOSAVE_KEY = 'chronos_autosave';
  const CURRENT_VERSION = 2;

  CHRONOS.Save = {
    // slot: 1|2|3 para manual, 'auto' para autoguardado
    save(game, slot = 1) {
      try {
        const key = slot === 'auto' ? AUTOSAVE_KEY : `${SAVE_KEY_BASE}_${slot}`;
        const data = {
          version: CURRENT_VERSION,
          timestamp: Date.now(),
          mapSize: C.MAP_SIZE || 'small',
          fogOfWar: C.FOG_OF_WAR !== false,
          playerFaction: game.playerFaction,
          playerConfig: game.playerConfig,
          humanPlayers: game.humanPlayers,
          activePlayerIndex: game.activePlayerIndex,
          turn: game.turnManager.serialize(),
          map: game.map.serialize(),
          resources: game.resources.serialize(),
          tech: game.tech.serialize(),
          stats: game.stats || {}
        };
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('Error al guardar:', e);
        return false;
      }
    },

    load(slot = 1) {
      try {
        const key = slot === 'auto' ? AUTOSAVE_KEY : `${SAVE_KEY_BASE}_${slot}`;
        let raw = localStorage.getItem(key);
        // Compatibilidad con guardados antiguos en slot 1
        if (!raw && slot === 1) raw = localStorage.getItem(SAVE_KEY_BASE);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data.version || data.version < 2) {
          data.version = CURRENT_VERSION;
          if (!data.timestamp) data.timestamp = Date.now();
        }
        return data;
      } catch (e) {
        console.error('Error al cargar:', e);
        return null;
      }
    },

    hasSave(slot = 1) {
      if (slot === 'auto') return !!localStorage.getItem(AUTOSAVE_KEY);
      return !!(localStorage.getItem(`${SAVE_KEY_BASE}_${slot}`) ||
                (slot === 1 && localStorage.getItem(SAVE_KEY_BASE)));
    },

    deleteSave(slot = 1) {
      if (slot === 'auto') { localStorage.removeItem(AUTOSAVE_KEY); return; }
      localStorage.removeItem(`${SAVE_KEY_BASE}_${slot}`);
      if (slot === 1) localStorage.removeItem(SAVE_KEY_BASE); // limpiar clave legacy
    },

    getSaveInfo(slot = 1) {
      try {
        const key = slot === 'auto' ? AUTOSAVE_KEY : `${SAVE_KEY_BASE}_${slot}`;
        let raw = localStorage.getItem(key);
        if (!raw && slot === 1) raw = localStorage.getItem(SAVE_KEY_BASE);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return {
          slot,
          faction: data.playerFaction,
          turn: data.turn?.turn || 1,
          timestamp: data.timestamp || null,
          version: data.version || 1,
          humanPlayers: data.humanPlayers || [data.playerFaction]
        };
      } catch (e) {
        return null;
      }
    },

    // Lista los 3 slots de guardado manual
    listSaves() {
      return [1, 2, 3].map(s => ({ slot: s, info: this.getSaveInfo(s) }));
    }
  };
})();
