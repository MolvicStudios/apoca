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

    startNewGame(factionId) {
      this.playerFaction = factionId;
      this.selectedHex = null;
      this.movementRange = null;

      // Generate map
      this.map.generate();

      // Init resources
      const factionIds = Object.keys(C.FACTIONS);
      this.resources.init(factionIds, factionId);

      // Init tech
      this.tech.init(factionIds);

      // Init turn manager
      this.turnManager = new CHRONOS.TurnManager(this);
      this.turnManager.addLog(`═══════ Turno 1 ═══════`);
      this.turnManager.addLog(`${C.FACTIONS[factionId].emoji} Juegas como ${C.FACTIONS[factionId].name}`);

      // Update visibility
      this.map.updateVisibility(factionId, this.tech);

      // Show game screen
      this.ui.showGameScreen();

      // Resize canvas now that container is visible
      this._resizeCanvas();

      // Create HUD overlays (zoom buttons, etc.)
      this.ui.createHUDOverlays();

      // Center camera on player capital
      const starts = C.FACTIONS[factionId].startPositions;
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
      this.playerFaction = data.playerFaction;
      this.selectedHex = null;
      this.movementRange = null;

      this.map.deserialize(data.map);
      this.resources.deserialize(data.resources);
      this.tech.deserialize(data.tech);
      this.turnManager = new CHRONOS.TurnManager(this);
      this.turnManager.deserialize(data.turn);

      this.map.updateVisibility(this.playerFaction, this.tech);

      this.ui.showGameScreen();
      this._resizeCanvas();
      this.ui.createHUDOverlays();

      // Center on capital
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
