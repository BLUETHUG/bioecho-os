// BioEcho OS v3 — Living Experience Controller
// The world IS the interface. Technology disappears into nature.

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

// Experience engines
const world = new WorldV3(document.getElementById('world-canvas'));
const ambientEngine = new AmbientEngine();
const soundEngine = new SoundEngine();
const lifeEngine = new LifeEngine(world);
let firefly = null;
let tree = null;
let vineTransition = null;
let wowMoment = null;

// ============================================================
// APP STATE
// ============================================================
let isConnected = false;
let isMonitoring = false;
let activeOrganismId = null;
let experienceReady = false;
let currentView = 'home';
let lastFrame = 0;

// ============================================================
// CINEMATIC LANDING — Seed click → Wow moment → World reveal
// ============================================================
function initLanding() {
  const landing = document.getElementById('landing');
  const seedCanvas = document.getElementById('seed-canvas');
  const seedCtx = seedCanvas.getContext('2d');

  // Draw seed
  let seedPulse = 0;
  const drawSeed = () => {
    seedPulse += 0.02;
    seedCtx.clearRect(0, 0, 200, 200);
    const cx = 100, cy = 100;
    const pulse = Math.sin(seedPulse) * 0.1 + 1;

    // Glow
    const grad = seedCtx.createRadialGradient(cx, cy, 0, cx, cy, 40 * pulse);
    grad.addColorStop(0, 'rgba(111,163,111,0.15)');
    grad.addColorStop(1, 'transparent');
    seedCtx.fillStyle = grad;
    seedCtx.fillRect(0, 0, 200, 200);

    // Seed body
    seedCtx.fillStyle = '#6E5843';
    seedCtx.beginPath();
    seedCtx.ellipse(cx, cy, 8 * pulse, 12 * pulse, 0, 0, Math.PI * 2);
    seedCtx.fill();

    // Tiny sprout
    seedCtx.strokeStyle = 'rgba(111,163,111,0.5)';
    seedCtx.lineWidth = 1;
    seedCtx.beginPath();
    seedCtx.moveTo(cx, cy - 12 * pulse);
    seedCtx.quadraticCurveTo(cx + 3, cy - 20 * pulse, cx, cy - 26 * pulse);
    seedCtx.stroke();

    if (!landing.classList.contains('hidden')) {
      requestAnimationFrame(drawSeed);
    }
  };
  requestAnimationFrame(drawSeed);

  landing.addEventListener('click', async () => {
    landing.style.pointerEvents = 'none';

    // Init world first
    world.initialize();

    // Play growth sound
    if (soundEngine.initialize ? await soundEngine.initialize() : true) {
      soundEngine.playGrowth?.();
    }

    // Wow moment
    wowMoment = new WowMoment(seedCanvas);
    wowMoment.start(() => {
      // After wow, fade landing and reveal experience
      landing.classList.add('hidden');
      setTimeout(() => {
        document.getElementById('experience').classList.add('visible');
        experienceReady = true;
        initExperience();
      }, 800);
    });
  });
}

// ============================================================
// EXPERIENCE INIT — After landing
// ============================================================
function initExperience() {
  LDL.init();
  ambientEngine.update();

  // Init firefly guide
  firefly = new FireflyGuide(world, soundEngine);

  // Init vine transitions
  vineTransition = new VineTransition(document.getElementById('experience'));

  // Populate knowledge graph
  knowledgeGraph.populateFromEngines(twinEngine, speciesDB, environmentEngine, experimentLog, relationshipEngine, localDB);

  // Load organisms
  loadOrganisms();

  // Setup navigation
  setupNavigation();

  // Setup buttons
  setupButtons();

  // Setup content overlay close
  document.getElementById('overlay-close').addEventListener('click', closeOverlay);

  // Start render loop
  lastFrame = performance.now();
  requestAnimationFrame(renderLoop);

  // Periodic updates
  setInterval(updateUI, 3000);
  setInterval(() => ambientEngine.update(), 60000);

  // Welcome hint
  setTimeout(() => {
    if (firefly) firefly.showHint?.('first_visit');
  }, 3000);
}

// ============================================================
// RENDER LOOP — World + Life + Tree + Firefly
// ============================================================
function renderLoop(timestamp) {
  const dt = Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;

  // Update ambient time
  LDL.currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  LDL.currentTime = LDL.getTimeOfDay(LDL.currentHour);

  // Update systems
  world.update(dt, LDL.currentTime, LDL.currentSeason);
  lifeEngine.update(dt);
  if (firefly) firefly.update?.(dt);

  // Render world
  world.render(LDL.currentTime, LDL.currentSeason);

  // Render life moments on world canvas
  lifeEngine.render(world.ctx);

  // Render firefly
  if (firefly) firefly.render?.(world.ctx);

  requestAnimationFrame(renderLoop);
}

// ============================================================
// NAVIGATION — Root nav with vine transitions
// ============================================================
function setupNavigation() {
  const btns = document.querySelectorAll('.root-btn');

  // Set icons
  btns.forEach(btn => {
    const view = btn.dataset.view;
    const iconEl = btn.querySelector('.bioecho-icon');
    const iconMap = {
      home: 'tree', lens: 'dew', graph: 'connection',
      predict: 'leaf', search: 'dew', earth: 'seed', shop: 'sprout'
    };
    if (iconEl) iconEl.innerHTML = BioEchoIcons[iconMap[view]] || '';
  });

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === currentView) return;

      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = view;

      if (soundEngine.enabled) soundEngine.playNote?.(600, 0.1, 'sine');

      if (view !== 'home') {
        openFeature(view);
      } else {
        closeOverlay();
      }
    });
  });
}

// ============================================================
// FEATURE VIEWS — Vine-grown overlays
// ============================================================
function openFeature(view) {
  const overlay = document.getElementById('content-overlay');
  const title = document.getElementById('overlay-title');
  const body = document.getElementById('overlay-body');

  const titles = {
    lens: 'Lens', graph: 'Knowledge Graph', predict: 'Predictions',
    search: 'Search', earth: 'Earth', shop: 'Marketplace'
  };

  title.textContent = titles[view] || view;
  body.innerHTML = `<div style="padding:20px;text-align:center;color:rgba(245,240,232,0.4);font-weight:300;font-size:13px">
    ${getViewContent(view)}
  </div>`;

  // Vine grow in
  vineTransition?.growIn(overlay, () => {});
  overlay.classList.add('visible');
}

function getViewContent(view) {
  switch (view) {
    case 'lens': return `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;text-transform:lowercase;letter-spacing:0.12em;color:rgba(245,240,232,0.3);margin-bottom:8px">camera recognition</div>
        <div style="color:rgba(245,240,232,0.6)">Point your camera at any organism. BioEcho identifies species, reads biometric signals, and connects to the knowledge graph.</div>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:16px">
        <button class="organic-btn" onclick="startLensScan()" style="border-color:rgba(95,168,211,0.2)">
          <span class="bioecho-icon" style="width:14px;height:14px">${BioEchoIcons.lens}</span>
          Start Scanning
        </button>
      </div>`;
    case 'graph': return `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;text-transform:lowercase;letter-spacing:0.12em;color:rgba(245,240,232,0.3);margin-bottom:8px">knowledge network</div>
        <div style="color:rgba(245,240,232,0.6)">Every organism, species, event, and observation connected. A living web of biological knowledge.</div>
      </div>
      <div id="graph-stats" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"></div>`;
    case 'predict': return `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;text-transform:lowercase;letter-spacing:0.12em;color:rgba(245,240,232,0.3);margin-bottom:8px">biological intelligence</div>
        <div style="color:rgba(245,240,232,0.6)">Predict events before they happen. Anomaly detection, health trajectories, behavioral forecasts.</div>
      </div>
      <div id="predict-content" style="margin-top:12px"></div>`;
    case 'search': return `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;text-transform:lowercase;letter-spacing:0.12em;color:rgba(245,240,232,0.3);margin-bottom:8px">bio search</div>
        <div style="color:rgba(245,240,232,0.6)">Full-text, temporal, and comparative search across all biological data. Find any organism, event, or pattern.</div>
      </div>
      <div style="margin-top:12px">
        <input type="text" placeholder="Search organisms, species, events..." style="width:100%;padding:10px 14px;border-radius:16px;border:1px solid rgba(111,163,111,0.1);background:rgba(15,61,46,0.06);color:rgba(245,240,232,0.7);font-family:inherit;font-size:13px;font-weight:300;outline:none" id="search-input">
      </div>`;
    case 'earth': return `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;text-transform:lowercase;letter-spacing:0.12em;color:rgba(245,240,232,0.3);margin-bottom:8px">global view</div>
        <div style="color:rgba(245,240,232,0.6)">Every connected organism on Earth. A living globe of biological intelligence.</div>
      </div>
      <canvas id="earth-canvas" width="500" height="350" style="width:100%;border-radius:16px;margin-top:12px"></canvas>`;
    case 'shop': return `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;text-transform:lowercase;letter-spacing:0.12em;color:rgba(245,240,232,0.3);margin-bottom:8px">care marketplace</div>
        <div style="color:rgba(245,240,232,0.6)">Products, donations, and resources for the organisms you care about.</div>
      </div>
      <div id="marketplace-content" style="margin-top:12px"></div>`;
    default: return '';
  }
}

function closeOverlay() {
  const overlay = document.getElementById('content-overlay');
  vineTransition?.foldOut(overlay, () => {});
  setTimeout(() => overlay.classList.remove('visible'), 100);
  currentView = 'home';
  document.querySelectorAll('.root-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.root-btn[data-view="home"]')?.classList.add('active');
}

function startLensScan() {
  // Placeholder for lens scan
}

// ============================================================
// ORGANISM LIST
// ============================================================
function loadOrganisms() {
  const list = document.getElementById('organism-list');
  const twins = twinEngine.getAll();

  if (twins.length === 0) {
    list.innerHTML = `<div style="font-size:11px;color:rgba(245,240,232,0.25);padding:10px;font-weight:300;text-align:center">
      No organisms yet.<br>Connect a device to begin.
    </div>`;
    return;
  }

  list.innerHTML = twins.map(t => {
    const health = t.state?.healthScore;
    const healthColor = health > 0.7 ? 'var(--fern)' : health > 0.4 ? 'var(--sunset)' : '#c0392b';
    const icon = t.species === 'pothos' ? '🌿' : t.species === 'monstera-deliciosa' ? '🪴' : t.species === 'golden-retriever' ? '🐕' : '🌱';
    return `<div class="organism-card ${t.id === activeOrganismId ? 'active' : ''}" data-id="${t.id}">
      <div class="organism-avatar">${icon}</div>
      <div>
        <div class="organism-name">${t.name || t.id}</div>
        <div style="font-size:9px;color:rgba(245,240,232,0.3);font-weight:300">${t.species || 'Unknown'}</div>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.organism-card').forEach(el => {
    el.addEventListener('click', () => selectOrganism(el.dataset.id));
  });

  if (!activeOrganismId && twins.length > 0) {
    selectOrganism(twins[0].id);
  }
}

function selectOrganism(id) {
  activeOrganismId = id;
  loadOrganisms();
  updateIdentityPanel();
  updateStatsPanel();
  updatePredictionPanel();
  updateEnvironmentPanel();
  updateCitizenSciencePanel();
  updateVerificationPanel();
  if (soundEngine.enabled) soundEngine.playNote?.(440, 0.2, 'sine');
}

// ============================================================
// PANEL UPDATES
// ============================================================
function updateIdentityPanel() {
  if (!activeOrganismId) return;
  const section = document.getElementById('identity-section');
  section.style.display = '';
  const identity = twinEngine.getOrganismIdentity(activeOrganismId);
  if (!identity) return;

  document.getElementById('identity-name').textContent = identity.name || activeOrganismId;
  document.getElementById('id-species').textContent = identity.species || '--';
  document.getElementById('id-age').textContent = identity.createdAt ? Math.floor((Date.now() - identity.createdAt) / 86400000) + 'd' : '--';
  document.getElementById('id-events').textContent = twinEngine.getTwin(activeOrganismId)?.events?.length || 0;
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

  const healthBar = document.getElementById('health-bar');
  const health = state.healthScore || 0;
  healthBar.style.width = (health * 100) + '%';
}

function updateEnvironmentPanel() {
  const ctx = environmentEngine.getContext();
  document.getElementById('env-light').textContent = ctx.lightPhase || '--';
  document.getElementById('env-soil').textContent = ctx.current?.soilMoisture !== undefined ? ctx.current.soilMoisture.toFixed(0) + '%' : '--';
  document.getElementById('env-season').textContent = ctx.season || LDL.currentSeason || '--';
  document.getElementById('env-greeting').textContent = ambientEngine.getGreeting?.() || '';
}

function updatePredictionPanel() {
  if (!activeOrganismId) return;
  predictiveEngine.predictNextEvent(activeOrganismId).then(pred => {
    const el = document.getElementById('prediction-content');
    if (pred && pred.type !== 'no_prediction') {
      el.innerHTML = `<div style="color:var(--fern);font-weight:400;font-size:13px">${pred.type.replace(/_/g, ' ')}</div>
        <div style="color:rgba(245,240,232,0.3);font-size:11px;margin-top:3px;font-weight:300">${pred.reasoning?.join('; ') || ''}</div>
        <div style="color:var(--sunset);font-size:11px;margin-top:5px;font-weight:300">${pred.recommendedAction || ''}</div>`;
    } else {
      el.textContent = 'Select an organism';
    }
  }).catch(() => {});
}

function updateCitizenSciencePanel() {
  citizenScience.getContributionStats('local-user').then(stats => {
    document.getElementById('stat-reputation').textContent = stats.reputationScore;
    document.getElementById('stat-contributions').textContent = stats.totalObservations;
  }).catch(() => {});
}

function updateVerificationPanel() {
  const stats = verificationChain.getStats();
  document.getElementById('stat-chains').textContent = stats.totalChains;
  document.getElementById('stat-confidence').textContent = (stats.avgConfidence * 100).toFixed(0) + '%';
}

// ============================================================
// BUTTON HANDLERS
// ============================================================
function setupButtons() {
  document.getElementById('btn-connect')?.addEventListener('click', async () => {
    if (isConnected) { hal.disconnect(); return; }
    try {
      const result = await hal.connect();
      if (result.success) {
        isConnected = true;
        if (soundEngine.enabled) soundEngine.playNote?.(523, 0.3, 'sine');
      }
    } catch (e) { console.log('Connection failed:', e.message); }
  });

  document.getElementById('btn-start')?.addEventListener('click', () => {
    if (isMonitoring) { isMonitoring = false; return; }
    if (!isConnected) return;
    isMonitoring = true;
  });

  document.getElementById('btn-scan')?.addEventListener('click', () => openFeature('lens'));

  document.getElementById('btn-submit-obs')?.addEventListener('click', async () => {
    if (!activeOrganismId) return;
    const twin = twinEngine.getTwin(activeOrganismId);
    await citizenScience.submitObservation({
      organismId: activeOrganismId,
      speciesId: twin?.species || null,
      sensorId: 'sensor-default',
      classification: { type: 'observation', confidence: 0.7 },
      notes: 'Citizen science observation',
      confidence: 0.7
    });
    updateCitizenSciencePanel();
    updateVerificationPanel();
  });

  document.getElementById('btn-emergency')?.addEventListener('click', async () => {
    if (!activeOrganismId) return;
    const emg = await emergency.detectEmergency(activeOrganismId);
    if (emg) {
      openFeature('emergency');
    }
  });
}

// ============================================================
// PERIODIC UI UPDATE
// ============================================================
function updateUI() {
  if (!experienceReady) return;
  updateStatsPanel();
  updateEnvironmentPanel();
  updatePredictionPanel();
  updateCitizenSciencePanel();
  updateVerificationPanel();
  knowledgeGraph.populateFromEngines(twinEngine, speciesDB, environmentEngine, experimentLog, relationshipEngine, localDB);
}

// ============================================================
// START
// ============================================================
initLanding();
