// ============================================================================
// CHRONOS: La Guerra por la Memoria — Controlador Principal
// ============================================================================
(function () {
  const C = CHRONOS.Config;

  class Game {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.playerFaction = null;
      this.selectedHex = null;
      this.movementRange = null;

      // Multiplayer state
      this.playerConfig = {};       // { resistencia: 'human'|'ai', ... }
      this.humanPlayers = [];       // ordered list of human faction IDs
      this.activePlayerIndex = 0;   // index into humanPlayers for current sub-turn

      // Estadísticas de partida
      this.stats = null;

      // Systems
      this.map = new CHRONOS.GameMap();
      this.resources = new CHRONOS.ResourceManager();
      this.buildings = new CHRONOS.BuildingManager();
      this.unitManager = new CHRONOS.UnitManager();
      this.tech = new CHRONOS.TechManager();
      this.events = new CHRONOS.EventManager();
      this.renderer = new CHRONOS.Renderer(this.canvas);
      this.ui = new CHRONOS.UI(this);
      this.turnManager = new CHRONOS.TurnManager(this);
      this.ai = new CHRONOS.AIManager(this.unitManager, this.buildings, this.tech, this.resources);

      this._animFrame = null;
    }

    init() {
      this._resizeCanvas();
      window.addEventListener('resize', () => this._resizeCanvas());
      this.ui.init();
      this.ui.showFactionSelect();
    }

    _resizeCanvas() {
      const container = document.getElementById('canvas-container');
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.renderer.resize(w, h);
      if (this.playerFaction) this.render();
    }

    startNewGame(config) {
      // config = { resistencia: 'human'|'ai', ..., mapSize: 'small'|'medium'|'large', fogOfWar: true|false }

      // Apply map size
      const MAP_SIZES = { small: 7, medium: 11, large: 15 };
      const sz = MAP_SIZES[config.mapSize] || 7;
      C.GRID_COLS = sz;
      C.GRID_ROWS = sz;
      C.MAP_SIZE  = config.mapSize || 'small';
      C.FOG_OF_WAR = config.fogOfWar !== false;
      this.map.width  = sz;
      this.map.height = sz;

      this.playerConfig = config;
      this.humanPlayers = Object.keys(config).filter(f => config[f] === 'human');
      this.activePlayerIndex = 0;
      this.playerFaction = this.humanPlayers[0] || Object.keys(config)[0];
      this.selectedHex = null;
      this.movementRange = null;

      // Inicializar estadísticas
      this.stats = {
        districtsConquered: 0,
        combatWon: 0,
        combatLost: 0,
        buildingsBuilt: 0,
        unitsRecruited: 0,
        techResearched: 0,
        turnsPlayed: 1,
        maxDistricts: 3
      };

      // Generate map
      this.map.generate();

      // Init resources
      const factionIds = Object.keys(C.FACTIONS);
      this.resources.init(factionIds, this.playerFaction);

      // Init tech
      this.tech.init(factionIds);

      // Init turn manager
      this.turnManager = new CHRONOS.TurnManager(this);
      this.turnManager.addLog(`═══════ Turno 1 ═══════`);
      const f = C.FACTIONS[this.playerFaction];
      if (this.humanPlayers.length > 1) {
        this.turnManager.addLog(`🎮 Multijugador local: ${this.humanPlayers.length} jugadores humanos`);
      }
      this.turnManager.addLog(`${f.emoji} Turno de ${f.name}`);

      // Update visibility for active player
      this.map.updateVisibility(this.playerFaction, this.tech);

      // Show game screen
      this.ui.showGameScreen();

      // Resize canvas now that container is visible
      this._resizeCanvas();

      // Create HUD overlays (zoom buttons, etc.)
      this.ui.createHUDOverlays();

      // Center camera on active player's capital
      const starts = C.FACTIONS[this.playerFaction].startPositions;
      if (starts && starts.length > 0) {
        const center = this.renderer.getHexCenter(starts[0][0], starts[0][1]);
        this.renderer.camera.centerOn(center.x, center.y, this.canvas.width, this.canvas.height, 1.0);
      }

      this.ui.update();

      // Start ambient
      CHRONOS.Audio.startAmbient();

      // Start render loop
      this.startRenderLoop();
    }

    loadSave(data) {
      // Restore map size and fog of war
      const MAP_SIZES = { small: 7, medium: 11, large: 15 };
      const sz = MAP_SIZES[data.mapSize] || 7;
      C.GRID_COLS  = sz;
      C.GRID_ROWS  = sz;
      C.MAP_SIZE   = data.mapSize || 'small';
      C.FOG_OF_WAR = data.fogOfWar !== false;
      this.map.width  = sz;
      this.map.height = sz;

      this.playerFaction = data.playerFaction;
      this.selectedHex = null;
      this.movementRange = null;

      // Restore multiplayer state
      if (data.playerConfig) {
        this.playerConfig = data.playerConfig;
        this.humanPlayers = data.humanPlayers || [data.playerFaction];
        this.activePlayerIndex = data.activePlayerIndex || 0;
      } else {
        // Legacy single-player save
        const config = {};
        for (const fid of Object.keys(C.FACTIONS)) {
          config[fid] = fid === data.playerFaction ? 'human' : 'ai';
        }
        this.playerConfig = config;
        this.humanPlayers = [data.playerFaction];
        this.activePlayerIndex = 0;
      }

      this.map.deserialize(data.map);
      this.resources.deserialize(data.resources);
      this.tech.deserialize(data.tech);
      this.turnManager = new CHRONOS.TurnManager(this);
      this.turnManager.deserialize(data.turn);

      // Restaurar estadísticas
      this.stats = data.stats || {
        districtsConquered: 0,
        combatWon: 0,
        combatLost: 0,
        buildingsBuilt: 0,
        unitsRecruited: 0,
        techResearched: 0,
        turnsPlayed: this.turnManager.turn,
        maxDistricts: 0
      };

      this.map.updateVisibility(this.playerFaction, this.tech);

      this.ui.showGameScreen();
      this._resizeCanvas();
      this.ui.createHUDOverlays();

      // Center on active player's capital
      const starts = C.FACTIONS[this.playerFaction].startPositions;
      if (starts && starts.length > 0) {
        const center = this.renderer.getHexCenter(starts[0][0], starts[0][1]);
        this.renderer.camera.centerOn(center.x, center.y, this.canvas.width, this.canvas.height, 1.0);
      }

      this.ui.update();

      CHRONOS.Audio.startAmbient();
      this.startRenderLoop();
    }

    startRenderLoop() {
      const loop = () => {
        this.render();
        this._animFrame = requestAnimationFrame(loop);
      };
      if (this._animFrame) cancelAnimationFrame(this._animFrame);
      loop();
    }

    switchToPlayer(factionId) {
      this.playerFaction = factionId;
      this.selectedHex = null;
      this.movementRange = null;
      this.map.updateVisibility(factionId, this.tech);

      // Center camera on this player's capital
      const starts = C.FACTIONS[factionId].startPositions;
      if (starts && starts.length > 0) {
        const center = this.renderer.getHexCenter(starts[0][0], starts[0][1]);
        this.renderer.camera.centerOn(center.x, center.y, this.canvas.width, this.canvas.height, 1.0);
      }

      this.ui.update();
    }

    isHuman(factionId) {
      return this.playerConfig[factionId] === 'human';
    }

    render() {
      this.renderer.render(this);
    }
  }

  // Boot
  document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
    window.CHRONOS_GAME = game; // debug access
  });
})();
