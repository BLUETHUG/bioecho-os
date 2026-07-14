// BioEcho OS — Main Application Controller (Real Data Only)

// ============================================================
// STATE
// ============================================================
let pipeline, waveformChart, spectrogramChart, spikeChart, chat, twin;
let serial, audioCapture;
let isConnected = false;
let sampleCount = 0;
let spikeCount = 0;
let connectTime = 0;
let recentWindow = [];
let lastUIUpdate = 0;
const SAMPLE_RATE = 250;
const UI_FPS = 30;

// ============================================================
// INIT
// ============================================================
function init() {
  // Charts
  waveformChart = new WaveformChart('waveform-canvas');
  spectrogramChart = new SpectrogramChart('spectrogram-canvas');
  spikeChart = new SpikeChart('spike-canvas');

  // DSP
  pipeline = new DspPipeline(SAMPLE_RATE);

  // Digital twin
  twin = {
    healthScore: 1.0,
    stressIndex: 0,
    spikeRate: 0,
    baselineNoise: 0,
    totalEvents: 0,
    events: [],
    baseline: { amplitude: 5, freq: 0.5, noise: 2 }
  };

  // Chat
  chat = new ChatEngine('chat-messages');

  // Connection screen
  setupConnectionScreen();

  // Main app controls
  setupAppControls();

  // Clock
  updateClock();
  setInterval(updateClock, 1000);
}

// ============================================================
// CONNECTION SCREEN
// ============================================================
function setupConnectionScreen() {
  document.querySelectorAll('.connect-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      const source = opt.dataset.source;
      const statusMsg = document.getElementById('connect-status-msg');
      statusMsg.className = 'connect-status';
      statusMsg.textContent = 'Requesting access...';

      try {
        if (source === 'serial') {
          if (!('serial' in navigator)) {
            statusMsg.className = 'connect-status error';
            statusMsg.textContent = 'Web Serial API not available. Use Chrome or Edge 89+.';
            return;
          }
          serial = new SerialDevice();
          serial.onSample = handleSample;
          serial.onDisconnect = handleDisconnect;
          await serial.connect();
          showApp('USB Serial Device');

        } else if (source === 'audio') {
          audioCapture = new AudioCapture();
          audioCapture.onSample = handleSample;
          await audioCapture.start();
          showApp('Microphone');
        }
      } catch (err) {
        statusMsg.className = 'connect-status error';
        statusMsg.textContent = err.name === 'NotFoundError'
          ? 'No device selected.'
          : `Error: ${err.message}`;
      }
    });
  });
}

function showApp(deviceLabel) {
  isConnected = true;
  connectTime = Date.now();
  sampleCount = 0;
  spikeCount = 0;
  recentWindow = [];
  pipeline.reset();

  document.getElementById('connect-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('device-label').textContent = deviceLabel;
  document.getElementById('live-indicator').className = 'live-on';
  document.getElementById('log-line').textContent = `Connected to ${deviceLabel}`;
  document.getElementById('sample-rate-label').textContent = `${SAMPLE_RATE} Hz`;

  waveformChart.resize();
  spectrogramChart.resize();
  spikeChart.resize();

  // Send connection message to chat
  chat.addMessage({
    type: 'event',
    text: `Connected to ${deviceLabel}. Monitoring at ${SAMPLE_RATE} Hz. Signal processing pipeline active.`,
    time: Date.now()
  });

  requestAnimationFrame(mainLoop);
}

function handleDisconnect() {
  isConnected = false;
  document.getElementById('live-indicator').className = 'live-off';
  document.getElementById('log-line').textContent = 'Device disconnected';
  chat.addMessage({ type: 'error', text: 'Device disconnected.', time: Date.now() });
}

// ============================================================
// DATA HANDLER — Every sample passes through here
// ============================================================
function handleSample(value, timestamp) {
  if (!isConnected) return;

  const result = pipeline.process(value);

  // Push to charts
  waveformChart.push(result.raw, result.filtered);
  waveformChart.setThreshold(pipeline.detector.threshold * pipeline.gain);

  // Store recent for spike window extraction
  recentWindow.push(result.filtered);
  if (recentWindow.length > 500) recentWindow.shift();

  // Spike detection
  if (result.spike) {
    spikeCount++;
    twin.totalEvents++;

    // Extract spike window
    const spikeIdx = recentWindow.length;
    const pre = Math.min(60, spikeIdx);
    const post = Math.min(140, 200);
    const window = recentWindow.slice(spikeIdx - pre, spikeIdx + post);
    spikeChart.setData(window);

    // Extract features
    const features = extractSpikeFeatures(window, SAMPLE_RATE);
    if (features) {
      // Classify
      const cls = classify(features);

      // Record event
      const event = {
        time: Date.now(),
        type: 'spike',
        classification: cls.classification,
        confidence: cls.confidence,
        features: features,
        amplitude: result.spike.amplitude,
        snr: result.spike.snr,
        noiseFloor: result.spike.noiseFloor
      };
      twin.events.push(event);
      if (twin.events.length > 5000) twin.events.shift();

      // Update twin
      updateTwin(event);

      // Waveform spike marker
      waveformChart.addSpike(spikeCount, result.spike.amplitude);

      // Log
      logSpike(event);
    }
  }

  sampleCount++;

  // Update spectrogram every 8 samples
  if (sampleCount % 8 === 0) {
    updateSpectrogram();
  }
}

// ============================================================
// CLASSIFIER — Threshold-based, grounded in literature
// ============================================================
function classify(features) {
  const { amplitude, duration, riseTime, dominantFreq, spectralEntropy } = features;
  const baseline = twin.baseline;
  const scores = {};

  // Resting
  if (amplitude < baseline.amplitude * 1.5 && dominantFreq > 0.1 && dominantFreq < 2) {
    scores.resting = 0.7 + (1 - amplitude / (baseline.amplitude * 1.5)) * 0.3;
  }

  // Water stress
  if (amplitude > baseline.amplitude * 2 && dominantFreq < baseline.freq * 0.6) {
    scores.water_stress = Math.min(0.92, 0.4 + amplitude / (baseline.amplitude * 6) * 0.3 + (1 - dominantFreq / baseline.freq) * 0.2);
  }

  // Touch response
  if (amplitude > baseline.amplitude * 3 && riseTime < 80 && duration < 300) {
    scores.touch_response = Math.min(0.90, 0.35 + amplitude / (baseline.amplitude * 5) * 0.3 + (1 - riseTime / 80) * 0.25);
  }

  // Wounding
  if (amplitude > baseline.amplitude * 5 && duration > 400) {
    scores.wounding = Math.min(0.95, 0.5 + amplitude / (baseline.amplitude * 8) * 0.25 + duration / 800 * 0.2);
  }

  // Unknown
  const best = Object.entries(scores).sort((a,b) => b[1] - a[1])[0];
  if (!best || best[1] < 0.5) {
    return { classification: 'unknown', confidence: 0.3 };
  }
  return { classification: best[0], confidence: Math.round(best[1] * 1000) / 1000 };
}

// ============================================================
// DIGITAL TWIN UPDATE
// ============================================================
function updateTwin(event) {
  const recent = twin.events.slice(-100);
  const stressEvents = recent.filter(e => ['water_stress','wounding','temperature_shock'].includes(e.classification));
  const fiveMin = twin.events.filter(e => e.time > Date.now() - 300000).length;

  twin.spikeRate = fiveMin / 5;
  twin.stressIndex = Math.min(1, stressEvents.length / 20);
  twin.healthScore = Math.max(0, 1 - twin.stressIndex * 0.8);

  // Baseline adaptation (slow)
  if (event.features) {
    twin.baseline.amplitude += 0.0005 * (event.features.amplitude - twin.baseline.amplitude);
    twin.baseline.freq += 0.0005 * (event.features.dominantFreq - twin.baseline.freq);
    twin.baseline.noise += 0.0005 * (event.noiseFloor - twin.baseline.noise);
  }
}

// ============================================================
// SPECTROGRAM UPDATE
// ============================================================
function updateSpectrogram() {
  const data = waveformChart.filteredData;
  if (data.length < 128) return;
  const win = data.slice(-128);
  const fftSize = 128;
  const fft = new FFT(fftSize);
  const complex = fft.createComplexArray();
  fft.toComplexArray(win, complex);
  fft.transform(complex, complex);
  const half = fftSize / 2;
  const freqs = [];
  for (let i = 0; i < half; i++) {
    freqs.push(Math.sqrt(complex[2*i]**2 + complex[2*i+1]**2) / fftSize);
  }
  spectrogramChart.pushFrame(freqs);
}

// ============================================================
// MAIN LOOP — UI update at 30fps
// ============================================================
function mainLoop() {
  if (!isConnected) return;

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
// STATS UPDATE
// ============================================================
function updateStats() {
  const elapsed = (Date.now() - connectTime) / 1000;
  const minutes = Math.floor(elapsed / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const secs = Math.floor(elapsed % 60);

  document.getElementById('stat-health').textContent = twin.healthScore.toFixed(2);
  document.getElementById('stat-stress').textContent = twin.stressIndex.toFixed(2);
  document.getElementById('stat-spike-rate').textContent = twin.spikeRate.toFixed(1);
  document.getElementById('stat-baseline').textContent = twin.baseline.noise.toFixed(1);
  document.getElementById('stat-snr').textContent = twin.baseline.noise > 0
    ? (20 * Math.log10(twin.baseline.amplitude / twin.baseline.noise)).toFixed(1) : '--';
  document.getElementById('stat-samples').textContent = sampleCount.toLocaleString();
  document.getElementById('stat-spikes').textContent = spikeCount;
  document.getElementById('stat-uptime').textContent = `${hours}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  document.getElementById('stat-threshold').textContent = `${pipeline.detector.thresholdMult}× MAD`;
}

// ============================================================
// SPIKE LOG (to chat)
// ============================================================
function logSpike(event) {
  const f = event.features;
  if (!f) return;

  // Only log significant events
  if (event.classification === 'unknown' && event.confidence < 0.5) return;

  const confClass = event.confidence > 0.85 ? 'high' : event.confidence > 0.7 ? 'med' : 'low';

  const evidenceRows = [
    `<tr><td>Amplitude</td><td>${f.amplitude.toFixed(1)} µV</td><td class="${f.amplitude > twin.baseline.amplitude*2 ? 'ev-up' : 'ev-stable'}">${f.amplitude > twin.baseline.amplitude*2 ? '↑ above baseline' : 'baseline'}</td></tr>`,
    `<tr><td>Frequency</td><td>${f.dominantFreq.toFixed(2)} Hz</td><td class="${f.dominantFreq < twin.baseline.freq*0.6 ? 'ev-down' : 'ev-stable'}">${f.dominantFreq < twin.baseline.freq*0.6 ? '↓' : '→'} ${f.dominantFreq < twin.baseline.freq*0.6 ? 'reduced' : 'normal'}</td></tr>`,
    `<tr><td>Duration</td><td>${f.duration.toFixed(0)} ms</td><td class="ev-stable">${f.duration > 400 ? 'long' : 'normal'}</td></tr>`,
    `<tr><td>Rise time</td><td>${f.riseTime.toFixed(0)} ms</td><td class="${f.riseTime < 50 ? 'ev-up' : 'ev-stable'}">${f.riseTime < 50 ? 'fast' : 'normal'}</td></tr>`,
    `<tr><td>Spectral entropy</td><td>${f.spectralEntropy.toFixed(2)}</td><td class="ev-stable">${f.spectralEntropy > 0.6 ? 'complex' : 'simple'}</td></tr>`
  ].join('');

  const confTag = `<span class="confidence-tag ${confClass}">${(event.confidence*100).toFixed(0)}%</span>`;

  const labels = {
    water_stress: 'Water Stress Detected',
    touch_response: 'Touch Response',
    wounding: 'Wounding Signal',
    resting: 'Resting State',
    unknown: 'Unknown Pattern'
  };

  const type = event.classification === 'wounding' ? 'warning' : 'event';

  chat.addMessage({
    type,
    text: `${labels[event.classification] || event.classification} ${confTag}`,
    evidence: `<table>${evidenceRows}</table>`,
    time: event.time
  });
}

// ============================================================
// APP CONTROLS
// ============================================================
function setupAppControls() {
  // Filter toggles
  document.getElementById('filter-toggle').addEventListener('change', e => {
    pipeline.filtersOn = e.target.checked;
    log(`Filters ${e.target.checked ? 'enabled' : 'disabled'}`);
  });
  document.getElementById('notch-toggle').addEventListener('change', e => {
    pipeline.notchOn = e.target.checked;
    log(`Notch filter ${e.target.checked ? 'enabled' : 'disabled'}`);
  });

  // Scale buttons
  document.getElementById('btn-scale-auto').addEventListener('click', () => {
    waveformChart.autoScale = true;
    document.getElementById('btn-scale-auto').classList.add('active');
    document.getElementById('btn-scale-fixed').classList.remove('active');
  });
  document.getElementById('btn-scale-fixed').addEventListener('click', () => {
    waveformChart.autoScale = false;
    waveformChart.yMin = -20;
    waveformChart.yMax = 20;
    document.getElementById('btn-scale-fixed').classList.add('active');
    document.getElementById('btn-scale-auto').classList.remove('active');
  });

  // Disconnect
  document.getElementById('btn-disconnect').addEventListener('click', async () => {
    if (serial && serial.isConnected) await serial.disconnect();
    if (audioCapture && audioCapture.isCapturing) audioCapture.stop();
    isConnected = false;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('connect-screen').classList.remove('hidden');
    document.getElementById('connect-status-msg').textContent = '';
    waveformChart.clear();
    spectrogramChart.spectrum = [];
    spikeChart.setData([]);
    sampleCount = 0;
    spikeCount = 0;
    twin.events = [];
  });

  // Export CSV
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (twin.events.length === 0) return;
    let csv = 'Timestamp,Classification,Confidence,Amplitude_uV,Duration_ms,RiseTime_ms,Freq_Hz,Entropy,SNR\n';
    for (const e of twin.events) {
      if (!e.features) continue;
      csv += `${new Date(e.time).toISOString()},${e.classification},${e.confidence},`
           + `${e.features.amplitude.toFixed(2)},${e.features.duration.toFixed(1)},`
           + `${e.features.riseTime.toFixed(1)},${e.features.dominantFreq.toFixed(3)},`
           + `${e.features.spectralEntropy.toFixed(3)},${e.snr.toFixed(1)}\n`;
    }
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bioecho-export-${Date.now()}.csv`;
    a.click();
    log(`Exported ${twin.events.length} events to CSV`);
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
}

function log(msg) {
  document.getElementById('log-line').textContent = msg;
  document.getElementById('log-time').textContent = new Date().toLocaleTimeString();
}

function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}

// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', init);
