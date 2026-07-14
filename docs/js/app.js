// BioEcho OS v3.1 — Pure Visual Experience
// The world IS the interface. No text. No panels. Just the living forest.

// ============================================================
// ENGINE INSTANCES
// ============================================================
const hal = new HardwareAbstractionLayer();
const calibration = new CalibrationEngine();
const speciesDB = new SpeciesDB();
const localDB = new LocalDB();
const identityLayer = new LivingIdentityLayer(localDB);
const twinEngine = new DigitalTwinEngine(localDB, identityLayer);
const contextEngine = new ContextEngine(twinEngine, speciesDB);
const meaningEngine = new MeaningEngine(speciesDB);
const experimentLog = new ExperimentLog();
const evidenceValidator = new EvidenceValidator();
const environmentEngine = new EnvironmentEngine();
const relationshipEngine = new RelationshipEngine();
const knowledgeGraph = new KnowledgeGraph();
const lens = new BioEchoLens(knowledgeGraph, twinEngine, speciesDB, contextEngine, meaningEngine);
const verificationChain = new VerificationChain(localDB, identityLayer);
const citizenScience = new CitizenScienceEngine(localDB, verificationChain, knowledgeGraph);
const predictiveEngine = new PredictiveEngine(twinEngine, speciesDB, contextEngine, localDB);
const researchAssistant = new ResearchAssistant(twinEngine, speciesDB, knowledgeGraph, localDB, meaningEngine);
const bioSearch = new BioSearchEngine(twinEngine, speciesDB, knowledgeGraph, localDB, contextEngine);
const earth = new BioEchoEarth(knowledgeGraph, twinEngine, citizenScience);
const timeMachine = new TimeMachine(twinEngine, localDB, identityLayer);
const sdk = new BioEchoSDK();
const emergency = new EmergencyEngine(twinEngine, speciesDB, localDB);
const marketplace = new Marketplace(twinEngine, speciesDB);

// Experience
const world = new WorldV3(document.getElementById('world-canvas'));
const ambientEngine = new AmbientEngine();
const soundEngine = new SoundEngine();
const lifeEngine = new LifeEngine(world);
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
    seedPulse += 0.02;
    seedCtx.clearRect(0, 0, 200, 200);
    const cx = 100, cy = 100;
    const pulse = Math.sin(seedPulse) * 0.12 + 1;

    const grad = seedCtx.createRadialGradient(cx, cy, 0, cx, cy, 45 * pulse);
    grad.addColorStop(0, 'rgba(111,163,111,0.12)');
    grad.addColorStop(1, 'transparent');
    seedCtx.fillStyle = grad;
    seedCtx.fillRect(0, 0, 200, 200);

    seedCtx.fillStyle = '#6E5843';
    seedCtx.beginPath();
    seedCtx.ellipse(cx, cy, 7 * pulse, 11 * pulse, 0, 0, Math.PI * 2);
    seedCtx.fill();

    seedCtx.strokeStyle = 'rgba(111,163,111,0.4)';
    seedCtx.lineWidth = 1;
    seedCtx.beginPath();
    seedCtx.moveTo(cx, cy - 11 * pulse);
    seedCtx.quadraticCurveTo(cx + 2.5, cy - 18 * pulse, cx, cy - 24 * pulse);
    seedCtx.stroke();

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
  const twins = twinEngine.getAll();

  if (twins.length === 0) {
    list.innerHTML = `<div style="font-size:11px;color:rgba(245,240,232,0.2);padding:8px;font-weight:300;text-align:center">
      Connect a device
    </div>`;
    return;
  }

  list.innerHTML = twins.map(t => {
    const health = t.state?.healthScore;
    const icon = t.species === 'pothos' ? '🌿' : t.species === 'monstera-deliciosa' ? '🪴' : '🌱';
    return `<div class="organism-card ${t.id === activeOrganismId ? 'active' : ''}" data-id="${t.id}">
      <div class="organism-avatar">${icon}</div>
      <div class="organism-name">${t.name || t.id}</div>
    </div>`;
  }).join('');

  if (!activeOrganismId && twins.length > 0) selectOrganism(twins[0].id);
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
  if (!activeOrganismId) return;
  const section = document.getElementById('identity-section');
  section.style.display = '';
  const identity = twinEngine.getOrganismIdentity(activeOrganismId);
  if (!identity) return;
  document.getElementById('identity-name').textContent = identity.name || activeOrganismId;
  document.getElementById('id-species').textContent = identity.species || '--';
  document.getElementById('id-age').textContent = identity.createdAt ? Math.floor((Date.now() - identity.createdAt) / 86400000) + 'd' : '--';
}

function updateStatsPanel() {
  if (!activeOrganismId) return;
  const twin = twinEngine.getTwin(activeOrganismId);
  if (!twin) return;
  const state = twin.state || {};
  document.getElementById('stat-health').textContent = state.healthScore !== undefined ? state.healthScore.toFixed(2) : '--';
  document.getElementById('stat-stress').textContent = state.stressIndex !== undefined ? state.stressIndex.toFixed(2) : '--';
  document.getElementById('stat-spikes').textContent = state.spikeRate !== undefined ? state.spikeRate.toFixed(1) : '--';
  document.getElementById('stat-growth').textContent = state.growthRate !== undefined ? state.growthRate.toFixed(3) : '--';
  document.getElementById('health-bar').style.width = ((state.healthScore || 0) * 100) + '%';
}

function updateEnvironmentPanel() {
  const ctx = environmentEngine.getContext();
  document.getElementById('env-light').textContent = ctx.lightPhase || '--';
  document.getElementById('env-soil').textContent = ctx.current?.soilMoisture !== undefined ? ctx.current.soilMoisture.toFixed(0) + '%' : '--';
  document.getElementById('env-season').textContent = ctx.season || LDL.currentSeason || '--';
}

function updateUI() {
  if (!experienceReady) return;
  updateStatsPanel();
  updateEnvironmentPanel();
}
