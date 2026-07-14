// BioEcho OS — Main Application Controller (11 Engines)

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
const UI_FPS = 30;

// ============================================================
// INIT
// ============================================================
function init() {
  waveformChart = new WaveformChart('waveform-canvas');
  spectrogramChart = new SpectrogramChart('spectrogram-canvas');
  spikeChart = new SpikeChart('spike-canvas');
  pipeline = new DspPipeline(250);
  chat = new ChatEngine('chat-messages');

  // Initialize local database and identity layer
  localDB.init().then(async () => {
    await identityLayer.init();
    log('Local database + identity layer initialized');
    updateDBStats();
    // Populate knowledge graph from engines
    knowledgeGraph.populateFromEngines(twinEngine, speciesDB, environmentEngine, experimentLog, relationshipEngine, localDB);
    updateKnowledgeGraphUI();
  }).catch(() => log('LocalDB init failed'));

  // Create default organism if none exist
  if (twinEngine.getAll().length === 0) {
    const org = twinEngine.create('org-1', 'Plant #42', 'epipremnum-aureum', 'plant');
    activeOrganismId = org.id;
  } else {
    activeOrganismId = twinEngine.getAll()[0].id;
  }

  // Set up default relationship
  const userId = 'user-default';
  if (!relationshipEngine.getRelationship(userId, activeOrganismId)) {
    relationshipEngine.createRelationship(userId, activeOrganismId, 'owner', {
      name: 'Plant #42',
      adoptionDate: Date.now()
    });
  }

  setupScreens();
  setupAppControls();
  setupNewTabs();
  updateClock();
  setInterval(updateClock, 1000);
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

function setupScreens() {
  // Connection options
  document.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', () => connectDevice(opt.dataset.source));
  });

  // Calibration buttons
  document.getElementById('btn-skip-cal').addEventListener('click', () => startMonitoring());
  document.getElementById('btn-start-monitoring').addEventListener('click', () => startMonitoring());
}

// ============================================================
// DEVICE CONNECTION
// ============================================================
async function connectDevice(sourceId) {
  const msg = document.getElementById('connect-msg');
  msg.className = 'status-msg'; msg.textContent = 'Connecting...';

  try {
    const source = await hal.connect(sourceId);
    isConnected = true;
    activeSource = source;
    pipeline = new DspPipeline(source.sampleRate);
    document.getElementById('sample-rate-label').textContent = source.sampleRate + ' Hz';

    // Go to calibration
    showScreen('calibrate');
    runCalibration(source);
  } catch (err) {
    msg.className = 'status-msg error';
    msg.textContent = err.name === 'NotFoundError' ? 'No device selected.' : err.message;
  }
}

// ============================================================
// CALIBRATION
// ============================================================
async function runCalibration(source) {
  const status = document.getElementById('cal-status');
  const fill = document.getElementById('cal-progress-fill');
  const resultsDiv = document.getElementById('cal-results');

  calibration.onProgress = (p, msg) => {
    fill.style.width = (p * 100) + '%';
    status.textContent = msg;
  };

  try {
    calibrationResult = await calibration.runCalibration(source, 3000);
    fill.style.width = '100%';
    status.textContent = 'Calibration complete';

    // Show results
    resultsDiv.classList.remove('hidden');
    document.getElementById('cal-score').textContent = calibrationResult.score + '/100';
    document.getElementById('cal-grade').textContent =
      calibrationResult.quality === 'good' ? 'Good Signal Quality' :
      calibrationResult.quality === 'fair' ? 'Fair — Some Issues Detected' : 'Poor — Check Connections';
    document.getElementById('cal-grade').className = 'cal-grade cal-' + calibrationResult.quality;

    document.getElementById('cal-details').innerHTML = [
      `DC Offset: ${calibrationResult.dcOffset} µV`,
      `RMS Noise: ${calibrationResult.rmsNoise} µV`,
      `Peak-to-Peak: ${calibrationResult.peakToPeak} µV`,
      `Mains Interference: ${(calibrationResult.mainsInterference * 100).toFixed(1)}%`,
      `Saturation: ${calibrationResult.saturationPct}%`
    ].map(d => `<div class="cal-detail">${d}</div>`).join('');

    document.getElementById('cal-recommendations').innerHTML =
      calibrationResult.recommendations.map(r => `<div class="cal-rec">${r}</div>`).join('');

    document.getElementById('btn-start-monitoring').classList.remove('hidden');
    document.getElementById('cal-badge').textContent = 'Cal: ' + calibrationResult.score;
    document.getElementById('cal-badge').className = 'topbar-chip cal-' + calibrationResult.quality;
  } catch (err) {
    status.textContent = 'Calibration failed: ' + err.message;
    document.getElementById('btn-start-monitoring').classList.remove('hidden');
  }
}

// ============================================================
// START MONITORING
// ============================================================
function startMonitoring() {
  isMonitoring = true;
  connectTime = Date.now();
  sampleCount = 0;
  spikeCount = 0;
  recentWindow = [];
  pipeline.reset();

  showScreen('app');
  waveformChart.resize();
  spectrogramChart.resize();
  spikeChart.resize();

  // Start experiment
  const source = hal.getActive();
  activeSource = source;
  experimentLog.startSession(activeOrganismId, {
    species: twinEngine.getTwin(activeOrganismId)?.species || '',
    sensorType: source?.type || 'unknown',
    calibrationScore: calibrationResult?.score ?? null,
    sampleRate: source?.sampleRate || 250
  });

  // Connect data handler
  hal.onSample = handleSample;
  hal.onSourceDisconnected = () => {
    isMonitoring = false;
    document.getElementById('live-indicator').className = 'live-off';
    document.getElementById('log-line').textContent = 'Device disconnected';
    experimentLog.endSession();
  };

  document.getElementById('device-label').textContent = source?.name || 'Device';
  document.getElementById('live-indicator').className = 'live-on';
  document.getElementById('log-line').textContent = 'Monitoring started';

  chat.addMessage({ type: 'event', text: `Monitoring started. Signal processing pipeline active at ${source?.sampleRate || 250} Hz.`, time: Date.now() });

  // Persist experiment to local DB
  const session = experimentLog.getActive();
  if (session) {
    localDB.saveExperiment({ ...session, organismId: activeOrganismId }).catch(() => {});
  }

  // Refresh relationship UI
  updateRelationshipsUI();
  updateEnvironmentUI();

  requestAnimationFrame(mainLoop);
}

// ============================================================
// DATA HANDLER — Every sample passes through all 10 engines
// ============================================================
function handleSample(raw) {
  if (!isMonitoring || !isConnected) return;

  // 1. DSP Pipeline (Engine: Signal Processing)
  const result = pipeline.process(raw.value);

  // 2. Push to charts
  waveformChart.push(raw.value, result.filtered);
  waveformChart.setThreshold(pipeline.detector.threshold * pipeline.gain);
  recentWindow.push(result.filtered);
  if (recentWindow.length > 500) recentWindow.shift();

  sampleCount++;
  experimentLog.recordSamples(1);

  // 3. Update environment with any sensor data from device
  if (raw.env) {
    environmentEngine.update(raw.env);
    updateEnvironmentUI();
  }

  // 4. Spike Detection
  if (result.spike) {
    spikeCount++;

    // Extract spike window
    const pre = Math.min(60, recentWindow.length);
    const window = recentWindow.slice(recentWindow.length - pre, recentWindow.length + 140);
    spikeChart.setData(window);

    // Feature Extraction
    const features = extractSpikeFeatures(window, pipeline.sampleRate);
    if (!features) return;

    // 5. Context Engine — gather organism, species, environment, history
    const context = contextEngine.getContext(activeOrganismId);

    // 6. Meaning Engine — interpret with evidence chain
    const explanation = meaningEngine.interpret(
      classify(features), features, context, calibrationResult
    );

    // 7. Evidence Validator — validate BEFORE recording
    const signalStats = {
      recentSpikeCount: spikeCount,
      periodicity: 0,
      periodicityFreq: 0
    };
    const evidenceResult = evidenceValidator.validate(
      { features, confidence: explanation.confidence, classification: explanation.classification },
      signalStats,
      context
    );

    // Update evidence UI
    updateEvidenceUI(evidenceResult);

    // 8. If rejected by evidence validator, skip recording but log it
    if (!evidenceResult.valid) {
      chat.addMessage({
        type: 'warning',
        text: `Signal rejected: ${evidenceResult.rejectionReason}`,
        time: Date.now()
      });
      return;
    }

    // 9. Digital Twin — record event (with adjusted confidence)
    const event = {
      time: Date.now(),
      type: 'spike',
      classification: explanation.classification,
      confidence: evidenceResult.adjustedConfidence,
      originalConfidence: explanation.confidence,
      confidencePenalty: evidenceResult.confidencePenalty,
      features,
      amplitude: result.spike.amplitude,
      snr: result.spike.snr,
      noiseFloor: result.spike.noiseFloor,
      artifacts: evidenceResult.artifacts,
      explanation: {
        statement: explanation.statement,
        evidenceChain: explanation.evidenceChain,
        physics: explanation.physics,
        scientificRef: explanation.scientificRef,
        guidance: explanation.guidance
      }
    };
    twinEngine.recordEvent(activeOrganismId, event);
    twinEngine.updateBaseline(activeOrganismId, features.amplitude, features.dominantFreq, result.spike.noiseFloor);

    // 9b. Living Identity — provenance chain
    const provenance = identityLayer.createProvenance(
      event.time,
      activeSource?.name || 'unknown',
      calibrationResult,
      { filterSettings: pipeline.filtersOn ? 'enabled' : 'disabled', threshold: pipeline.detector.thresholdMult + 'x MAD' },
      evidenceResult,
      'classifier-v1'
    );
    provenance.organismId = activeOrganismId;
    localDB.saveProvenance(provenance).catch(() => {});

    // 9c. Living Identity — periodic state snapshot
    identityLayer.recordSnapshot(activeOrganismId, twinEngine._buildSnapshot(twinEngine.getTwin(activeOrganismId)));

    // 10. Experiment Log — record
    experimentLog.recordEvent(event);

    // 11. Local Database — persist
    localDB.saveEvent({ ...event, organismId: activeOrganismId }).catch(() => {});

    // 12. Relationship Engine — log observation activity
    const relId = `user-default-${activeOrganismId}`;
    if (relationshipEngine.getRelationship('user-default', activeOrganismId)) {
      relationshipEngine.recordActivity(relId, 'observation', {
        classification: explanation.classification,
        confidence: evidenceResult.adjustedConfidence
      });
    }

    // 13. Waveform spike marker
    waveformChart.addSpike(spikeCount, result.spike.amplitude);

    // 14. Chat — only significant events
    if (explanation.confidence > 0.5 && explanation.classification !== 'resting') {
      logEvent(event, explanation);
    }

    // 15. Update explainability panel
    updateExplainPanel(explanation);
  }

  // Spectrogram update (every 8 samples)
  if (sampleCount % 8 === 0) updateSpectrogram();
}

// ============================================================
// CLASSIFIER
// ============================================================
function classify(features) {
  const twin = twinEngine.getTwin(activeOrganismId);
  const baseline = twin?.baseline || { amplitude: 5, freq: 0.5 };
  const scores = {};

  if (features.amplitude < baseline.amplitude * 1.5) {
    scores.resting = 0.7 + (1 - features.amplitude / (baseline.amplitude * 1.5)) * 0.3;
  }
  if (features.amplitude > baseline.amplitude * 2 && features.dominantFreq < baseline.freq * 0.6) {
    scores.water_stress = Math.min(0.92, 0.4 + features.amplitude / (baseline.amplitude * 6) * 0.3);
  }
  if (features.amplitude > baseline.amplitude * 3 && features.riseTime < 80 && features.duration < 300) {
    scores.touch_response = Math.min(0.90, 0.35 + features.amplitude / (baseline.amplitude * 5) * 0.3);
  }
  if (features.amplitude > baseline.amplitude * 5 && features.duration > 400) {
    scores.wounding = Math.min(0.95, 0.5 + features.amplitude / (baseline.amplitude * 8) * 0.25);
  }

  const best = Object.entries(scores).sort((a,b) => b[1] - a[1])[0];
  if (!best || best[1] < 0.5) return 'unknown';
  return best[0];
}

// ============================================================
// CHAT LOGGING — Evidence-backed
// ============================================================
function logEvent(event, explanation) {
  const confClass = explanation.confidence > 0.85 ? 'high' : explanation.confidence > 0.7 ? 'med' : 'low';
  const confTag = `<span class="confidence-tag ${confClass}">${(explanation.confidence*100).toFixed(0)}%</span>`;

  const evidenceRows = explanation.evidence.slice(0, 6).map(e => {
    const cls = e.trend === 'up' ? 'ev-up' : e.trend === 'down' ? 'ev-down' : 'ev-stable';
    return `<tr><td>${e.label}</td><td>${e.value}</td><td class="${cls}">${e.trend}</td></tr>`;
  }).join('');

  const ref = explanation.scientificRef
    ? `<div class="chat-ref">Ref: ${explanation.scientificRef.paper}</div>` : '';

  const guidance = explanation.guidance
    ? `<div class="chat-guidance">→ ${explanation.guidance.action} (${explanation.guidance.urgency})</div>` : '';

  const labels = {
    water_stress: 'Water Stress', touch_response: 'Touch Response',
    wounding: 'Wounding Signal', resting: 'Resting State', unknown: 'Unknown Pattern'
  };
  const type = event.classification === 'wounding' ? 'warning' : 'event';

  chat.addMessage({
    type,
    text: `${labels[event.classification] || event.classification} ${confTag}`,
    evidence: `<table>${evidenceRows}</table>${ref}${guidance}`,
    time: event.time
  });
}

// ============================================================
// EXPLAINABILITY PANEL
// ============================================================
function updateExplainPanel(explanation) {
  const container = document.getElementById('explain-content');
  const chain = explanation.evidenceChain.map(s =>
    `<div class="explain-step"><span class="explain-step-title">${s.step}</span><span class="explain-step-detail">${s.detail}</span></div>`
  ).join('');

  const physics = explanation.physics.map(p =>
    `<div class="explain-physics">• ${p}</div>`
  ).join('');

  const ref = explanation.scientificRef
    ? `<div class="explain-ref"><strong>Reference:</strong> ${explanation.scientificRef.paper}<br><em>${explanation.scientificRef.title}</em></div>`
    : '';

  const guidance = explanation.guidance
    ? `<div class="explain-guidance"><strong>Recommendation:</strong> ${explanation.guidance.action}<br><em>${explanation.guidance.rationale}</em></div>`
    : '';

  const confBreakdown = Object.entries(explanation.confidenceBreakdown).map(([k,v]) =>
    `<span class="explain-conf-item">${k}: ${v > 0 ? '+' : ''}${(v*100).toFixed(0)}%</span>`
  ).join(' ');

  container.innerHTML = `
    <div class="explain-header">
      <span class="explain-cls">${explanation.classification}</span>
      <span class="explain-conf">${(explanation.confidence*100).toFixed(0)}% confidence</span>
    </div>
    <div class="explain-statement">${explanation.statement}</div>
    <div class="explain-section">
      <div class="explain-section-title">Evidence Chain</div>
      ${chain}
    </div>
    <div class="explain-section">
      <div class="explain-section-title">Physics</div>
      ${physics}
    </div>
    ${ref}
    ${guidance}
    <div class="explain-section">
      <div class="explain-section-title">Confidence Breakdown</div>
      <div class="explain-conf-breakdown">${confBreakdown || 'Base confidence only'}</div>
    </div>
  `;
}

// ============================================================
// SPECTROGRAM
// ============================================================
function updateSpectrogram() {
  const data = waveformChart.filteredData;
  if (data.length < 128) return;
  const win = data.slice(-128);
  const fft = new FFT(128);
  const complex = fft.createComplexArray();
  fft.toComplexArray(win, complex);
  fft.transform(complex, complex);
  const freqs = [];
  for (let i = 0; i < 64; i++) {
    freqs.push(Math.sqrt(complex[2*i]**2 + complex[2*i+1]**2) / 128);
  }
  spectrogramChart.pushFrame(freqs);
}

// ============================================================
// MAIN LOOP
// ============================================================
function mainLoop() {
  if (!isMonitoring) return;
  const now = performance.now();
  if (now - lastUIUpdate > 1000 / UI_FPS) {
    lastUIUpdate = now;
    waveformChart.render();
    spectrogramChart.render();
    spikeChart.render();
    updateStats();
  }
  requestAnimationFrame(mainLoop);
}

// ============================================================
// STATS
// ============================================================
function updateStats() {
  const elapsed = (Date.now() - connectTime) / 1000;
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = Math.floor(elapsed % 60);

  const twin = twinEngine.getTwin(activeOrganismId);
  document.getElementById('s-health').textContent = twin ? twin.state.healthScore.toFixed(2) : '--';
  document.getElementById('s-stress').textContent = twin ? twin.state.stressIndex.toFixed(2) : '--';
  document.getElementById('s-rate').textContent = twin ? twin.state.spikeRate.toFixed(1) : '--';
  document.getElementById('s-snr').textContent = twin && twin.baseline.noise > 0
    ? (20 * Math.log10(twin.baseline.amplitude / twin.baseline.noise)).toFixed(1) : '--';
  document.getElementById('s-samples').textContent = sampleCount.toLocaleString();
  document.getElementById('s-spikes').textContent = spikeCount;
  document.getElementById('s-uptime').textContent = `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  document.getElementById('s-baseline').textContent = twin ? twin.baseline.noise.toFixed(1) + ' µV' : '--';
  document.getElementById('s-threshold').textContent = pipeline.detector.thresholdMult + '× MAD';
}

// ============================================================
// APP CONTROLS
// ============================================================
function setupAppControls() {
  document.getElementById('filter-toggle').addEventListener('change', e => { pipeline.filtersOn = e.target.checked; });
  document.getElementById('notch-toggle').addEventListener('change', e => { pipeline.notchOn = e.target.checked; });

  document.getElementById('btn-scale-auto').addEventListener('click', () => {
    waveformChart.autoScale = true;
    document.getElementById('btn-scale-auto').classList.add('active');
    document.getElementById('btn-scale-fixed').classList.remove('active');
  });
  document.getElementById('btn-scale-fixed').addEventListener('click', () => {
    waveformChart.autoScale = false; waveformChart.yMin = -20; waveformChart.yMax = 20;
    document.getElementById('btn-scale-fixed').classList.add('active');
    document.getElementById('btn-scale-auto').classList.remove('active');
  });

  document.getElementById('btn-disconnect').addEventListener('click', async () => {
    await hal.disconnect();
    isMonitoring = false;
    isConnected = false;
    if (experimentLog.getActive()) experimentLog.endSession();
    showScreen('connect');
    document.getElementById('connect-msg').textContent = '';
    waveformChart.clear();
    spectrogramChart.spectrum = [];
    spikeChart.setData([]);
  });

  document.getElementById('btn-new-experiment').addEventListener('click', () => {
    if (experimentLog.getActive()) experimentLog.endSession();
    const source = hal.getActive();
    experimentLog.startSession(activeOrganismId, {
      species: twinEngine.getTwin(activeOrganismId)?.species || '',
      sensorType: source?.type || 'unknown',
      calibrationScore: calibrationResult?.score ?? null,
      sampleRate: source?.sampleRate || 250
    });
    document.getElementById('log-line').textContent = 'New experiment started';
    chat.addMessage({ type: 'event', text: 'New experiment session started.', time: Date.now() });
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    const csv = experimentLog.exportCSV();
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bioecho-${Date.now()}.csv`;
    a.click();
    log('Exported experiment to CSV');
  });

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('pane-' + tab.dataset.tab).classList.add('active');
    });
  });

  // Update experiment list
  setInterval(() => {
    const sessions = experimentLog.getSessions();
    const active = experimentLog.getActive();
    const list = document.getElementById('experiment-list');
    const status = document.getElementById('exp-status');

    if (active) {
      status.textContent = `Active: ${active.id} (${active.events.length} events)`;
      status.className = 'exp-active';
    } else {
      status.textContent = 'No active experiment';
      status.className = 'exp-inactive';
    }

    list.innerHTML = sessions.slice(-10).reverse().map(s => `
      <div class="exp-item">
        <span class="exp-id">${s.id}</span>
        <span class="exp-events">${s.events.length} events</span>
        <span class="exp-time">${new Date(s.startTime).toLocaleDateString()}</span>
      </div>
    `).join('');
  }, 2000);
}

function log(msg) {
  document.getElementById('log-line').textContent = msg;
  document.getElementById('log-time').textContent = new Date().toLocaleTimeString();
}

function updateClock() {
  const el = document.getElementById('clock');
  if (el) el.textContent = new Date().toLocaleTimeString();
}

// ============================================================
// NEW TAB FUNCTIONS — Environment, Relationships, Evidence, DB
// ============================================================
function setupNewTabs() {
  // Activity button
  document.getElementById('btn-add-activity').addEventListener('click', () => {
    const relId = `user-default-${activeOrganismId}`;
    const types = ['watering', 'feeding', 'observation', 'pruning', 'photo'];
    const type = types[Math.floor(Math.random() * types.length)];
    relationshipEngine.recordActivity(relId, type, { manual: true });
    updateRelationshipsUI();
    log(`Logged activity: ${type}`);
  });

  // Initial UI updates
  updateEnvironmentUI();
  updateRelationshipsUI();
  updateEvidenceUI(null);
  updateIdentityUI();
  updateVerificationUI();
  updateCitizenScienceUI();
  updatePredictiveUI();
  updateResearchUI();
  updateSearchUI();
  updateEarthUI();
  updateTimeMachineUI();
  updateEmergencyUI();
  updateMarketplaceUI();

  // Export identity button
  document.getElementById('btn-export-identity')?.addEventListener('click', async () => {
    if (!activeOrganismId) return;
    const data = await identityLayer.exportIdentity(activeOrganismId);
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bioecho-identity-${activeOrganismId}.json`;
    a.click();
    log('Identity exported');
  });

  // Update identity UI periodically
  setInterval(updateIdentityUI, 5000);

  // Refresh knowledge graph button
  document.getElementById('btn-refresh-graph')?.addEventListener('click', () => {
    knowledgeGraph.populateFromEngines(twinEngine, speciesDB, environmentEngine, experimentLog, relationshipEngine, localDB);
    updateKnowledgeGraphUI();
    log('Knowledge graph refreshed');
  });

  // Update knowledge graph periodically
  setInterval(() => {
    knowledgeGraph.populateFromEngines(twinEngine, speciesDB, environmentEngine, experimentLog, relationshipEngine, localDB);
    updateKnowledgeGraphUI();
  }, 15000);

  // Lens button (topbar)
  document.getElementById('btn-lens')?.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelector('.tab[data-tab="lens"]')?.classList.add('active');
    document.getElementById('pane-lens')?.classList.add('active');
  });

  // Lens scan button
  document.getElementById('btn-start-scan')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-start-scan');
    if (lens.isCapturing) {
      lens.stopCamera();
      lens.stopScanning();
      btn.textContent = 'Start Scan';
      document.getElementById('lens-result').innerHTML = '<div class="lens-empty">Camera stopped</div>';
      return;
    }
    btn.textContent = 'Initializing...';
    const init = await lens.initialize('lens-video', 'lens-canvas');
    if (!init) { btn.textContent = 'Start Scan'; return; }
    const cam = await lens.startCamera();
    if (!cam.success) {
      btn.textContent = 'Start Scan';
      document.getElementById('lens-result').innerHTML = `<div class="lens-empty">${cam.error}</div>`;
      return;
    }
    btn.textContent = 'Scanning...';

    const scanLoop = async () => {
      if (!lens.isCapturing) return;
      const result = await lens.scan(activeOrganismId);
      if (result) updateLensUI(result);
      requestAnimationFrame(scanLoop);
    };
    requestAnimationFrame(scanLoop);
  });
}

// ============================================================
// ENVIRONMENT UI
// ============================================================
function updateEnvironmentUI() {
  const ctx = environmentEngine.getContext();
  document.getElementById('env-light-phase').textContent = ctx.lightPhase || '--';
  document.getElementById('env-sunrise').textContent = ctx.sunriseHour ? `${ctx.sunriseHour}h` : '--';
  document.getElementById('env-sunset').textContent = ctx.sunsetHour ? `${ctx.sunsetHour}h` : '--';
  document.getElementById('env-daylength').textContent = ctx.dayLength ? `${ctx.dayLength}h` : '--';
  document.getElementById('env-season').textContent = ctx.season || '--';

  const cur = ctx.current;
  document.getElementById('env-temp').textContent = cur.temperature !== null ? `${cur.temperature.toFixed(1)}°C` : '--';
  document.getElementById('env-humidity').textContent = cur.humidity !== null ? `${cur.humidity.toFixed(0)}%` : '--';
  document.getElementById('env-soil').textContent = cur.soilMoisture !== null ? `${cur.soilMoisture.toFixed(0)}%` : '--';
  document.getElementById('env-light').textContent = cur.lightLevel !== null ? `${cur.lightLevel.toFixed(0)} lux` : '--';

  const tempTrend = environmentEngine.getTrend('temperature');
  const soilTrend = environmentEngine.getTrend('soilMoisture');
  document.getElementById('env-temp-trend').textContent = tempTrend === 'insufficient_data' ? 'Need data' : tempTrend;
  document.getElementById('env-soil-trend').textContent = soilTrend === 'insufficient_data' ? 'Need data' : soilTrend;

  const watering = environmentEngine.predictWateringNeed();
  const waterEl = document.getElementById('env-watering');
  if (!watering) {
    waterEl.textContent = 'No soil sensor data';
    waterEl.className = 'env-watering';
  } else if (watering.needed) {
    waterEl.textContent = `Water needed ${watering.urgency === 'soon' ? '(SOON)' : ''} — ~${watering.estimatedHours}h remaining (moisture: ${watering.currentMoisture.toFixed(0)}%)`;
    waterEl.className = 'env-watering ' + watering.urgency;
  } else {
    waterEl.textContent = `Soil moisture adequate (${watering.currentMoisture?.toFixed(0) || '--'}%)`;
    waterEl.className = 'env-watering';
  }
}

// ============================================================
// RELATIONSHIPS UI
// ============================================================
function updateRelationshipsUI() {
  const userId = 'user-default';
  const rels = relationshipEngine.getRelationshipsForUser(userId);
  const rel = rels.find(r => r.organismId === activeOrganismId);

  if (!rel) {
    document.getElementById('rel-organism-name').textContent = 'No organism selected';
    document.getElementById('rel-recs-list').textContent = 'Connect to see care recommendations';
    document.getElementById('rel-activity-list').innerHTML = '';
    document.getElementById('rel-milestone-list').innerHTML = '';
    return;
  }

  document.getElementById('rel-organism-name').textContent = rel.metadata.name || activeOrganismId;

  // Recommendations
  const recs = relationshipEngine.getRecommendations(rel.id);
  const recsEl = document.getElementById('rel-recs-list');
  if (recs.length === 0) {
    recsEl.textContent = 'No care recommendations yet — activities will build patterns';
  } else {
    recsEl.innerHTML = recs.map(r =>
      `<div class="rel-rec-item ${r.urgency}">${r.message}</div>`
    ).join('');
  }

  // Recent activities
  const activities = rel.activities.slice(-15).reverse();
  const actEl = document.getElementById('rel-activity-list');
  actEl.innerHTML = activities.map(a =>
    `<div class="rel-activity-item"><span class="rel-activity-type">${a.type}</span><span class="rel-activity-time">${new Date(a.time).toLocaleString()}</span></div>`
  ).join('') || '<div style="font-size:11px;color:var(--text3)">No activities yet</div>';

  // Milestones
  const milestones = rel.milestones.slice(-10).reverse();
  const msEl = document.getElementById('rel-milestone-list');
  msEl.innerHTML = milestones.map(m =>
    `<div class="rel-milestone-item"><span class="rel-milestone-desc">${m.description}</span><span class="rel-milestone-date">${new Date(m.date).toLocaleDateString()}</span></div>`
  ).join('') || '<div style="font-size:11px;color:var(--text3)">No milestones recorded</div>';
}

// ============================================================
// EVIDENCE UI
// ============================================================
function updateEvidenceUI(lastResult) {
  const stats = evidenceValidator.getStats();
  document.getElementById('evi-valid').textContent = stats.valid || '--';
  document.getElementById('evi-rejected').textContent = stats.rejected || '--';
  document.getElementById('evi-artifacts').textContent = stats.avgArtifacts ? stats.avgArtifacts.toFixed(1) : '--';
  document.getElementById('evi-validrate').textContent = stats.validRate ? `${(stats.validRate * 100).toFixed(0)}%` : '--';

  const chip = document.getElementById('evi-rate');
  if (stats.validRate < 0.7) {
    chip.textContent = 'POOR';
    chip.className = 'evi-chip warn';
  } else if (stats.validRate < 0.9) {
    chip.textContent = 'FAIR';
    chip.className = 'evi-chip warn';
  } else {
    chip.textContent = 'GOOD';
    chip.className = 'evi-chip';
  }

  // History
  const history = evidenceValidator.validationHistory.slice(-20).reverse();
  const histEl = document.getElementById('evi-history');
  histEl.innerHTML = history.map(h => {
    const cls = h.valid ? 'evi-hist-valid' : 'evi-hist-rejected';
    const label = h.valid ? 'Valid' : 'Rejected';
    return `<div class="evi-history-item"><span class="${cls}">${label}</span><span style="color:var(--text3);font-size:10px">${h.artifactCount} artifacts</span></div>`;
  }).join('') || '<div style="font-size:11px;color:var(--text3);padding:4px">No validations yet</div>';

  // Artifact types
  const typeCounts = {};
  evidenceValidator.validationHistory.forEach(h => {
    h.artifacts.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });
  });
  const typesEl = document.getElementById('evi-artifact-types');
  typesEl.innerHTML = Object.entries(typeCounts).sort((a,b) => b[1] - a[1]).map(([type, count]) =>
    `<span class="evi-artifact-tag${count > 5 ? ' high' : ''}">${type}: ${count}</span>`
  ).join('') || '<div style="font-size:11px;color:var(--text3)">None detected</div>';
}

// ============================================================
// LOCAL DB STATS
// ============================================================
async function updateDBStats() {
  try {
    const stats = await localDB.getStats();
    document.getElementById('s-samples').textContent = stats.events ? stats.events.toLocaleString() : '0';
  } catch {}
}

// ============================================================
// IDENTITY UI
// ============================================================
function updateIdentityUI() {
  if (!activeOrganismId) return;
  const identity = twinEngine.getOrganismIdentity(activeOrganismId);
  const twin = twinEngine.getTwin(activeOrganismId);

  if (!identity) return;

  document.getElementById('id-name').textContent = identity.name || activeOrganismId;

  // Lifecycle stage chip
  const stage = identity.lifecycle?.lifecycleStage || 'unknown';
  const stageEl = document.getElementById('id-stage');
  stageEl.textContent = stage;
  stageEl.className = 'id-chip id-stage-' + stage;

  // Identity fields
  document.getElementById('id-version').textContent = identity.identityVersion || '1';
  document.getElementById('id-species').textContent = identity.species || '--';
  document.getElementById('id-age').textContent = identity.createdAt
    ? Math.floor((Date.now() - identity.createdAt) / 86400000) + ' days'
    : '--';
  document.getElementById('id-acquired').textContent = identity.lifecycle?.acquisitionDate
    ? new Date(identity.lifecycle.acquisitionDate).toLocaleDateString()
    : '--';
  document.getElementById('id-parent').textContent = identity.lifecycle?.parentOrganismId || 'None';
  document.getElementById('id-propagation').textContent = identity.lifecycle?.propagationMethod || 'Unknown';
  document.getElementById('id-location').textContent = identity.location?.latitude
    ? `${identity.location.latitude.toFixed(4)}, ${identity.location.longitude.toFixed(4)}`
    : 'No location set';

  // Lifecycle transitions
  const transitions = twinEngine.getStageHistory(activeOrganismId);
  const transEl = document.getElementById('id-transitions');
  if (transitions.length === 0) {
    transEl.innerHTML = '<div style="font-size:11px;color:var(--text3)">No transitions yet</div>';
  } else {
    transEl.innerHTML = transitions.slice(-10).reverse().map(t =>
      `<div class="rel-activity-item"><span class="rel-activity-type">${t.from || 'init'} → ${t.stage}</span><span class="rel-activity-time">${new Date(t.time).toLocaleString()}</span></div>`
    ).join('');
  }

  // State history (last 10 snapshots from localDB)
  const stateHistoryEl = document.getElementById('id-state-history');
  if (identity.state) {
    stateHistoryEl.innerHTML = `
      <div class="stats-row"><span>Health</span><span>${identity.state.healthScore?.toFixed(2) || '--'}</span></div>
      <div class="stats-row"><span>Stress</span><span>${identity.state.stressIndex?.toFixed(2) || '--'}</span></div>
      <div class="stats-row"><span>Spike Rate</span><span>${identity.state.spikeRate?.toFixed(1) || '--'}/min</span></div>
      <div class="stats-row"><span>Growth Rate</span><span>${identity.state.growthRate?.toFixed(3) || '0.000'}</span></div>
      <div class="stats-row"><span>Energy Balance</span><span>${identity.state.energyBalance?.toFixed(1) || '100.0'}</span></div>
    `;
  }

  // Provenance count
  localDB.getProvenanceByOrganism(activeOrganismId, 10000).then(prov => {
    document.getElementById('id-prov-count').textContent = prov.length || '0';
    document.getElementById('id-integrity').textContent = prov.length > 0 ? 'Chained' : 'No provenance yet';
  }).catch(() => {});

  // Life events count
  document.getElementById('id-state-history').innerHTML += `
    <div class="stats-row" style="margin-top:8px;border-top:1px solid var(--border);padding-top:6px"><span>Events Recorded</span><span>${identity.eventsCount || 0}</span></div>
    <div class="stats-row"><span>Life Events</span><span>${identity.lifeEventsCount || 0}</span></div>
  `;
}

// ============================================================
// KNOWLEDGE GRAPH UI
// ============================================================
function updateKnowledgeGraphUI() {
  const stats = knowledgeGraph.getStats();
  document.getElementById('kg-nodes').textContent = stats.totalNodes;
  document.getElementById('kg-edges').textContent = stats.totalEdges;

  // Entity counts
  const countsEl = document.getElementById('kg-entity-counts');
  countsEl.innerHTML = Object.entries(stats.nodeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `<div class="stats-row"><span>${type}</span><span>${count}</span></div>`)
    .join('') || '<div style="font-size:11px;color:var(--text3)">No entities</div>';

  // Edge counts
  const edgeCountsEl = document.getElementById('kg-edge-counts');
  edgeCountsEl.innerHTML = Object.entries(stats.edgeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `<div class="stats-row"><span>${type}</span><span>${count}</span></div>`)
    .join('') || '<div style="font-size:11px;color:var(--text3)">No relationships</div>';

  // Subgraph of active organism
  const subgraphEl = document.getElementById('kg-subgraph');
  if (activeOrganismId) {
    const subgraph = knowledgeGraph.getSubgraph(activeOrganismId, 2);
    const neighbors = knowledgeGraph.getNeighbors(activeOrganismId);
    subgraphEl.innerHTML = neighbors.slice(0, 10).map(n => {
      const label = n.node?.data?.name || n.node?.data?.scientificName || n.node?.id || 'unknown';
      return `<div class="stats-row"><span>${n.edge.type}</span><span style="color:var(--accent)">${label}</span></div>`;
    }).join('') || '<div style="font-size:11px;color:var(--text3)">No connections</div>';
  } else {
    subgraphEl.innerHTML = '<div style="font-size:11px;color:var(--text3)">No organism selected</div>';
  }
}

// ============================================================
// LENS UI
// ============================================================
function updateLensUI(result) {
  if (!result) return;
  const rec = result.recognition;
  const el = document.getElementById('lens-result');
  if (!el) return;

  const sp = rec.matchedSpecies;
  const org = rec.matchedOrganism;
  const id = rec.identification;

  let html = '<div class="lens-result-content">';
  if (sp) {
    html += `<div class="lens-species">${sp.commonName}</div>`;
    html += `<div class="lens-scientific">${sp.scientificName}</div>`;
    html += `<div class="lens-family">${sp.family || ''}</div>`;
  } else {
    html += `<div class="lens-species">${id.type}</div>`;
    html += `<div class="lens-confidence">${(id.confidence * 100).toFixed(0)}% confidence</div>`;
  }
  if (org) {
    const state = org.state || {};
    html += `<div class="lens-stats">`;
    html += `<div class="stats-row"><span>Health</span><span>${(state.healthScore || 0).toFixed(2)}</span></div>`;
    html += `<div class="stats-row"><span>Stress</span><span>${(state.stressIndex || 0).toFixed(2)}</span></div>`;
    html += `<div class="stats-row"><span>Spike Rate</span><span>${(state.spikeRate || 0).toFixed(1)}/min</span></div>`;
    html += `</div>`;
  }
  if (sp?.notes) {
    html += `<div class="lens-notes">${sp.notes.substring(0, 120)}...</div>`;
  }
  html += '</div>';
  el.innerHTML = html;

  const recsEl = document.getElementById('lens-recommendations');
  if (recsEl && rec.recommendations) {
    recsEl.innerHTML = rec.recommendations.map(r =>
      `<div class="rel-rec-item ${r.urgency || 'low'}">${r.text}</div>`
    ).join('') || '<div style="font-size:11px;color:var(--text3)">No recommendations</div>';
  }
}

// ============================================================
// VERIFICATION UI
// ============================================================
function updateVerificationUI() {
  const stats = verificationChain.getStats();
  document.getElementById('vc-total').textContent = stats.totalChains;
  document.getElementById('vc-confidence').textContent = stats.avgConfidence.toFixed(2);
  document.getElementById('vc-validated').textContent = (stats.byLevel.validated || 0) + (stats.byLevel.peer_reviewed || 0);
  document.getElementById('vc-published').textContent = stats.byLevel.published || 0;

  const levelsEl = document.getElementById('vc-levels');
  levelsEl.innerHTML = Object.entries(stats.byLevel).map(([level, count]) =>
    `<div class="stats-row"><span class="vc-level-${level}">${level.replace('_', ' ')}</span><span>${count}</span></div>`
  ).join('') || '<div style="font-size:11px;color:var(--text3)">No chains yet</div>';

  const chainsEl = document.getElementById('vc-chains');
  const chains = Array.from(verificationChain.chains.values()).slice(-10).reverse();
  chainsEl.innerHTML = chains.map(c => {
    const lvl = c.verificationLevel;
    return `<div class="vc-chain-item"><span class="vc-level-badge vc-level-${lvl}">${lvl}</span><span style="color:var(--text3);font-size:10px">${c.steps.length} steps · ${(c.overallConfidence * 100).toFixed(0)}%</span></div>`;
  }).join('') || '<div style="font-size:11px;color:var(--text3)">No chains yet</div>';
}

// ============================================================
// CITIZEN SCIENCE UI
// ============================================================
function updateCitizenScienceUI() {
  const stats = citizenScience.getStats();
  document.getElementById('cs-total').textContent = stats.totalSubmissions;
  document.getElementById('cs-reviews').textContent = stats.totalReviews;
  document.getElementById('cs-species').textContent = stats.uniqueSpecies;

  citizenScience.getContributionStats('local-user').then(userStats => {
    document.getElementById('cs-reputation').textContent = userStats.reputationScore;
    const badgesEl = document.getElementById('cs-badges');
    const allBadges = Array.from(citizenScience.badges.values());
    badgesEl.innerHTML = allBadges.map(b => {
      const unlocked = b.unlockedFor?.has('local-user');
      return `<span class="cs-badge ${unlocked ? 'unlocked' : ''}">${b.name}</span>`;
    }).join('') || '<div style="font-size:11px;color:var(--text3)">No badges</div>';
  }).catch(() => {});

  const subsEl = document.getElementById('cs-submissions');
  const subs = Array.from(citizenScience.submissions.values()).slice(-10).reverse();
  subsEl.innerHTML = subs.map(s => {
    return `<div class="cs-sub-item"><span class="cs-level-badge cs-level-${s.verificationLevel}">${s.verificationLevel}</span><span style="font-size:10px;color:var(--text3)">${s.speciesId || 'Unknown'} · ${s.reviewCount} reviews</span></div>`;
  }).join('') || '<div style="font-size:11px;color:var(--text3)">No submissions yet</div>';
}

// ============================================================
// BUTTON HANDLERS (Verification + Citizen Science)
// ============================================================
document.getElementById('btn-create-chain')?.addEventListener('click', async () => {
  if (!activeOrganismId) { log('Select an organism first'); return; }
  const chain = await verificationChain.createChain(
    activeOrganismId, 'sensor-default',
    { score: 0.85, timestamp: Date.now() },
    { name: 'dsp-v1', filters: ['bandpass', 'notch'], version: '1.0' }
  );
  await verificationChain.completeChain(chain.id, {
    valid: true, adjustedConfidence: 0.75, model: 'local-classifier', version: '1.0'
  });
  updateVerificationUI();
  log(`Verification chain created: ${chain.id}`);
});

document.getElementById('btn-submit-obs')?.addEventListener('click', async () => {
  if (!activeOrganismId) { log('Select an organism first'); return; }
  const twin = twinEngine.getTwin(activeOrganismId);
  const state = twin?.state || {};
  const result = await citizenScience.submitObservation({
    organismId: activeOrganismId,
    speciesId: twin?.species || null,
    sensorId: 'sensor-default',
    classification: { type: 'observation', confidence: 0.7 },
    notes: 'Citizen science observation',
    confidence: 0.7,
    features: { healthScore: state.healthScore, stressIndex: state.stressIndex, spikeRate: state.spikeRate }
  });
  updateCitizenScienceUI();
  log(`Observation submitted: ${result.submission?.id}`);
});

// Periodic UI updates for verification and citizen science
setInterval(updateVerificationUI, 10000);
setInterval(updateCitizenScienceUI, 10000);

// ============================================================
// PREDICTIVE UI
// ============================================================
function updatePredictiveUI() {
  const stats = predictiveEngine.getStats();
  document.getElementById('pred-anomalies').textContent = stats.totalAnomalies;
  document.getElementById('pred-tracked').textContent = stats.organismsTracked;

  if (activeOrganismId) {
    predictiveEngine.predictNextEvent(activeOrganismId).then(pred => {
      const el = document.getElementById('pred-next');
      if (pred && pred.type !== 'no_prediction') {
        el.innerHTML = `<div class="pred-item"><span class="pred-type">${pred.type.replace(/_/g, ' ')}</span><span class="pred-conf">${(pred.confidence * 100).toFixed(0)}%</span></div><div class="pred-reason">${pred.reasoning?.join('; ') || ''}</div><div class="pred-action">${pred.recommendedAction || ''}</div>`;
      } else {
        el.innerHTML = '<div style="font-size:11px;color:var(--text3)">No predictions available</div>';
      }
    }).catch(() => {});

    predictiveEngine.forecastNeeds(activeOrganismId).then(forecast => {
      const el = document.getElementById('pred-needs');
      if (!forecast) { el.innerHTML = '<div style="font-size:11px;color:var(--text3)">No data</div>'; return; }
      el.innerHTML = `
        <div class="stats-row"><span>Water</span><span class="${forecast.watering.needed ? 'pred-warn' : ''}">${forecast.watering.needed ? 'Needed (' + forecast.watering.urgency + ')' : 'Adequate'}</span></div>
        <div class="stats-row"><span>Light</span><span>${(forecast.light.currentVsOptimal * 100).toFixed(0)}% optimal</span></div>
        <div class="stats-row"><span>Temperature</span><span class="${forecast.temperature.risk ? 'pred-warn' : ''}">${forecast.temperature.risk ? 'Risk' : 'Normal'}</span></div>
      `;
    }).catch(() => {});

    predictiveEngine.predictHealth(activeOrganismId, 30).then(health => {
      const el = document.getElementById('pred-health');
      if (!health) { el.innerHTML = '<div style="font-size:11px;color:var(--text3)">No data</div>'; return; }
      const s = health.summary;
      el.innerHTML = `
        <div class="stats-row"><span>Current</span><span>${s.currentHealth.toFixed(2)}</span></div>
        <div class="stats-row"><span>Predicted</span><span>${s.predictedHealth.toFixed(2)}</span></div>
        <div class="stats-row"><span>Trend</span><span class="pred-trend-${s.trend}">${s.trend}</span></div>
        <div class="stats-row"><span>Risk</span><span class="pred-risk-${s.riskLevel}">${s.riskLevel}</span></div>
      `;
    }).catch(() => {});

    predictiveEngine.detectAnomalies(activeOrganismId).then(anomalies => {
      const el = document.getElementById('pred-anomaly-list');
      if (anomalies.length === 0) { el.innerHTML = '<div style="font-size:11px;color:var(--text3)">No anomalies detected</div>'; return; }
      el.innerHTML = anomalies.map(a => `<div class="pred-anomaly-item pred-sev-${a.severity}"><span>${a.type.replace(/_/g, ' ')}</span><span>${a.description}</span></div>`).join('');
    }).catch(() => {});
  }
}

// ============================================================
// RESEARCH UI
// ============================================================
function updateResearchUI() {
  const stats = researchAssistant.getStats();
  if (activeOrganismId) {
    researchAssistant.generateHypotheses(activeOrganismId).then(hyps => {
      const el = document.getElementById('res-hypotheses');
      if (hyps.length === 0) { el.innerHTML = '<div style="font-size:11px;color:var(--text3)">No hypotheses generated</div>'; return; }
      el.innerHTML = hyps.map(h => `<div class="pred-anomaly-item"><span class="pred-type">${h.statement.substring(0, 80)}</span><span class="pred-conf">${(h.confidence * 100).toFixed(0)}%</span></div><div class="pred-action">${h.suggestedExperiment}</div>`).join('');
    }).catch(() => {});
  }
}

// ============================================================
// SEARCH UI
// ============================================================
function updateSearchUI() {
  const stats = bioSearch.getStats();
  document.getElementById('srch-indexed').textContent = stats.totalIndexed;
}

// Button: Run Prediction
document.getElementById('btn-run-prediction')?.addEventListener('click', async () => {
  if (!activeOrganismId) { log('Select an organism first'); return; }
  updatePredictiveUI();
  log('Predictions updated');
});

// Button: Research Search
document.getElementById('btn-res-search')?.addEventListener('click', async () => {
  const q = document.getElementById('res-query').value.trim();
  if (!q) return;
  const localResults = await researchAssistant.searchLocalHistory(q, { organismId: activeOrganismId, limit: 10 });
  const localEl = document.getElementById('res-local-results');
  localEl.innerHTML = localResults.map(r => `<div class="pred-anomaly-item"><span>${r.event?.type || 'event'}</span><span style="color:var(--text3);font-size:10px">${new Date(r.timestamp).toLocaleDateString()} · ${(r.similarity * 100).toFixed(0)}% match</span></div>`).join('') || '<div style="font-size:11px;color:var(--text3)">No local matches</div>';

  const papers = await researchAssistant.searchResearch(q);
  const papersEl = document.getElementById('res-papers');
  papersEl.innerHTML = papers.map(p => `<div class="pred-anomaly-item"><span class="pred-type">${p.title.substring(0, 60)}</span><span style="color:var(--text3);font-size:10px">${p.year} · ${(p.relevance * 100).toFixed(0)}%</span></div>`).join('') || '<div style="font-size:11px;color:var(--text3)">No papers found</div>';
  log(`Research search: ${localResults.length} local, ${papers.length} papers`);
});

// Button: Generate Hypotheses
document.getElementById('btn-gen-hypotheses')?.addEventListener('click', async () => {
  if (!activeOrganismId) { log('Select an organism first'); return; }
  const hyps = await researchAssistant.generateHypotheses(activeOrganismId);
  const el = document.getElementById('res-hypotheses');
  if (hyps.length === 0) { el.innerHTML = '<div style="font-size:11px;color:var(--text3)">No hypotheses — need more data</div>'; return; }
  el.innerHTML = hyps.map(h => `<div class="pred-anomaly-item"><span class="pred-type">${h.statement.substring(0, 80)}</span><span class="pred-conf">${(h.confidence * 100).toFixed(0)}%</span></div><div class="pred-action">${h.suggestedExperiment}</div>`).join('');
  log(`Generated ${hyps.length} hypotheses`);
});

// Button: Bio Search
document.getElementById('btn-srch-search')?.addEventListener('click', async () => {
  const q = document.getElementById('srch-query').value.trim();
  if (!q) return;
  bioSearch.rebuildIndex();
  const results = await bioSearch.search(q, { limit: 20 });
  document.getElementById('srch-results-count').textContent = results.length;
  const el = document.getElementById('srch-results');
  el.innerHTML = results.map(r => `<div class="pred-anomaly-item"><span class="pred-type">${r.type}: ${(r.data?.name || r.data?.commonName || r.id || '').substring(0, 40)}</span><span style="color:var(--text3);font-size:10px">${(r.score * 100).toFixed(0)}%</span></div>`).join('') || '<div style="font-size:11px;color:var(--text3)">No results</div>';
  log(`Search: ${results.length} results for "${q}"`);
});

// ============================================================
// EARTH UI
// ============================================================
function updateEarthUI() {
  const stats = earth.getStats();
  document.getElementById('earth-points').textContent = stats.totalPoints;
  document.getElementById('earth-layers').textContent = stats.layers;

  const layerEl = document.getElementById('earth-layer-list');
  const layerStats = earth.getLayerStats();
  layerEl.innerHTML = Object.entries(layerStats).map(([id, l]) =>
    `<div class="stats-row"><span style="color:${l.color}">${l.visible ? '●' : '○'} ${l.name}</span><span>${l.count}</span></div>`
  ).join('');

  const missions = earth.layers.get('missions')?.points || [];
  const missionsEl = document.getElementById('earth-missions');
  missionsEl.innerHTML = missions.map(m => {
    const d = m.data;
    return `<div class="pred-anomaly-item"><span class="pred-type">${m.label.substring(0, 30)}</span><span style="font-size:10px;color:var(--text3)">${d.participants}/${d.target}</span></div>`;
  }).join('') || '<div style="font-size:11px;color:var(--text3)">No missions</div>';
}

// ============================================================
// TIME MACHINE UI
// ============================================================
function updateTimeMachineUI() {
  const stats = timeMachine.getStats();
  document.getElementById('tm-events').textContent = stats.totalEvents;
  document.getElementById('tm-progress').textContent = `${(stats.progress * 100).toFixed(0)}%`;

  const timelineEl = document.getElementById('tm-timeline');
  const visibleItems = timeMachine.timeline.slice(
    Math.max(0, timeMachine.currentIndex - 5),
    timeMachine.currentIndex + 10
  );
  timelineEl.innerHTML = visibleItems.map((t, i) => {
    const isCurrent = t.index === timeMachine.currentIndex;
    return `<div class="tm-item ${isCurrent ? 'tm-current' : ''}"><span class="tm-type">${t.type}</span><span class="tm-label">${t.label.substring(0, 40)}</span><span style="font-size:9px;color:var(--text3)">${new Date(t.timestamp).toLocaleDateString()}</span></div>`;
  }).join('') || '<div style="font-size:11px;color:var(--text3)">No timeline loaded</div>';

  const snapshot = timeMachine.getCurrentSnapshot();
  const snapEl = document.getElementById('tm-snapshot');
  if (snapshot) {
    snapEl.innerHTML = `<div class="stats-row"><span>Time</span><span>${new Date(snapshot.timestamp).toLocaleString()}</span></div><div class="stats-row"><span>Type</span><span>${snapshot.type}</span></div><div class="stats-row"><span>Label</span><span>${snapshot.label.substring(0, 50)}</span></div>`;
  } else {
    snapEl.innerHTML = '<div style="font-size:11px;color:var(--text3)">No snapshot</div>';
  }
}

// ============================================================
// EMERGENCY UI
// ============================================================
function updateEmergencyUI() {
  const stats = emergency.getStats();
  document.getElementById('emg-total').textContent = stats.totalEmergencies;
  document.getElementById('emg-affected').textContent = stats.organismsAffected;

  const passportEl = document.getElementById('emg-passport');
  if (activeOrganismId) {
    emergency.getMedicalPassport(activeOrganismId).then(passport => {
      if (passport) {
        passportEl.innerHTML = `
          <div class="stats-row"><span>Name</span><span>${passport.name}</span></div>
          <div class="stats-row"><span>Species</span><span>${passport.species}</span></div>
          <div class="stats-row"><span>Age</span><span>${passport.age ? passport.age + ' days' : '--'}</span></div>
          <div class="stats-row"><span>History</span><span>${passport.medicalHistory.length} events</span></div>
        `;
      } else {
        passportEl.innerHTML = '<div style="font-size:11px;color:var(--text3)">No organism selected</div>';
      }
    }).catch(() => {});
  }

  emergency.findNearestVet(activeOrganismId ? (twinEngine.getTwin(activeOrganismId)?.location) : null).then(vets => {
    const vetsEl = document.getElementById('emg-vets');
    vetsEl.innerHTML = vets.map(v =>
      `<div class="pred-anomaly-item"><span class="pred-type">${v.name}</span><span style="font-size:10px;color:var(--text3)">${v.specialty} · ${v.distance ? v.distance.toFixed(0) + 'km' : '--'}</span></div>`
    ).join('') || '<div style="font-size:11px;color:var(--text3)">No vets found</div>';
  }).catch(() => {});

  if (activeOrganismId) {
    const history = emergency.emergencyHistory.get(activeOrganismId) || [];
    const histEl = document.getElementById('emg-history');
    histEl.innerHTML = history.slice(-5).reverse().map(e =>
      `<div class="pred-anomaly-item pred-sev-${e.severity}"><span>${e.type}</span><span style="font-size:10px">${new Date(e.timestamp).toLocaleDateString()}</span></div>`
    ).join('') || '<div style="font-size:11px;color:var(--text3)">No emergencies</div>';
  }
}

// ============================================================
// MARKETPLACE UI
// ============================================================
function updateMarketplaceUI() {
  const stats = marketplace.getStats();
  document.getElementById('mkt-products').textContent = stats.totalProducts;
  document.getElementById('mkt-orders').textContent = stats.totalOrders;

  marketplace.getRecommendations(activeOrganismId).then(recs => {
    const recsEl = document.getElementById('mkt-recommendations');
    recsEl.innerHTML = recs.map(p =>
      `<div class="mkt-product"><div class="mkt-product-name">${p.name}</div><div class="mkt-product-desc">${p.description.substring(0, 60)}</div><div class="mkt-product-footer"><span class="mkt-price">$${p.price}</span><span class="mkt-rating">★ ${p.rating}</span><button class="btn-small mkt-buy" data-id="${p.id}">Add</button></div></div>`
    ).join('') || '<div style="font-size:11px;color:var(--text3)">No recommendations</div>';
  }).catch(() => {});

  marketplace.browse().then(products => {
    const listEl = document.getElementById('mkt-products-list');
    listEl.innerHTML = products.map(p =>
      `<div class="mkt-product"><div class="mkt-product-name">${p.name}</div><div class="mkt-product-footer"><span class="mkt-price">$${p.price}</span><span class="mkt-rating">★ ${p.rating} (${p.reviews})</span></div></div>`
    ).join('');
  }).catch(() => {});

  const donEl = document.getElementById('mkt-donations');
  donEl.innerHTML = `<div class="mkt-donation-option"><span>Plant Trees Foundation</span><button class="btn-small mkt-donate" data-org="ptf" data-amount="10">$10</button></div><div class="mkt-donation-option"><span>Coral Reef Alliance</span><button class="btn-small mkt-donate" data-org="coral" data-amount="25">$25</button></div><div class="mkt-donation-option"><span>WWF Conservation</span><button class="btn-small mkt-donate" data-org="wwf" data-amount="50">$50</button></div>`;
}

// ============================================================
// BUTTON HANDLERS (Phase 6)
// ============================================================

// Earth
document.getElementById('btn-load-earth')?.addEventListener('click', async () => {
  await earth.loadData();
  updateEarthUI();
  log(`Earth loaded: ${earth.getStats().totalPoints} data points`);
});

// Time Machine
document.getElementById('btn-tm-load')?.addEventListener('click', async () => {
  if (!activeOrganismId) { log('Select an organism first'); return; }
  await timeMachine.loadTimeline(activeOrganismId);
  document.getElementById('btn-tm-play').style.display = '';
  document.getElementById('btn-tm-pause').style.display = 'none';
  updateTimeMachineUI();
  log(`Timeline loaded: ${timeMachine.timeline.length} events`);
});

document.getElementById('btn-tm-play')?.addEventListener('click', () => {
  timeMachine.play(2);
  document.getElementById('btn-tm-play').style.display = 'none';
  document.getElementById('btn-tm-pause').style.display = '';
  log('Timeline playing');
});

document.getElementById('btn-tm-pause')?.addEventListener('click', () => {
  timeMachine.pause();
  document.getElementById('btn-tm-play').style.display = '';
  document.getElementById('btn-tm-pause').style.display = 'none';
  log('Timeline paused');
});

document.getElementById('btn-tm-export')?.addEventListener('click', async () => {
  const data = await timeMachine.exportTimeline();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bioecho-timeline-${activeOrganismId || 'unknown'}.json`;
  a.click();
  log('Timeline exported');
});

// Emergency
document.getElementById('btn-detect-emergency')?.addEventListener('click', async () => {
  if (!activeOrganismId) { log('Select an organism first'); return; }
  const emergencyResult = await emergency.detectEmergency(activeOrganismId);
  if (emergencyResult) {
    log(`Emergency detected: ${emergencyResult.type} (${emergencyResult.severity})`);
  } else {
    log('No emergency detected — organism stable');
  }
  updateEmergencyUI();
});

document.getElementById('btn-passport')?.addEventListener('click', () => updateEmergencyUI());

// Marketplace
document.getElementById('btn-mkt-search')?.addEventListener('click', async () => {
  const q = document.getElementById('mkt-query').value.trim();
  const products = await marketplace.browse(null, { search: q || undefined });
  const listEl = document.getElementById('mkt-products-list');
  listEl.innerHTML = products.map(p =>
    `<div class="mkt-product"><div class="mkt-product-name">${p.name}</div><div class="mkt-product-desc">${p.description.substring(0, 60)}</div><div class="mkt-product-footer"><span class="mkt-price">$${p.price}</span><span class="mkt-rating">★ ${p.rating}</span></div></div>`
  ).join('') || '<div style="font-size:11px;color:var(--text3)">No products found</div>';
});

// Event delegation for marketplace buy/donate buttons
document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('mkt-buy')) {
    const id = e.target.dataset.id;
    const result = await marketplace.purchase(id);
    if (result.success) { log(`Purchased: ${result.order.productName}`); updateMarketplaceUI(); }
  }
  if (e.target.classList.contains('mkt-donate')) {
    const org = e.target.dataset.org;
    const amount = parseFloat(e.target.dataset.amount);
    const result = await marketplace.donate(org, amount);
    if (result.success) { log(`Donated $${amount} to ${org}`); updateMarketplaceUI(); }
  }
});

// Periodic UI updates for new engines
setInterval(updatePredictiveUI, 15000);
setInterval(updateResearchUI, 15000);
setInterval(updateSearchUI, 15000);
setInterval(updateEarthUI, 20000);
setInterval(updateTimeMachineUI, 1000);
setInterval(updateEmergencyUI, 15000);
setInterval(updateMarketplaceUI, 20000);
