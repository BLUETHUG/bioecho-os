// ============================================================
//  BioEcho — Living Engine
//  Shared world state · Continuous physics · Organic motion
//  Master pulse · Environmental drift · Cursor memory
// ============================================================

// ---------- NOISE ----------
const _grad = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];
const _p = new Uint8Array(512);
const perm = new Uint8Array(512);
(function initPerm() {
  for (let i = 0; i < 256; i++) _p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [_p[i], _p[j]] = [_p[j], _p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = _p[i & 255];
})();
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
function dot3(g, x, y, z) { return g[0] * x + g[1] * y + g[2] * z; }
function noise3D(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
  const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
  return lerp(
    lerp(lerp(dot3(_grad[perm[AA] % 12], x, y, z), dot3(_grad[perm[BA] % 12], x - 1, y, z), u),
         lerp(dot3(_grad[perm[AB] % 12], x, y - 1, z), dot3(_grad[perm[BB] % 12], x - 1, y - 1, z), u), v),
    lerp(lerp(dot3(_grad[perm[AA + 1] % 12], x, y, z - 1), dot3(_grad[perm[BA + 1] % 12], x - 1, y, z - 1), u),
         lerp(dot3(_grad[perm[AB + 1] % 12], x, y - 1, z - 1), dot3(_grad[perm[BB + 1] % 12], x - 1, y - 1, z - 1), u), v), w);
}
function n(x, y) { return noise3D(x, y, 0); }

// ---------- CANVAS ----------
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
let W, H;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

// roundRect polyfill for older browsers
if (!ctx.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
  };
}

// ============================================================
//  WORLD
// ============================================================
const WORLD = {
  energy: 0.5,
  pulse: 0,
  entropy: 0.3,
  growth: 0.4,
  noise: 0,
  breathing: 0,
  windX: 0, windY: 0,
  time: 0,

  temp: 0.6,
  humidity: 0.4,
  light: 0.7,
  magnetic: 0.5,

  mood: 'calm',
  moodTimer: 0,

  cursor: { x: -999, y: -999, active: 0, influence: 0 },
  cursorTrail: [],
  cursorMemory: 0,

  scene: 0,
  sceneTarget: 0,
  sceneTransition: 1,

  palette: { bg: 160, text: 26, accent: 45 },
  accentPulse: 0,
};

const MOODS = ['calm','alert','learning','exploring','sleeping','synchronizing'];

// ============================================================
//  PHYSICS PRIMITIVES
// ============================================================
class Spring {
  constructor(value = 0, stiffness = 0.08, damping = 0.85) {
    this.target = value;
    this.value = value;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
  }
  update() {
    const force = (this.target - this.value) * this.stiffness;
    this.velocity += force;
    this.velocity *= this.damping;
    this.value += this.velocity;
    return this.value;
  }
  snap(v) { this.value = this.target = v; this.velocity = 0; }
}

class Particle {
  constructor(x, y) {
    this.x = this.px = x;
    this.y = this.py = y;
    this.vx = 0; this.vy = 0;
    this.age = 0; this.life = 1;
    this.size = 1.5;
    this.disturbed = 0;
  }
  verlet(dt) {
    const dx = this.x - this.px, dy = this.y - this.py;
    this.px = this.x; this.py = this.y;
    this.x += dx + this.vx * dt;
    this.y += dy + this.vy * dt;
    this.vx *= 0.98; this.vy *= 0.98;
    this.age += dt;
    if (this.disturbed > 0) this.disturbed -= dt * 0.5;
  }
  attract(tx, ty, strength) {
    this.vx += (tx - this.x) * strength;
    this.vy += (ty - this.y) * strength;
  }
  repel(tx, ty, strength) {
    const dx = this.x - tx, dy = this.y - ty;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    this.vx += (dx / d) * strength / d;
    this.vy += (dy / d) * strength / d;
  }
  constrain() {
    if (this.x < -50) this.x = W + 50;
    if (this.x > W + 50) this.x = -50;
    if (this.y < -50) this.y = H + 50;
    if (this.y > H + 50) this.y = -50;
  }
}

class Oscillator {
  constructor(freq = 0.5, phase = 0) {
    this.freq = freq;
    this.phase = phase;
    this.value = 0;
  }
  tick(dt, t) {
    this.phase += this.freq * dt * Math.PI * 2;
    this.value = Math.sin(this.phase);
    this.value += n(this.phase * 0.1, t * 0.05) * 0.15;
    return this.value;
  }
  get norm() { return this.value * 0.5 + 0.5; }
}

// ============================================================
//  CONTINUOUS SYSTEMS
// ============================================================
const SYSTEMS = {
  particles: [],
  wavePhase: new Oscillator(0.3, 0),
  pulseOsc: new Oscillator(0.4, 0),
  breathOsc: new Oscillator(0.08, 0),
  orbitAngle: 0,
  bars: Array.from({ length: 6 }, (_, i) => ({
    value: new Spring(0.5 + Math.random() * 0.3, 0.04, 0.9),
    width: 0, x: 0, y: 0, h: 0
  })),
  gridCells: Array.from({ length: 6 }, (_, i) => ({
    pulse: new Spring(0, 0.06, 0.85),
    phase: i * 1.7
  })),
  cards: Array.from({ length: 4 }, (_, i) => ({
    opacity: new Spring(0, 0.05, 0.88),
    phase: i * 1.5
  })),
  rings: Array.from({ length: 8 }, (_, i) => ({
    phase: i * 0.5,
    radius: new Spring(30 + i * 18, 0.03, 0.9)
  })),
  timeline: Array.from({ length: 7 }, (_, i) => ({
    pulse: new Spring(0, 0.07, 0.82),
    phase: i * 0.9
  })),
  envNoise: Array.from({ length: 20 }, () => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - 0.5) * 0.001,
    vy: (Math.random() - 0.5) * 0.001
  })),
};

// Init particles
for (let i = 0; i < 80; i++) {
  SYSTEMS.particles.push(new Particle(Math.random() * W, Math.random() * H));
}

// ============================================================
//  CURSOR
// ============================================================
document.addEventListener('mousemove', (e) => {
  WORLD.cursor.x = e.clientX;
  WORLD.cursor.y = e.clientY;
  WORLD.cursor.active = 1;
  WORLD.cursor.influence = Math.min(1, WORLD.cursor.influence + 0.05);
  WORLD.cursorMemory = 1;
  WORLD.cursorTrail.push({ x: e.clientX, y: e.clientY, t: WORLD.time });
  if (WORLD.cursorTrail.length > 60) WORLD.cursorTrail.shift();
});
document.addEventListener('mouseleave', () => { WORLD.cursor.active = 0; });
canvas.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  WORLD.cursor.x = t.clientX;
  WORLD.cursor.y = t.clientY;
  WORLD.cursor.active = 1;
  WORLD.cursor.influence = Math.min(1, WORLD.cursor.influence + 0.05);
  WORLD.cursorMemory = 1;
}, { passive: true });
document.addEventListener('touchend', () => { WORLD.cursor.active = 0; });

// ============================================================
//  UPDATE
// ============================================================
function updateWorld(dt) {
  WORLD.time += dt;

  // Master pulse (heartbeat)
  WORLD.pulse = SYSTEMS.pulseOsc.tick(dt, WORLD.time);
  WORLD.breathing = SYSTEMS.breathOsc.tick(dt, WORLD.time);

  // Wave phase (continuous)
  SYSTEMS.wavePhase.tick(dt, WORLD.time);

  // Orbit (continuous)
  SYSTEMS.orbitAngle += dt * 0.3;

  // Environmental drift
  WORLD.temp += (n(WORLD.time * 0.01, 0) * 0.5) * dt * 0.02;
  WORLD.temp = Math.max(0.2, Math.min(0.9, WORLD.temp));
  WORLD.humidity += (n(WORLD.time * 0.008, 10) * 0.5) * dt * 0.015;
  WORLD.humidity = Math.max(0.1, Math.min(0.9, WORLD.humidity));
  WORLD.light += (n(WORLD.time * 0.005, 20) * 0.5) * dt * 0.01;
  WORLD.light = Math.max(0.3, Math.min(0.95, WORLD.light));
  WORLD.magnetic += (n(WORLD.time * 0.003, 30) * 0.5) * dt * 0.008;
  WORLD.magnetic = Math.max(0.2, Math.min(0.8, WORLD.magnetic));

  // Wind from noise
  WORLD.windX = n(WORLD.time * 0.04, 5) * 0.5;
  WORLD.windY = n(WORLD.time * 0.04 + 50, 5) * 0.3;

  // Energy (drifts with temp * light)
  WORLD.energy = 0.3 + (WORLD.temp * WORLD.light) * 0.5 +
    Math.sin(WORLD.time * 0.1) * 0.05;
  WORLD.entropy = 0.2 + (1 - WORLD.humidity) * 0.3 +
    Math.abs(n(WORLD.time * 0.02, 0)) * 0.2;
  WORLD.growth = WORLD.energy * (1 - WORLD.entropy * 0.3);

  // Accent pulse — only during significant moments
  WORLD.accentPulse = Math.max(0, Math.sin(WORLD.pulse * Math.PI) *
    (0.05 + WORLD.energy * 0.1));

  // Palette dynamics (±3% luminance drift)
  const bgShift = n(WORLD.time * 0.02, 100) * 3;
  WORLD.palette.bg = 160 + bgShift;

  // Mood system — changes every 45-90 seconds
  WORLD.moodTimer -= dt;
  if (WORLD.moodTimer <= 0) {
    WORLD.mood = MOODS[Math.floor(Math.random() * MOODS.length)];
    WORLD.moodTimer = 45 + Math.random() * 45;
  }

  // Cursor memory decay
  if (WORLD.cursor.active < 0.5) {
    WORLD.cursor.influence *= 0.995;
    WORLD.cursorMemory *= 0.998;
  }

  // Scene transition
  if (WORLD.scene !== WORLD.sceneTarget) {
    WORLD.sceneTransition -= dt * 0.4;
    if (WORLD.sceneTransition <= 0) {
      WORLD.scene = WORLD.sceneTarget;
      WORLD.sceneTransition = 1;
    }
  }
}

function updateParticles(dt) {
  const pSys = SYSTEMS.particles;
  const moodSpeed = { calm: 0.3, alert: 1.2, learning: 0.7, exploring: 0.9, sleeping: 0.15, synchronizing: 0.6 }[WORLD.mood] || 0.5;
  const cursor = WORLD.cursor;

  // Remove dead particles, add new ones
  while (pSys.length < 80) {
    pSys.push(new Particle(Math.random() * W, Math.random() * H));
  }
  if (pSys.length > 120) pSys.shift();

  for (const p of pSys) {
    // Noise-based drift
    const nx = n(p.x * 0.003 + WORLD.time * 0.05, p.y * 0.003) * 0.5;
    const ny = n(p.x * 0.003 + WORLD.time * 0.05 + 100, p.y * 0.003) * 0.5;
    p.vx += nx * 0.15 * moodSpeed + WORLD.windX * 0.02;
    p.vy += ny * 0.15 * moodSpeed + WORLD.windY * 0.02;

    // Cursor attraction
    if (cursor.active > 0.5) {
      const dx = cursor.x - p.x, dy = cursor.y - p.y;
      const d = dx * dx + dy * dy;
      if (d < 40000) {
        const force = (1 - d / 40000) * 0.04 * cursor.influence;
        p.vx += dx * force;
        p.vy += dy * force;
        p.disturbed = 1;
      }
    }

    // Particle-to-particle (simple cohesion)
    for (let j = 0; j < 2; j++) {
      const q = pSys[(Math.floor(Math.random() * pSys.length))];
      if (q === p) continue;
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = dx * dx + dy * dy;
      if (d < 1000 && d > 0) {
        p.vx += dx * 0.0003;
        p.vy += dy * 0.0003;
      }
    }

    p.verlet(dt);
    p.constrain();

    // Lifespan / respawn
    p.age += dt;
    if (p.age > 60 + Math.random() * 60) {
      p.x = Math.random() * W;
      p.y = Math.random() * H;
      p.px = p.x; p.py = p.y;
      p.vx = 0; p.vy = 0;
      p.age = 0;
    }
  }
}

function updateBars(dt) {
  const bars = SYSTEMS.bars;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const target = 0.2 + n(WORLD.time * 0.05 + i * 10, i) * 0.3 +
      WORLD.energy * 0.2 + WORLD.pulse * 0.05;
    b.value.target = Math.max(0.05, Math.min(0.95, target));
    b.value.update();
  }
}

function updateGrid(dt) {
  for (const c of SYSTEMS.gridCells) {
    const target = 0.2 + n(WORLD.time * 0.03 + c.phase, c.phase + 5) * 0.3 +
      Math.sin(WORLD.pulse * Math.PI + c.phase) * 0.1;
    c.pulse.target = Math.max(0, Math.min(1, target));
    c.pulse.update();
  }
}

function updateCards(dt) {
  const scene = WORLD.scene;
  for (const c of SYSTEMS.cards) {
    const target = scene === 4 ? 0.6 + n(WORLD.time * 0.02 + c.phase, c.phase) * 0.2 : 0.05;
    c.opacity.target = target;
    c.opacity.update();
  }
}

function updateRings(dt) {
  const scene = WORLD.scene;
  for (const r of SYSTEMS.rings) {
    const target = scene === 5 ? 30 + r.phase * 18 + WORLD.energy * 10 : 20 + r.phase * 10;
    r.radius.target = target;
    r.radius.update();
  }
}

function updateTimeline(dt) {
  for (const t of SYSTEMS.timeline) {
    const target = 0.2 + n(WORLD.time * 0.04 + t.phase, t.phase + 10) * 0.3 +
      Math.sin(WORLD.time * 0.15 + t.phase) * 0.15 + WORLD.pulse * 0.1;
    t.pulse.target = Math.max(0, Math.min(1, target));
    t.pulse.update();
  }
}

// ============================================================
//  RENDER
// ============================================================
function render() {
  ctx.clearRect(0, 0, W, H);

  // Background
  const bgVal = WORLD.palette.bg;
  ctx.fillStyle = `rgb(${bgVal},${bgVal + 3},${bgVal + 7})`;
  ctx.fillRect(0, 0, W, H);

  // Ambient gradient
  const grad = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, Math.max(W, H) * 0.7);
  grad.addColorStop(0, `rgba(255,255,255,${WORLD.light * 0.08})`);
  grad.addColorStop(1, `rgba(0,0,0,${(1 - WORLD.light) * 0.04})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const s = WORLD.scene;
  const t = WORLD.sceneTransition;
  const nextS = WORLD.sceneTarget;
  const inTrans = s !== nextS;
  const transAlpha = inTrans ? 1 - t : 1;

  // -- RENDER LAYERS (each reads from shared WORLD state) --

  // Layer 0: Rings (scene 5 primary, others subtle)
  renderRings(ctx, transAlpha * (s === 5 ? 1 : 0.15));

  // Layer 1: Pulse / central shape (scene 0 primary)
  renderPulseShape(ctx, transAlpha * (s === 0 ? 1 : 0.1 + WORLD.energy * 0.1));

  // Layer 2: Waves (scene 1 primary)
  renderWaves(ctx, transAlpha * (s === 1 ? 1 : 0.05 + WORLD.accentPulse * 0.3));

  // Layer 3: Bars (scene 2 primary)
  renderBars(ctx, transAlpha * (s === 2 ? 1 : 0.08));

  // Layer 4: Grid (scene 3 primary)
  renderGrid(ctx, transAlpha * (s === 3 ? 1 : 0.06));

  // Layer 5: Cards (scene 4 primary)
  renderCards(ctx, transAlpha);

  // Layer 6: Timeline (scene 7 primary)
  renderTimeline(ctx, transAlpha * (s === 7 ? 1 : 0.05 + WORLD.growth * 0.05));

  // Layer 7: Particles (always visible)
  renderParticles(ctx, 0.3 + WORLD.energy * 0.3 + WORLD.accentPulse * 0.2);

  // Cursor trail
  renderCursorTrail(ctx);

  // Lighting
  applyVignette(ctx);
  applyBloom(ctx, WORLD.accentPulse * 0.3);

  // Scene transition overlay
  if (inTrans) {
    ctx.fillStyle = `rgba(160,165,177,${(1 - t) * 0.4})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------- LAYER: PULSE SHAPE ----------
function renderPulseShape(ctx, alpha) {
  if (alpha < 0.01) return;
  const cx = W / 2, cy = H / 2;
  const p = WORLD.pulse;
  const breath = WORLD.breathing;
  const energy = WORLD.energy;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);

  const baseR = 30 + energy * 20 + p * 8 + breath * 5;

  for (let ring = 0; ring < 5; ring++) {
    const r = baseR + ring * 25 + Math.sin(WORLD.time * 0.15 + ring) * 4;
    const sides = 5 + ring + Math.floor(energy * 3);
    const rot = WORLD.time * 0.05 * (ring % 2 === 0 ? 1 : -1);

    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2 + rot;
      const wobble = 1 + n(Math.cos(a) * 0.5 + ring, Math.sin(a) * 0.5 + WORLD.time * 0.05) * 0.06;
      const x = Math.cos(a) * r * wobble;
      const y = Math.sin(a) * r * wobble;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(26,26,26,${0.04 + ring * 0.025 + energy * 0.02})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Inner organic shape
  const innerR = 15 + p * 5 + breath * 3;
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI * 2 + WORLD.time * 0.04;
    const wobble = innerR + Math.sin(a * 4 + WORLD.time * 0.5) * 4 + n(Math.cos(a), Math.sin(a)) * 3;
    const x = Math.cos(a) * wobble;
    const y = Math.sin(a) * wobble;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.strokeStyle = `rgba(45,107,79,${0.2 + WORLD.accentPulse * 0.3})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// ---------- LAYER: WAVES ----------
function renderWaves(ctx, alpha) {
  if (alpha < 0.01) return;
  const mid = H / 2;
  const phase = SYSTEMS.wavePhase.phase;
  const count = 8 + Math.floor(WORLD.energy * 6);
  const humidity = WORLD.humidity;

  ctx.save();
  ctx.globalAlpha = alpha * 0.8;

  for (let l = 0; l < count; l++) {
    const amp = (15 + l * 4) * (1 - humidity * 0.3) + n(l, WORLD.time) * 5;
    const freq = 0.006 + l * 0.0015;
    const speed = 0.4 + l * 0.05;
    ctx.beginPath();
    for (let x = 0; x < W; x += 3) {
      const y = mid + Math.sin(x * freq + phase * speed + l * 0.5) * amp +
        n(x * 0.01, l * 0.5 + WORLD.time * 0.02) * 7;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(26,26,26,${0.02 + l * 0.008 + WORLD.accentPulse * 0.02})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();
}

// ---------- LAYER: BARS ----------
function renderBars(ctx, alpha) {
  if (alpha < 0.01) return;
  const cols = SYSTEMS.bars.length;
  const gap = 6;
  const totalW = W - 80;
  const barW = (totalW - gap * (cols - 1)) / cols;
  const startX = (W - totalW) / 2;
  const maxH = H * 0.45;
  const baseY = H / 2 + maxH / 2;
  const cursor = WORLD.cursor;

  ctx.save();
  ctx.globalAlpha = alpha;

  for (let i = 0; i < cols; i++) {
    const b = SYSTEMS.bars[i];
    const v = b.value.value;
    const bh = maxH * v;
    const x = startX + i * (barW + gap);
    const y = baseY - bh;

    // Cursor sway
    let sway = 0;
    if (cursor.active > 0.5) {
      const dx = cursor.x - (x + barW / 2);
      const d = Math.abs(dx);
      if (d < 300) sway = (1 - d / 300) * Math.sign(dx) * 8 * cursor.influence;
    }

    ctx.fillStyle = `rgba(26,26,26,${0.04 + v * 0.08 + WORLD.accentPulse * 0.03})`;
    ctx.beginPath();
    ctx.roundRect(x + sway, y, barW, bh, 2);
    ctx.fill();

    if (v > 0.4) {
      const accentH = bh * 0.25;
      ctx.fillStyle = `rgba(45,107,79,${0.1 + v * 0.15 + WORLD.accentPulse * 0.1})`;
      ctx.beginPath();
      ctx.roundRect(x + sway, baseY - accentH, barW, accentH, 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ---------- LAYER: GRID ----------
function renderGrid(ctx, alpha) {
  if (alpha < 0.01) return;
  const cols = 3, rows = 2;
  const gap = 10;
  const cw = 70, ch = 70;
  const totalW = cols * cw + (cols - 1) * gap;
  const totalH = rows * ch + (rows - 1) * gap;
  const startX = (W - totalW) / 2;
  const startY = (H - totalH) / 2;
  const cursor = WORLD.cursor;

  ctx.save();
  ctx.globalAlpha = alpha;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const cell = SYSTEMS.gridCells[idx];
      const pVal = cell.pulse.value;
      const x = startX + c * (cw + gap);
      const y = startY + r * (ch + gap);

      // Cursor distortion
      let distortX = 0, distortY = 0;
      if (cursor.active > 0.5) {
        const dx = cursor.x - (x + cw / 2);
        const dy = cursor.y - (y + ch / 2);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 200) {
          const f = (1 - d / 200) * cursor.influence;
          distortX = dx * f * 0.05;
          distortY = dy * f * 0.05;
        }
      }

      ctx.fillStyle = `rgba(26,26,26,${0.03 + pVal * 0.05})`;
      ctx.beginPath();
      ctx.roundRect(x + distortX, y + distortY, cw, ch, 3);
      ctx.fill();

      ctx.strokeStyle = `rgba(26,26,26,${0.04 + pVal * 0.06 + WORLD.accentPulse * 0.02})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      if (pVal > 0.4) {
        ctx.fillStyle = `rgba(45,107,79,${pVal * 0.1})`;
        ctx.beginPath();
        ctx.roundRect(x + 3 + distortX, y + 3 + distortY, cw - 6, ch - 6, 2);
        ctx.fill();
      }


    }
  }

  ctx.restore();
}

// ---------- LAYER: CARDS ----------
function renderCards(ctx, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const cols = 2;
  const gap = 10;
  const cardW = 180, cardH = 120;
  const totalW = cols * cardW + (cols - 1) * gap;
  const startX = (W - totalW) / 2;
  const startY = (H - cardH) / 2;

  for (let i = 0; i < 4; i++) {
    const c = SYSTEMS.cards[i];
    const op = c.opacity.value;
    if (op < 0.01) continue;

    const x = startX + (i % cols) * (cardW + gap);
    const y = startY + Math.floor(i / cols) * (cardH + gap);
    const pulse = Math.sin(WORLD.pulse * Math.PI + c.phase) * 0.5 + 0.5;

    ctx.fillStyle = `rgba(255,255,255,${op * 0.08})`;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 5);
    ctx.fill();

    ctx.strokeStyle = `rgba(26,26,26,${op * 0.05 + pulse * 0.03})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Circle
    const cx = x + cardW / 2, cy = y + 35;
    const cr = 10 + pulse * 3 + WORLD.accentPulse * 4;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(45,107,79,${op * (0.06 + pulse * 0.08)})`;
    ctx.fill();
  }

  ctx.restore();
}

// ---------- LAYER: RINGS ----------
function renderRings(ctx, alpha) {
  if (alpha < 0.01) return;
  const cx = W / 2, cy = H / 2;
  const cursor = WORLD.cursor;

  ctx.save();
  ctx.globalAlpha = alpha * 0.7;

  for (let i = 0; i < SYSTEMS.rings.length; i++) {
    const r = SYSTEMS.rings[i];
    const radius = r.radius.value;
    const wobble = n(i, WORLD.time * 0.04) * 3 + Math.sin(r.phase + WORLD.time * 0.1) * 2;

    // Cursor distortion
    let distort = 0;
    if (cursor.active > 0.5) {
      const dx = cursor.x - cx, dy = cursor.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < radius + 50) {
        distort = (1 - Math.abs(radius - d) / 50) * cursor.influence * 3 *
          Math.sin(Math.atan2(dy, dx) * 2 + r.phase);
      }
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius + wobble + distort, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(26,26,26,${0.02 + i * 0.012 + WORLD.accentPulse * 0.02})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    if (i % 2 === 0) {
      const startA = WORLD.time * 0.12 + r.phase;
      const endA = startA + Math.PI * (0.8 + WORLD.energy * 0.3);
      ctx.beginPath();
      ctx.arc(cx, cy, radius + wobble + distort, startA, endA);
      ctx.strokeStyle = `rgba(45,107,79,${0.04 + i * 0.01 + WORLD.accentPulse * 0.04})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Orbiting dot
  const orbR = 80 + WORLD.energy * 30 + Math.sin(WORLD.time * 0.2) * 8;
  const ox = cx + Math.cos(SYSTEMS.orbitAngle) * orbR;
  const oy = cy + Math.sin(SYSTEMS.orbitAngle) * orbR;
  ctx.beginPath();
  ctx.arc(ox, oy, 2.5 + WORLD.accentPulse * 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(45,107,79,${0.2 + WORLD.accentPulse * 0.2})`;
  ctx.fill();

  ctx.restore();
}

// ---------- LAYER: TIMELINE ----------
function renderTimeline(ctx, alpha) {
  if (alpha < 0.01) return;
  const startX = 80;
  const endX = W - 80;
  const cy = H / 2;

  ctx.save();
  ctx.globalAlpha = alpha * 0.8;

  // Horizontal line
  ctx.strokeStyle = `rgba(26,26,26,${0.04})`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(startX, cy);
  ctx.lineTo(endX, cy);
  ctx.stroke();

  const count = SYSTEMS.timeline.length;

  for (let i = 0; i < count; i++) {
    const t = SYSTEMS.timeline[i];
    const pVal = t.pulse.value;
    const x = startX + (i / (count - 1)) * (endX - startX);

    // Cursor bending
    let bendY = 0;
    if (WORLD.cursor.active > 0.5) {
      const dx = WORLD.cursor.x - x;
      const d = Math.abs(dx);
      if (d < 200) bendY = (1 - d / 200) * WORLD.cursor.influence * 15 *
        Math.sin((x - startX) / (endX - startX) * Math.PI);
    }

    const r = 2 + pVal * 3 + WORLD.accentPulse * 2;
    const dotY = cy + bendY;

    // Vertical line
    const vh = 10 + pVal * 25;
    ctx.fillStyle = `rgba(26,26,26,${0.015 + pVal * 0.025})`;
    ctx.fillRect(x - 0.5, dotY - vh, 1, vh * 2);

    // Dot
    ctx.beginPath();
    ctx.arc(x, dotY, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(26,26,26,${0.03 + pVal * 0.05})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, dotY, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(45,107,79,${0.06 + pVal * 0.1 + WORLD.accentPulse * 0.06})`;
    ctx.fill();
  }

  ctx.restore();
}

// ---------- LAYER: PARTICLES ----------
function renderParticles(ctx, density) {
  ctx.save();
  const cursor = WORLD.cursor;

  for (const p of SYSTEMS.particles) {
    const dist = p.disturbed > 0.5;
    const a = 0.02 + (1 - p.age / 120) * density * (1 - WORLD.humidity * 0.3) +
      (dist ? 0.04 : 0);

    if (a < 0.01) continue;

    // Cursor glow
    let glow = 0;
    if (cursor.active > 0.5) {
      const dx = cursor.x - p.x, dy = cursor.y - p.y;
      const d = dx * dx + dy * dy;
      if (d < 10000) glow = (1 - d / 10000) * cursor.influence * 0.5;
    }

    const size = p.size + glow * 2;

    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(45,107,79,${a + glow * 0.2})`;
    ctx.fill();

    if (glow > 0.1) {
      ctx.shadowColor = 'rgba(45,107,79,0.1)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // Env noise particles (tiny, drifting)
  for (const e of SYSTEMS.envNoise) {
    const ex = e.x * W, ey = e.y * H;
    e.x += e.vx + WORLD.windX * 0.0001;
    e.y += e.vy + WORLD.windY * 0.0001;
    if (e.x < 0 || e.x > 1) e.vx *= -1;
    if (e.y < 0 || e.y > 1) e.vy *= -1;
    ctx.beginPath();
    ctx.arc(ex, ey, 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(26,26,26,${0.01})`;
    ctx.fill();
  }

  ctx.restore();
}

// ---------- CURSOR TRAIL ----------
function renderCursorTrail(ctx) {
  const trail = WORLD.cursorTrail;
  if (trail.length < 2 || WORLD.cursorMemory < 0.01) return;

  ctx.save();
  for (let i = 1; i < trail.length; i++) {
    const age = WORLD.time - trail[i].t;
    const alpha = Math.max(0, (1 - age * 0.1)) * WORLD.cursorMemory * 0.08;
    if (alpha < 0.001) continue;
    ctx.beginPath();
    ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
    ctx.lineTo(trail[i].x, trail[i].y);
    ctx.strokeStyle = `rgba(45,107,79,${alpha})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- LIGHTING ----------
function applyVignette(ctx) {
  const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.8);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${0.08 + (1 - WORLD.light) * 0.06})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function applyBloom(ctx, intensity) {
  if (intensity < 0.01) return;
  ctx.fillStyle = `rgba(45,107,79,${intensity * 0.04})`;
  ctx.fillRect(0, 0, W, H);
}

// ============================================================
//  SCENE NAVIGATION
// ============================================================
function navigateScene(idx) {
  if (idx < 0 || idx >= 8) return;
  WORLD.sceneTarget = idx;
  WORLD.sceneTransition = 0;
  document.querySelectorAll('[data-scene]').forEach(el =>
    el.classList.toggle('active', parseInt(el.dataset.scene) === idx));
}

// Build nav
(function buildNav() {
  const nav = document.getElementById('uiNav');
  for (let i = 0; i < 8; i++) {
    const a = document.createElement('a');
    a.href = '#'; a.dataset.scene = i;
    if (i === 0) a.className = 'active';
    const span = document.createElement('span');
    span.className = 'nl'; span.textContent = String(i).padStart(2, '0');
    a.appendChild(span);
    a.addEventListener('click', (e) => { e.preventDefault(); navigateScene(i); });
    nav.appendChild(a);
  }
})();

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigateScene(WORLD.sceneTarget + 1);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigateScene(WORLD.sceneTarget - 1);
});

// ============================================================
//  LOADER
// ============================================================
setTimeout(() => {
  const loader = document.getElementById('loader');
  loader.style.transition = 'opacity 0.75s cubic-bezier(0.22,1,0.36,1)';
  loader.style.opacity = '0';
  setTimeout(() => loader.style.display = 'none', 800);
}, 2200);

// ============================================================
//  MAIN LOOP
// ============================================================
let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  updateWorld(dt);
  updateParticles(dt);
  updateBars(dt);
  updateGrid(dt);
  updateCards(dt);
  updateRings(dt);
  updateTimeline(dt);

  // Micro motion global
  // (handled per-render via noise)

  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// Expose for debugging
window.WORLD = WORLD;
