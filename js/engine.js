import { makeNoise, mulberry32 } from './noise.js';
import { PALETTES, sampleCyclic } from './palettes.js';

export const MODES = ['flow', 'curl', 'orbit', 'nebula'];
export const DEFAULTS = {
  seed: 1337, mode: 'curl', palette: 'Aurora',
  count: 3500, speed: 1.0, scale: 1.0, trail: 0.93, size: 1.2,
  glow: 0.55, symmetry: 1, mirror: false, spread: 1.0, mouse: 1.0,
};
export const RANGES = {
  count: [300, 9000, 100], speed: [0.1, 3, 0.05], scale: [0.2, 3, 0.05], trail: [0.80, 0.96, 0.005],
  size: [0.4, 4, 0.1], glow: [0.1, 1, 0.01], symmetry: [1, 12, 1], spread: [0, 3, 0.05], mouse: [0, 3, 0.05],
};
const BUCKETS = 16;
const TAU = Math.PI * 2;

export class Engine {
  constructor(canvas, bloomCanvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.bloom = bloomCanvas; this.bctx = bloomCanvas.getContext('2d');
    this.params = { ...DEFAULTS };
    this.pointer = { x: -9999, y: -9999, down: false, active: false, vx: 0, vy: 0, lastMove: 0 };
    this.paused = false; this.t = 0; this.frame = 0;
    this.audio = { level: 0, bass: 0, on: false };
    this.fps = 60; this.quality = 1;
    this.listeners = { fps: [] };
    this.colors = sampleCyclic(PALETTES[DEFAULTS.palette], BUCKETS);
    this.targetColors = this.colors.map((c) => c.slice());
    this._alloc(9000);
    this.resize();
    this.reseed(this.params.seed);
    this._loop = this._loop.bind(this);
    this._last = performance.now();
    requestAnimationFrame(this._loop);
    window.addEventListener('resize', () => this.resize());
    this._bindPointer();
  }

  // Particle budget scales with screen area so phones don't blow out
  active() {
    const area = (this.w * this.h) / 1.1e6;
    return Math.min(this.max, Math.floor(this.params.count * this.quality * Math.min(1.3, Math.max(0.3, area))));
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, ...a) { (this.listeners[ev] || []).forEach((f) => f(...a)); }

  _alloc(n) {
    this.px = new Float32Array(n); this.py = new Float32Array(n);
    this.vx = new Float32Array(n); this.vy = new Float32Array(n);
    this.life = new Float32Array(n); this.hue = new Float32Array(n);
    this.ox = new Float32Array(n); this.oy = new Float32Array(n);
    this.max = n;
  }

  reseed(seed) {
    this.params.seed = seed >>> 0;
    this.noise = makeNoise(this.params.seed);
    this.rnd = mulberry32(this.params.seed ^ 0x9e3779b9);
    this.tOff = this.rnd() * 1000;
    for (let i = 0; i < this.max; i++) this._spawn(i, true);
    this.clear();
  }

  clear() {
    const { ctx, canvas } = this;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  setParams(p, { silent } = {}) {
    const prev = this.params;
    this.params = { ...prev, ...p };
    if (p.palette && p.palette !== prev.palette) this.targetColors = sampleCyclic(PALETTES[this.params.palette] || PALETTES.Aurora, BUCKETS);
    if (p.seed !== undefined && p.seed !== prev.seed) this.reseed(p.seed);
    if (p.mode && p.mode !== prev.mode) for (let i = 0; i < this.max; i++) this._spawn(i, true);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight; this.dpr = dpr;
    this.canvas.width = Math.floor(this.w * dpr); this.canvas.height = Math.floor(this.h * dpr);
    this.canvas.style.width = this.w + 'px'; this.canvas.style.height = this.h + 'px';
    this.bw = Math.max(64, Math.floor(this.w / 5)); this.bh = Math.max(64, Math.floor(this.h / 5));
    this.bloom.width = this.bw; this.bloom.height = this.bh;
    this.bloom.style.width = this.w + 'px'; this.bloom.style.height = this.h + 'px';
    this.clear();
    for (let i = 0; i < this.max; i++) this._spawn(i, true);
  }

  _spawn(i, initial) {
    const r = this.rnd || Math.random;
    const R = initial ? Math.random : Math.random;
    const { w, h } = this;
    let x, y;
    if (this.pointer.down && !initial) {
      const a = R() * TAU, d = Math.sqrt(R()) * 90;
      x = this.pointer.x + Math.cos(a) * d; y = this.pointer.y + Math.sin(a) * d;
    } else if (this.params.mode === 'nebula') {
      const a = R() * TAU, d = Math.pow(R(), 0.6) * Math.min(w, h) * 0.5;
      x = w / 2 + Math.cos(a) * d; y = h / 2 + Math.sin(a) * d;
    } else { x = R() * w; y = R() * h; }
    this.px[i] = this.ox[i] = x; this.py[i] = this.oy[i] = y;
    this.vx[i] = 0; this.vy[i] = 0;
    this.life[i] = 120 + R() * 520;
    this.hue[i] = R();
    void r;
  }

  _bindPointer() {
    const c = this.canvas.parentElement || window;
    const set = (e) => {
      const p = this.pointer;
      const nx = e.clientX, ny = e.clientY;
      p.vx = nx - p.x; p.vy = ny - p.y; p.x = nx; p.y = ny; p.active = true; p.lastMove = performance.now();
    };
    window.addEventListener('pointermove', set, { passive: true });
    window.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.ui, .modal, .drawer, #intro, button, a, input, label, select')) return;
      set(e); this.pointer.down = true; this.burst(e.clientX, e.clientY);
    });
    window.addEventListener('pointerup', () => { this.pointer.down = false; });
    window.addEventListener('pointerleave', () => { this.pointer.active = false; });
    window.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) set(t); }, { passive: true });
    void c;
  }

  burst(x, y, strength = 1) {
    const n = this.active();
    for (let i = 0; i < n; i++) {
      const dx = this.px[i] - x, dy = this.py[i] - y, d2 = dx * dx + dy * dy;
      if (d2 < 260 * 260) {
        const d = Math.sqrt(d2) + 1, f = (1 - d / 260) * 14 * strength;
        this.vx[i] += (dx / d) * f; this.vy[i] += (dy / d) * f;
      }
    }
    this.emit('burst', x, y);
  }

  async enableAudio() {
    if (this.audio.on) { this.disableAudio(); return false; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AC = window.AudioContext || window.webkitAudioContext;
    this.actx = new AC(); const src = this.actx.createMediaStreamSource(stream);
    this.analyser = this.actx.createAnalyser(); this.analyser.fftSize = 256; this.analyser.smoothingTimeConstant = 0.8;
    src.connect(this.analyser); this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.stream = stream; this.audio.on = true; return true;
  }
  disableAudio() {
    this.stream?.getTracks().forEach((t) => t.stop()); this.actx?.close();
    this.audio = { level: 0, bass: 0, on: false };
  }

  _loop(now) {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, (now - this._last) / 1000); this._last = now;
    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;
    if (this.paused) return;
    this.step(dt);
    this.draw();
    if (++this.frame % 30 === 0) {
      // adaptive quality
      if (this.fps < 38 && this.quality > 0.35) this.quality *= 0.9;
      else if (this.fps > 56 && this.quality < 1) this.quality = Math.min(1, this.quality * 1.03);
      this.emit('fps', this.fps, this.active());
    }
  }

  step(dt) {
    const P = this.params, w = this.w, h = this.h, cx = w / 2, cy = h / 2;
    const n = this.active();
    const k = dt * 60;
    // audio
    if (this.audio.on) {
      this.analyser.getByteFrequencyData(this.freq);
      let b = 0, a = 0;
      for (let i = 0; i < 6; i++) b += this.freq[i];
      for (let i = 0; i < this.freq.length; i++) a += this.freq[i];
      this.audio.bass = b / 6 / 255; this.audio.level = a / this.freq.length / 255;
    }
    const boost = 1 + this.audio.bass * 2.2;
    this.t += dt * 0.12 * P.speed * (1 + this.audio.level * 3);
    const z = this.t + this.tOff;
    // autopilot cursor when idle
    const p = this.pointer, idle = now_() - p.lastMove > 4500 && !p.down;
    let mx = p.x, my = p.y, mActive = p.active && !idle;
    if (idle) {
      const s = now_() / 1000;
      mx = cx + Math.cos(s * 0.37) * w * 0.28 + Math.sin(s * 0.91) * w * 0.07;
      my = cy + Math.sin(s * 0.53) * h * 0.26 + Math.cos(s * 0.77) * h * 0.06;
      mActive = true;
    }
    this.cursor = { x: mx, y: my, active: mActive, idle };
    const rad = 170, rad2 = rad * rad;
    const mStr = P.mouse * (p.down ? -1.6 : 1) * (idle ? 0.6 : 1);
    const sc = 0.0028 * P.scale;
    const noise = this.noise, sp = P.speed * 0.55 * boost;
    const mode = P.mode;
    const px = this.px, py = this.py, vx = this.vx, vy = this.vy, life = this.life, ox = this.ox, oy = this.oy;
    const e = 1.2;
    for (let i = 0; i < n; i++) {
      const x = px[i], y = py[i];
      ox[i] = x; oy[i] = y;
      let ax = 0, ay = 0;
      if (mode === 'flow') {
        const a = noise(x * sc, y * sc, z) * TAU * 1.4;
        ax = Math.cos(a); ay = Math.sin(a);
      } else if (mode === 'curl') {
        const X = x * sc, Y = y * sc;
        const n1 = noise(X, Y + e * sc, z), n2 = noise(X, Y - e * sc, z);
        const n3 = noise(X + e * sc, Y, z), n4 = noise(X - e * sc, Y, z);
        ax = (n1 - n2) / (2 * e * sc) * 0.012; ay = -(n3 - n4) / (2 * e * sc) * 0.012;
        const m = Math.hypot(ax, ay) || 1; ax = ax / m * Math.min(1.4, m * 1.5); ay = ay / m * Math.min(1.4, m * 1.5);
        ax = ax * 1.0; ay = ay * 1.0;
      } else if (mode === 'orbit') {
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) + 0.001;
        const nn = noise(x * sc, y * sc, z);
        ax = (-dy / d) * 1.1 + (dx / d) * nn * 0.9; ay = (dx / d) * 1.1 + (dy / d) * nn * 0.9;
        const pull = (Math.min(w, h) * 0.34 - d) * 0.006;
        ax += (dx / d) * pull; ay += (dy / d) * pull;
      } else { // nebula
        const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) + 0.001;
        const nn = noise(x * sc * 0.9, y * sc * 0.9, z);
        const swirl = 1.6 / (1 + d * 0.004);
        ax = (dx / d) * 0.35 + (-dy / d) * swirl + Math.cos(nn * TAU) * 0.6;
        ay = (dy / d) * 0.35 + (dx / d) * swirl + Math.sin(nn * TAU) * 0.6;
      }
      vx[i] = vx[i] * 0.9 + ax * sp * 0.55;
      vy[i] = vy[i] * 0.9 + ay * sp * 0.55;
      if (mActive && mStr !== 0) {
        const dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
        if (d2 < rad2 && d2 > 1) {
          const d = Math.sqrt(d2), f = (1 - d / rad) * mStr;
          // push away + swirl
          vx[i] += (dx / d) * f * 1.1 + (-dy / d) * f * 0.9;
          vy[i] += (dy / d) * f * 1.1 + (dx / d) * f * 0.9;
        }
      }
      px[i] = x + vx[i] * k * 2.2; py[i] = y + vy[i] * k * 2.2;
      life[i] -= k;
      const xx = px[i], yy = py[i];
      if (life[i] <= 0 || xx < -20 || xx > w + 20 || yy < -20 || yy > h + 20) this._spawn(i, false);
    }
    // palette morph
    const c = this.colors, tc = this.targetColors;
    for (let i = 0; i < BUCKETS; i++) for (let j = 0; j < 3; j++) c[i][j] += (tc[i][j] - c[i][j]) * 0.06;
  }

  draw() {
    const P = this.params, ctx = this.ctx, dpr = this.dpr, w = this.w, h = this.h;
    const n = this.active();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // trail fade
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(5,6,12,${Math.max(0.04, 1 - P.trail)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineWidth = P.size * (1 + this.audio.bass * 1.5);
    const sym = P.symmetry | 0, mir = P.mirror;
    const cx = w / 2, cy = h / 2;
    const cosT = [], sinT = [];
    for (let k = 0; k < sym; k++) { cosT.push(Math.cos((k * TAU) / sym)); sinT.push(Math.sin((k * TAU) / sym)); }
    // bucket paths
    const paths = new Array(BUCKETS);
    for (let b = 0; b < BUCKETS; b++) paths[b] = new Path2D();
    const drift = this.t * 0.5 * (1 + 0), spread = P.spread;
    const px = this.px, py = this.py, ox = this.ox, oy = this.oy, vx = this.vx, vy = this.vy, hue = this.hue;
    for (let i = 0; i < n; i++) {
      const sx = vx[i], sy = vy[i];
      const ang = Math.atan2(sy, sx) / TAU;
      let t = ang * spread + hue[i] * (spread > 0 ? 0.35 : 1) + drift;
      t -= Math.floor(t);
      const path = paths[(t * BUCKETS) | 0];
      const x0 = ox[i] - cx, y0 = oy[i] - cy, x1 = px[i] - cx, y1 = py[i] - cy;
      if (sym === 1 && !mir) { path.moveTo(ox[i], oy[i]); path.lineTo(px[i], py[i]); continue; }
      for (let k = 0; k < sym; k++) {
        const c = cosT[k], s = sinT[k];
        path.moveTo(cx + x0 * c - y0 * s, cy + x0 * s + y0 * c);
        path.lineTo(cx + x1 * c - y1 * s, cy + x1 * s + y1 * c);
        if (mir) {
          path.moveTo(cx + x0 * c + y0 * s, cy + x0 * s - y0 * c);
          path.lineTo(cx + x1 * c + y1 * s, cy + x1 * s - y1 * c);
        }
      }
    }
    const alpha = P.glow * (0.7 + this.audio.level * 0.8);
    for (let b = 0; b < BUCKETS; b++) {
      const c = this.colors[b];
      ctx.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
      ctx.stroke(paths[b]);
    }
    // bloom: downscaled copy, blurred+screened by CSS
    if (this.frame % 2 === 0) { this.bctx.drawImage(this.canvas, 0, 0, this.bw, this.bh); }
  }

  // Render a composite (main + bloom) to a canvas, optionally scaled
  snapshot(maxW = 0) {
    const src = this.canvas;
    const s = maxW ? Math.min(1, maxW / src.width) : 1;
    const c = document.createElement('canvas');
    c.width = Math.round(src.width * s); c.height = Math.round(src.height * s);
    const g = c.getContext('2d');
    g.fillStyle = '#05060c'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(src, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.55; g.filter = `blur(${Math.max(4, c.width / 90)}px)`;
    g.drawImage(this.bloom, 0, 0, c.width, c.height);
    return c;
  }
}
const now_ = () => performance.now();
