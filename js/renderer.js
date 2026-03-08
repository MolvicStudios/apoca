// ============================================================================
// CHRONOS v2.0: La Guerra por la Memoria — Renderer (Canvas + Camera)
// ============================================================================
(function () {
  const C = CHRONOS.Config;
  const H = CHRONOS.Hex;

  // ---- Camera Constants ----
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2.5;
  const DEFAULT_ZOOM = 1.0;
  const ZOOM_STEP = 0.15;
  const ZOOM_LERP_SPEED = 0.15;
  const PAN_INERTIA_FRICTION = 0.92;
  const PAN_INERTIA_MIN = 0.5;

  class Camera {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.zoom = DEFAULT_ZOOM;
      this._targetZoom = DEFAULT_ZOOM;
      this._targetX = 0;
      this._targetY = 0;
      this._animating = false;
      this._velX = 0;
      this._velY = 0;
      this._isPanning = false;
      this._pinchStartDist = 0;
      this._pinchStartZoom = 1;
    }

    zoomAt(delta, screenX, screenY) {
      const worldX = (screenX - this.x) / this.zoom;
      const worldY = (screenY - this.y) / this.zoom;
      this._targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this._targetZoom + delta));
      this._targetX = screenX - worldX * this._targetZoom;
      this._targetY = screenY - worldY * this._targetZoom;
      this._animating = true;
    }

    setZoom(newZoom, centerX, centerY) {
      const worldX = (centerX - this.x) / this.zoom;
      const worldY = (centerY - this.y) / this.zoom;
      this._targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      this._targetX = centerX - worldX * this._targetZoom;
      this._targetY = centerY - worldY * this._targetZoom;
      this._animating = true;
    }

    pan(dx, dy) {
      this._targetX += dx;
      this._targetY += dy;
      this.x += dx;
      this.y += dy;
    }

    applyInertia(dx, dy) {
      this._velX = dx;
      this._velY = dy;
    }

    centerOn(worldX, worldY, canvasW, canvasH, newZoom) {
      if (newZoom !== undefined) {
        this._targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      }
      this._targetX = canvasW / 2 - worldX * this._targetZoom;
      this._targetY = canvasH / 2 - worldY * this._targetZoom;
      this._animating = true;
    }

    clampToBounds(mapPixelW, mapPixelH, canvasW, canvasH) {
      const margin = C.HEX_SIZE * this.zoom * 2;
      const scaledW = mapPixelW * this.zoom;
      const scaledH = mapPixelH * this.zoom;

      if (scaledW + margin * 2 < canvasW) {
        const cx = (canvasW - scaledW) / 2;
        this.x = cx;
        this._targetX = cx;
      } else {
        const minX = canvasW - scaledW - margin;
        const maxX = margin;
        this.x = Math.max(minX, Math.min(maxX, this.x));
        this._targetX = Math.max(minX, Math.min(maxX, this._targetX));
      }
      if (scaledH + margin * 2 < canvasH) {
        const cy = (canvasH - scaledH) / 2;
        this.y = cy;
        this._targetY = cy;
      } else {
        const minY = canvasH - scaledH - margin;
        const maxY = margin;
        this.y = Math.max(minY, Math.min(maxY, this.y));
        this._targetY = Math.max(minY, Math.min(maxY, this._targetY));
      }
    }

    update(mapPixelW, mapPixelH, canvasW, canvasH) {
      if (Math.abs(this.zoom - this._targetZoom) > 0.001) {
        this.zoom += (this._targetZoom - this.zoom) * ZOOM_LERP_SPEED;
        this._animating = true;
      } else {
        this.zoom = this._targetZoom;
      }

      const dx = this._targetX - this.x;
      const dy = this._targetY - this.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        this.x += dx * ZOOM_LERP_SPEED;
        this.y += dy * ZOOM_LERP_SPEED;
        this._animating = true;
      } else {
        this.x = this._targetX;
        this.y = this._targetY;
        this._animating = false;
      }

      if (!this._isPanning && (Math.abs(this._velX) > PAN_INERTIA_MIN || Math.abs(this._velY) > PAN_INERTIA_MIN)) {
        this.pan(this._velX, this._velY);
        this._velX *= PAN_INERTIA_FRICTION;
        this._velY *= PAN_INERTIA_FRICTION;
        this._animating = true;
      } else if (!this._isPanning) {
        this._velX = 0;
        this._velY = 0;
      }

      this.clampToBounds(mapPixelW, mapPixelH, canvasW, canvasH);
    }

    screenToWorld(sx, sy) {
      return { x: (sx - this.x) / this.zoom, y: (sy - this.y) / this.zoom };
    }

    worldToScreen(wx, wy) {
      return { x: wx * this.zoom + this.x, y: wy * this.zoom + this.y };
    }

    getZoomPercent() {
      return Math.round(this.zoom * 100);
    }
  }

  // ---- Particle System ----
  class ParticlePool {
    constructor(maxSize) {
      this.pool = [];
      this.maxSize = maxSize || 200;
    }

    emit(x, y, count, color, speed, life, gravity) {
      for (let i = 0; i < count; i++) {
        if (this.pool.length >= this.maxSize) break;
        const angle = Math.random() * Math.PI * 2;
        const spd = (speed || 2) * (0.5 + Math.random());
        this.pool.push({
          x, y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: (life || 1) * (0.7 + Math.random() * 0.6),
          maxLife: (life || 1) * 1.3,
          color, size: 2 + Math.random() * 3,
          gravity: gravity || 0
        });
      }
    }

    emitSpiral(x, y, count, color, life) {
      for (let i = 0; i < count; i++) {
        if (this.pool.length >= this.maxSize) break;
        const angle = (i / count) * Math.PI * 2;
        const spd = 1.5 + Math.random();
        this.pool.push({
          x, y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: (life || 1.2) * (0.8 + Math.random() * 0.4),
          maxLife: (life || 1.2) * 1.2,
          color, size: 2 + Math.random() * 2,
          gravity: -0.3
        });
      }
    }

    update(dt) {
      for (let i = this.pool.length - 1; i >= 0; i--) {
        const p = this.pool[i];
        p.life -= dt;
        if (p.life <= 0) { this.pool.splice(i, 1); continue; }
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.vy += p.gravity * dt * 60;
      }
    }

    draw(ctx, camera) {
      for (const p of this.pool) {
        const alpha = Math.max(0, p.life / p.maxLife);
        const screen = camera.worldToScreen(p.x, p.y);
        const size = p.size * camera.zoom;
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---- Screen Shake ----
  class ScreenShake {
    constructor() {
      this.intensity = 0;
      this.duration = 0;
      this.elapsed = 0;
      this.offsetX = 0;
      this.offsetY = 0;
    }

    trigger(intensity, duration) {
      this.intensity = Math.max(this.intensity, intensity);
      this.duration = Math.max(this.duration - this.elapsed, duration);
      this.elapsed = 0;
    }

    update(dt) {
      if (this.elapsed >= this.duration) {
        this.offsetX = 0;
        this.offsetY = 0;
        this.intensity = 0;
        return;
      }
      this.elapsed += dt * 1000;
      const decay = 1 - this.elapsed / this.duration;
      const mag = this.intensity * decay * decay;
      this.offsetX = (Math.random() * 2 - 1) * mag;
      this.offsetY = (Math.random() * 2 - 1) * mag;
    }

    isActive() { return this.elapsed < this.duration; }
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.size = C.HEX_SIZE;
      this.camera = new Camera();
      this.particles = new ParticlePool(300);
      this.shake = new ScreenShake();
      this.animations = [];
      this.floatingTexts = [];
      this._mapW = 0;
      this._mapH = 0;
      this._mapOffX = 0;
      this._mapOffY = 0;
      this._ambientTimer = 0;
      this._lodSimple = 0.8;
      this._lodDetailed = 1.5;
      this._minimapW = 150;
      this._minimapH = 100;
      this._minimapMargin = 10;
      this._minimapBounds = null;
      this._phaseBanner = null;
      this._phaseBannerTimer = 0;
      this._lastTime = 0;
      this._initialized = false;
      this.hoverHex = null;
      this._calcMapDimensions();
    }

    _calcMapDimensions() {
      const s = this.size;
      const SQRT3 = Math.sqrt(3);
      this._mapW = s * 3 / 2 * (C.GRID_COLS - 1) + s * 2;
      this._mapH = SQRT3 * s * C.GRID_ROWS + SQRT3 * s * 0.5;
      this._mapOffX = s;
      this._mapOffY = SQRT3 * s / 2;
    }

    resize(w, h) {
      this.canvas.width = w;
      this.canvas.height = h;
      if (!this._initialized) {
        this._initialized = true;
        this.camera.centerOn(this._mapW / 2, this._mapH / 2, w, h, DEFAULT_ZOOM);
        this.camera.x = this.camera._targetX;
        this.camera.y = this.camera._targetY;
        this.camera.zoom = this.camera._targetZoom;
      }
    }

    getHexCenter(q, r) {
      return H.hexToPixel(q, r, this.size, this._mapOffX, this._mapOffY);
    }

    pixelToHex(screenX, screenY) {
      const world = this.camera.screenToWorld(screenX, screenY);
      return H.pixelToHex(world.x, world.y, this.size, this._mapOffX, this._mapOffY);
    }

    render(game) {
      const now = performance.now();
      const dt = Math.min((now - (this._lastTime || now)) / 1000, 0.05);
      this._lastTime = now;
      const ctx = this.ctx;
      const cam = this.camera;
      const w = this.canvas.width;
      const h = this.canvas.height;

      cam.update(this._mapW, this._mapH, w, h);
      this.particles.update(dt);
      this.shake.update(dt);
      this._updateAmbientParticles(dt);
      this._updateFloatingTexts(dt);

      ctx.save();
      if (this.shake.isActive()) {
        ctx.translate(this.shake.offsetX, this.shake.offsetY);
      }

      ctx.fillStyle = C.COLORS.bg;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.zoom, cam.zoom);

      const lod = cam.zoom < this._lodSimple ? 'simple' :
                  cam.zoom > this._lodDetailed ? 'detailed' : 'normal';

      if (game && game.map) this._drawMap(ctx, game, lod);
      if (game && game.selectedHex) this._drawSelection(ctx, game.selectedHex.q, game.selectedHex.r);
      if (game && game.movementRange) {
        for (const mh of game.movementRange) this._drawMovementHighlight(ctx, mh.q, mh.r, game);
      }
      if (this.hoverHex && game && game.map) {
        const hd = game.map.get(this.hoverHex.q, this.hoverHex.r);
        if (hd && hd.isVisible) this._drawHoverHighlight(ctx, this.hoverHex.q, this.hoverHex.r);
      }
      this._processAnimations(ctx, dt);
      ctx.restore();

      this.particles.draw(ctx, cam);
      this._drawFloatingTexts(ctx, cam);
      ctx.restore();

      this._drawMinimap(ctx, game);
      this._drawZoomIndicator(ctx);
      this._drawPhaseBanner(ctx, dt);
    }

    _drawMap(ctx, game, lod) {
      const map = game.map;
      const cam = this.camera;
      const s = this.size;
      const world0 = cam.screenToWorld(0, 0);
      const world1 = cam.screenToWorld(this.canvas.width, this.canvas.height);
      const margin = s * 2;

      for (let q = 0; q < C.GRID_COLS; q++) {
        for (let r = 0; r < C.GRID_ROWS; r++) {
          const { x, y } = this.getHexCenter(q, r);
          if (x < world0.x - margin || x > world1.x + margin ||
              y < world0.y - margin || y > world1.y + margin) continue;
          this._drawHex(ctx, map.get(q, r), game, lod);
        }
      }
    }

    _drawHex(ctx, district, game, lod) {
      const { q, r } = district;
      const { x, y } = this.getHexCenter(q, r);
      const s = this.size;

      if (!district.isVisible) {
        H.drawHexPath(ctx, x, y, s);
        ctx.fillStyle = '#080C12';
        ctx.fill();
        H.drawHexPath(ctx, x, y, s);
        ctx.strokeStyle = '#1A1F28';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (lod !== 'simple') {
          ctx.fillStyle = '#0D1117';
          ctx.font = `${s * 0.6}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', x, y);
        }
        return;
      }

      // Hex fill
      H.drawHexPath(ctx, x, y, s);
      const factionId = district.faction;
      let fillColor;
      if (factionId) {
        const fc = C.FACTIONS[factionId];
        fillColor = fc ? fc.colorDark : C.COLORS.neutral;
      } else {
        fillColor = '#1A1F28';
      }
      ctx.fillStyle = fillColor;
      ctx.fill();

      const typeData = C.DISTRICT_TYPES[district.type];
      if (typeData && lod !== 'simple') {
        H.drawHexPath(ctx, x, y, s * 0.85);
        ctx.fillStyle = typeData.color + '18';
        ctx.fill();
      }

      // Border
      H.drawHexPath(ctx, x, y, s);
      if (factionId && C.FACTIONS[factionId]) {
        ctx.strokeStyle = C.FACTIONS[factionId].color + 'AA';
        ctx.lineWidth = 2;
        if (lod === 'detailed') {
          ctx.shadowColor = C.FACTIONS[factionId].color;
          ctx.shadowBlur = 4;
        }
      } else if (district.type === 'sigma7') {
        ctx.strokeStyle = C.COLORS.sigma7 + 'CC';
        ctx.lineWidth = 2.5;
        if (lod === 'detailed') {
          ctx.shadowColor = C.COLORS.sigma7;
          ctx.shadowBlur = 6;
        }
      } else {
        ctx.strokeStyle = C.COLORS.border;
        ctx.lineWidth = 1;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // LOD: Simple
      if (lod === 'simple') {
        if (factionId && C.FACTIONS[factionId]) {
          ctx.beginPath();
          ctx.arc(x, y, s * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = C.FACTIONS[factionId].color;
          ctx.fill();
        } else if (typeData) {
          ctx.font = `${s * 0.5}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(typeData.icon, x, y);
        }
        return;
      }

      // LOD: Normal + Detailed
      ctx.font = `${s * 0.45}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(typeData ? typeData.icon : '?', x, y - s * 0.15);

      if (district.population > 0 || district.units.length > 0) {
        ctx.font = `bold ${s * 0.25}px monospace`;
        ctx.fillStyle = C.COLORS.text;
        ctx.fillText(`👥${district.population}`, x, y + s * 0.3);
      }

      if (district.units.length > 0) {
        const totalUnits = district.getTotalUnits();
        // Verificar si todas las unidades de la facción ya se movieron
        const allMoved = district.units.length > 0 &&
          district.units.every(u => u.hasMoved);
        ctx.font = `bold ${s * 0.22}px monospace`;
        ctx.fillStyle = allMoved ? '#888844' : '#FFD700';
        ctx.globalAlpha = allMoved ? 0.6 : 1.0;
        ctx.fillText(`⚔${totalUnits}`, x, y + s * 0.55);
        ctx.globalAlpha = 1.0;
      }

      if (district.buildings.length > 0) {
        const builtCount = district.buildings.filter(b => b.turnsLeft <= 0).length;
        if (builtCount > 0) {
          if (lod === 'detailed') {
            const built = district.buildings.filter(b => b.turnsLeft <= 0);
            let bx = x - (built.length - 1) * s * 0.15;
            for (const b of built) {
              const bd = C.BUILDINGS[b.type];
              if (bd) {
                ctx.font = `${s * 0.2}px serif`;
                ctx.fillStyle = '#A371F7';
                ctx.fillText(bd.icon, bx, y + s * 0.75);
                bx += s * 0.3;
              }
            }
          } else {
            ctx.font = `${s * 0.2}px monospace`;
            ctx.fillStyle = '#A371F7';
            ctx.fillText('🔨'.repeat(Math.min(builtCount, 3)), x, y + s * 0.75);
          }
        }
      }

      // LOD: Detailed extras
      if (lod === 'detailed') {
        if (typeData) {
          ctx.font = `bold ${s * 0.18}px sans-serif`;
          ctx.fillStyle = C.COLORS.textDim;
          ctx.fillText(typeData.name, x, y - s * 0.6);
        }
        if (district.faction) {
          const prod = district.getProduction();
          const total = Object.values(prod).reduce((a, b) => a + Math.max(0, b), 0);
          const barW = s * 1.2;
          const barH = 3;
          const barX = x - barW / 2;
          const barY = y + s * 0.92;
          ctx.fillStyle = '#1A1F28';
          ctx.fillRect(barX, barY, barW, barH);
          const fillW = Math.min(1, total / 15) * barW;
          ctx.fillStyle = C.FACTIONS[district.faction] ? C.FACTIONS[district.faction].color + '88' : '#FFD70088';
          ctx.fillRect(barX, barY, fillW, barH);
        }
      }
    }

    _drawSelection(ctx, q, r) {
      const { x, y } = this.getHexCenter(q, r);
      const s = this.size + 2;
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
      H.drawHexPath(ctx, x, y, s);
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 + pulse * 0.4})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 8 + pulse * 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    _drawHoverHighlight(ctx, q, r) {
      const { x, y } = this.getHexCenter(q, r);
      const s = this.size;
      H.drawHexPath(ctx, x, y, s);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    _drawMovementHighlight(ctx, q, r, game) {
      const { x, y } = this.getHexCenter(q, r);
      const s = this.size - 2;
      const d = game.map.get(q, r);
      H.drawHexPath(ctx, x, y, s);
      if (d && d.faction && d.faction !== game.playerFaction) {
        ctx.fillStyle = 'rgba(248, 81, 73, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#F85149AA';
        ctx.font = `${s * 0.4}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(248, 81, 73, 0.7)';
        ctx.fillText('⚔', x, y);
      } else {
        ctx.fillStyle = 'rgba(255, 235, 59, 0.15)';
        ctx.fill();
        ctx.strokeStyle = '#FFEB3BAA';
      }
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ---- Animations ----
    addCombatAnimation(q, r, damage, isDefender) {
      const { x, y } = this.getHexCenter(q, r);
      this.animations.push({
        type: 'combat', x, y, q, r, damage,
        color: isDefender ? '#F85149' : '#FFD700',
        start: Date.now(), duration: 1200
      });
      this.shake.trigger(isDefender ? 2 : 1, 200);
      if (damage > 0) {
        this.addFloatingText(x, y, isDefender ? `-${damage} 🗡️` : `-${damage}`, isDefender ? '#F85149' : '#FFD700');
      }
    }

    addConquestAnimation(q, r, factionColor) {
      const { x, y } = this.getHexCenter(q, r);
      this.animations.push({
        type: 'conquest', x, y, color: factionColor,
        start: Date.now(), duration: 800
      });
      this.particles.emit(x, y, 20, factionColor, 3, 1, 0.5);
      this.shake.trigger(4, 300);
    }

    addBuildAnimation(q, r) {
      const { x, y } = this.getHexCenter(q, r);
      this.particles.emit(x, y - this.size * 0.3, 10, '#FFD700', 1.5, 0.8, -1);
    }

    addResearchAnimation(q, r) {
      const { x, y } = this.getHexCenter(q, r);
      this.particles.emitSpiral(x, y, 15, '#A371F7', 1.2);
    }

    addFloatingText(worldX, worldY, text, color) {
      this.floatingTexts.push({
        x: worldX, y: worldY, text, color: color || '#FFFFFF',
        life: 1.5, maxLife: 1.5, vy: -1.5
      });
    }

    _updateFloatingTexts(dt) {
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.life -= dt;
        ft.y += ft.vy * dt * 30;
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
      }
    }

    _drawFloatingTexts(ctx, cam) {
      for (const ft of this.floatingTexts) {
        const alpha = Math.max(0, ft.life / ft.maxLife);
        const screen = cam.worldToScreen(ft.x, ft.y);
        const fontSize = Math.round(16 * cam.zoom);
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';
        ctx.fillText(ft.text, screen.x + 1, screen.y + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, screen.x, screen.y);
      }
      ctx.globalAlpha = 1;
    }

    _processAnimations(ctx, dt) {
      const now = Date.now();
      this.animations = this.animations.filter(a => {
        const elapsed = now - a.start;
        if (elapsed > a.duration) return false;
        const t = elapsed / a.duration;
        if (a.type === 'combat') {
          if (t < 0.3) {
            const alpha = 1 - t / 0.3;
            H.drawHexPath(ctx, a.x, a.y, this.size);
            ctx.fillStyle = `rgba(248, 81, 73, ${alpha * 0.5})`;
            ctx.fill();
          }
        }
        if (a.type === 'conquest') {
          const alpha = (1 - t) * 0.6;
          const scale = 1 + t * 0.5;
          H.drawHexPath(ctx, a.x, a.y, this.size * scale);
          ctx.strokeStyle = a.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        return true;
      });
    }

    _updateAmbientParticles(dt) {
      this._ambientTimer += dt;
      if (this._ambientTimer > 2 && this.particles.pool.length < 15) {
        this._ambientTimer = 0;
        const wx = Math.random() * this._mapW;
        const wy = Math.random() * this._mapH;
        this.particles.emit(wx, wy, 1, 'rgba(88,166,255,0.3)', 0.3, 4, -0.1);
      }
    }

    // ---- Minimap ----
    _drawMinimap(ctx, game) {
      if (!game || !game.map) return;
      const mw = this._minimapW;
      const mh = this._minimapH;
      const mx = this.canvas.width - mw - this._minimapMargin;
      const my = this.canvas.height - mh - this._minimapMargin;

      ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
      ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
      ctx.strokeStyle = C.COLORS.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(mx - 2, my - 2, mw + 4, mh + 4);

      const scaleX = mw / this._mapW;
      const scaleY = mh / this._mapH;
      const scale = Math.min(scaleX, scaleY);
      const offX = mx + (mw - this._mapW * scale) / 2;
      const offY = my + (mh - this._mapH * scale) / 2;

      for (let q = 0; q < C.GRID_COLS; q++) {
        for (let r = 0; r < C.GRID_ROWS; r++) {
          const d = game.map.get(q, r);
          const center = this.getHexCenter(q, r);
          const px = offX + center.x * scale;
          const py = offY + center.y * scale;
          let color;
          if (d.faction && C.FACTIONS[d.faction]) color = C.FACTIONS[d.faction].color;
          else if (d.type === 'sigma7') color = C.COLORS.sigma7;
          else color = C.COLORS.neutral;
          ctx.fillStyle = d.isVisible ? color : (color + '40');
          ctx.beginPath();
          ctx.arc(px, py, Math.max(2, 4 * scale), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Viewport rectangle
      const cam = this.camera;
      const vx1 = offX + (-cam.x / cam.zoom) * scale;
      const vy1 = offY + (-cam.y / cam.zoom) * scale;
      const vw = (this.canvas.width / cam.zoom) * scale;
      const vh = (this.canvas.height / cam.zoom) * scale;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        Math.max(mx, vx1), Math.max(my, vy1),
        Math.min(mw, vw), Math.min(mh, vh)
      );

      this._minimapBounds = { x: mx - 2, y: my - 2, w: mw + 4, h: mh + 4, scale, offX, offY };
    }

    handleMinimapClick(screenX, screenY) {
      const b = this._minimapBounds;
      if (!b) return null;
      if (screenX >= b.x && screenX <= b.x + b.w &&
          screenY >= b.y && screenY <= b.y + b.h) {
        return { x: (screenX - b.offX) / b.scale, y: (screenY - b.offY) / b.scale };
      }
      return null;
    }

    _drawZoomIndicator(ctx) {
      const pct = this.camera.getZoomPercent();
      const x = this.canvas.width - this._minimapW - this._minimapMargin;
      const y = this.canvas.height - this._minimapH - this._minimapMargin - 24;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = C.COLORS.textDim;
      ctx.fillText(`🔍 ${pct}%`, x + this._minimapW, y);
    }

    showPhaseBanner(text, color) {
      this._phaseBanner = { text, color: color || C.COLORS.gold };
      this._phaseBannerTimer = 1.5;
    }

    _drawPhaseBanner(ctx, dt) {
      if (!this._phaseBanner || this._phaseBannerTimer <= 0) {
        this._phaseBanner = null;
        return;
      }
      this._phaseBannerTimer -= dt;
      const alpha = Math.min(1, this._phaseBannerTimer / 0.3);
      const slideIn = Math.min(1, (1.5 - this._phaseBannerTimer) / 0.2);
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height * 0.3;
      const bannerW = 300;
      const bannerH = 50;
      ctx.globalAlpha = alpha * 0.9;
      const sc = 0.8 + slideIn * 0.2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
      ctx.fillRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH);
      ctx.strokeStyle = this._phaseBanner.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH);
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this._phaseBanner.color;
      ctx.fillText(this._phaseBanner.text, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    hasAnimations() {
      return this.animations.length > 0 || this.particles.pool.length > 0 ||
             this.floatingTexts.length > 0 || this.shake.isActive() || this.camera._animating;
    }
  }

  CHRONOS.Renderer = Renderer;
  CHRONOS.Camera = Camera;
  CHRONOS.MIN_ZOOM = MIN_ZOOM;
  CHRONOS.MAX_ZOOM = MAX_ZOOM;
  CHRONOS.DEFAULT_ZOOM = DEFAULT_ZOOM;
  CHRONOS.ZOOM_STEP = ZOOM_STEP;
})();
