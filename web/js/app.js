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

document.addEventListener('DOMContentLoaded', init);
