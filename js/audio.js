// ============================================================================
// CHRONOS: La Guerra por la Memoria — Audio (Web Audio API)
// ============================================================================
(function () {
  let audioCtx = null;

  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  const Audio = {
    enabled: true,
    volume: 0.3,

    _play(freq, duration, type, vol) {
      if (!this.enabled) return;
      try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime((vol || this.volume) * 0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      } catch (e) { /* silent fail */ }
    },

    click() { this._play(800, 0.05, 'sine', 0.2); },

    select() {
      this._play(600, 0.08, 'sine', 0.2);
      setTimeout(() => this._play(900, 0.08, 'sine', 0.2), 50);
    },

    build() {
      this._play(200, 0.15, 'square', 0.15);
      setTimeout(() => this._play(400, 0.1, 'square', 0.15), 100);
      setTimeout(() => this._play(600, 0.15, 'square', 0.15), 200);
    },

    recruit() {
      this._play(300, 0.1, 'sawtooth', 0.1);
      setTimeout(() => this._play(500, 0.15, 'sawtooth', 0.1), 100);
    },

    combat() {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          this._play(100 + Math.random() * 200, 0.08, 'sawtooth', 0.2);
        }, i * 60);
      }
    },

    conquest() {
      this._play(400, 0.2, 'sine', 0.3);
      setTimeout(() => this._play(500, 0.2, 'sine', 0.3), 150);
      setTimeout(() => this._play(700, 0.3, 'sine', 0.3), 300);
    },

    event() {
      this._play(500, 0.15, 'triangle', 0.2);
      setTimeout(() => this._play(700, 0.15, 'triangle', 0.2), 150);
      setTimeout(() => this._play(500, 0.2, 'triangle', 0.2), 300);
    },

    endTurn() {
      this._play(300, 0.2, 'triangle', 0.15);
      setTimeout(() => this._play(450, 0.3, 'triangle', 0.15), 200);
    },

    victory() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => {
        setTimeout(() => this._play(n, 0.4, 'sine', 0.3), i * 200);
      });
    },

    defeat() {
      const notes = [400, 350, 300, 200];
      notes.forEach((n, i) => {
        setTimeout(() => this._play(n, 0.5, 'sine', 0.3), i * 300);
      });
    },

    milestone() {
      // Arpeggio celebratorio para hitos de turno
      const notes = [523, 659, 784, 659, 1047];
      notes.forEach((n, i) => {
        setTimeout(() => this._play(n, 0.25, 'sine', 0.22), i * 120);
      });
    },

    research() {
      // Sonido electrónico para investigación completada
      this._play(880, 0.1, 'square', 0.12);
      setTimeout(() => this._play(1109, 0.1, 'square', 0.12), 100);
      setTimeout(() => this._play(1320, 0.2, 'sine', 0.18), 200);
    },

    alert() {
      // Pulso de advertencia (moral baja, hambre)
      this._play(330, 0.15, 'triangle', 0.2);
      setTimeout(() => this._play(330, 0.12, 'triangle', 0.2), 320);
    },

    // Ambient drone
    _droneOsc: null,
    _droneGain: null,
    startAmbient() {
      if (!this.enabled) return;
      try {
        const ctx = getCtx();
        this._droneOsc = ctx.createOscillator();
        this._droneGain = ctx.createGain();
        this._droneOsc.type = 'sine';
        this._droneOsc.frequency.value = 55;
        this._droneGain.gain.value = 0.04;
        // Add modulation
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.1;
        lfoGain.gain.value = 10;
        lfo.connect(lfoGain);
        lfoGain.connect(this._droneOsc.frequency);
        lfo.start();
        this._droneOsc.connect(this._droneGain);
        this._droneGain.connect(ctx.destination);
        this._droneOsc.start();
      } catch (e) { /* silent fail */ }
    },

    stopAmbient() {
      try {
        if (this._droneOsc) { this._droneOsc.stop(); this._droneOsc = null; }
      } catch (e) { /* silent fail */ }
    },

    toggle() {
      this.enabled = !this.enabled;
      if (!this.enabled) this.stopAmbient();
      else this.startAmbient();
      return this.enabled;
    }
  };

  CHRONOS.Audio = Audio;
})();
