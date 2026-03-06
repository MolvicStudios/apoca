// ============================================================================
// CHRONOS v2.0: La Guerra por la Memoria — Interfaz de Usuario (DOM + Input)
// ============================================================================
(function () {
  const C = CHRONOS.Config;

  class UI {
    constructor(game) {
      this.game = game;
      this._pendingResolve = null;
      // Pan state
      this._isPanning = false;
      this._panStartX = 0;
      this._panStartY = 0;
      this._lastPanX = 0;
      this._lastPanY = 0;
      this._panButton = -1;
      // Touch state
      this._touches = [];
      this._pinchStartDist = 0;
      this._pinchStartZoom = 1;
      this._longPressTimer = null;
      this._touchMoved = false;
      // Double click
      this._lastClickTime = 0;
      this._lastClickHex = null;
      // Space bar state
      this._spaceHeld = false;
      // Alerts
      this._alerts = [];
      this._alertsRead = true;
      // Previous resources (for trend arrows)
      this._prevResources = null;
      // Log history with hex refs
      this._logHistory = [];
    }

    init() {
      this._cacheElements();
      this._bindEvents();
      this._bindCanvasInput();
      this._bindKeyboard();
    }

    _cacheElements() {
      this.els = {
        screenFaction: document.getElementById('screen-faction'),
        screenGame: document.getElementById('screen-game'),
        hudTurn: document.getElementById('hud-turn'),
        hudFaction: document.getElementById('hud-faction'),
        resPop: document.getElementById('res-pop'),
        resFood: document.getElementById('res-food'),
        resMat: document.getElementById('res-mat'),
        resEnergy: document.getElementById('res-energy'),
        resCredits: document.getElementById('res-credits'),
        resMorale: document.getElementById('res-morale'),
        resSpecial: document.getElementById('res-special'),
        resSpecialIcon: document.getElementById('res-special-icon'),
        sidePanel: document.getElementById('side-panel'),
        panelTitle: document.getElementById('panel-title'),
        panelContent: document.getElementById('panel-content'),
        btnEndTurn: document.getElementById('btn-end-turn'),
        btnSave: document.getElementById('btn-save'),
        btnLoad: document.getElementById('btn-load'),
        btnAudio: document.getElementById('btn-audio'),
        btnTech: document.getElementById('btn-tech'),
        modal: document.getElementById('modal'),
        modalTitle: document.getElementById('modal-title'),
        modalBody: document.getElementById('modal-body'),
        modalActions: document.getElementById('modal-actions'),
        logContainer: document.getElementById('log-container'),
        techPanel: document.getElementById('tech-panel'),
        techContent: document.getElementById('tech-content'),
        canvasContainer: document.getElementById('canvas-container'),
        // New v2 elements (will be created dynamically)
        zoomIn: null,
        zoomOut: null,
        btnViewAll: null,
        btnHome: null,
        alertBell: null,
        alertPanel: null,
        pauseMenu: null,
        historyPanel: null,
      };
    }

    _bindEvents() {
      const g = this.game;

      this.els.btnEndTurn.addEventListener('click', () => {
        if (g.turnManager.phase !== 'waiting') return;
        CHRONOS.Audio.endTurn();
        g.selectedHex = null;
        g.movementRange = null;
        g.turnManager.endTurn();
      });

      this.els.btnSave.addEventListener('click', () => {
        if (CHRONOS.Save.save(g)) this._showToast('💾 Partida guardada');
        else this._showToast('❌ Error al guardar');
      });

      this.els.btnLoad.addEventListener('click', () => {
        const data = CHRONOS.Save.load();
        if (data) {
          g.loadSave(data);
          this._showToast('📂 Partida cargada');
        } else {
          this._showToast('❌ No hay partida guardada');
        }
      });

      this.els.btnAudio.addEventListener('click', () => {
        const on = CHRONOS.Audio.toggle();
        this.els.btnAudio.textContent = on ? '🔊' : '🔇';
      });

      this.els.btnTech.addEventListener('click', () => {
        this.els.techPanel.classList.toggle('hidden');
        if (!this.els.techPanel.classList.contains('hidden')) this.updateTechPanel();
      });
    }

    // ================================================================
    // Canvas Input: Zoom, Pan, Click, Hover, Touch
    // ================================================================
    _bindCanvasInput() {
      const canvas = this.game.canvas;

      // Wheel zoom
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const delta = e.deltaY < 0 ? CHRONOS.ZOOM_STEP : -CHRONOS.ZOOM_STEP;
        this.game.renderer.camera.zoomAt(delta, mx, my);
      }, { passive: false });

      // Mouse down
      canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Right click or middle click → pan
        if (e.button === 1 || e.button === 2) {
          e.preventDefault();
          this._startPan(mx, my, e.button);
          return;
        }

        // Left click: check if space held → pan, else check minimap, else normal
        if (e.button === 0) {
          if (this._spaceHeld) {
            this._startPan(mx, my, 0);
            return;
          }

          // Minimap click
          const minimapWorld = this.game.renderer.handleMinimapClick(mx, my);
          if (minimapWorld) {
            const cam = this.game.renderer.camera;
            cam.centerOn(minimapWorld.x, minimapWorld.y, canvas.width, canvas.height);
            return;
          }

          // Start potential pan (if they drag) or click
          this._panStartX = mx;
          this._panStartY = my;
          this._lastPanX = mx;
          this._lastPanY = my;
          this._panButton = 0;
          this._touchMoved = false;
        }
      });

      // Mouse move
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (this._isPanning) {
          const dx = mx - this._lastPanX;
          const dy = my - this._lastPanY;
          this.game.renderer.camera.pan(dx, dy);
          this._lastPanX = mx;
          this._lastPanY = my;
          return;
        }

        // Check if left button held & moved enough to start panning
        if (this._panButton === 0 && (e.buttons & 1)) {
          const dist = Math.hypot(mx - this._panStartX, my - this._panStartY);
          if (dist > 5) {
            this._isPanning = true;
            this._touchMoved = true;
            this.game.renderer.camera._isPanning = true;
            this._lastPanX = mx;
            this._lastPanY = my;
            canvas.style.cursor = 'grabbing';
            return;
          }
        }

        // Hover
        this._updateHover(mx, my);
      });

      // Mouse up
      canvas.addEventListener('mouseup', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (this._isPanning) {
          this._endPan(mx, my);
          return;
        }

        if (e.button === 0 && !this._touchMoved) {
          this._handleClick(mx, my);
        }

        this._panButton = -1;
        canvas.style.cursor = 'pointer';
      });

      // Context menu (prevent right-click menu on canvas)
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      // Mouse leave
      canvas.addEventListener('mouseleave', () => {
        if (this._isPanning) {
          this._isPanning = false;
          this.game.renderer.camera._isPanning = false;
        }
        this.game.renderer.hoverHex = null;
        canvas.style.cursor = 'default';
      });

      // ---- Touch Events ----
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        this._touches = Array.from(e.touches).map(t => ({
          id: t.identifier,
          x: t.clientX - rect.left,
          y: t.clientY - rect.top
        }));

        if (this._touches.length === 1) {
          this._touchMoved = false;
          this._panStartX = this._touches[0].x;
          this._panStartY = this._touches[0].y;
          this._lastPanX = this._touches[0].x;
          this._lastPanY = this._touches[0].y;
          // Start long press timer
          this._longPressTimer = setTimeout(() => {
            if (!this._touchMoved) {
              this._handleLongPress(this._touches[0].x, this._touches[0].y);
            }
          }, 500);
        } else if (this._touches.length === 2) {
          clearTimeout(this._longPressTimer);
          this._pinchStartDist = this._getTouchDist(this._touches[0], this._touches[1]);
          this._pinchStartZoom = this.game.renderer.camera._targetZoom;
          this._isPanning = false;
        }
      }, { passive: false });

      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const newTouches = Array.from(e.touches).map(t => ({
          id: t.identifier,
          x: t.clientX - rect.left,
          y: t.clientY - rect.top
        }));

        if (newTouches.length === 1) {
          const dx = newTouches[0].x - this._lastPanX;
          const dy = newTouches[0].y - this._lastPanY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            this._touchMoved = true;
            clearTimeout(this._longPressTimer);
            this.game.renderer.camera.pan(dx, dy);
            this.game.renderer.camera._isPanning = true;
          }
          this._lastPanX = newTouches[0].x;
          this._lastPanY = newTouches[0].y;
        } else if (newTouches.length === 2) {
          this._touchMoved = true;
          clearTimeout(this._longPressTimer);
          const dist = this._getTouchDist(newTouches[0], newTouches[1]);
          const ratio = dist / this._pinchStartDist;
          const newZoom = this._pinchStartZoom * ratio;
          const cx = (newTouches[0].x + newTouches[1].x) / 2;
          const cy = (newTouches[0].y + newTouches[1].y) / 2;
          this.game.renderer.camera.setZoom(newZoom, cx, cy);
        }

        this._touches = newTouches;
      }, { passive: false });

      canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        clearTimeout(this._longPressTimer);
        const cam = this.game.renderer.camera;

        if (this._touches.length === 1 && e.touches.length === 0) {
          // End single finger
          if (this._touchMoved) {
            // Apply inertia
            const dx = this._touches[0].x - this._panStartX;
            const dy = this._touches[0].y - this._panStartY;
            cam.applyInertia(dx * 0.05, dy * 0.05);
          } else {
            // Tap = click
            this._handleClick(this._touches[0].x, this._touches[0].y);
          }
          cam._isPanning = false;
        }

        this._touches = Array.from(e.touches).map(t => {
          const rect = canvas.getBoundingClientRect();
          return { id: t.identifier, x: t.clientX - rect.left, y: t.clientY - rect.top };
        });
        this._isPanning = false;
      }, { passive: false });
    }

    _getTouchDist(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    _startPan(x, y, button) {
      this._isPanning = true;
      this._panButton = button;
      this._lastPanX = x;
      this._lastPanY = y;
      this.game.renderer.camera._isPanning = true;
      this.game.canvas.style.cursor = 'grabbing';
    }

    _endPan(mx, my) {
      const dx = mx - this._lastPanX;
      const dy = my - this._lastPanY;
      this.game.renderer.camera.applyInertia(dx * 0.5, dy * 0.5);
      this._isPanning = false;
      this._panButton = -1;
      this.game.renderer.camera._isPanning = false;
      this.game.canvas.style.cursor = 'pointer';
    }

    _updateHover(mx, my) {
      const hex = this.game.renderer.pixelToHex(mx, my);
      if (CHRONOS.Hex.isValid(hex.q, hex.r)) {
        this.game.renderer.hoverHex = { q: hex.q, r: hex.r };
        this.game.canvas.style.cursor = 'pointer';
      } else {
        this.game.renderer.hoverHex = null;
        this.game.canvas.style.cursor = 'default';
      }
    }

    _handleClick(mx, my) {
      const g = this.game;
      if (g.turnManager.phase !== 'waiting') return;

      const hex = g.renderer.pixelToHex(mx, my);
      if (!CHRONOS.Hex.isValid(hex.q, hex.r)) return;

      const district = g.map.get(hex.q, hex.r);
      if (!district || !district.isVisible) {
        CHRONOS.Audio.click();
        return;
      }

      // Double click detection
      const now = Date.now();
      if (this._lastClickHex && this._lastClickHex.q === hex.q && this._lastClickHex.r === hex.r &&
          now - this._lastClickTime < 400) {
        // Double click → center and zoom
        const center = g.renderer.getHexCenter(hex.q, hex.r);
        g.renderer.camera.centerOn(center.x, center.y, g.canvas.width, g.canvas.height, 1.5);
        this._lastClickTime = 0;
        return;
      }
      this._lastClickTime = now;
      this._lastClickHex = { q: hex.q, r: hex.r };

      // Movement target
      if (g.movementRange && g.selectedHex) {
        const isValidTarget = g.movementRange.some(h => h.q === hex.q && h.r === hex.r);
        if (isValidTarget) {
          const result = g.unitManager.moveUnits(
            g.selectedHex.q, g.selectedHex.r,
            hex.q, hex.r,
            g.playerFaction, g.map, g.renderer, g.resources, g.tech
          );
          if (result.ok) {
            if (result.combat) {
              CHRONOS.Audio.combat();
              if (result.won) CHRONOS.Audio.conquest();
              g.turnManager.addLog(`⚔️ ${result.msg}`, hex.q, hex.r);
            } else {
              CHRONOS.Audio.select();
              g.turnManager.addLog(`🚶 Unidades movidas a (${hex.q},${hex.r})`, hex.q, hex.r);
            }
            g.map.updateVisibility(g.playerFaction, g.tech);
          } else {
            this._showToast(result.msg);
          }
          g.selectedHex = null;
          g.movementRange = null;
          this.update();
          return;
        }
      }

      // Select hex
      g.selectedHex = { q: hex.q, r: hex.r };
      CHRONOS.Audio.select();

      if (district.faction === g.playerFaction && district.units.some(u => u.faction === g.playerFaction && !u.hasMoved)) {
        g.movementRange = g.unitManager.getMovementRange(hex.q, hex.r, g.playerFaction, g.map, g.tech);
      } else {
        g.movementRange = null;
      }

      this.showDistrictPanel(district);
    }

    _handleLongPress(mx, my) {
      // Long press on mobile = show detailed district info
      const hex = this.game.renderer.pixelToHex(mx, my);
      if (!CHRONOS.Hex.isValid(hex.q, hex.r)) return;
      const district = this.game.map.get(hex.q, hex.r);
      if (district && district.isVisible) {
        this.game.selectedHex = { q: hex.q, r: hex.r };
        this.showDistrictPanel(district);
      }
    }

    // ================================================================
    // Keyboard shortcuts
    // ================================================================
    _bindKeyboard() {
      document.addEventListener('keydown', (e) => {
        const g = this.game;
        if (!g.playerFaction) return;

        // ESC → close tech panel or show pause menu
        if (e.key === 'Escape') {
          if (!this.els.techPanel.classList.contains('hidden')) {
            this.els.techPanel.classList.add('hidden');
          } else if (!this.els.modal.classList.contains('hidden')) {
            // Modal open — don't interfere
          } else {
            this._togglePauseMenu();
          }
          return;
        }

        // Space → hold for pan
        if (e.code === 'Space') {
          e.preventDefault();
          this._spaceHeld = true;
        }

        // Home or H → center on capital
        if (e.key === 'Home' || e.key === 'h' || e.key === 'H') {
          this._centerOnCapital();
        }

        // + / - zoom
        if (e.key === '+' || e.key === '=') {
          const cam = g.renderer.camera;
          cam.zoomAt(CHRONOS.ZOOM_STEP, g.canvas.width / 2, g.canvas.height / 2);
        }
        if (e.key === '-' || e.key === '_') {
          const cam = g.renderer.camera;
          cam.zoomAt(-CHRONOS.ZOOM_STEP, g.canvas.width / 2, g.canvas.height / 2);
        }
      });

      document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
          this._spaceHeld = false;
        }
      });
    }

    _centerOnCapital() {
      const g = this.game;
      if (!g.playerFaction) return;
      const districts = g.map.getFactionsDistricts(g.playerFaction);
      if (districts.length === 0) return;
      // Capital = first start position
      const starts = C.FACTIONS[g.playerFaction].startPositions;
      const capital = starts ? g.map.get(starts[0][0], starts[0][1]) : districts[0];
      if (capital) {
        const center = g.renderer.getHexCenter(capital.q, capital.r);
        g.renderer.camera.centerOn(center.x, center.y, g.canvas.width, g.canvas.height, 1.0);
      }
    }

    _viewAll() {
      const g = this.game;
      const cam = g.renderer.camera;
      cam.centerOn(
        g.renderer._mapW / 2,
        g.renderer._mapH / 2,
        g.canvas.width, g.canvas.height,
        CHRONOS.MIN_ZOOM
      );
    }

    // ================================================================
    // Pause Menu
    // ================================================================
    _togglePauseMenu() {
      if (this.els.pauseMenu) {
        this.els.pauseMenu.remove();
        this.els.pauseMenu = null;
        return;
      }
      const g = this.game;
      const div = document.createElement('div');
      div.id = 'pause-menu';
      div.innerHTML = `
        <div class="pause-overlay"></div>
        <div class="pause-box">
          <div class="pause-title">⚙️ MENÚ</div>
          <button class="btn-modal pause-btn" data-action="resume">▶ Continuar</button>
          <button class="btn-modal pause-btn" data-action="save">💾 Guardar</button>
          <button class="btn-modal pause-btn" data-action="load">📂 Cargar</button>
          <button class="btn-modal pause-btn" data-action="new">🔄 Nueva Partida</button>
          <button class="btn-modal pause-btn" data-action="exit">🚪 Salir al Menú</button>
        </div>
      `;
      document.body.appendChild(div);
      this.els.pauseMenu = div;

      div.querySelectorAll('.pause-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          div.remove();
          this.els.pauseMenu = null;
          if (action === 'save') {
            if (CHRONOS.Save.save(g)) this._showToast('💾 Partida guardada');
            else this._showToast('❌ Error al guardar');
          } else if (action === 'load') {
            const data = CHRONOS.Save.load();
            if (data) { g.loadSave(data); this._showToast('📂 Partida cargada'); }
            else this._showToast('❌ No hay partida guardada');
          } else if (action === 'new' || action === 'exit') {
            CHRONOS.Audio.stopAmbient();
            this.showFactionSelect();
          }
        });
      });

      div.querySelector('.pause-overlay').addEventListener('click', () => {
        div.remove();
        this.els.pauseMenu = null;
      });
    }

    // ================================================================
    // Create HUD overlay elements (zoom buttons, etc.)
    // ================================================================
    createHUDOverlays() {
      const container = this.els.canvasContainer;
      if (!container) return;

      // Zoom buttons
      const zoomDiv = document.createElement('div');
      zoomDiv.id = 'zoom-controls';
      zoomDiv.innerHTML = `
        <button class="zoom-btn" id="btn-zoom-in" title="Acercar (+)">+</button>
        <button class="zoom-btn" id="btn-zoom-out" title="Alejar (-)">−</button>
        <button class="zoom-btn zoom-btn-small" id="btn-view-all" title="Ver todo">🗺</button>
        <button class="zoom-btn zoom-btn-small" id="btn-home" title="Capital (H)">🏠</button>
      `;
      container.appendChild(zoomDiv);

      this.els.zoomIn = document.getElementById('btn-zoom-in');
      this.els.zoomOut = document.getElementById('btn-zoom-out');
      this.els.btnViewAll = document.getElementById('btn-view-all');
      this.els.btnHome = document.getElementById('btn-home');

      this.els.zoomIn.addEventListener('click', () => {
        const cam = this.game.renderer.camera;
        cam.zoomAt(CHRONOS.ZOOM_STEP, this.game.canvas.width / 2, this.game.canvas.height / 2);
      });
      this.els.zoomOut.addEventListener('click', () => {
        const cam = this.game.renderer.camera;
        cam.zoomAt(-CHRONOS.ZOOM_STEP, this.game.canvas.width / 2, this.game.canvas.height / 2);
      });
      this.els.btnViewAll.addEventListener('click', () => this._viewAll());
      this.els.btnHome.addEventListener('click', () => this._centerOnCapital());
    }

    // ================================================================
    // District Panel
    // ================================================================
    showDistrictPanel(district) {
      const g = this.game;
      const typeData = C.DISTRICT_TYPES[district.type];
      const isOwn = district.faction === g.playerFaction;

      let html = '';

      const factionName = district.faction ? (C.FACTIONS[district.faction]?.name || 'Neutral') : 'Neutral';
      const factionColor = district.faction ? (C.FACTIONS[district.faction]?.color || C.COLORS.neutral) : C.COLORS.neutral;

      html += `<div class="panel-header" style="border-left: 3px solid ${factionColor}">`;
      html += `<span class="panel-icon">${typeData?.icon || '?'}</span>`;
      html += `<div><strong>${typeData?.name || 'Desconocido'}</strong><br>`;
      html += `<span style="color:${factionColor}">${factionName}</span></div>`;
      html += `</div>`;

      html += `<div class="panel-section">`;
      html += `<div class="panel-label">Coordenadas</div><div class="panel-value">(${district.q}, ${district.r})</div>`;
      html += `<div class="panel-label">Población</div><div class="panel-value">👥 ${district.population}</div>`;
      html += `<div class="panel-label">Defensa</div><div class="panel-value">🛡️ ${district.getDefense()}</div>`;
      html += `</div>`;

      // Production
      if (district.faction) {
        const prod = district.getProduction();
        html += `<div class="panel-section"><div class="panel-subtitle">Producción</div>`;
        html += `<div class="prod-grid">`;
        if (prod.food) html += `<span>🌾${prod.food > 0 ? '+' : ''}${prod.food}</span>`;
        if (prod.materials) html += `<span>⚙️${prod.materials > 0 ? '+' : ''}${prod.materials}</span>`;
        if (prod.energy) html += `<span>⚡${prod.energy > 0 ? '+' : ''}${prod.energy}</span>`;
        if (prod.credits) html += `<span>💰${prod.credits > 0 ? '+' : ''}${prod.credits}</span>`;
        if (prod.morale) html += `<span>😊${prod.morale > 0 ? '+' : ''}${prod.morale}</span>`;
        if (prod.population) html += `<span>👥${prod.population > 0 ? '+' : ''}${prod.population}</span>`;
        html += `</div></div>`;
      }

      // Strength estimate for enemy districts
      if (district.faction && district.faction !== g.playerFaction && district.isVisible) {
        const str = district.getMilitaryStrength();
        let label;
        if (str === 0) label = '💤 Sin defensa';
        else if (str < 10) label = '🟢 Débil';
        else if (str < 25) label = '🟡 Medio';
        else if (str < 50) label = '🔴 Fuerte';
        else label = '💀 Fortaleza';
        html += `<div class="panel-section"><div class="panel-label">Fuerza estimada</div><div class="panel-value">${label}</div></div>`;
      }

      // Buildings
      if (district.buildings.length > 0) {
        html += `<div class="panel-section"><div class="panel-subtitle">Edificios</div>`;
        for (const b of district.buildings) {
          const bd = C.BUILDINGS[b.type];
          if (bd) {
            const status = b.turnsLeft > 0 ? ` (${b.turnsLeft} turnos)` : ' ✅';
            html += `<div class="building-item">${bd.icon} ${bd.name}${status}</div>`;
          }
        }
        html += `</div>`;
      }

      // Units
      if (district.units.length > 0) {
        html += `<div class="panel-section"><div class="panel-subtitle">Unidades</div>`;
        for (const u of district.units) {
          const ud = C.UNITS[u.type];
          if (ud) {
            const movedIcon = u.hasMoved ? ' 💤' : ' ✊';
            html += `<div class="unit-item">`;
            html += `${ud.icon} ${ud.name} ×${u.quantity}${u.faction === g.playerFaction ? movedIcon : ''}`;
            html += `<span class="unit-stats">⚔${ud.atk} 🛡${ud.def}</span>`;
            html += `</div>`;
          }
        }
        html += `</div>`;
      }

      // Actions for own district
      if (isOwn) {
        html += `<div class="panel-section panel-actions">`;

        if (district.canBuild()) {
          html += `<div class="panel-subtitle">Construir</div>`;
          const available = g.buildings.getAvailableBuildings(district, g.playerFaction);
          for (const b of available) {
            const canAfford = g.resources.canAfford(g.playerFaction, b.cost);
            const costStr = Object.entries(b.cost).map(([k, v]) => `${v}${this._resIcon(k)}`).join(' ');
            html += `<button class="btn-build ${canAfford ? '' : 'disabled'}" data-building="${b.id}" data-q="${district.q}" data-r="${district.r}" title="${b.desc}">`;
            html += `${b.icon} ${b.name} <span class="cost">${costStr}</span>`;
            html += `</button>`;
          }
        }

        html += `<div class="panel-subtitle" style="margin-top:8px">Reclutar</div>`;
        const units = g.unitManager.getAvailableUnits(g.playerFaction);
        for (const u of units) {
          const cost = (g.playerFaction === 'horda' && u.id === 'caminante') ? {} : u.cost;
          const canAfford = g.resources.canAfford(g.playerFaction, cost);
          const costStr = Object.keys(cost).length > 0 ?
            Object.entries(cost).map(([k, v]) => `${v}${this._resIcon(k)}`).join(' ') : 'GRATIS';
          html += `<button class="btn-recruit ${canAfford ? '' : 'disabled'}" data-unit="${u.id}" data-q="${district.q}" data-r="${district.r}" title="${u.desc}">`;
          html += `${u.icon} ${u.name} <span class="cost">${costStr}</span>`;
          html += `</button>`;
        }

        html += `</div>`;
      }

      this.els.panelContent.innerHTML = html;

      // Bind build buttons (event delegation)
      this.els.panelContent.querySelectorAll('.btn-build:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
          const bid = btn.dataset.building;
          const bq = parseInt(btn.dataset.q);
          const br = parseInt(btn.dataset.r);
          const d = g.map.get(bq, br);
          if (d) {
            const result = g.buildings.build(d, bid, g.playerFaction, g.resources);
            CHRONOS.Audio.build();
            g.renderer.addBuildAnimation(bq, br);
            this._showToast(result.msg);
            this.update();
            this.showDistrictPanel(d);
          }
        });
      });

      this.els.panelContent.querySelectorAll('.btn-recruit:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
          const uid = btn.dataset.unit;
          const uq = parseInt(btn.dataset.q);
          const ur = parseInt(btn.dataset.r);
          const d = g.map.get(uq, ur);
          if (d) {
            const result = g.unitManager.recruit(d, uid, g.playerFaction, g.resources);
            if (result.ok) CHRONOS.Audio.recruit();
            this._showToast(result.msg);
            this.update();
            this.showDistrictPanel(d);
          }
        });
      });
    }

    _resIcon(key) {
      const icons = { population: '👥', food: '🌾', materials: '⚙️', energy: '⚡', credits: '💰', morale: '😊', biomasa: '🧬', datos: '💾', neural: '🧠', influencia: '🤝' };
      return icons[key] || key;
    }

    // ================================================================
    // HUD Update
    // ================================================================
    update() {
      const g = this.game;
      const res = g.resources.get(g.playerFaction);
      if (!res) return;

      this.els.hudTurn.textContent = `TURNO ${g.turnManager.turn}`;
      const f = C.FACTIONS[g.playerFaction];
      this.els.hudFaction.textContent = `${f.emoji} ${f.name}`;
      this.els.hudFaction.style.color = f.color;

      // Update resources with trend arrows
      this._updateResValue(this.els.resPop, res.population, 'population');
      this._updateResValue(this.els.resFood, res.food, 'food');
      this._updateResValue(this.els.resMat, res.materials, 'materials');
      this._updateResValue(this.els.resEnergy, res.energy, 'energy');
      this._updateResValue(this.els.resCredits, res.credits, 'credits');
      this._updateResValue(this.els.resMorale, res.morale, 'morale');
      this.els.resSpecial.textContent = res.special;

      const spec = C.FACTIONS[g.playerFaction]?.specialResource;
      if (spec) {
        this.els.resSpecialIcon.textContent = spec.icon;
        this.els.resSpecialIcon.title = spec.name + ': ' + spec.desc;
      }

      // Morale color
      if (res.morale < C.COMBAT.MORALE_THRESHOLD_LOW) {
        this.els.resMorale.style.color = '#F85149';
      } else if (res.morale > C.COMBAT.MORALE_THRESHOLD_HIGH) {
        this.els.resMorale.style.color = '#3FB950';
      } else {
        this.els.resMorale.style.color = C.COLORS.text;
      }

      // Store for next comparison
      this._prevResources = { ...res };

      this.updateLog();
      this.els.btnEndTurn.disabled = g.turnManager.phase !== 'waiting';
    }

    _updateResValue(el, value, key) {
      let trend = '';
      if (this._prevResources) {
        const prev = this._prevResources[key];
        if (prev !== undefined) {
          if (value > prev) { trend = ' ↑'; el.style.color = '#3FB950'; }
          else if (value < prev) { trend = ' ↓'; el.style.color = '#F85149'; }
          else { el.style.color = ''; }
        }
      }
      el.textContent = value + trend;
      // Reset color after 2s
      if (trend) {
        setTimeout(() => { el.style.color = ''; el.textContent = String(value); }, 2000);
      }
    }

    updateLog() {
      const g = this.game;
      let html = '';
      const recent = g.turnManager.log.slice(-10);
      for (const entry of recent) {
        if (entry.q !== undefined && entry.r !== undefined) {
          html += `<div class="log-entry log-clickable" data-q="${entry.q}" data-r="${entry.r}">${entry.msg}</div>`;
        } else {
          html += `<div class="log-entry">${entry.msg}</div>`;
        }
      }
      this.els.logContainer.innerHTML = html;
      this.els.logContainer.scrollTop = this.els.logContainer.scrollHeight;

      // Make clickable log entries center on hex
      this.els.logContainer.querySelectorAll('.log-clickable').forEach(el => {
        el.addEventListener('click', () => {
          const lq = parseInt(el.dataset.q);
          const lr = parseInt(el.dataset.r);
          const center = g.renderer.getHexCenter(lq, lr);
          g.renderer.camera.centerOn(center.x, center.y, g.canvas.width, g.canvas.height, 1.2);
        });
      });
    }

    updateTechPanel() {
      const g = this.game;
      const techs = g.tech.getAllTechs(g.playerFaction);
      const researched = g.tech.getResearched(g.playerFaction);
      const current = g.tech.getCurrentResearch(g.playerFaction);
      const available = g.tech.getAvailableTechs(g.playerFaction);

      let html = '<div class="tech-header">🔬 Investigación</div>';

      if (current) {
        const tree = C.TECH_TREES[g.playerFaction];
        const tech = tree?.find(t => t.id === current.id);
        if (tech) {
          const pct = Math.round((1 - current.turnsLeft / current.totalTurns) * 100);
          html += `<div class="tech-current">`;
          html += `<div class="tech-name">${tech.icon} ${tech.name}</div>`;
          html += `<div class="tech-progress"><div class="tech-bar" style="width:${pct}%"></div></div>`;
          html += `<div class="tech-eta">${current.turnsLeft} turnos restantes</div>`;
          html += `</div>`;
        }
      }

      const branches = {};
      for (const t of techs) {
        if (!branches[t.branch]) branches[t.branch] = [];
        branches[t.branch].push(t);
      }

      for (const [branch, branchTechs] of Object.entries(branches)) {
        html += `<div class="tech-branch"><div class="tech-branch-name">${branch.toUpperCase()}</div>`;
        for (const t of branchTechs) {
          const isResearched = researched.includes(t.id);
          const isAvailable = available.some(a => a.id === t.id);
          const isCurrent = current && current.id === t.id;

          let cls = 'tech-item';
          if (isResearched) cls += ' researched';
          else if (isCurrent) cls += ' current';
          else if (isAvailable) cls += ' available';
          else cls += ' locked';

          html += `<div class="${cls}" data-tech="${t.id}" title="${t.effect.desc}">`;
          html += `<span class="tech-icon">${t.icon}</span> ${t.name}`;
          if (!isResearched && !isCurrent) {
            html += `<span class="tech-cost">${t.cost.energy}⚡ ${t.turns}T</span>`;
          }
          if (isResearched) html += ` ✅`;
          html += `</div>`;
        }
        html += `</div>`;
      }

      this.els.techContent.innerHTML = html;

      this.els.techContent.querySelectorAll('.tech-item.available').forEach(el => {
        el.addEventListener('click', () => {
          const techId = el.dataset.tech;
          const result = g.tech.startResearch(g.playerFaction, techId, g.resources);
          if (result.ok) {
            CHRONOS.Audio.build();
            this._showToast(result.msg);
          } else {
            this._showToast(result.msg);
          }
          this.updateTechPanel();
          this.update();
        });
      });
    }

    // ================================================================
    // Faction Selection Screen
    // ================================================================
    showFactionSelect() {
      this.els.screenFaction.classList.remove('hidden');
      this.els.screenGame.classList.add('hidden');

      let html = '<div class="faction-select-title">CHRONOS</div>';
      html += '<div class="faction-select-subtitle">La Guerra por la Memoria</div>';
      html += '<div class="faction-select-version">v2.0</div>';
      html += '<div class="faction-select-desc">Selecciona tu facción</div>';

      if (CHRONOS.Save.hasSave()) {
        const info = CHRONOS.Save.getSaveInfo();
        let infoStr = '';
        if (info) {
          const f = C.FACTIONS[info.faction];
          infoStr = ` — ${f ? f.emoji + ' ' + f.name : '?'} | Turno ${info.turn}`;
        }
        html += `<button class="btn-continue" id="btn-continue-save">📂 Continuar Partida${infoStr}</button>`;
      }

      html += '<div class="faction-grid">';
      for (const [fid, fdata] of Object.entries(C.FACTIONS)) {
        html += `<div class="faction-card" data-faction="${fid}" style="--fc: ${fdata.color}">`;
        html += `<div class="faction-emoji">${fdata.emoji}</div>`;
        html += `<div class="faction-name">${fdata.name}</div>`;
        html += `<div class="faction-leader">${fdata.leader.name}</div>`;
        html += `<div class="faction-leader-title">${fdata.leader.title}</div>`;
        html += `<div class="faction-desc">${fdata.desc}</div>`;
        html += `<div class="faction-bonus">✅ ${fdata.bonus}</div>`;
        html += `<div class="faction-weakness">⚠️ ${fdata.weakness}</div>`;
        html += `<div class="faction-special">${fdata.specialResource.icon} ${fdata.specialResource.name}</div>`;
        html += `<div class="faction-victory">🏆 ${C.VICTORY_CONDITIONS[fid].desc}</div>`;
        html += `</div>`;
      }
      html += '</div>';

      this.els.screenFaction.innerHTML = html;

      this.els.screenFaction.querySelectorAll('.faction-card').forEach(card => {
        card.addEventListener('click', () => {
          const fid = card.dataset.faction;
          CHRONOS.Audio.select();
          this.game.startNewGame(fid);
        });
      });

      const btnContinue = document.getElementById('btn-continue-save');
      if (btnContinue) {
        btnContinue.addEventListener('click', () => {
          const data = CHRONOS.Save.load();
          if (data) this.game.loadSave(data);
        });
      }
    }

    showGameScreen() {
      this.els.screenFaction.classList.add('hidden');
      this.els.screenGame.classList.remove('hidden');
    }

    // ================================================================
    // Modals
    // ================================================================
    showEvent(event) {
      return new Promise(resolve => {
        CHRONOS.Audio.event();
        this.els.modal.classList.remove('hidden');
        this.els.modalTitle.textContent = event.name;
        this.els.modalBody.innerHTML = `<p>${event.desc}</p>`;

        let effectStr = '';
        if (event.effect) {
          const parts = Object.entries(event.effect).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${this._resIcon(k)}`);
          effectStr = `<p class="event-effect">${parts.join(' ')}</p>`;
        }
        this.els.modalBody.innerHTML += effectStr;

        this.els.modalActions.innerHTML = `<button class="btn-modal" id="btn-modal-ok">Aceptar</button>`;
        document.getElementById('btn-modal-ok').addEventListener('click', () => {
          this.els.modal.classList.add('hidden');
          resolve();
        });
      });
    }

    showEventChoice(event) {
      return new Promise(resolve => {
        CHRONOS.Audio.event();
        this.els.modal.classList.remove('hidden');
        this.els.modalTitle.textContent = event.name;
        this.els.modalBody.innerHTML = `<p>${event.desc}</p>`;

        let btns = '';
        event.options.forEach((opt, i) => {
          btns += `<button class="btn-modal btn-choice" data-choice="${i}">${opt.text}</button>`;
        });
        this.els.modalActions.innerHTML = btns;

        this.els.modalActions.querySelectorAll('.btn-choice').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.choice);
            const enemies = Object.keys(C.FACTIONS).filter(f => f !== this.game.playerFaction);
            this.game.events.applyChoice(event, idx, this.game.playerFaction, this.game.resources, enemies);
            this.els.modal.classList.add('hidden');
            this.update();
            resolve();
          });
        });
      });
    }

    showNotification(msg) {
      return new Promise(resolve => {
        this._showToast(msg);
        setTimeout(resolve, 500);
      });
    }

    showGameEnd(result) {
      return new Promise(resolve => {
        this.els.modal.classList.remove('hidden');

        if (result.type === 'defeat') {
          CHRONOS.Audio.defeat();
          this.els.modalTitle.textContent = '💀 DERROTA';
          this.els.modalBody.innerHTML = `<p>Has perdido todos tus distritos. El apocalipsis ganó.</p>
            <p>"Al menos moriste un martes, como decía el libro."</p>
            <p class="event-effect">Sobreviviste ${result.turn} turnos.</p>`;
        } else {
          CHRONOS.Audio.victory();
          const winner = C.FACTIONS[result.winner];
          const isPlayer = result.winner === this.game.playerFaction;
          this.els.modalTitle.textContent = isPlayer ? '🏆 ¡VICTORIA!' : `😱 ${winner.name} ha ganado`;
          let bodyHtml = '';
          if (isPlayer) {
            bodyHtml = `<p>¡${winner.name} ha cumplido su condición de victoria!</p>`;
            bodyHtml += `<p>${C.VICTORY_CONDITIONS[result.winner].desc}</p>`;
            bodyHtml += `<p>"Y pensar que todo empezó un martes cualquiera..."</p>`;
          } else {
            bodyHtml = `<p>${winner.name} ha alcanzado la victoria antes que tú.</p>`;
            bodyHtml += `<p>"En el apocalipsis, ser segundo no es una opción."</p>`;
          }
          bodyHtml += `<p class="event-effect">Turno: ${result.turn}</p>`;
          bodyHtml += `<div class="stats-grid">`;
          for (const [fid, fdata] of Object.entries(C.FACTIONS)) {
            const count = this.game.map.countFactionDistricts(fid);
            bodyHtml += `<div style="color:${fdata.color}">${fdata.emoji} ${fdata.name}: ${count} distritos</div>`;
          }
          bodyHtml += `</div>`;
          this.els.modalBody.innerHTML = bodyHtml;
        }

        this.els.modalActions.innerHTML = `<button class="btn-modal" id="btn-new-game">🔄 Nueva Partida</button>`;
        document.getElementById('btn-new-game').addEventListener('click', () => {
          this.els.modal.classList.add('hidden');
          this.showFactionSelect();
          resolve();
        });
      });
    }

    _showToast(msg) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = msg;
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }
  }

  CHRONOS.UI = UI;
})();
