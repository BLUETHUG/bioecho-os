// BioEcho OS — Main Application Controller

// ============================================================
// INIT
// ============================================================
let manager, orgUI, pipeline, sim, chart, spectrogram, spikeChart, chat, serial, audioCapture;
let classifier, healthChart, dailyChart;
let isRunning = false;
let sampleCount = 0;
let spikeCount = 0;
let lastSpikeTime = 0;
let spikeDetailData = [];
let eventHistory = [];
let recording = false;
let recordingData = [];

const SAMPLE_RATE = 250;
const UI_UPDATE_INTERVAL = 33; // ~30fps

function init() {
  // Manager
  manager = new PlantManager();
  manager.addPlant('plant-01', 'Plant #42', 'Epipremnum aureum');
  manager.addPlant('plant-02', 'Plant #43', 'Chlorophytum comosum');

  // Organism UI
  orgUI = new OrganismUI('organism-list', manager);

  // DSP
  pipeline = new DspPipeline(SAMPLE_RATE, 'plant');
  classifier = new PlantClassifier();

  // Signal source
  sim = new SignalSimulator(SAMPLE_RATE);

  // Charts
  chart = new ChartEngine('waveform-canvas', {
    waveColor: '#00d4aa', maxPoints: 500, showSpikes: true
  });
  spectrogram = new SpectrogramEngine('spectrogram-canvas');
  spikeChart = new ChartEngine('spike-canvas', {
    waveColor: '#ff8800', maxPoints: 200, autoScale: true, showSpikes: false
  });
  healthChart = new MiniChart('health-canvas', '#00d4aa', 100);
  dailyChart = new MiniChart('daily-canvas', '#0088cc', 100);

  // Chat
  chat = new ChatEngine('chat-messages', 'chat-organism-select', 'chat-text-input', 'chat-send-btn', 'chat-status');
  chat.updateOrganisms(manager.getAll(), manager.activePlantId);
  chat.enableInput(true);
  chat.setStatus('Online', 'status-ok');

  // Serial
  serial = new SerialDevice();
  serial.onSample = (sample) => {
    processSample(sample.value, sample.timestamp);
  };
  serial.onDisconnect = () => setStatus('disconnected');

  // Audio
  audioCapture = new AudioCapture();
  audioCapture.onSample = (value) => processSample(value, Date.now());
  audioCapture.onAudioData = (buffer, sampleRate) => {
    handleAudioBuffer(buffer, sampleRate);
  };

  // UI
  initTabs();
  setupControls();
  setupHistoryTab();

  // Start the main loop
  isRunning = true;
  mainLoop();

  // Welcome message
  chat.addSystemMessage(
    'BioEcho OS initialized. Starting monitoring on simulated plant signal. '
    + 'Connect a SpikerBox or ESP32 via USB to stream real plant data.',
    [{ label: 'Mode', value: 'Simulated (Plant)', trend: 'stable' },
     { label: 'Sample rate', value: `${SAMPLE_RATE} Hz`, trend: 'stable' },
     { label: 'Pipeline', value: 'Filters + Spike Detection + Classifier', trend: 'ready' }],
    1.0
  );
}

// ============================================================
// MAIN LOOP
// ============================================================
let lastUIUpdate = 0;

function mainLoop() {
  if (!isRunning) return;

  // Read samples
  const samplesPerFrame = Math.round(SAMPLE_RATE / (1000 / UI_UPDATE_INTERVAL));

  for (let i = 0; i < samplesPerFrame; i++) {
    const simData = sim.read();
    processSample(simData.signal, sim.t);
  }

  // Update UI at ~30fps
  const now = performance.now();
  if (now - lastUIUpdate > UI_UPDATE_INTERVAL) {
    lastUIUpdate = now;
    updateUI();
  }

  // Stats
  document.getElementById('stat-samples').textContent = sampleCount;
  document.getElementById('stat-spikes').textContent = spikeCount;
  const elapsed = sampleCount / SAMPLE_RATE;
  document.getElementById('stat-rate').textContent = elapsed > 0
    ? (spikeCount / (elapsed / 60)).toFixed(1) : '0';

  requestAnimationFrame(mainLoop);
}

function processSample(value, timestamp) {
  // Run DSP pipeline
  const result = pipeline.process(value);

  // Update chart data
  chart.push(value);

  // Spike detected
  if (result.spike) {
    spikeCount++;
    lastSpikeTime = timestamp;

    // Extract waveform around spike
    spikeDetailData = [];
    // We need to look back; store recent values
    if (window.recentSamples) {
      const spikeIdx = window.recentSamples.length;
      const preSamples = Math.min(50, spikeIdx);
      const postSamples = Math.min(50, 200 - preSamples);
      for (let j = spikeIdx - preSamples; j < spikeIdx + postSamples && j < window.recentSamples.length; j++) {
        spikeDetailData.push(window.recentSamples[j] || 0);
      }
    }

    const spikeInfo = { ...result.spike, sampleIndex: chart.data.length, index: spikeCount };
    chart.addSpike(spikeInfo);

    // Extract features
    const features = extractSpikeFeatures(spikeDetailData, SAMPLE_RATE);
    if (features) {
      const context = sim.getContext();
      const active = manager.getActive();
      const baseline = active ? active.baseline : { restingAmplitude: 5, restingFrequency: 0.5 };

      // Classify
      const result_cls = classifier.classify(features, context, baseline);

      // Create event
      const event = {
        timestamp: Date.now(),
        type: 'spike',
        classification: result_cls.classification,
        confidence: result_cls.confidence,
        featureVector: features,
        context: context,
        spikeTimestamp: result.spike.timestamp
      };

      eventHistory.push(event);

      // Update digital twin
      if (active) {
        manager.recordEvent(active.id, event);
        manager.updateBaseline(active.id, features.amplitude, features.dominantFreq, result.spike.noiseFloor);
      }

      // Generate chat message for significant events
      if (result_cls.confidence > 0.7 && result_cls.classification !== 'resting') {
        const eventWithOrg = { ...event, featureVector: features };
        chat.generateStatement(eventWithOrg, active);
      }

      // Spike detail chart
      if (spikeDetailData.length > 0) {
        spikeChart.data = spikeDetailData;
        spikeChart.render();
      }

      // Update spike detail info
      document.getElementById('spike-detail-info').textContent =
        `${result_cls.classification} · ${features.amplitude.toFixed(1)}µV · `
        + `${features.dominantFreq.toFixed(2)}Hz · confidence ${(result_cls.confidence * 100).toFixed(0)}%`;
    }
  }

  sampleCount++;

  // Track recent samples for spike waveform extraction
  if (!window.recentSamples) window.recentSamples = [];
  window.recentSamples.push(result.filtered);
  if (window.recentSamples.length > 500) window.recentSamples.shift();
}

function handleAudioBuffer(buffer, sampleRate) {
  // For BirdNET integration: buffer is Float32Array of 3 seconds at 48kHz
  // In production: POST to Python ML service for BirdNET inference
  // For now, log the audio event
  const peak = Math.max(...buffer.map(v => Math.abs(v)));
  const rms = Math.sqrt(buffer.reduce((s, v) => s + v*v, 0) / buffer.length);
  const active = manager.getActive();
  if (active) {
    const event = {
      timestamp: Date.now(),
      type: 'audio',
      classification: 'audio_event',
      confidence: 0.5,
      featureVector: { amplitude: peak * 1000, dominantFreq: 0, duration: 3000 },
      context: sim.getContext()
    };
    manager.recordEvent(active.id, event);
  }
  // Update waveform display
  for (let i = 0; i < buffer.length; i += 480) { // downsample for display
    processSample(buffer[i] * 1000, Date.now());
  }
}

// ============================================================
// UI UPDATE
// ============================================================
function updateUI() {
  // Waveform chart
  chart.render();

  // Spectrogram (compute FFT on window of data)
  if (chart.data.length >= 128) {
    const windowLen = 128;
    const windowData = chart.data.slice(-windowLen);
    const fftSize = Math.pow(2, Math.ceil(Math.log2(windowLen)));
    const fft = new FFT(fftSize);
    const complex = fft.createComplexArray();
    fft.toComplexArray(windowData, complex);
    fft.transform(complex, complex);
    const half = fftSize / 2;
    const freqs = [];
    for (let i = 0; i < half; i++) {
      freqs.push(Math.sqrt(complex[2*i]**2 + complex[2*i+1]**2) / windowLen);
    }
    spectrogram.pushFrame(freqs);
    spectrogram.render();
  }

  // Health trend
  const active = manager.getActive();
  if (active) {
    healthChart.push(active.state.healthScore);
    healthChart.render();
    dailyChart.push(active.state.spikeRate);
    dailyChart.render();

    // Update digital twin panel
    document.getElementById('twin-health').textContent = active.state.healthScore.toFixed(2);
    document.getElementById('twin-stress').textContent = active.state.stressIndex.toFixed(2);
    document.getElementById('twin-spike-rate').textContent = active.state.spikeRate.toFixed(1) + ' /min';
    document.getElementById('twin-noise').textContent = active.baseline.noiseFloor.toFixed(1) + ' µV';
    document.getElementById('twin-events').textContent = active.events.length;
    const elapsed = sampleCount / SAMPLE_RATE;
    document.getElementById('twin-recording').textContent = formatDuration(elapsed);

    // Predictions
    if (active.predictions.expectedStressTime) {
      const remaining = Math.max(0, active.predictions.expectedStressTime - Date.now());
      document.getElementById('pred-stress').textContent = `~${formatDuration(remaining / 1000)}`;
    } else {
      document.getElementById('pred-stress').textContent = 'None';
    }
    if (active.state.stressIndex > 0.3) {
      document.getElementById('pred-watering').textContent = 'Check moisture';
    } else {
      document.getElementById('pred-watering').textContent = 'Not needed';
    }
    document.getElementById('pred-growth').textContent = active.state.growthRate.toFixed(1) + ' cm/day';

    // Update history table
    updateHistoryTable();
  }

  // Threshold line
  const sensitivity = parseFloat(document.getElementById('sensitivity-slider').value);
  pipeline.detector.thresholdMult = sensitivity;
}

// ============================================================
// CONTROLS
// ============================================================
function setupControls() {
  // Gain slider
  const gainSlider = document.getElementById('gain-slider');
  gainSlider.addEventListener('input', () => {
    document.getElementById('gain-value').textContent = parseFloat(gainSlider.value).toFixed(1) + 'x';
  });

  // Sensitivity
  const sensSlider = document.getElementById('sensitivity-slider');
  sensSlider.addEventListener('input', () => {
    document.getElementById('sensitivity-value').textContent = parseFloat(sensSlider.value).toFixed(1);
  });

  // Filter toggle
  document.getElementById('filter-toggle').addEventListener('change', (e) => {
    pipeline.filtersEnabled = e.target.checked;
  });
  document.getElementById('notch-toggle').addEventListener('change', (e) => {
    pipeline.notchEnabled = e.target.checked;
  });

  // Source select + connect
  document.getElementById('btn-connect').addEventListener('click', async () => {
    const source = document.getElementById('source-select').value;
    const btn = document.getElementById('btn-connect');
    btn.disabled = true;
    try {
      if (source === 'serial') {
        await serial.connect();
        setStatus('connected');
        chat.addSystemMessage('Connected to USB serial device (SpikerBox/ESP32). Streaming real plant signal.');
        sim.reset(); // Stop sim when real device connected
      } else if (source === 'audio') {
        await audioCapture.start();
        setStatus('connected');
        document.getElementById('signal-source-label').textContent = 'Microphone (Audio)';
        pipeline = new DspPipeline(48000, 'audio'); // Audio sample rate
        chat.addSystemMessage('Microphone connected. Audio capture active. Send 3-second segments for BirdNET analysis.', null, 1.0);
      } else {
        // Simulated
        if (serial.isConnected) await serial.disconnect();
        if (audioCapture.isCapturing) audioCapture.stop();
        setStatus('simulated');
        document.getElementById('signal-source-label').textContent = 'Simulated Plant';
        sim.reset();
        pipeline = new DspPipeline(SAMPLE_RATE, 'plant');
        chat.addSystemMessage('Switched to simulated plant signal.');
      }
    } catch (err) {
      setStatus('error', err.message);
      chat.addSystemMessage(`Error: ${err.message}`);
    }
    btn.disabled = false;
  });

  // Stimulus buttons
  document.querySelectorAll('.btn-stimulus').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.stimulus;
      sim.setStimulus(type);

      const active = manager.getActive();
      if (active) {
        const event = {
          timestamp: Date.now(),
          type: 'stimulus',
          classification: type,
          confidence: 1.0,
          featureVector: { amplitude: 0, dominantFreq: 0, duration: 0 },
          context: sim.getContext()
        };
        manager.recordEvent(active.id, event);

        chat.addSystemMessage(
          `Stimulus logged: ${type}. ${type === 'water' ? 'Soil moisture increased.' : type === 'light' ? 'Light level toggled.' : type === 'touch' ? 'Monitoring electrical response...' : 'Observation noted.'}`,
          [{ label: 'Stimulus', value: type, trend: 'changed' },
           { label: 'Temperature', value: `${sim.temperature.toFixed(1)}°C`, trend: 'monitoring' },
           { label: 'Soil moisture', value: `${sim.soilMoisture.toFixed(0)}%`, trend: 'monitoring' }],
          1.0
        );
      }
    });
  });

  // Record button
  document.getElementById('btn-record').addEventListener('click', () => {
    recording = !recording;
    document.getElementById('btn-record').textContent = recording ? 'Stop Recording' : 'Start Recording';
    document.getElementById('btn-record').style.borderColor = recording ? '#ff4444' : '';
    if (recording) {
      recordingData = [];
    } else {
      // Save recording
      if (recordingData.length > 0) {
        const blob = new Blob([recordingData.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bioecho-recording-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        chat.addSystemMessage(`Recording saved: ${recordingData.length} samples.`);
      }
    }
  });

  // Add organism
  document.getElementById('btn-add-organism').addEventListener('click', () => {
    const count = manager.count + 1;
    const name = `Plant #${39 + count}`;
    const specieses = ['Epipremnum aureum', 'Chlorophytum comosum', 'Spathiphyllum wallisii',
                       'Ficus benjamina', 'Monstera deliciosa'];
    const species = specieses[count % specieses.length];
    manager.addPlant(`plant-0${count + 1}`, name, species);
    chat.updateOrganisms(manager.getAll(), manager.activePlantId);
  });
}

// ============================================================
// STATUS
// ============================================================
function setStatus(state, message) {
  const el = document.getElementById('connection-status');
  switch (state) {
    case 'connected':
      el.textContent = 'Connected ✓';
      el.className = 'status-connected';
      break;
    case 'disconnected':
      el.textContent = 'Disconnected';
      el.className = 'status-disconnected';
      break;
    case 'simulated':
      el.textContent = 'Simulated Signal';
      el.className = 'status-connected';
      break;
    case 'error':
      el.textContent = `Error: ${message || 'Unknown error'}`;
      el.className = 'status-error';
      break;
    default:
      el.textContent = 'Disconnected';
      el.className = 'status-disconnected';
  }
}

// ============================================================
// HISTORY TAB
// ============================================================
function setupHistoryTab() {
  // Populate organism select
  const sel = document.getElementById('history-organism');
  document.getElementById('history-date').valueAsDate = new Date();
}

function updateHistoryTable() {
  const active = manager.getActive();
  if (!active) return;
  const tbody = document.getElementById('history-body');
  const recentEvents = active.events.slice(-100).reverse();
  tbody.innerHTML = '';
  for (const ev of recentEvents) {
    const tr = document.createElement('tr');
    const time = formatTime(ev.timestamp);
    const type = ev.type === 'spike' ? '⚡ Spike' : ev.type === 'stimulus' ? '📝 ' + ev.classification : ev.type;
    const cls = ev.classification || '--';
    const conf = ev.confidence ? (ev.confidence * 100).toFixed(0) + '%' : '--';
    const amp = ev.featureVector?.amplitude?.toFixed(1) || '--';
    const dur = ev.featureVector?.duration?.toFixed(0) || '--';
    const ctx = ev.context ? `${ev.context.temperature.toFixed(0)}°C` : '--';
    tr.innerHTML = `<td>${time}</td><td>${type}</td><td>${cls}</td><td>${conf}</td><td>${amp}µV</td><td>${dur}ms</td><td>${ctx}</td>`;
    tbody.appendChild(tr);
  }
}

// Export CSV
document.getElementById('btn-export-csv').addEventListener('click', () => {
  const active = manager.getActive();
  if (!active || active.events.length === 0) return;
  let csv = 'Timestamp,Type,Classification,Confidence,Amplitude(µV),Duration(ms),DominantFreq(Hz),Temperature(°C),Humidity(%),Light(lux),SoilMoisture(%)\n';
  for (const ev of active.events) {
    const fv = ev.featureVector || {};
    const ctx = ev.context || {};
    csv += `${ev.timestamp},${ev.type},${ev.classification||''},${ev.confidence||0},`
         + `${fv.amplitude||0},${fv.duration||0},${fv.dominantFreq||0},`
         + `${ctx.temperature||0},${ctx.humidity||0},${ctx.lightLevel||0},${ctx.soilMoisture||0}\n`;
  }
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bioecho-${active.name}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', init);
