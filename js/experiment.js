// BioEcho Experiment Log
// Automatically generates reproducible scientific records.

class ExperimentLog {
  constructor() {
    this.sessions = [];
    this.activeSession = null;
    this._load();
  }

  // Start a new experiment session
  startSession(organismId, metadata = {}) {
    this.activeSession = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      organismId,
      startTime: Date.now(),
      endTime: null,
      metadata: {
        species: metadata.species || '',
        electrodePosition: metadata.electrodePosition || 'unspecified',
        sensorType: metadata.sensorType || 'unknown',
        firmwareVersion: metadata.firmwareVersion || '',
        calibrationScore: metadata.calibrationScore ?? null,
        sampleRate: metadata.sampleRate || 250,
        filterSettings: metadata.filterSettings || { highpass: 0.01, bandpass: '0.1-100', notch: '50/60' },
        temperature: metadata.temperature ?? null,
        humidity: metadata.humidity ?? null,
        lightLevel: metadata.lightLevel ?? null,
        notes: metadata.notes || '',
        location: metadata.location || null
      },
      events: [],
      signalStats: {
        totalSamples: 0,
        totalSpikes: 0,
        meanAmplitude: 0,
        maxAmplitude: 0,
        classifications: {}
      }
    };
    this._save();
    return this.activeSession;
  }

  // Record an event in the active session
  recordEvent(event) {
    if (!this.activeSession) return;
    this.activeSession.events.push({
      time: Date.now(),
      ...event
    });

    // Update stats
    const stats = this.activeSession.signalStats;
    stats.totalSpikes++;
    if (event.features) {
      stats.meanAmplitude = (stats.meanAmplitude * (stats.totalSpikes - 1) + event.features.amplitude) / stats.totalSpikes;
      stats.maxAmplitude = Math.max(stats.maxAmplitude, event.features.amplitude);
    }
    const cls = event.classification || 'unknown';
    stats.classifications[cls] = (stats.classifications[cls] || 0) + 1;
    this._save();
  }

  // Record sample count
  recordSamples(count) {
    if (!this.activeSession) return;
    this.activeSession.signalStats.totalSamples += count;
  }

  // End the active session
  endSession() {
    if (!this.activeSession) return null;
    this.activeSession.endTime = Date.now();
    this.sessions.push(this.activeSession);
    const session = this.activeSession;
    this.activeSession = null;
    this._save();
    return session;
  }

  // Export as CSV
  exportCSV(sessionId) {
    const session = sessionId
      ? this.sessions.find(s => s.id === sessionId)
      : this.activeSession || this.sessions[this.sessions.length - 1];
    if (!session) return '';

    let csv = 'BioEcho Experiment Log\n';
    csv += `Session,${session.id}\n`;
    csv += `Organism,${session.organismId}\n`;
    csv += `Start,${new Date(session.startTime).toISOString()}\n`;
    csv += `End,${session.endTime ? new Date(session.endTime).toISOString() : 'active'}\n`;
    csv += `Species,${session.metadata.species}\n`;
    csv += `Sensor,${session.metadata.sensorType}\n`;
    csv += `Calibration Score,${session.metadata.calibrationScore ?? 'N/A'}\n`;
    csv += `Sample Rate,${session.metadata.sampleRate} Hz\n`;
    csv += '\n';
    csv += 'Time,Classification,Confidence,Amplitude_uV,Duration_ms,RiseTime_ms,Freq_Hz,Entropy\n';

    for (const e of session.events) {
      if (!e.features) continue;
      csv += `${new Date(e.time).toISOString()},${e.classification || ''},${e.confidence || 0},`
           + `${e.features.amplitude?.toFixed(2) || ''},${e.features.duration?.toFixed(1) || ''},`
           + `${e.features.riseTime?.toFixed(1) || ''},${e.features.dominantFreq?.toFixed(3) || ''},`
           + `${e.features.spectralEntropy?.toFixed(3) || ''}\n`;
    }
    return csv;
  }

  // Export as JSON
  exportJSON(sessionId) {
    const session = sessionId
      ? this.sessions.find(s => s.id === sessionId)
      : this.activeSession || this.sessions[this.sessions.length - 1];
    return JSON.stringify(session, null, 2);
  }

  // Get all sessions
  getSessions() { return this.sessions; }
  getActive() { return this.activeSession; }

  _save() {
    try {
      localStorage.setItem('bioecho_experiments', JSON.stringify({
        sessions: this.sessions.slice(-50),
        active: this.activeSession
      }));
    } catch {}
  }

  _load() {
    try {
      const raw = localStorage.getItem('bioecho_experiments');
      if (raw) {
        const data = JSON.parse(raw);
        this.sessions = data.sessions || [];
        this.activeSession = data.active || null;
      }
    } catch {}
  }
}
