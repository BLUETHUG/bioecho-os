// BioEcho OS — Experience-First Application Controller
// 30 engines + Living Interface Language + Ambient World + Sound + Firefly Guide

// ============================================================
// ENGINE INSTANCES (30 scientific + 5 experience)
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
const worldEngine = new LivingWorld('world-canvas');
const ambientEngine = new AmbientEngine();
const soundEngine = new SoundEngine();
let firefly = null;

// ============================================================
// APP STATE
// ============================================================
let pipeline, waveformChart, spectrogramChart, spikeChart, chat;
let isConnected = false, isMonitoring = false;
let sampleCount = 0, spikeCount = 0, connectTime = 0;
let recentWindow = [], lastUIUpdate = 0;
let activeOrganismId = null;
let calibrationResult = null;
let activeSource = null;
let experienceReady = false;

// ============================================================
// CINEMATIC LANDING
// ============================================================
async function initLanding() {
  const landing = document.getElementById('landing');
  const seed = document.getElementById('landing-seed');

  seed.addEventListener('click', async () => {
    seed.style.pointerEvents = 'none';
    landing.classList.add('growing');

    await worldEngine.initialize();
    worldEngine.start();

    if (await soundEngine.initialize()) {
      soundEngine.playGrowth();
    }

    setTimeout(() => {
      landing.classList.add('hidden');
      document.getElementById('app').classList.add('active');
      experienceReady = true;
      initApp();
    }, 2200);
  });
}

// ============================================================
// MAIN APP INIT
// ============================================================
async function initApp() {
  // Update LDL ambient
  ambientEngine.update();
  const palette = LDL.seasons[LDL.currentSeason];
  document.documentElement.style.setProperty('--ldl-primary', palette.leaf);

  // Init firefly guide
  firefly = new FireflyGuide(worldEngine, soundEngine);
  await firefly.appear(worldEngine.width * 0.8, worldEngine.height * 0.25);
  worldEngine.onWorldClick = (x, y) => firefly.onInteraction();

  // Show welcome hint
  setTimeout(() => {
    firefly.showHint('first_visit');
    if (ambientEngine.timeOfDay === 'morning' || ambientEngine.timeOfDay === 'dawn') firefly.showHint('morning');
    if (ambientEngine.timeOfDay === 'night') firefly.showHint('night');
  }, 3000);

  // Start ambient sound
  const ambientConfig = ambientEngine.getAmbientConfig();
  soundEngine.startAmbient(ambientConfig.sound);

  // Load organisms
  loadOrganisms();

  // Setup UI
  setupNavigation();
  setupButtons();

  // Periodic updates
  setInterval(updateUI, 3000);
  setInterval(() => ambientEngine.update(), 60000);
  setInterval(() => {
    const config = ambientEngine.getAmbientConfig();
    document.documentElement.style.setProperty('--ldl-primary', LDL.seasons[LDL.currentSeason].leaf);
  }, 60000);

  // Populate knowledge graph
  knowledgeGraph.populateFromEngines(twinEngine, speciesDB, environmentEngine, experimentLog, relationshipEngine, localDB);
}

// ============================================================
// ORGANISM LIST
// ============================================================
function loadOrganisms() {
  const list = document.getElementById('organism-list');
  const twins = twinEngine.getAll();
  if (twins.length === 0) {
    list.innerHTML = '<div style="font-size:12px;color:var(--ldl-text3);padding:10px;font-weight:300">No organisms yet. Connect a device to begin.</div>';
    return;
  }
  list.innerHTML = twins.map(t => {
    const health = t.state?.healthScore;
    const healthColor = health > 0.7 ? 'var(--ldl-fern)' : health > 0.4 ? 'var(--ldl-sunset)' : '#c0392b';
    const stage = t.lifecycle?.lifecycleStage || 'unknown';
    const icon = t.species === 'pothos' ? '🌿' : t.species === 'monstera-deliciosa' ? '🪴' : t.species === 'spider-plant' ? '🌱' : t.species === 'golden-retriever' ? '🐕' : t.species === 'domestic-cat' ? '🐈' : '🌿';
    return `<div class="ldl-organism ${t.id === activeOrganismId ? 'active' : ''}" data-id="${t.id}">
      <div class="ldl-organism-icon">${icon}</div>
      <div class="ldl-organism-info">
        <div class="ldl-organism-name">${t.name || t.id}</div>
        <div class="ldl-organism-species">${t.species || 'Unknown'}</div>
      </div>
      <div class="ldl-organism-health" style="color:${healthColor}">${health !== undefined ? health.toFixed(2) : '--'}</div>
    </div>`;
  }).join('');

  list.querySelectorAll('.ldl-organism').forEach(el => {
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
  updateActivityFeed();
  updateEnvironmentPanel();
  updateCitizenSciencePanel();
  updateVerificationPanel();

  // Move firefly to organism
  if (firefly) {
    firefly.moveTo(worldEngine.width * 0.15, worldEngine.height * 0.4);
    setTimeout(() => firefly.moveTo(worldEngine.width * 0.8, worldEngine.height * 0.25), 2000);
  }

  if (soundEngine.enabled) soundEngine.playNote(440, 0.2, 'sine');
}

// ============================================================
// IDENTITY PANEL
// ============================================================
function updateIdentityPanel() {
  if (!activeOrganismId) return;
  const section = document.getElementById('identity-section');
  section.style.display = '';
  const identity = twinEngine.getOrganismIdentity(activeOrganismId);
  const twin = twinEngine.getTwin(activeOrganismId);
  if (!identity) return;

  document.getElementById('identity-name').textContent = identity.name || activeOrganismId;
  const stage = identity.lifecycle?.lifecycleStage || 'unknown';
  document.getElementById('identity-stage').innerHTML = `<span class="ldl-stage ldl-stage-${stage}">${stage}</span>`;
  document.getElementById('id-species').textContent = identity.species || '--';
  document.getElementById('id-age').textContent = identity.createdAt ? Math.floor((Date.now() - identity.createdAt) / 86400000) + 'd' : '--';
  document.getElementById('id-events').textContent = twin?.events?.length || 0;

  localDB.getProvenanceByOrganism(activeOrganismId, 10000).then(prov => {
    document.getElementById('id-provenance').textContent = prov.length + ' chains';
  }).catch(() => {});

  const transEl = document.getElementById('lifecycle-transitions');
  const transitions = twinEngine.getStageHistory(activeOrganismId);
  document.getElementById('lifecycle-section').style.display = transitions.length > 0 ? '' : 'none';
  transEl.innerHTML = transitions.slice(-5).reverse().map(t =>
    `<div class="ldl-row"><span class="ldl-row-key">${t.from || 'init'} → ${t.stage}</span><span class="ldl-row-value" style="font-size:10px">${new Date(t.time).toLocaleDateString()}</span></div>`
  ).join('');
}

// ============================================================
// STATS PANEL
// ============================================================
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
  healthBar.style.background = health > 0.7 ? 'var(--ldl-fern)' : health > 0.4 ? 'var(--ldl-sunset)' : '#c0392b';
}

// ============================================================
// ENVIRONMENT PANEL
// ============================================================
function updateEnvironmentPanel() {
  const ctx = environmentEngine.getContext();
  document.getElementById('env-light').textContent = ctx.lightPhase || '--';
  document.getElementById('env-soil').textContent = ctx.current?.soilMoisture !== undefined ? ctx.current.soilMoisture.toFixed(0) + '%' : '--';
  document.getElementById('env-season').textContent = ctx.season || '--';
  document.getElementById('env-greeting').textContent = ambientEngine.getGreeting();
}

// ============================================================
// PREDICTION PANEL
// ============================================================
function updatePredictionPanel() {
  if (!activeOrganismId) return;
  predictiveEngine.predictNextEvent(activeOrganismId).then(pred => {
    const el = document.getElementById('prediction-content');
    if (pred && pred.type !== 'no_prediction') {
      el.innerHTML = `<div style="color:var(--ldl-fern);font-weight:400">${pred.type.replace(/_/g, ' ')}</div>
        <div style="color:var(--ldl-text3);font-size:11px;margin-top:3px;font-weight:300">${pred.reasoning?.join('; ') || ''}</div>
        <div style="color:var(--ldl-sunset);font-size:11px;margin-top:5px;font-weight:300">${pred.recommendedAction || ''}</div>`;
    } else {
      el.textContent = 'No predictions — monitoring...';
    }
  }).catch(() => {});
}

// ============================================================
// ACTIVITY FEED
// ============================================================
function updateActivityFeed() {
  if (!activeOrganismId) return;
  const twin = twinEngine.getTwin(activeOrganismId);
  if (!twin) return;
  const events = (twin.events || []).slice(-8).reverse();
  const el = document.getElementById('activity-feed');
  el.innerHTML = events.map(e => {
    const icon = e.type === 'spike' ? '⚡' : e.type === 'rest' ? '🌙' : '📊';
    return `<div class="ldl-row"><span class="ldl-row-key">${icon} ${e.type || 'event'}</span><span class="ldl-row-value" style="font-size:10px">${new Date(e.timestamp).toLocaleTimeString()}</span></div>`;
  }).join('') || '<div style="font-size:12px;color:var(--ldl-text3);font-weight:300">No activity yet</div>';
}

// ============================================================
// CITIZEN SCIENCE PANEL
// ============================================================
function updateCitizenSciencePanel() {
  citizenScience.getContributionStats('local-user').then(stats => {
    document.getElementById('stat-reputation').textContent = stats.reputationScore;
    document.getElementById('stat-contributions').textContent = stats.totalObservations;
    const badgesEl = document.getElementById('badges-container');
    const allBadges = Array.from(citizenScience.badges.values());
    badgesEl.innerHTML = allBadges.map(b => {
      const earned = b.unlockedFor?.has('local-user');
      return `<span class="ldl-badge ${earned ? 'earned' : ''}">${b.name}</span>`;
    }).join('');
  }).catch(() => {});
}

// ============================================================
// VERIFICATION PANEL
// ============================================================
function updateVerificationPanel() {
  const stats = verificationChain.getStats();
  document.getElementById('stat-chains').textContent = stats.totalChains;
  document.getElementById('stat-confidence').textContent = (stats.avgConfidence * 100).toFixed(0) + '%';
}

// ============================================================
// NAVIGATION
// ============================================================
function setupNavigation() {
  document.querySelectorAll('.ldl-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ldl-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (soundEngine.enabled) soundEngine.playNote(600, 0.1, 'sine');
    });
  });
}

// ============================================================
// BUTTON HANDLERS
// ============================================================
function setupButtons() {
  // Connect
  document.getElementById('btn-connect')?.addEventListener('click', async () => {
    if (isConnected) { hal.disconnect(); return; }
    try {
      const result = await hal.connect();
      if (result.success) {
        isConnected = true;
        document.getElementById('status-dot').classList.remove('offline');
        document.getElementById('status-text').textContent = 'Connected';
        document.getElementById('btn-connect').textContent = 'Disconnect';
        if (soundEngine.enabled) soundEngine.playNote(523, 0.3, 'sine');
        log('Device connected');
      }
    } catch (e) { log('Connection failed: ' + e.message); }
  });

  // Start monitoring
  document.getElementById('btn-start')?.addEventListener('click', () => {
    if (isMonitoring) { stopMonitoring(); return; }
    startMonitoring();
  });

  // Scan with Lens
  document.getElementById('btn-scan')?.addEventListener('click', async () => {
    if (lens.isCapturing) { lens.stopCamera(); lens.stopScanning(); document.getElementById('btn-scan').textContent = 'Scan with Lens'; return; }
    document.getElementById('btn-scan').textContent = 'Starting...';
    const init = await lens.initialize('lens-video', 'lens-canvas');
    if (!init) { document.getElementById('btn-scan').textContent = 'Scan with Lens'; return; }
    const cam = await lens.startCamera();
    if (!cam.success) { document.getElementById('btn-scan').textContent = 'Scan with Lens'; return; }
    document.getElementById('btn-scan').textContent = 'Scanning...';
    const scanLoop = async () => {
      if (!lens.isCapturing) return;
      const result = await lens.scan(activeOrganismId);
      if (result && firefly) {
        const sp = result.recognition?.matchedSpecies;
        if (sp) firefly.say(`Identified: ${sp.commonName}`, 4000);
      }
      requestAnimationFrame(scanLoop);
    };
    requestAnimationFrame(scanLoop);
  });

  // Submit observation
  document.getElementById('btn-submit-obs')?.addEventListener('click', async () => {
    if (!activeOrganismId) return;
    const twin = twinEngine.getTwin(activeOrganismId);
    const state = twin?.state || {};
    const result = await citizenScience.submitObservation({
      organismId: activeOrganismId,
      speciesId: twin?.species || null,
      sensorId: 'sensor-default',
      classification: { type: 'observation', confidence: 0.7 },
      notes: 'Citizen science observation',
      confidence: 0.7
    });
    updateCitizenSciencePanel();
    updateVerificationPanel();
    if (soundEngine.enabled) soundEngine.playNote(880, 0.2, 'sine');
    if (firefly) firefly.say('Observation submitted. Thank you for contributing to science.', 4000);
    log('Observation submitted');
  });

  // Export
  document.getElementById('btn-export')?.addEventListener('click', async () => {
    if (!activeOrganismId) return;
    const data = await identityLayer.exportIdentity(activeOrganismId);
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bioecho-${activeOrganismId}.json`;
    a.click();
    log('Data exported');
  });

  // Emergency
  document.getElementById('btn-emergency')?.addEventListener('click', async () => {
    if (!activeOrganismId) return;
    const emg = await emergency.detectEmergency(activeOrganismId);
    if (emg) {
      if (firefly) firefly.say(`Emergency: ${emg.type} (${emg.severity}). First aid: ${emg.firstAid?.steps?.[0] || 'Check organism immediately'}`, 8000);
      if (soundEngine.enabled) { soundEngine.playNote(200, 0.5, 'sawtooth'); setTimeout(() => soundEngine.playNote(150, 0.5, 'sawtooth'), 600); }
    } else {
      if (firefly) firefly.say('No emergency detected. Organism appears stable.', 3000);
    }
  });
}

// ============================================================
// MONITORING
// ============================================================
function startMonitoring() {
  if (!isConnected) { log('Connect a device first'); return; }
  isMonitoring = true;
  document.getElementById('btn-start').textContent = 'Stop Monitoring';
  document.getElementById('btn-start').classList.add('ldl-btn-danger');
  log('Monitoring started');
}

function stopMonitoring() {
  isMonitoring = false;
  document.getElementById('btn-start').textContent = 'Start Monitoring';
  document.getElementById('btn-start').classList.remove('ldl-btn-danger');
  log('Monitoring stopped');
}

// ============================================================
// PERIODIC UI UPDATE
// ============================================================
function updateUI() {
  if (!experienceReady) return;
  updateStatsPanel();
  updateEnvironmentPanel();
  updatePredictionPanel();
  updateActivityFeed();
  updateVerificationPanel();
  knowledgeGraph.populateFromEngines(twinEngine, speciesDB, environmentEngine, experimentLog, relationshipEngine, localDB);
}

// ============================================================
// LOGGING
// ============================================================
function log(msg) {
  console.log('[BioEcho]', msg);
  if (firefly && experienceReady) {
    firefly.onInteraction();
  }
}

// ============================================================
// START
// ============================================================
initLanding();
