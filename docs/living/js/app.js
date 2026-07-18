// ============================================================
//  BioEcho — Living Engine v2
//  Fluid flow · Particle web · Ripple propagation
//  Verlet chains · Reaction-diffusion · Recursive geometry
//  Auto-pilot · Color dynamics · Temporal memory
// ============================================================

// ---------- NOISE (simplex 3D) ----------
const _grad = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];
const _p = new Uint8Array(512);
const perm = new Uint8Array(512);
(function() {
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
         lerp(dot3(_grad[perm[AB + 1] % 12], x, y, z - 1), dot3(_grad[perm[BB + 1] % 12], x - 1, y - 1, z - 1), u), v), w);
}
function n(x, y) { return noise3D(x, y, 0); }
function fbm(x, y, octaves) {
  let v = 0, a = 1, m = 0;
  for (let i = 0; i < (octaves || 3); i++) { v += a * n(x, y); m += a; a *= 0.5; x *= 2; y *= 2; }
  return v / m;
}

// ---------- CANVAS ----------
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
let W, H;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

if (!ctx.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (r > w / 2) r = w / 2; if (r > h / 2) r = h / 2;
    this.moveTo(x + r, y); this.lineTo(x + w - r, y);
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
//  WORLD STATE
// ============================================================
const W$ = {
  energy: 0.5, pulse: 0, entropy: 0.3, growth: 0.4, noise: 0,
  breathing: 0, windX: 0, windY: 0, time: 0,
  temp: 0.6, humidity: 0.4, light: 0.7, magnetic: 0.5,
  mood: 'calm', moodTimer: 0,

  camera: { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1, vx: 0, vy: 0, vz: 0 },

  cursor: { x: -999, y: -999, active: 0, influence: 0, dt: Infinity },
  cursorTrail: [], cursorMemory: 0,
  idleTimer: 0, autoPilot: false, autoSceneTimer: 0,

  scene: 0, sceneTarget: 0, sceneTransition: 1,
  palette: { h: 44, s: 2, l: 64, bg: 160, accent: 45 },
  accentPulse: 0,
  ripples: [],
};
const MOODS = ['calm','alert','learning','exploring','sleeping','synchronizing'];

// ============================================================
//  PHYSICS
// ============================================================
class Spring {
  constructor(value = 0, stiffness = 0.08, damping = 0.85) {
    this.target = value; this.value = value; this.velocity = 0;
    this.stiffness = stiffness; this.damping = damping;
  }
  update() {
    const f = (this.target - this.value) * this.stiffness;
    this.velocity += f; this.velocity *= this.damping;
    this.value += this.velocity;
    return this.value;
  }
  snap(v) { this.value = this.target = v; this.velocity = 0; }
}

class Particle {
  constructor(x, y) {
    this.x = this.px = x; this.y = this.py = y;
    this.vx = 0; this.vy = 0;
    this.age = 0; this.size = 1.5; this.disturbed = 0;
  }
  verlet(dt) {
    const dx = this.x - this.px, dy = this.y - this.py;
    this.px = this.x; this.py = this.y;
    this.x += dx + this.vx * dt; this.y += dy + this.vy * dt;
    this.vx *= 0.97; this.vy *= 0.97;
    this.age += dt;
    if (this.disturbed > 0) this.disturbed -= dt * 0.3;
  }
  attract(tx, ty, strength) { this.vx += (tx - this.x) * strength; this.vy += (ty - this.y) * strength; }
  repel(tx, ty, strength) {
    const dx = this.x - tx, dy = this.y - ty, d = Math.sqrt(dx * dx + dy * dy) || 1;
    this.vx += (dx / d) * strength / d; this.vy += (dy / d) * strength / d;
  }
  constrain() {
    const m = 80;
    if (this.x < -m) this.x = W + m; if (this.x > W + m) this.x = -m;
    if (this.y < -m) this.y = H + m; if (this.y > H + m) this.y = -m;
  }
}

class Osc {
  constructor(freq = 0.5, phase = 0) { this.freq = freq; this.phase = phase; this.value = 0; }
  tick(dt, t) {
    this.phase += this.freq * dt * Math.PI * 2;
    this.value = Math.sin(this.phase);
    this.value += n(this.phase * 0.1, t * 0.05) * 0.15;
    return this.value;
  }
  get norm() { return this.value * 0.5 + 0.5; }
}

// ============================================================
//  SYSTEMS
// ============================================================
const SYS = {
  particles: [],
  wavePhase: new Osc(0.3, 0), pulseOsc: new Osc(0.4, 0), breathOsc: new Osc(0.08, 0),
  orbitAngle: 0,

  bars: Array.from({ length: 8 }, (_, i) => ({
    value: new Spring(0.5 + Math.random() * 0.3, 0.03, 0.88),
    vy: 0, targetY: 0, x: 0, w: 0
  })),

  // Verlet chain
  nodes: [],

  grid: Array.from({ length: 8 }, (_, i) => ({ p: new Spring(0, 0.06, 0.85), phase: i * 1.3 })),
  cards: Array.from({ length: 4 }, (_, i) => ({ op: new Spring(0, 0.05, 0.88), phase: i * 1.5 })),
  rings: Array.from({ length: 10 }, (_, i) => ({ phase: i * 0.4, r: new Spring(20 + i * 16, 0.03, 0.9) })),
  timeline: Array.from({ length: 9 }, (_, i) => ({ p: new Spring(0, 0.07, 0.82), phase: i * 0.7 })),
  envNoise: Array.from({ length: 30 }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.001, vy: (Math.random() - 0.5) * 0.001 })),

  // Reaction-diffusion
  rd: { grid: [], next: [], cols: 30, rows: 20, feed: 0.037, kill: 0.06, diffU: 0.16, diffV: 0.08 },
  flow: [],
};

// Init particles
for (let i = 0; i < 100; i++) SYS.particles.push(new Particle(Math.random() * W, Math.random() * H));

// Init verlet nodes (chain of 8)
for (let i = 0; i < 8; i++) {
  SYS.nodes.push({ x: 0, y: 0, px: 0, py: 0, pinned: i === 0 });
}

// Init reaction-diffusion
(function initRD() {
  const rd = SYS.rd;
  const N = rd.cols * rd.rows;
  for (let i = 0; i < N; i++) {
    rd.grid[i] = { u: 1, v: 0 };
    rd.next[i] = { u: 1, v: 0 };
  }
  // Seed center
  const cx = Math.floor(rd.cols / 2), cy = Math.floor(rd.rows / 2);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const idx = (cy + dy) * rd.cols + (cx + dx);
    if (idx >= 0 && idx < N) { rd.grid[idx].v = 1; rd.next[idx].v = 1; }
  }
})();

// Init flow field
for (let i = 0; i < 40; i++) SYS.flow.push({ angle: 0, mag: 0 });

// ============================================================
//  CURSOR
// ============================================================
function onPointer(x, y) {
  W$.cursor.x = x; W$.cursor.y = y;
  W$.cursor.active = 1;
  W$.cursor.influence = Math.min(1, W$.cursor.influence + 0.05);
  W$.cursorMemory = 1;
  W$.cursor.dt = 0;
  W$.idleTimer = 0;
  W$.autoPilot = false;
  W$.cursorTrail.push({ x, y, t: W$.time });
  if (W$.cursorTrail.length > 80) W$.cursorTrail.shift();
}
function emitRipple(x, y) {
  W$.ripples.push({ x, y, r: 0, maxR: Math.max(W, H) * 0.6, s: 1, age: 0, speed: 120 + Math.random() * 60 });
  if (W$.ripples.length > 10) W$.ripples.shift();
}

document.addEventListener('mousemove', (e) => onPointer(e.clientX, e.clientY));
document.addEventListener('mouseleave', () => { W$.cursor.active = 0; });
canvas.addEventListener('click', (e) => emitRipple(e.clientX, e.clientY));
canvas.addEventListener('touchmove', (e) => { const t = e.touches[0]; onPointer(t.clientX, t.clientY); }, { passive: true });
canvas.addEventListener('touchstart', (e) => { const t = e.touches[0]; emitRipple(t.clientX, t.clientY); }, { passive: true });
document.addEventListener('touchend', () => { W$.cursor.active = 0; });

// ============================================================
//  UPDATE: WORLD
// ============================================================
function updateWorld(dt) {
  W$.time += dt;

  W$.pulse = SYS.pulseOsc.tick(dt, W$.time);
  W$.breathing = SYS.breathOsc.tick(dt, W$.time);
  SYS.wavePhase.tick(dt, W$.time);
  SYS.orbitAngle += dt * 0.3;

  // Environment
  W$.temp += n(W$.time * 0.01, 0) * 0.5 * dt * 0.02;
  W$.temp = Math.max(0.2, Math.min(0.9, W$.temp));
  W$.humidity += n(W$.time * 0.008, 10) * 0.5 * dt * 0.015;
  W$.humidity = Math.max(0.1, Math.min(0.9, W$.humidity));
  W$.light += n(W$.time * 0.005, 20) * 0.5 * dt * 0.01;
  W$.light = Math.max(0.3, Math.min(0.95, W$.light));
  W$.magnetic += n(W$.time * 0.003, 30) * 0.5 * dt * 0.008;
  W$.magnetic = Math.max(0.2, Math.min(0.8, W$.magnetic));

  W$.windX = n(W$.time * 0.04, 5) * 0.5;
  W$.windY = n(W$.time * 0.04 + 50, 5) * 0.3;

  W$.energy = 0.3 + (W$.temp * W$.light) * 0.5 + Math.sin(W$.time * 0.1) * 0.05;
  W$.entropy = 0.2 + (1 - W$.humidity) * 0.3 + Math.abs(n(W$.time * 0.02, 0)) * 0.2;
  W$.growth = W$.energy * (1 - W$.entropy * 0.3);
  W$.accentPulse = Math.max(0, Math.sin(W$.pulse * Math.PI) * (0.05 + W$.energy * 0.12));

  // Color dynamics: HSL drift
  const moodH = { calm: 44, alert: 10, learning: 200, exploring: 120, sleeping: 260, synchronizing: 300 }[W$.mood] || 44;
  W$.palette.h += (moodH - W$.palette.h) * dt * 0.02;
  const bgShift = n(W$.time * 0.02, 100) * 3;
  W$.palette.bg = 160 + bgShift;
  W$.palette.l = 64 + n(W$.time * 0.015, 200) * 2 + W$.energy * 2;

  // Mood
  W$.moodTimer -= dt;
  if (W$.moodTimer <= 0) {
    W$.mood = MOODS[Math.floor(Math.random() * MOODS.length)];
    W$.moodTimer = 45 + Math.random() * 45;
  }

  // Cursor decay
  if (W$.cursor.active < 0.5) {
    W$.cursor.influence *= 0.995;
    W$.cursorMemory *= 0.998;
    W$.cursor.dt += dt;
  }

  // Auto-pilot
  W$.idleTimer += dt;
  if (W$.idleTimer > 12 && !W$.autoPilot) {
    W$.autoPilot = true;
    W$.autoSceneTimer = 0;
  }
  if (W$.autoPilot) {
    W$.autoSceneTimer += dt;
    if (W$.autoSceneTimer > 8 + n(W$.time * 0.05, 50) * 3) {
      navigateScene(Math.floor(Math.random() * 8));
      W$.autoSceneTimer = 0;
      emitRipple(Math.random() * W, Math.random() * H);
    }
    const cx = W / 2, cy = H / 2;
    const driftX = n(W$.time * 0.03, 99) * W * 0.15;
    const driftY = n(W$.time * 0.03, 199) * H * 0.1;
    const driftZ = 1 + n(W$.time * 0.02, 299) * 0.08;
    W$.camera.tx = lerp(W$.camera.tx, driftX, 0.01);
    W$.camera.ty = lerp(W$.camera.ty, driftY, 0.01);
    W$.camera.tz = lerp(W$.camera.tz, driftZ, 0.01);
  } else {
    const cx = W / 2, cy = H / 2;
    const pullX = (W$.cursor.x - cx) * 0.06;
    const pullY = (W$.cursor.y - cy) * 0.04;
    W$.camera.tx = lerp(W$.camera.tx, pullX, 0.05);
    W$.camera.ty = lerp(W$.camera.ty, pullY, 0.05);
    W$.camera.tz = lerp(W$.camera.tz, 1, 0.02);
  }
  W$.camera.vx += (W$.camera.tx - W$.camera.x) * 0.06;
  W$.camera.vy += (W$.camera.ty - W$.camera.y) * 0.06;
  W$.camera.vz += (W$.camera.tz - W$.camera.z) * 0.04;
  W$.camera.vx *= 0.85; W$.camera.vy *= 0.85; W$.camera.vz *= 0.85;
  W$.camera.x += W$.camera.vx; W$.camera.y += W$.camera.vy; W$.camera.z += W$.camera.vz;

  // Scene transition
  if (W$.scene !== W$.sceneTarget) {
    W$.sceneTransition -= dt * 0.4;
    if (W$.sceneTransition <= 0) { W$.scene = W$.sceneTarget; W$.sceneTransition = 1; }
  }

  // Ripples
  for (let i = W$.ripples.length - 1; i >= 0; i--) {
    const r = W$.ripples[i];
    r.r += r.speed * dt;
    r.age += dt;
    r.s *= Math.max(0, 1 - dt * 0.2);
    if (r.r > r.maxR || r.s < 0.02) W$.ripples.splice(i, 1);
  }
}

// ============================================================
//  UPDATE: FLUID FLOW
// ============================================================
function updateFlow(dt) {
  const t = W$.time;
  const scale = 0.004;
  const flow = SYS.flow;
  for (let i = 0; i < flow.length; i++) {
    const x = (i % 8) / 8, y = Math.floor(i / 8) / 5;
    const a = fbm(x * 3 + t * 0.1, y * 3 + t * 0.08, 2) * Math.PI + W$.windX * 2;
    flow[i] = { angle: a, mag: 0.5 + fbm(x * 2 + t * 0.05, y * 2, 1) * 0.5 };
  }
}

function getFlow(x, y) {
  const fx = (x / W) * 8, fy = (y / H) * 5;
  const ix = Math.floor(fx) % 8, iy = Math.floor(fy) % 5;
  const idx = iy * 8 + ix;
  const f = SYS.flow[idx] || { angle: 0, mag: 0.5 };
  return f;
}

// ============================================================
//  UPDATE: PARTICLES + WEB
// ============================================================
function updateParticles(dt) {
  const pSys = SYS.particles;
  const moodSpeed = { calm: 0.3, alert: 1.2, learning: 0.7, exploring: 0.9, sleeping: 0.15, synchronizing: 0.6 }[W$.mood] || 0.5;
  const cursor = W$.cursor;
  const cam = W$.camera;

  while (pSys.length < 100) pSys.push(new Particle(Math.random() * W, Math.random() * H));
  if (pSys.length > 150) pSys.shift();

  for (const p of pSys) {
    // Fluid flow
    const f = getFlow(p.x + cam.x, p.y + cam.y);
    p.vx += Math.cos(f.angle) * f.mag * 0.12 * moodSpeed;
    p.vy += Math.sin(f.angle) * f.mag * 0.12 * moodSpeed;

    // Direct noise drift
    const nx = n(p.x * 0.003 + W$.time * 0.05, p.y * 0.003) * 0.3;
    const ny = n(p.x * 0.003 + W$.time * 0.05 + 100, p.y * 0.003) * 0.3;
    p.vx += nx * 0.12 + W$.windX * 0.015;
    p.vy += ny * 0.12 + W$.windY * 0.015;

    // Ripple displacement
    for (const r of W$.ripples) {
      const dx = p.x - r.x, dy = p.y - r.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < r.r + 40 && d > r.r - 40) {
        const f2 = (1 - Math.abs(d - r.r) / 40) * r.s * 2;
        p.vx += (dx / (d || 1)) * f2;
        p.vy += (dy / (d || 1)) * f2;
      }
    }

    // Cursor
    if (cursor.active > 0.5) {
      const dx = cursor.x - p.x, dy = cursor.y - p.y, d = dx * dx + dy * dy;
      if (d < 50000) {
        const force = (1 - d / 50000) * 0.03 * cursor.influence;
        p.vx += dx * force; p.vy += dy * force;
        p.disturbed = 1;
      }
    }

    p.verlet(dt);
    p.constrain();

    if (p.age > 80 + Math.random() * 80) {
      p.x = Math.random() * W; p.y = Math.random() * H;
      p.px = p.x; p.py = p.y; p.vx = 0; p.vy = 0; p.age = 0;
    }
  }
}

// ============================================================
//  UPDATE: VERLET CHAIN (bars as connected nodes)
// ============================================================
function updateChain(dt) {
  const nodes = SYS.nodes;
  const sticky = 0.5;
  const spacing = 70;
  const cx = W / 2, cy = H / 2;
  const startX = cx - (nodes.length - 1) * spacing / 2;

  // Pin first node
  const head = nodes[0];
  const baseX = startX + W$.camera.x;
  const baseY = cy + 60 + W$.camera.y + Math.sin(W$.time * 0.2) * 10;
  head.x = head.px = baseX;
  head.y = head.py = baseY;

  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1], b = nodes[i];
    const gravity = 9.8;
    const windF = W$.windX * 4 + n(i * 2, W$.time * 0.1) * 3;
    b.vy = (b.vy || 0) + gravity * dt * 0.3 + windF * dt;
    b.vx = (b.vx || 0);

    // Verlet
    const dx = b.x - (b.px || b.x), dy = b.y - (b.py || b.y);
    b.px = b.x; b.py = b.y;
    b.x += dx + (b.vx || 0) * dt; b.y += dy + (b.vy || 0) * dt;
    b.vx *= 0.96; b.vy *= 0.96;

    // Stick constraint to previous node
    const sx = b.x - a.x, sy = b.y - a.y;
    const d = Math.sqrt(sx * sx + sy * sy);
    if (d > 0) {
      const diff = (d - spacing) / d * sticky;
      if (!a.pinned) { a.x += sx * diff * 0.5; a.y += sy * diff * 0.5; }
      b.x -= sx * diff * 0.5; b.y -= sy * diff * 0.5;
    }

    // Floor
    if (b.y > H - 40) { b.y = H - 40; b.vy *= -0.3; }
  }

  // Bar values track chain node Y position
  const bars = SYS.bars;
  for (let i = 0; i < bars.length; i++) {
    const n = nodes[i];
    const target = 1 - (n.y - cy + 60) / (H * 0.35);
    bars[i].value.target = Math.max(0.05, Math.min(0.95, target));
    bars[i].x = startX + i * spacing + W$.camera.x;
    bars[i].w = spacing - 4;
  }
}

// ============================================================
//  UPDATE: REACTION-DIFFUSION
// ============================================================
function updateRD() {
  const rd = SYS.rd;
  const { grid, next, cols, rows, feed, kill, diffU, diffV } = rd;
  const da = 1, db = 0.5;

  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const i = y * cols + x;
      const u = grid[i].u, v = grid[i].v;
      const lu = grid[(y - 1) * cols + x].u + grid[(y + 1) * cols + x].u + grid[y * cols + x - 1].u + grid[y * cols + x + 1].u;
      const lv = grid[(y - 1) * cols + x].v + grid[(y + 1) * cols + x].v + grid[y * cols + x - 1].v + grid[y * cols + x + 1].v;
      const laplacianU = lu - 4 * u;
      const laplacianV = lv - 4 * v;
      const uvv = u * v * v;
      next[i].u = u + (diffU * laplacianU - uvv + feed * (1 - u)) * 0.5;
      next[i].v = v + (diffV * laplacianV + uvv - (kill + feed) * v) * 0.5;
      next[i].u = Math.max(0, Math.min(1, next[i].u));
      next[i].v = Math.max(0, Math.min(1, next[i].v));
    }
  }

  // Swap
  for (let i = 0; i < cols * rows; i++) {
    const tmp = grid[i]; grid[i] = next[i]; next[i] = tmp;
  }

  // Perturb with cursor
  const cursor = W$.cursor;
  if (cursor.active > 0.5) {
    const cx = Math.floor((cursor.x / W) * cols);
    const cy = Math.floor((cursor.y / H) * rows);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xi = Math.min(cols - 1, Math.max(0, cx + dx));
      const yi = Math.min(rows - 1, Math.max(0, cy + dy));
      const idx = yi * cols + xi;
      grid[idx].v = Math.min(1, grid[idx].v + 0.05);
    }
  }
}

// ============================================================
//  UPDATE: DERIVED LAYERS
// ============================================================
function updateBars(dt) {
  for (const b of SYS.bars) b.value.update();
}

function updateGrid(dt) {
  for (const c of SYS.grid) {
    const t = 0.2 + n(W$.time * 0.03 + c.phase, c.phase + 5) * 0.3 +
      Math.sin(W$.pulse * Math.PI + c.phase) * 0.1;
    c.p.target = Math.max(0, Math.min(1, t));
    c.p.update();
  }
}

function updateCards(dt) {
  for (const c of SYS.cards) {
    const t = W$.scene === 4 ? 0.6 + n(W$.time * 0.02 + c.phase, c.phase) * 0.2 : 0.05;
    c.op.target = t; c.op.update();
  }
}

function updateRings(dt) {
  for (const r of SYS.rings) {
    const t = W$.scene === 5 ? 30 + r.phase * 16 + W$.energy * 10 : 20 + r.phase * 10;
    r.r.target = t; r.r.update();
  }
}

function updateTimeline(dt) {
  for (const t of SYS.timeline) {
    const v = 0.2 + n(W$.time * 0.04 + t.phase, t.phase + 10) * 0.3 +
      Math.sin(W$.time * 0.15 + t.phase) * 0.15 + W$.pulse * 0.1;
    t.p.target = Math.max(0, Math.min(1, v));
    t.p.update();
  }
}

// ============================================================
//  RENDER
// ============================================================
function render() {
  ctx.clearRect(0, 0, W, H);

  const bg = W$.palette.bg;
  ctx.fillStyle = `rgb(${bg},${bg + 3},${bg + 7})`;
  ctx.fillRect(0, 0, W, H);

  // Ambient gradient
  const g = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, Math.max(W, H) * 0.7);
  g.addColorStop(0, `rgba(255,255,255,${W$.light * 0.08})`);
  g.addColorStop(1, `rgba(0,0,0,${(1 - W$.light) * 0.04})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const s = W$.scene;
  const trans = W$.sceneTransition;
  const inTrans = s !== W$.sceneTarget;
  const ta = inTrans ? 1 - trans : 1;

  // Camera transform
  ctx.save();
  const cx = W / 2, cy = H / 2;
  ctx.translate(cx, cy);
  ctx.scale(W$.camera.z, W$.camera.z);
  ctx.translate(-cx + W$.camera.x, -cy + W$.camera.y);

  // Layers rendered in z-order
  renderRings(ctx, ta * (s === 5 ? 1 : 0.12));
  renderPulseShape(ctx, ta * (s === 0 ? 1 : 0.1 + W$.energy * 0.1));
  renderWaves(ctx, ta * (s === 1 ? 1 : 0.05 + W$.accentPulse * 0.3));
  renderBars(ctx, ta * (s === 2 ? 1 : 0.08));
  renderGrid(ctx, ta * (s === 3 ? 1 : 0.06));
  renderRD(ctx, ta * (s === 6 ? 1 : 0.03));
  renderCards(ctx, ta);
  renderTimeline(ctx, ta * (s === 7 ? 1 : 0.05 + W$.growth * 0.05));
  renderParticleWeb(ctx, ta);
  renderParticles(ctx, 0.3 + W$.energy * 0.3 + W$.accentPulse * 0.2);

  ctx.restore();

  renderCursorTrail(ctx);
  renderRipples(ctx);
  applyVignette(ctx);
  applyBloom(ctx, W$.accentPulse * 0.3);

  if (inTrans) {
    ctx.fillStyle = `rgba(160,165,177,${(1 - trans) * 0.4})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ============================================================
//  LAYER: PULSE SHAPE (recursive organic)
// ============================================================
function renderPulseShape(ctx, alpha) {
  if (alpha < 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  const cx = W / 2, cy = H / 2;
  const p = W$.pulse, breath = W$.breathing, en = W$.energy;
  const baseR = 25 + en * 25 + p * 10 + breath * 6;

  // Recursive sub-circles
  function subCircles(x, y, r, depth) {
    if (depth > 3 || r < 5) return;
    const sides = Math.max(4, 4 + depth + Math.floor(en * 3));
    const rot = W$.time * 0.04 * (depth % 2 === 0 ? 1 : -1) + depth * 0.5;

    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2 + rot;
      const wobble = 1 + n(Math.cos(a) * 0.3 + depth, Math.sin(a) * 0.3 + W$.time * 0.04) * 0.08;
      const px = x + Math.cos(a) * r * wobble;
      const py = y + Math.sin(a) * r * wobble;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = `rgba(26,26,26,${0.03 + depth * 0.02 + en * 0.02})`;
    ctx.lineWidth = 0.5 + depth * 0.2;
    ctx.stroke();

    if (depth < 3) {
      const childCount = 3 + Math.floor(n(depth, W$.time * 0.05) * 2);
      for (let i = 0; i < childCount; i++) {
        const a = (i / childCount) * Math.PI * 2 + rot + depth;
        const childR = r * (0.4 + n(depth * 2 + i, W$.time * 0.03) * 0.1);
        const cx2 = x + Math.cos(a) * r * 0.6;
        const cy2 = y + Math.sin(a) * r * 0.6;
        subCircles(cx2, cy2, childR, depth + 1);
      }
    }
  }

  subCircles(cx, cy, baseR, 0);

  // Center core
  const innerR = 12 + p * 6 + breath * 4;
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2 + W$.time * 0.03;
    const wobble = innerR + Math.sin(a * 5 + W$.time * 0.4) * 3 + n(Math.cos(a), Math.sin(a)) * 2;
    const px = cx + Math.cos(a) * wobble;
    const py = cy + Math.sin(a) * wobble;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.strokeStyle = `rgba(45,107,79,${0.15 + W$.accentPulse * 0.35})`;
  ctx.lineWidth = 1.5; ctx.stroke();

  ctx.restore();
}

// ============================================================
//  LAYER: WAVES
// ============================================================
function renderWaves(ctx, alpha) {
  if (alpha < 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;

  const mid = H / 2;
  const phase = SYS.wavePhase.phase;
  const count = 8 + Math.floor(W$.energy * 6);

  for (let l = 0; l < count; l++) {
    const amp = (14 + l * 4) * (1 - W$.humidity * 0.3) + n(l, W$.time) * 5;
    const freq = 0.006 + l * 0.0015;
    const speed = 0.4 + l * 0.05;
    ctx.beginPath();
    for (let x = 0; x < W; x += 3) {
      const y = mid + Math.sin(x * freq + phase * speed + l * 0.5) * amp +
        n(x * 0.01, l * 0.5 + W$.time * 0.02) * 7;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(26,26,26,${0.02 + l * 0.008 + W$.accentPulse * 0.02})`;
    ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
}

// ============================================================
//  LAYER: BARS (verlet chain driven)
// ============================================================
function renderBars(ctx, alpha) {
  if (alpha < 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  const bars = SYS.bars;
  const maxH = H * 0.4;
  const baseY = H / 2 + maxH / 2;

  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const v = b.value.value;
    const bh = maxH * v;
    const x = b.x;
    const y = baseY - bh;

    // Ripple sway
    let sway = 0;
    for (const r of W$.ripples) {
      const dx = r.x - (x + b.w / 2);
      const d = Math.abs(dx);
      if (d < r.r + 30 && d > Math.abs(r.r - 30)) {
        sway += (1 - Math.abs(d - r.r) / 30) * r.s * 6 * Math.sign(dx);
      }
    }
    // Cursor sway
    const cursor = W$.cursor;
    if (cursor.active > 0.5) {
      const dx = cursor.x - (x + b.w / 2);
      const d = Math.abs(dx);
      if (d < 300) sway += (1 - d / 300) * Math.sign(dx) * 8 * cursor.influence;
    }

    ctx.fillStyle = `rgba(26,26,26,${0.04 + v * 0.08 + W$.accentPulse * 0.03})`;
    ctx.beginPath();
    ctx.roundRect(x + sway, y, b.w, bh, 2);
    ctx.fill();

    if (v > 0.4) {
      ctx.fillStyle = `rgba(45,107,79,${0.1 + v * 0.15 + W$.accentPulse * 0.1})`;
      ctx.beginPath();
      ctx.roundRect(x + sway, baseY - bh * 0.25, b.w, bh * 0.25, 2);
      ctx.fill();
    }

    // Chain line between bars
    if (i < bars.length - 1) {
      const next = bars[i + 1];
      ctx.strokeStyle = `rgba(26,26,26,${0.01 + v * 0.02})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x + b.w, baseY - bh * 0.3);
      ctx.lineTo(next.x, baseY - bars[i + 1].value.value * maxH * 0.3);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ============================================================
//  LAYER: GRID
// ============================================================
function renderGrid(ctx, alpha) {
  if (alpha < 0.01) return;
  const cols = 3, rows = 2, gap = 10, cw = 70, ch = 70;
  const totalW = cols * cw + (cols - 1) * gap;
  const totalH = rows * ch + (rows - 1) * gap;
  const startX = (W - totalW) / 2, startY = (H - totalH) / 2;
  const cursor = W$.cursor;

  ctx.save();
  ctx.globalAlpha = alpha;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const cell = SYS.grid[idx];
      const pVal = cell.p.value;
      const x = startX + c * (cw + gap);
      const y = startY + r * (ch + gap);

      let distortX = 0, distortY = 0;
      // Ripple distortion
      for (const rp of W$.ripples) {
        const dx = rp.x - (x + cw / 2), dy = rp.y - (y + ch / 2);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < rp.r + 40 && d > Math.abs(rp.r - 40)) {
          const f = (1 - Math.abs(d - rp.r) / 40) * rp.s * 3;
          distortX += (dx / (d || 1)) * f;
          distortY += (dy / (d || 1)) * f;
        }
      }
      // Cursor distortion
      if (cursor.active > 0.5) {
        const dx = cursor.x - (x + cw / 2), dy = cursor.y - (y + ch / 2);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 200) { const f = (1 - d / 200) * cursor.influence; distortX += dx * f * 0.05; distortY += dy * f * 0.05; }
      }

      ctx.fillStyle = `rgba(26,26,26,${0.03 + pVal * 0.05})`;
      ctx.beginPath(); ctx.roundRect(x + distortX, y + distortY, cw, ch, 3); ctx.fill();
      ctx.strokeStyle = `rgba(26,26,26,${0.04 + pVal * 0.06 + W$.accentPulse * 0.02})`;
      ctx.lineWidth = 0.5; ctx.stroke();
      if (pVal > 0.4) {
        ctx.fillStyle = `rgba(45,107,79,${pVal * 0.1})`;
        ctx.beginPath(); ctx.roundRect(x + 3 + distortX, y + 3 + distortY, cw - 6, ch - 6, 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

// ============================================================
//  LAYER: REACTION-DIFFUSION
// ============================================================
function renderRD(ctx, alpha) {
  if (alpha < 0.01) return;
  const rd = SYS.rd;
  const cellW = W / rd.cols, cellH = H / rd.rows;

  ctx.save();
  ctx.globalAlpha = alpha * 0.6;

  for (let y = 0; y < rd.rows; y++) {
    for (let x = 0; x < rd.cols; x++) {
      const v = rd.grid[y * rd.cols + x].v;
      if (v < 0.05) continue;
      ctx.fillStyle = `rgba(45,107,79,${v * 0.25})`;
      ctx.fillRect(x * cellW, y * cellH, cellW + 1, cellH + 1);
      ctx.fillStyle = `rgba(26,26,26,${v * 0.06})`;
      ctx.fillRect(x * cellW, y * cellH, cellW + 1, cellH + 1);
    }
  }
  ctx.restore();
}

// ============================================================
//  LAYER: CARDS
// ============================================================
function renderCards(ctx, alpha) {
  ctx.save(); ctx.globalAlpha = alpha;
  const cols = 2, gap = 10, cw = 180, ch = 120;
  const startX = (W - (cols * cw + (cols - 1) * gap)) / 2;
  const startY = (H - ch) / 2;

  for (let i = 0; i < 4; i++) {
    const c = SYS.cards[i];
    const op = c.op.value;
    if (op < 0.01) continue;
    const x = startX + (i % cols) * (cw + gap);
    const y = startY + Math.floor(i / cols) * (ch + gap);
    const pulse = Math.sin(W$.pulse * Math.PI + c.phase) * 0.5 + 0.5;

    ctx.fillStyle = `rgba(255,255,255,${op * 0.08})`;
    ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 5); ctx.fill();
    ctx.strokeStyle = `rgba(26,26,26,${op * 0.05 + pulse * 0.03})`;
    ctx.lineWidth = 0.5; ctx.stroke();

    const cxc = x + cw / 2, cyc = y + 35;
    const cr = 10 + pulse * 3 + W$.accentPulse * 4;
    ctx.beginPath(); ctx.arc(cxc, cyc, cr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(45,107,79,${op * (0.06 + pulse * 0.08)})`;
    ctx.fill();
  }
  ctx.restore();
}

// ============================================================
//  LAYER: RINGS
// ============================================================
function renderRings(ctx, alpha) {
  if (alpha < 0.01) return;
  const cx = W / 2, cy = H / 2;
  const cursor = W$.cursor;

  ctx.save();
  ctx.globalAlpha = alpha * 0.7;

  for (let i = 0; i < SYS.rings.length; i++) {
    const r = SYS.rings[i];
    const radius = r.r.value;
    const wobble = n(i, W$.time * 0.04) * 3 + Math.sin(r.phase + W$.time * 0.1) * 2;

    let distort = 0;
    for (const rp of W$.ripples) {
      const dx = rp.x - cx, dy = rp.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < rp.r + radius + 30 && d > Math.abs(rp.r - radius - 30)) {
        distort += (1 - Math.abs(d - rp.r) / 30) * rp.s * 2 *
          Math.sin(Math.atan2(dy, dx) * 2 + r.phase);
      }
    }
    if (cursor.active > 0.5) {
      const dx = cursor.x - cx, dy = cursor.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < radius + 50) distort += (1 - Math.abs(radius - d) / 50) * cursor.influence * 3 *
        Math.sin(Math.atan2(dy, dx) * 2 + r.phase);
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius + wobble + distort, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(26,26,26,${0.02 + i * 0.012 + W$.accentPulse * 0.02})`;
    ctx.lineWidth = 0.5; ctx.stroke();

    if (i % 2 === 0) {
      const startA = W$.time * 0.12 + r.phase;
      const endA = startA + Math.PI * (0.8 + W$.energy * 0.3);
      ctx.beginPath();
      ctx.arc(cx, cy, radius + wobble + distort, startA, endA);
      ctx.strokeStyle = `rgba(45,107,79,${0.04 + i * 0.01 + W$.accentPulse * 0.04})`;
      ctx.lineWidth = 1; ctx.stroke();
    }
  }

  // Orbiting dot
  const orbR = 80 + W$.energy * 30 + Math.sin(W$.time * 0.2) * 8;
  const ox = cx + Math.cos(SYS.orbitAngle) * orbR;
  const oy = cy + Math.sin(SYS.orbitAngle) * orbR;
  ctx.beginPath();
  ctx.arc(ox, oy, 2.5 + W$.accentPulse * 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(45,107,79,${0.2 + W$.accentPulse * 0.2})`;
  ctx.fill();

  ctx.restore();
}

// ============================================================
//  LAYER: TIMELINE
// ============================================================
function renderTimeline(ctx, alpha) {
  if (alpha < 0.01) return;
  const startX = 80, endX = W - 80, cy = H / 2;

  ctx.save();
  ctx.globalAlpha = alpha * 0.8;

  ctx.strokeStyle = `rgba(26,26,26,${0.04})`;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(startX, cy); ctx.lineTo(endX, cy); ctx.stroke();

  const count = SYS.timeline.length;
  for (let i = 0; i < count; i++) {
    const t = SYS.timeline[i];
    const pVal = t.p.value;
    const x = startX + (i / (count - 1)) * (endX - startX);

    let bendY = 0;
    // Ripple bend
    for (const rp of W$.ripples) {
      const dx = rp.x - x, dy = rp.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < rp.r + 30) {
        bendY += (1 - Math.abs(d - rp.r) / 30) * rp.s * 10 *
          Math.sin((x - startX) / (endX - startX) * Math.PI);
      }
    }
    // Cursor bend
    if (W$.cursor.active > 0.5) {
      const dx = W$.cursor.x - x;
      const d = Math.abs(dx);
      if (d < 200) bendY += (1 - d / 200) * W$.cursor.influence * 15 *
        Math.sin((x - startX) / (endX - startX) * Math.PI);
    }

    const r = 2 + pVal * 3 + W$.accentPulse * 2;
    const dotY = cy + bendY;
    const vh = 10 + pVal * 25;

    ctx.fillStyle = `rgba(26,26,26,${0.015 + pVal * 0.025})`;
    ctx.fillRect(x - 0.5, dotY - vh, 1, vh * 2);

    ctx.beginPath(); ctx.arc(x, dotY, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(26,26,26,${0.03 + pVal * 0.05})`; ctx.fill();
    ctx.beginPath(); ctx.arc(x, dotY, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(45,107,79,${0.06 + pVal * 0.1 + W$.accentPulse * 0.06})`; ctx.fill();
  }

  ctx.restore();
}

// ============================================================
//  LAYER: PARTICLE WEB (constellation)
// ============================================================
function renderParticleWeb(ctx, alpha) {
  const particles = SYS.particles;
  if (particles.length < 5) return;

  ctx.save();
  ctx.globalAlpha = alpha * 0.3;

  // Sample 30 random pairs for connections
  const count = Math.min(30, particles.length);
  for (let i = 0; i < count; i++) {
    const a = particles[Math.floor(Math.random() * particles.length)];
    const b = particles[Math.floor(Math.random() * particles.length)];
    if (a === b) continue;
    const dx = a.x - b.x, dy = a.y - b.y;
    const d = dx * dx + dy * dy;
    if (d < 25000 && d > 100) {
      const alpha2 = (1 - d / 25000) * 0.4;
      ctx.strokeStyle = `rgba(45,107,79,${alpha2})`;
      ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }

  // Nearest-neighbor connections (fast grid-based)
  const gridSize = 80;
  const cellMap = {};
  for (const p of particles) {
    const gx = Math.floor(p.x / gridSize), gy = Math.floor(p.y / gridSize);
    const key = gx + ',' + gy;
    if (!cellMap[key]) cellMap[key] = [];
    cellMap[key].push(p);
  }
  for (const key in cellMap) {
    const cell = cellMap[key];
    for (let i = 1; i < cell.length; i++) {
      const dx = cell[i].x - cell[i - 1].x, dy = cell[i].y - cell[i - 1].y;
      const d = dx * dx + dy * dy;
      if (d < 15000) {
        const alpha2 = (1 - d / 15000) * 0.3;
        ctx.strokeStyle = `rgba(26,26,26,${alpha2})`;
        ctx.lineWidth = 0.3;
        ctx.beginPath(); ctx.moveTo(cell[i - 1].x, cell[i - 1].y); ctx.lineTo(cell[i].x, cell[i].y); ctx.stroke();
      }
    }
  }

  ctx.restore();
}

// ============================================================
//  LAYER: PARTICLES
// ============================================================
function renderParticles(ctx, density) {
  ctx.save();
  const cursor = W$.cursor;

  for (const p of SYS.particles) {
    const dist = p.disturbed > 0.5;
    const a = 0.02 + (1 - p.age / 120) * density * (1 - W$.humidity * 0.3) + (dist ? 0.04 : 0);
    if (a < 0.01) continue;

    let glow = 0;
    if (cursor.active > 0.5) {
      const dx = cursor.x - p.x, dy = cursor.y - p.y, d = dx * dx + dy * dy;
      if (d < 10000) glow = (1 - d / 10000) * cursor.influence * 0.5;
    }
    // Ripple glow
    for (const r of W$.ripples) {
      const dx = p.x - r.x, dy = p.y - r.y, d = dx * dx + dy * dy;
      if (d < (r.r + 20) * (r.r + 20) && d > (r.r - 20) * (r.r - 20)) {
        glow = Math.max(glow, r.s * 0.4);
      }
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size + glow * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(45,107,79,${a + glow * 0.2})`;
    ctx.fill();

    if (glow > 0.1) { ctx.shadowColor = 'rgba(45,107,79,0.1)'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0; }
  }

  for (const e of SYS.envNoise) {
    const ex = e.x * W, ey = e.y * H;
    e.x += e.vx + W$.windX * 0.0001; e.y += e.vy + W$.windY * 0.0001;
    if (e.x < 0 || e.x > 1) e.vx *= -1;
    if (e.y < 0 || e.y > 1) e.vy *= -1;
    ctx.beginPath(); ctx.arc(ex, ey, 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(26,26,26,${0.01})`; ctx.fill();
  }
  ctx.restore();
}

// ============================================================
//  CURSOR TRAIL
// ============================================================
function renderCursorTrail(ctx) {
  const trail = W$.cursorTrail;
  if (trail.length < 2 || W$.cursorMemory < 0.01) return;

  ctx.save();
  for (let i = 1; i < trail.length; i++) {
    const age = W$.time - trail[i].t;
    const alpha = Math.max(0, (1 - age * 0.1)) * W$.cursorMemory * 0.08;
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

// ============================================================
//  RIPPLE OVERLAY
// ============================================================
function renderRipples(ctx) {
  for (const r of W$.ripples) {
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(26,26,26,${r.s * 0.04})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r + 1, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(45,107,79,${r.s * 0.06})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

// ============================================================
//  LIGHTING
// ============================================================
function applyVignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${0.08 + (1 - W$.light) * 0.06})`);
  ctx.fillStyle = g;
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
  if (W$.autoPilot && idx !== W$.sceneTarget) {
    // Let auto-pilot navigate freely
  }
  W$.sceneTarget = idx;
  W$.sceneTransition = 0;
  document.querySelectorAll('[data-scene]').forEach(el =>
    el.classList.toggle('active', parseInt(el.dataset.scene) === idx));
}

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
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigateScene(W$.sceneTarget + 1);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigateScene(W$.sceneTarget - 1);
});

// Override auto-pilot on user interaction
document.addEventListener('keydown', () => { W$.idleTimer = 0; W$.autoPilot = false; });
document.addEventListener('mousedown', () => { W$.idleTimer = 0; W$.autoPilot = false; });

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
  updateFlow(dt);
  updateParticles(dt);
  updateChain(dt);
  updateBars(dt);
  updateGrid(dt);
  updateCards(dt);
  updateRings(dt);
  updateTimeline(dt);
  updateRD();

  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

window.W$ = W$;
