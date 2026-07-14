// BioEcho Digital Twin Engine
// Full organism model with state tracking, history, predictions, and persistence.

class DigitalTwinEngine {
  constructor() {
    this.twins = new Map();
    this.onChange = null;
    this._load();
  }

  create(id, name, species, type = 'plant', metadata = {}) {
    const twin = {
      id, name, species, type,
      createdAt: Date.now(),
      metadata,
      state: {
        healthScore: 1.0,
        stressIndex: 0,
        spikeRate: 0,
        growthRate: 0,
        energyBalance: 100,
        electricalSignature: []
      },
      baseline: { amplitude: 5, freq: 0.5, noise: 2 },
      events: [],
      lifeEvents: [], // meaningful milestones
      environment: {},
      lastUpdate: Date.now()
    };
    this.twins.set(id, twin);
    this._save();
    if (this.onChange) this.onChange();
    return twin;
  }

  getTwin(id) { return this.twins.get(id); }
  getAll() { return Array.from(this.twins.values()); }
  getAllSummaries() { return this.getAll().map(t => this.getSummary(t.id)); }

  getSummary(id) {
    const t = this.twins.get(id);
    if (!t) return null;
    return {
      id: t.id, name: t.name, species: t.species, type: t.type,
      healthScore: t.state.healthScore, stressIndex: t.state.stressIndex,
      spikeRate: t.state.spikeRate, noiseFloor: t.baseline.noise,
      totalEvents: t.events.length, lifeEvents: t.lifeEvents.length,
      ageDays: Math.floor((Date.now() - t.createdAt) / 86400000),
      createdAt: t.createdAt, lastUpdate: t.lastUpdate
    };
  }

  recordEvent(id, event) {
    const t = this.twins.get(id);
    if (!t) return;
    t.events.push(event);
    if (t.events.length > 10000) t.events.shift();
    this._updateState(t, event);
    t.lastUpdate = Date.now();
    this._save();
    if (this.onChange) this.onChange();
  }

  recordLifeEvent(id, type, description, data = {}) {
    const t = this.twins.get(id);
    if (!t) return;
    t.lifeEvents.push({ time: Date.now(), type, description, data });
    if (this.onChange) this.onChange();
    this._save();
  }

  updateBaseline(id, amplitude, freq, noise) {
    const t = this.twins.get(id);
    if (!t) return;
    const a = 0.0005;
    t.baseline.amplitude += a * (amplitude - t.baseline.amplitude);
    t.baseline.freq += a * (freq - t.baseline.freq);
    t.baseline.noise += a * (noise - t.baseline.noise);
  }

  _updateState(t, event) {
    // Spike rate (last 5 min)
    const now = Date.now();
    const recent = t.events.filter(e => e.time > now - 300000).length;
    t.state.spikeRate = recent / 5;

    // Stress index
    const stressEvents = t.events.slice(-100).filter(e =>
      ['water_stress','wounding','temperature_shock'].includes(e.classification)
    );
    t.state.stressIndex = Math.min(1, stressEvents.length / 15);

    // Health score
    t.state.healthScore = Math.max(0, 1 - t.state.stressIndex * 0.8);

    // Electrical signature (last 50 amplitudes)
    if (event.amplitude !== undefined) {
      t.state.electricalSignature.push(event.amplitude);
      if (t.state.electricalSignature.length > 50) t.state.electricalSignature.shift();
    }
  }

  getPredictions(id) {
    const t = this.twins.get(id);
    if (!t) return null;

    const recent = t.events.slice(-50);
    const stressCount = recent.filter(e => ['water_stress','temperature_shock'].includes(e.classification)).length;
    const woundingCount = recent.filter(e => e.classification === 'wounding').length;

    let nextWatering = null;
    let stressRisk = 'low';
    if (stressCount > 3) stressRisk = 'high';
    else if (stressCount > 1) stressRisk = 'moderate';

    if (stressRisk === 'high') nextWatering = Date.now() + 3600000 * 2; // ~2 hours
    else if (stressRisk === 'moderate') nextWatering = Date.now() + 3600000 * 6; // ~6 hours

    return {
      nextWatering,
      stressRisk,
      recoveryExpected: woundingCount > 0 ? Date.now() + 86400000 * 3 : null,
      growthRate: t.state.growthRate,
      confidence: Math.min(0.9, 0.3 + recent.length * 0.01)
    };
  }

  getEvents(id, filter) {
    const t = this.twins.get(id);
    if (!t) return [];
    let events = t.events;
    if (filter?.since) events = events.filter(e => e.time > filter.since);
    if (filter?.classification) events = events.filter(e => e.classification === filter.classification);
    if (filter?.limit) events = events.slice(-filter.limit);
    return events;
  }

  getLifeEvents(id) {
    const t = this.twins.get(id);
    return t ? t.lifeEvents : [];
  }

  _save() {
    try {
      const data = {};
      this.twins.forEach((v, k) => {
        data[k] = { ...v, events: v.events.slice(-1000) }; // limit persistence
      });
      localStorage.setItem('bioecho_twins', JSON.stringify(data));
    } catch {}
  }

  _load() {
    try {
      const raw = localStorage.getItem('bioecho_twins');
      if (raw) {
        const data = JSON.parse(raw);
        Object.entries(data).forEach(([k, v]) => this.twins.set(k, v));
      }
    } catch {}
  }

  delete(id) { this.twins.delete(id); this._save(); if (this.onChange) this.onChange(); }
}
