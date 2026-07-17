// ═══════════════════════════════════════════════════════════════
// BioEcho OS v7 — Professional Immersive Experience
// ═══════════════════════════════════════════════════════════════

let scene3d = null;
const sound = new SoundEngine();
let scheduler = null;
let experienceReady = false;
let lastFrame = 0;

// Mouse stillness tracking
let cursorWorldX = 0, cursorWorldZ = 0;
let cursorStillTime = 0;
let lastCursorMove = 0;
let cursorActive = false;
let cursorScreenX = -1000, cursorScreenY = -1000;

// ─── Boot Sequence ───
(function boot() {
  const loader = document.getElementById('loader');
  const fill = loader?.querySelector('.ring-fill');
  const pct = loader?.querySelector('.loader-pct');
  const text = loader?.querySelector('.loader-text');
  const bar = loader?.querySelector('.loader-bar-fill');

  const steps = [
    { p: 15, t: 'initializing WebGL context' },
    { p: 30, t: 'generating terrain mesh' },
    { p: 50, t: 'planting vegetation' },
    { p: 65, t: 'building water system' },
    { p: 78, t: 'assembling atmosphere' },
    { p: 88, t: 'calibrating light transport' },
    { p: 95, t: 'final synthesis' },
    { p: 100, t: 'ready' },
  ];

  const circumference = 283;
  let i = 0;

  function tick() {
    if (i >= steps.length) {
      setTimeout(() => {
        loader?.classList.add('hidden');
        initApp();
      }, 400);
      return;
    }
    const s = steps[i];
    if (fill) fill.style.strokeDashoffset = circumference - (circumference * s.p / 100);
    if (pct) pct.textContent = s.p + '%';
    if (text) text.textContent = s.t;
    if (bar) bar.style.width = s.p + '%';
    i++;
    setTimeout(tick, 200 + Math.random() * 300);
  }

  tick();
})();

// ─── Main Init ───
function initApp() {
  const worldCanvas = document.getElementById('world-canvas');
  if (worldCanvas) {
    worldCanvas.width = window.innerWidth;
    worldCanvas.height = window.innerHeight;
  }

  try { scene3d = new BioEchoScene(); } catch(e) { console.warn('Scene:', e); }
  scheduler = new LivingWorldScheduler();

  // Cursor tracking for butterfly curiosity
  document.addEventListener('mousemove', (e) => {
    cursorScreenX = e.clientX;
    cursorScreenY = e.clientY;
    cursorActive = true;
    lastCursorMove = scheduler ? scheduler.time : 0;
    cursorStillTime = 0;
  });

  initCursor();
  initLanding(worldCanvas);
}

// ─── Cursor ───
function initCursor() {
  const el = document.getElementById('cursor');
  if (!el || window.innerWidth < 769) return;

  let mx = -100, my = -100, cx = -100, cy = -100;
  const dot = el.querySelector('.cursor-dot');
  const ring = el.querySelector('.cursor-ring');

  document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
  document.addEventListener('mousedown', () => el.classList.add('press'));
  document.addEventListener('mouseup', () => el.classList.remove('press'));

  const interactives = 'button, a, .nav-item, .hud-btn, #seed-canvas, #landing, [role="button"]';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactives)) el.classList.add('expand');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactives)) el.classList.remove('expand');
  });

  (function loop() {
    cx += (mx - cx) * 0.1;
    cy += (my - cy) * 0.1;
    el.style.transform = `translate3d(${cx}px,${cy}px,0)`;
    requestAnimationFrame(loop);
  })();
}

function setCursorLabel(text) {
  const el = document.getElementById('cursor');
  const label = el?.querySelector('.cursor-label');
  if (!label) return;
  if (text) {
    label.textContent = text;
    el?.classList.add('label');
  } else {
    el?.classList.remove('label');
  }
}

// ─── Landing ───
function initLanding(worldCanvas) {
  const landing = document.getElementById('landing');
  const seedCanvas = document.getElementById('seed-canvas');
  if (!landing || !seedCanvas) return;

  const seq = new LandingSequence(seedCanvas);

  // Draw seed
  const ctx = seedCanvas.getContext('2d');
  const sw = seedCanvas.width, sh = seedCanvas.height;
  const s = sw / 200;
  let pt = 0;

  function drawSeed() {
    if (seq.phase !== 'pulse' && seq.t > 0) return;
    pt += 0.015;
    ctx.clearRect(0, 0, sw, sh);
    const cx = sw / 2, cy = sh / 2;
    const p = Math.sin(pt * 1.5) * 0.15 + 1;
    const b = Math.sin(pt * 0.8) * 0.08 + 1;

    // Glow
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90 * s * b);
    g.addColorStop(0, 'rgba(111,163,111,0.12)');
    g.addColorStop(0.5, 'rgba(111,163,111,0.04)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 90 * s * b, 0, 6.28); ctx.fill();

    // Seed body
    ctx.fillStyle = '#F5F0E8';
    ctx.beginPath(); ctx.ellipse(cx, cy, 24 * s * p, 36 * s * p, 0, 0, 6.28); ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(cx - 3 * s, cy - 5 * s, 9 * s * p, 14 * s * p, -0.2, 0, 6.28); ctx.fill();

    // Stem
    ctx.strokeStyle = '#6FA36F';
    ctx.lineWidth = 2.5 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 36 * s * p);
    ctx.quadraticCurveTo(cx + 5 * s, cy - 52 * s * p, cx, cy - 68 * s * p);
    ctx.stroke();

    // Leaf
    ctx.fillStyle = 'rgba(111,163,111,0.5)';
    ctx.beginPath(); ctx.ellipse(cx + 5 * s, cy - 60 * s * p, 7 * s * p, 3.5 * s * p, 0.3, 0, 6.28); ctx.fill();

    if (!landing.classList.contains('hidden')) requestAnimationFrame(drawSeed);
  }
  requestAnimationFrame(drawSeed);

  // Click to enter
  landing.addEventListener('click', async () => {
    landing.style.pointerEvents = 'none';

    try {
      await sound.initialize();
      await sound.resume();
      sound.playPulse();
    } catch(e) {}

    seq.start(() => {
      landing.classList.add('hidden');
      experienceReady = true;

      const ui = document.getElementById('ui');
      if (ui) {
        ui.style.display = 'block';
        ui.removeAttribute('aria-hidden');
        requestAnimationFrame(() => ui.classList.add('visible'));
      }

      try {
        scene3d.init(worldCanvas);
        scene3d.scheduler = scheduler;
        const phase = scheduler.getCurrentPhase();
        scene3d.setTimeOfDay(phase.id);
      } catch(e) { console.error('Scene init:', e); }

      try { sound.playGrowth(); } catch(e) {}
      requestAnimationFrame(renderLoop);

      // Scheduler integration
      scheduler.on('phase_change', (data) => {
        try {
          scene3d.setTimeOfDay(data.to);
          const greeting = scheduler.getGreeting();
          if (greeting) showEcoGreeting(greeting);
        } catch(e) {}
      });
      scheduler.on('weather_change', (data) => {
        try {
          scene3d.setWeather(data.weather);
          if (data.weather === 'rain' || data.weather === 'storm') {
            scene3d._startRain();
          } else {
            scene3d._stopRain();
          }
        } catch(e) {}
      });
      scheduler.on('bird_chorus', () => { try { sound.playBirdChirp(); } catch(e) {} });
      scheduler.on('fireflies_emerge', () => { try { scene3d._activateFireflies(); } catch(e) {} });
      scheduler.on('dew_formation', () => { try { scene3d._setDew(0.4); } catch(e) {} });

      setTimeout(() => {
        showHero();
        showHint();
        startCoords();
        initOrbs();
        initNav();
        initSoundToggle();
        initFullscreen();
        initUnderground();
      }, 800);
    });
  }, { once: true });
}

// ─── Eco Greeting ───
function showEcoGreeting(text) {
  const el = document.getElementById('eco-greeting') || (() => {
    const div = document.createElement('div');
    div.id = 'eco-greeting';
    div.style.cssText = 'position:fixed;bottom:140px;left:50%;transform:translateX(-50%);z-index:50;font-family:var(--f-sans,Inter);font-size:13px;font-weight:300;font-style:italic;color:rgba(245,240,232,0.3);pointer-events:none;opacity:0;transition:opacity 2s ease-out;text-align:center;';
    document.body.appendChild(div);
    return div;
  })();
  el.textContent = text;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 6000);
}

// ─── Hero Text ───
function showHero() {
  const hero = document.getElementById('hero');
  if (!hero) return;
  hero.classList.add('visible');
  setTimeout(() => {
    hero.classList.add('fading');
    setTimeout(() => hero.classList.remove('visible', 'fading'), 2500);
  }, 5000);
}

// ─── Explore Hint ───
function showHint() {
  const hint = document.getElementById('explore-hint');
  if (!hint) return;
  setTimeout(() => hint.classList.add('visible'), 1200);
  const hide = () => {
    hint.classList.add('fading');
    setTimeout(() => hint.classList.remove('visible', 'fading'), 2000);
  };
  window.addEventListener('keydown', hide, { once: true });
  document.getElementById('world-canvas')?.addEventListener('mousedown', hide, { once: true });
  setTimeout(hide, 12000);
}

// ─── Coordinates ───
function startCoords() {
  const xEl = document.getElementById('coord-x');
  const zEl = document.getElementById('coord-z');
  const needle = document.querySelector('.compass-needle');
  if (!scene3d?.camera) return;

  setInterval(() => {
    if (!scene3d?.camera) return;
    const x = scene3d.camera.position.x;
    const z = scene3d.camera.position.z;
    if (xEl) xEl.textContent = x.toFixed(1);
    if (zEl) zEl.textContent = z.toFixed(1);
    if (needle) {
      const yaw = scene3d.yaw || 0;
      needle.style.transform = `rotate(${(-yaw * 180 / Math.PI)}deg)`;
    }
  }, 100);
}

// ─── Orb Interaction ───
function initOrbs() {
  const canvas = document.getElementById('world-canvas');
  if (!canvas || !scene3d?.orbs) return;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const tooltip = document.getElementById('orb-tooltip');
  const tooltipText = tooltip?.querySelector('.tooltip-text');
  const names = ['Lens', 'Care', 'Earth', 'Research', 'Community', 'Story'];
  const keys = ['lens', 'care', 'earth', 'research', 'community', 'story'];
  const ecoLabels = ['Forest', 'Water', 'Biodiversity', 'Pollinators', 'Community', 'Forest'];
  const ecoKeys = ['forest', 'water', 'biodiversity', 'pollinators', 'community', 'forest'];

  canvas.addEventListener('mousemove', (e) => {
    if (!experienceReady) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, scene3d.camera);
    const hits = raycaster.intersectObjects(scene3d.orbs);
    if (hits.length > 0) {
      const idx = scene3d.orbs.indexOf(hits[0].object);
      if (idx >= 0) {
        let label = names[idx];
        const ecoKey = ecoKeys[idx];
        if (ecoKey && typeof ecoHealth !== 'undefined') {
          const val = Math.round(ecoHealth[ecoKey] || 0);
          label = `${ecoLabels[idx]} ${val}%`;
        }
        if (tooltipText) tooltipText.textContent = label;
        if (tooltip) {
          tooltip.style.left = `${e.clientX + 16}px`;
          tooltip.style.top = `${e.clientY - 8}px`;
          tooltip.classList.add('visible');
        }
        setCursorLabel(label);
        canvas.style.cursor = 'none';
      }
    } else {
      tooltip?.classList.remove('visible');
      setCursorLabel('');
    }
  });

  canvas.addEventListener('click', (e) => {
    if (!experienceReady) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, scene3d.camera);
    const hits = raycaster.intersectObjects(scene3d.orbs);
    if (hits.length > 0) {
      const idx = scene3d.orbs.indexOf(hits[0].object);
      if (idx >= 0) {
        tooltip?.classList.remove('visible');
        setCursorLabel('');
        showPanel(keys[idx]);
        try { sound.playWaterDrop(); } catch(e) {}
      }
    }
  });
}

// ─── Underground Click ───
function initUnderground() {
  const canvas = document.getElementById('world-canvas');
  if (!canvas || !scene3d) return;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  canvas.addEventListener('dblclick', (e) => {
    if (!experienceReady || !scene3d) return;
    if (scene3d.undergroundActive) {
      scene3d._exitUnderground();
      return;
    }
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, scene3d.camera);
    if (scene3d.terrain) {
      const hits = raycaster.intersectObject(scene3d.terrain);
      if (hits.length > 0) {
        scene3d._enterUnderground();
        showEcoGreeting('You discover the world beneath... roots, fungi, mycelium networks');
        try { sound.playGrowth(); } catch(e) {}
      }
    }
  });

  // Also allow via keyboard
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyU' && scene3d && !scene3d.undergroundActive) {
      scene3d._enterUnderground();
      showEcoGreeting('You discover the world beneath... roots, fungi, mycelium networks');
      try { sound.playGrowth(); } catch(e) {}
    } else if (e.code === 'KeyU' && scene3d && scene3d.undergroundActive) {
      scene3d._exitUnderground();
    }
  });
}

// ─── Panel ───
// Ecosystem health state (replaces XP/gamification)
const ecoHealth = {
  forest: 82, pollinators: 68, biodiversity: 75, water: 91, community: 44,
  _targets: { forest: 82, pollinators: 68, biodiversity: 75, water: 91, community: 44 },
  update() {
    for (const key of Object.keys(this._targets)) {
      this[key] += (this._targets[key] - this[key]) * 0.01;
      this[key] = Math.max(0, Math.min(100, this[key]));
    }
  },
  set(key, val) { if (this._targets[key] !== undefined) this._targets[key] = Math.max(0, Math.min(100, val)); },
  add(key, delta) { if (this._targets[key] !== undefined) this._targets[key] = Math.max(0, Math.min(100, this._targets[key] + delta)); }
};

const panelData = {
  lens: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    title: 'BioEcho Lens',
    html: `
      <p class="p-desc">See the invisible. The Lens reveals electrical pulses, chemical signatures, and stress patterns that plants and ecosystems emit constantly.</p>
      <div class="p-stats">
        <div class="p-stat"><span class="p-stat-label">Status</span><span class="p-stat-val g">Active</span></div>
        <div class="p-stat"><span class="p-stat-label">Sensitivity</span><span class="p-stat-val">High</span></div>
        <div class="p-stat"><span class="p-stat-label">Range</span><span class="p-stat-val">12m</span></div>
        <div class="p-stat"><span class="p-stat-label">Latency</span><span class="p-stat-val b">3ms</span></div>
      </div>
      <div class="eco-health" id="eco-health-lens"></div>
      <button class="p-btn">Connect Sensor</button>`
  },
  care: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    title: 'Living Care',
    html: `
      <p class="p-desc">Your ecosystem's health timeline. Track vitality, detect early warning signs, and nurture what matters most.</p>
      <div class="eco-health" id="eco-health-care"></div>
      <button class="p-btn">View Timeline</button>`
  },
  earth: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    title: 'Living Earth',
    html: `
      <p class="p-desc">Every observation connects to a global living map. See what others are discovering — from old-growth forests to your own backyard.</p>
      <div class="p-stats">
        <div class="p-stat"><span class="p-stat-label">Observations</span><span class="p-stat-val">12,847</span></div>
        <div class="p-stat"><span class="p-stat-label">Species Mapped</span><span class="p-stat-val g">847</span></div>
        <div class="p-stat"><span class="p-stat-label">Active Regions</span><span class="p-stat-val">156</span></div>
        <div class="p-stat"><span class="p-stat-label">Last Sync</span><span class="p-stat-val b">2m ago</span></div>
      </div>
      <div class="eco-health" id="eco-health-earth"></div>
      <button class="p-btn">Explore Map</button>`
  },
  research: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    title: 'Living Research',
    html: `
      <p class="p-desc">Explore the knowledge graph of life — species relationships, ecological networks, and evolutionary lineages interconnected like a vast root system.</p>
      <div class="p-stats">
        <div class="p-stat"><span class="p-stat-label">Graph Nodes</span><span class="p-stat-val">24,891</span></div>
        <div class="p-stat"><span class="p-stat-label">Connections</span><span class="p-stat-val g">142,308</span></div>
        <div class="p-stat"><span class="p-stat-label">Confidence</span><span class="p-stat-val g">96.2%</span></div>
        <div class="p-stat"><span class="p-stat-label">Last Updated</span><span class="p-stat-val b">Today</span></div>
      </div>
      <div class="eco-health" id="eco-health-research"></div>
      <button class="p-btn">Open Graph</button>`
  },
  community: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    title: 'Living Community',
    html: `
      <p class="p-desc">You're not alone. Join a global network of citizen scientists, naturalists, and caretakers working together to protect the living world.</p>
      <div class="p-stats">
        <div class="p-stat"><span class="p-stat-label">Members</span><span class="p-stat-val g">8,241</span></div>
        <div class="p-stat"><span class="p-stat-label">Online Now</span><span class="p-stat-val">1,247</span></div>
        <div class="p-stat"><span class="p-stat-label">Contributions</span><span class="p-stat-val">34,612</span></div>
        <div class="p-stat"><span class="p-stat-label">Your Rank</span><span class="p-stat-val b">#428</span></div>
      </div>
      <div class="eco-health" id="eco-health-community"></div>
      <button class="p-btn">Join Discussion</button>`
  },
  story: {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    title: 'Living Story',
    html: `
      <p class="p-desc">Travel through time. See the deep history of your ecosystem — from ancient forests to restoration stories — and peer into what's coming next.</p>
      <div class="p-stats">
        <div class="p-stat"><span class="p-stat-label">Timeline Span</span><span class="p-stat-val">2,400 yrs</span></div>
        <div class="p-stat"><span class="p-stat-label">Events Logged</span><span class="p-stat-val g">1,892</span></div>
        <div class="p-stat"><span class="p-stat-label">Predictions</span><span class="p-stat-val g">Active</span></div>
        <div class="p-stat"><span class="p-stat-label">Accuracy</span><span class="p-stat-val b">89%</span></div>
      </div>
      <div class="eco-health" id="eco-health-story"></div>
      <button class="p-btn">View Timeline</button>`
  }
};

let activePanel = null;

const ecoHealthConfig = {
  lens: [
    { label: 'Forest Health', key: 'forest', color: 'green' },
    { label: 'Pollinators', key: 'pollinators', color: 'gold' },
    { label: 'Biodiversity', key: 'biodiversity', color: 'fern' }
  ],
  care: [
    { label: 'Forest Health', key: 'forest', color: 'green' },
    { label: 'Pollinators', key: 'pollinators', color: 'gold' },
    { label: 'Biodiversity', key: 'biodiversity', color: 'fern' },
    { label: 'Water Quality', key: 'water', color: 'blue' },
    { label: 'Community Care', key: 'community', color: 'soil' }
  ],
  earth: [
    { label: 'Forest Health', key: 'forest', color: 'green' },
    { label: 'Water Quality', key: 'water', color: 'blue' }
  ],
  research: [
    { label: 'Biodiversity', key: 'biodiversity', color: 'fern' },
    { label: 'Pollinators', key: 'pollinators', color: 'gold' }
  ],
  community: [
    { label: 'Community Care', key: 'community', color: 'soil' },
    { label: 'Forest Health', key: 'forest', color: 'green' }
  ],
  story: [
    { label: 'Forest Health', key: 'forest', color: 'green' },
    { label: 'Biodiversity', key: 'biodiversity', color: 'fern' },
    { label: 'Water Quality', key: 'water', color: 'blue' }
  ]
};

function renderEcoHealth(container, config) {
  if (!container) return;
  container.innerHTML = '';
  for (const item of config) {
    const val = Math.round(ecoHealth[item.key] || 0);
    const row = document.createElement('div');
    row.className = 'eco-row';
    row.innerHTML = `
      <span class="eco-label">${item.label}</span>
      <div class="eco-track">
        <div class="eco-fill ${item.color}" style="width:${val}%"></div>
      </div>
      <span class="eco-pct ${item.color}">${val}%</span>`;
    container.appendChild(row);
  }
}

function showPanel(key) {
  const panel = document.getElementById('panel');
  const title = document.getElementById('panel-title');
  const icon = document.getElementById('panel-icon');
  const body = document.getElementById('panel-body');
  const data = panelData[key];
  if (!panel || !data) return;

  if (title) title.textContent = data.title;
  if (icon) icon.innerHTML = data.icon;
  if (body) body.innerHTML = data.html;

  panel.classList.add('visible');
  activePanel = key;

  // Render ecosystem health bars
  const ecoConfig = ecoHealthConfig[key];
  if (ecoConfig) {
    const ecoEl = document.getElementById(`eco-health-${key}`);
    if (ecoEl) renderEcoHealth(ecoEl, ecoConfig);
  }
}

function hidePanel() {
  const panel = document.getElementById('panel');
  panel?.classList.remove('visible');
  activePanel = null;
  try { sound.playLeafRustle(); } catch(e) {}
}

document.getElementById('panel-close')?.addEventListener('click', hidePanel);

// ─── Sparkline ───
function drawSparkline(key) {
  const canvas = document.getElementById(`spark-${key}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  canvas.width = w * 2;
  canvas.height = h * 2;
  ctx.scale(2, 2);

  const points = [];
  for (let i = 0; i < 40; i++) {
    points.push(0.2 + Math.random() * 0.6 + Math.sin(i * 0.3) * 0.15);
  }

  ctx.clearRect(0, 0, w, h);

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(111,163,111,0.15)');
  grad.addColorStop(1, 'rgba(111,163,111,0)');

  ctx.beginPath();
  ctx.moveTo(0, h);
  points.forEach((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - p * h;
    if (i === 0) ctx.lineTo(x, y);
    else {
      const px = ((i - 1) / (points.length - 1)) * w;
      const py = h - points[i - 1] * h;
      const cpx = (px + x) / 2;
      ctx.bezierCurveTo(cpx, py, cpx, y, x, y);
    }
  });
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - p * h;
    if (i === 0) ctx.moveTo(x, y);
    else {
      const px = ((i - 1) / (points.length - 1)) * w;
      const py = h - points[i - 1] * h;
      const cpx = (px + x) / 2;
      ctx.bezierCurveTo(cpx, py, cpx, y, x, y);
    }
  });
  ctx.strokeStyle = 'rgba(111,163,111,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // End dot
  const lastX = w;
  const lastY = h - points[points.length - 1] * h;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#6FA36F';
  ctx.fill();
}

// ─── Nav ───
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      try { sound.playWaterDrop(); } catch(e) {}
    });
  });
}

// ─── Sound Toggle ───
function initSoundToggle() {
  const btn = document.getElementById('btn-sound');
  if (!btn) return;
  let muted = false;
  btn.addEventListener('click', () => {
    muted = !muted;
    btn.classList.toggle('muted', muted);
    if (muted) sound.stopAmbient();
    else startAmbient();
  });
}

// ─── Fullscreen ───
function initFullscreen() {
  const btn = document.getElementById('btn-fullscreen');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });
}

// ─── Ambient Sound ───
let ambientInterval = null;

function startAmbient() {
  const set = () => {
    const h = new Date().getHours();
    sound.stopAmbient();
    if (h >= 5 && h < 10) sound.startAmbient('birds');
    else if (h >= 10 && h < 17) sound.startAmbient('water');
    else if (h >= 17 && h < 21) sound.startAmbient('birds');
    else sound.startAmbient('crickets');
  };
  set();
  ambientInterval = setInterval(set, 600000);
}

// ─── Render Loop ───
let lastGust = 0, lastStep = 0;
let ecoUpdateTimer = 0;

function renderLoop(ts) {
  if (!experienceReady) return;
  try {
    const dt = Math.min((ts - lastFrame) / 1000, 0.05);
    lastFrame = ts;

    // Update scheduler
    if (scheduler) scheduler.update(dt);

    // Update eco health values based on scheduler
    ecoUpdateTimer += dt;
    if (ecoUpdateTimer > 2) {
      ecoUpdateTimer = 0;
      const rain = scheduler ? scheduler.getWeather().rain : 0;
      const phase = scheduler ? scheduler.getCurrentPhase() : null;
      if (rain > 0.5) ecoHealth.add('water', 0.5);
      if (rain < 0.1) ecoHealth.add('water', -0.1);
      if (phase && (phase.id === 'morning' || phase.id === 'noon')) ecoHealth.add('pollinators', 0.2);
      const wind = scheduler ? scheduler.getWindStrength() : 0.3;
      if (wind > 0.7) ecoHealth.add('forest', -0.1);
      ecoHealth.add('forest', 0.05);
      // Refresh panel if open
      if (activePanel && document.getElementById('panel')?.classList.contains('visible')) {
        const ecoConfig = ecoHealthConfig[activePanel];
        if (ecoConfig) {
          const ecoEl = document.getElementById(`eco-health-${activePanel}`);
          if (ecoEl) renderEcoHealth(ecoEl, ecoConfig);
        }
      }
    }
    ecoHealth.update();

    // Cursor stillness tracking for butterfly curiosity
    if (cursorActive) {
      cursorStillTime += dt;
    }

    if (scene3d) {
      // Pass cursor data to scene for butterfly curiosity
      scene3d.cursorScreenX = cursorScreenX;
      scene3d.cursorScreenY = cursorScreenY;
      scene3d.cursorStillTime = cursorStillTime;
      scene3d.cursorActive = cursorActive;

      scene3d.update(dt);
      scene3d.render();
    }

    if (scene3d?.wind?.strength > 0.6 && ts - lastGust > 4000) {
      sound.playWindGust();
      lastGust = ts;
    }
    if (scene3d?.isMoving && ts - lastStep > 350) {
      sound.playFootstep();
      lastStep = ts;
    }
  } catch(e) {
    console.error('Render:', e);
  }
  requestAnimationFrame(renderLoop);
}
