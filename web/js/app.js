// BioEcho OS v3.1 — Pure Visual Experience
// The world IS the interface. No text. No panels. Just the living forest.

// ============================================================
// ENGINE INSTANCES (wrapped for safety)
// ============================================================
let hal, calibration, speciesDB, localDB, identityLayer, twinEngine;
let contextEngine, meaningEngine, experimentLog, evidenceValidator;
let environmentEngine, relationshipEngine, knowledgeGraph, lens;
let verificationChain, citizenScience, predictiveEngine;
let researchAssistant, bioSearch, earth, timeMachine, sdk, emergency, marketplace;
let world, ambientEngine, soundEngine, lifeEngine;

try {
  hal = new HardwareAbstractionLayer();
  calibration = new CalibrationEngine();
  speciesDB = new SpeciesDB();
  localDB = new LocalDB();
  identityLayer = new LivingIdentityLayer(localDB);
  twinEngine = new DigitalTwinEngine(localDB, identityLayer);
  contextEngine = new ContextEngine(twinEngine, speciesDB);
  meaningEngine = new MeaningEngine(speciesDB);
  experimentLog = new ExperimentLog();
  evidenceValidator = new EvidenceValidator();
  environmentEngine = new EnvironmentEngine();
  relationshipEngine = new RelationshipEngine();
  knowledgeGraph = new KnowledgeGraph();
  lens = new BioEchoLens(knowledgeGraph, twinEngine, speciesDB, contextEngine, meaningEngine);
  verificationChain = new VerificationChain(localDB, identityLayer);
  citizenScience = new CitizenScienceEngine(localDB, verificationChain, knowledgeGraph);
  predictiveEngine = new PredictiveEngine(twinEngine, speciesDB, contextEngine, localDB);
  researchAssistant = new ResearchAssistant(twinEngine, speciesDB, knowledgeGraph, localDB, meaningEngine);
  bioSearch = new BioSearchEngine(twinEngine, speciesDB, knowledgeGraph, localDB, contextEngine);
  earth = new BioEchoEarth(knowledgeGraph, twinEngine, citizenScience);
  timeMachine = new TimeMachine(twinEngine, localDB, identityLayer);
  sdk = new BioEchoSDK();
  emergency = new EmergencyEngine(twinEngine, speciesDB, localDB);
  marketplace = new Marketplace(twinEngine, speciesDB);
} catch(e) { console.warn('Engine init error:', e); }

// Experience
world = new WorldV3(document.getElementById('world-canvas'));
ambientEngine = new AmbientEngine();
soundEngine = new SoundEngine();
lifeEngine = new LifeEngine(world);
let firefly = null;
let tree = null;
let vineTransition = null;

// State
let experienceReady = false;
let uiVisible = false;
let lastFrame = 0;
let mouseX = -1, mouseY = -1;

// ============================================================
// LANDING — Seed click → wow → world
// ============================================================
function initLanding() {
  const landing = document.getElementById('landing');
  const seedCanvas = document.getElementById('seed-canvas');
  const seedCtx = seedCanvas.getContext('2d');

  let seedPulse = 0;
  const drawSeed = () => {
    seedPulse += 0.015;
    seedCtx.clearRect(0, 0, 200, 200);
    const cx = 100, cy = 105;
    const pulse = Math.sin(seedPulse) * 0.15 + 1;

    // Outer glow ring
    const glowGrad = seedCtx.createRadialGradient(cx, cy, 0, cx, cy, 70 * pulse);
    glowGrad.addColorStop(0, 'rgba(111,163,111,0.08)');
    glowGrad.addColorStop(0.5, 'rgba(111,163,111,0.03)');
    glowGrad.addColorStop(1, 'transparent');
    seedCtx.fillStyle = glowGrad;
    seedCtx.beginPath();
    seedCtx.arc(cx, cy, 70 * pulse, 0, Math.PI * 2);
    seedCtx.fill();

    // Seed body - larger, brighter
    seedCtx.fillStyle = '#8A6A4A';
    seedCtx.beginPath();
    seedCtx.ellipse(cx, cy, 12 * pulse, 18 * pulse, 0, 0, Math.PI * 2);
    seedCtx.fill();

    // Seed highlight
    seedCtx.fillStyle = 'rgba(245,240,232,0.15)';
    seedCtx.beginPath();
    seedCtx.ellipse(cx - 2, cy - 3, 5 * pulse, 8 * pulse, -0.2, 0, Math.PI * 2);
    seedCtx.fill();

    // Sprout - brighter
    seedCtx.strokeStyle = 'rgba(111,163,111,0.7)';
    seedCtx.lineWidth = 1.5;
    seedCtx.beginPath();
    seedCtx.moveTo(cx, cy - 18 * pulse);
    seedCtx.quadraticCurveTo(cx + 4, cy - 28 * pulse, cx, cy - 38 * pulse);
    seedCtx.stroke();

    // Tiny leaf
    seedCtx.fillStyle = 'rgba(111,163,111,0.4)';
    seedCtx.beginPath();
    seedCtx.ellipse(cx + 4, cy - 30 * pulse, 4 * pulse, 2 * pulse, 0.3, 0, Math.PI * 2);
    seedCtx.fill();

    if (!landing.classList.contains('hidden')) requestAnimationFrame(drawSeed);
  };
  requestAnimationFrame(drawSeed);

  landing.addEventListener('click', async () => {
    landing.style.pointerEvents = 'none';
    world.initialize();
    if (soundEngine.initialize ? await soundEngine.initialize() : true) {
      soundEngine.playGrowth?.();
    }

    // Quick wow: seed cracks, roots, sapling, then reveal
    const wow = new WowMoment(seedCanvas);
    wow.start(() => {
      landing.classList.add('hidden');
      setTimeout(() => {
        document.getElementById('ui-layer').style.display = '';
        experienceReady = true;
        initExperience();
      }, 600);
    });
  });
}

// ============================================================
// EXPERIENCE INIT
// ============================================================
function initExperience() {
  LDL.init();
  ambientEngine.update();

  // Init tree
  tree = new LivingTree(world);
  tree.initialize();
  tree.onFeatureClick = (idx) => handleFeatureClick(idx);

  // Init vine transitions
  vineTransition = new VineTransition(document.getElementById('ui-layer'));

  // Knowledge graph
  knowledgeGraph.populateFromEngines(twinEngine, speciesDB, environmentEngine, experimentLog, relationshipEngine, localDB);

  // Nav icons
  setupNavIcons();

  // Mouse tracking
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    world.setMouse(mouseX, mouseY);

    // Check tree feature hover
    if (tree) {
      const idx = tree.hitTest(mouseX, mouseY);
      tree.setHover(idx);
      document.body.style.cursor = idx >= 0 ? 'pointer' : 'default';
    }

    // Show nav on bottom hover
    if (mouseY > window.innerHeight - 60) {
      showNav();
    } else if (!uiVisible) {
      hideNav();
    }
  });

  // Click handler
  document.addEventListener('click', (e) => {
    if (!experienceReady) return;

    // Tree feature click
    if (tree) {
      const idx = tree.hitTest(e.clientX, e.clientY);
      if (idx >= 0) {
        handleFeatureClick(idx);
        return;
      }
    }

    // Organism list click (if panel visible)
    const orgEl = e.target.closest('.organism-card');
    if (orgEl) {
      selectOrganism(orgEl.dataset.id);
    }
  });

  // Resize
  window.addEventListener('resize', () => {
    world.resize();
    world._generate();
    if (tree) tree.initialize();
  });

  // Start render loop
  lastFrame = performance.now();
  requestAnimationFrame(renderLoop);

  // Periodic updates
  setInterval(updateUI, 3000);
  setInterval(() => ambientEngine.update(), 60000);

  // Load organisms
  loadOrganisms();

  // Add icons to action buttons
  const actionIcons = ['connection', 'water', 'dew', 'leaf', 'emergency'];
  const actionBtns = document.querySelectorAll('.organic-btn');
  actionBtns.forEach((btn, i) => {
    const icon = document.createElement('span');
    icon.className = 'bioecho-icon';
    icon.style.cssText = 'width:16px;height:16px';
    icon.innerHTML = BioEchoIcons[actionIcons[i]] || '';
    btn.appendChild(icon);
  });

  // Add icons to overlay close
  const closeBtn = document.getElementById('overlay-close');
  if (closeBtn) {
    const icon = document.createElement('span');
    icon.className = 'bioecho-icon';
    icon.style.cssText = 'width:14px;height:14px';
    icon.innerHTML = BioEchoIcons.close || '';
    closeBtn.appendChild(icon);
  }
}

// ============================================================
// RENDER LOOP
// ============================================================
function renderLoop(timestamp) {
  const dt = Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;

  LDL.currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  LDL.currentTime = LDL.getTimeOfDay(LDL.currentHour);
  const tod = LDL.timeOfDay[LDL.currentTime];

  world.update(dt, LDL.currentTime, LDL.currentSeason);
  lifeEngine.update(dt);
  if (tree) tree.update(dt);

  world.render(LDL.currentTime, LDL.currentSeason);
  lifeEngine.render(world.ctx);
  if (tree) tree.render(world.ctx, tod);

  requestAnimationFrame(renderLoop);
}

// ============================================================
// FEATURE CLICK — Tree orb clicked
// ============================================================
function handleFeatureClick(idx) {
  const views = ['home', 'lens', 'graph', 'predict', 'search', 'earth', 'shop'];
  const view = views[idx] || 'home';

  if (view === 'home') {
    hideUI();
    return;
  }

  showUI(view);
}

// ============================================================
// UI VISIBILITY — Panels appear on interaction
// ============================================================
function showUI(view) {
  uiVisible = true;
  const left = document.getElementById('panel-left');
  const right = document.getElementById('panel-right');
  const bar = document.getElementById('action-bar');

  left.style.opacity = '1';
  left.style.pointerEvents = 'auto';
  right.style.opacity = '1';
  right.style.pointerEvents = 'auto';
  bar.style.opacity = '1';
  bar.style.pointerEvents = 'auto';

  updateStatsPanel();
  updateEnvironmentPanel();
  loadOrganisms();
}

function hideUI() {
  uiVisible = false;
  const left = document.getElementById('panel-left');
  const right = document.getElementById('panel-right');
  const bar = document.getElementById('action-bar');

  left.style.opacity = '0';
  left.style.pointerEvents = 'none';
  right.style.opacity = '0';
  right.style.pointerEvents = 'none';
  bar.style.opacity = '0';
  bar.style.pointerEvents = 'none';
}

function showNav() {
  const nav = document.getElementById('root-nav');
  nav.style.opacity = '1';
  nav.style.pointerEvents = 'auto';
}

function hideNav() {
  const nav = document.getElementById('root-nav');
  nav.style.opacity = '0';
  nav.style.pointerEvents = 'none';
}

// ============================================================
// NAV ICONS
// ============================================================
function setupNavIcons() {
  const btns = document.querySelectorAll('.root-btn');
  const iconNames = ['tree', 'dew', 'connection', 'leaf', 'dew', 'seed', 'sprout'];
  btns.forEach((btn, i) => {
    const iconEl = btn.querySelector('.bioecho-icon') || document.createElement('span');
    iconEl.className = 'bioecho-icon';
    iconEl.style.cssText = 'width:16px;height:16px';
    iconEl.innerHTML = BioEchoIcons[iconNames[i]] || '';
    if (!btn.querySelector('.bioecho-icon')) btn.appendChild(iconEl);

    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      handleFeatureClick(['home', 'lens', 'graph', 'predict', 'search', 'earth', 'shop'].indexOf(view));
      hideNav();
    });
  });
}

// ============================================================
// ORGANISM LIST
// ============================================================
function loadOrganisms() {
  const list = document.getElementById('organism-list');
  if (!list || !twinEngine) return;
  try {
    const twins = twinEngine.getAll();
    if (twins.length === 0) { list.innerHTML = ''; return; }
    list.innerHTML = twins.map(t => {
      const icon = t.species === 'pothos' ? '🌿' : t.species === 'monstera-deliciosa' ? '🪴' : '🌱';
      return `<div class="organism-card ${t.id === activeOrganismId ? 'active' : ''}" data-id="${t.id}">
        <div class="organism-avatar">${icon}</div>
      </div>`;
    }).join('');
    if (!activeOrganismId && twins.length > 0) selectOrganism(twins[0].id);
  } catch(e) {}
}

let activeOrganismId = null;

function selectOrganism(id) {
  activeOrganismId = id;
  loadOrganisms();
  updateIdentityPanel();
  updateStatsPanel();
  updateEnvironmentPanel();
}

function updateIdentityPanel() {
  if (!activeOrganismId || !twinEngine) return;
  try {
    const identity = twinEngine.getOrganismIdentity(activeOrganismId);
    if (!identity) return;
  } catch(e) {}
}

function updateStatsPanel() {
  if (!activeOrganismId || !twinEngine) return;
  try {
    const twin = twinEngine.getTwin(activeOrganismId);
    if (!twin) return;
    const state = twin.state || {};
    document.getElementById('stat-health').textContent = state.healthScore !== undefined ? state.healthScore.toFixed(2) : '--';
    document.getElementById('stat-stress').textContent = state.stressIndex !== undefined ? state.stressIndex.toFixed(2) : '--';
    document.getElementById('stat-spikes').textContent = state.spikeRate !== undefined ? state.spikeRate.toFixed(1) : '--';
    document.getElementById('stat-growth').textContent = state.growthRate !== undefined ? state.growthRate.toFixed(3) : '--';
    document.getElementById('health-bar').style.width = ((state.healthScore || 0) * 100) + '%';
  } catch(e) {}
}

function updateEnvironmentPanel() {
  if (!environmentEngine) return;
  try {
    const ctx = environmentEngine.getContext();
    document.getElementById('env-light').textContent = ctx.lightPhase || '--';
    document.getElementById('env-soil').textContent = ctx.current?.soilMoisture !== undefined ? ctx.current.soilMoisture.toFixed(0) + '%' : '--';
    document.getElementById('env-season').textContent = ctx.season || LDL.currentSeason || '--';
  } catch(e) {}
}

function updateUI() {
  if (!experienceReady) return;
  updateStatsPanel();
  updateEnvironmentPanel();
}

try { initLanding(); } catch(e) { console.error('Landing error:', e); }
