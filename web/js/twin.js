// BioEcho Digital Twin Engine
// Full organism model with state tracking, history, predictions, and persistence.
// Integrates with Living Identity Layer for lifecycle tracking, state snapshots, and IndexedDB.

class DigitalTwinEngine {
  constructor(localDB, identityLayer) {
    this.twins = new Map();
    this.onChange = null;
    this.localDB = localDB || null;
    this.identityLayer = identityLayer || null;
    this._pendingSnapshots = new Map();
    this._snapshotInterval = 5 * 60 * 1000;
    this._load();
  }

  create(id, name, species, type = 'plant', metadata = {}) {
    const lifecycleStage = type === 'plant' || type === 'mature' ? 'mature' : 'mature';
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
      lifeEvents: [],
      environment: {},
      lastUpdate: Date.now(),
      lifecycle: {
        lifecycleStage,
        birthDate: null,
        acquisitionDate: Date.now(),
        deathDate: null,
        parentOrganismId: null,
        propagationMethod: null,
        transitions: []
      },
      location: {
        latitude: null,
        longitude: null,
        indoor: false,
        container: null,
        climateZone: null
      },
      identityVersion: 1,
      identityChecksum: ''
    };
    this.twins.set(id, twin);
    if (this.identityLayer && this.identityLayer.createOrganism) {
      this.identityLayer.createOrganism(id, twin);
    }
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
    if (this.identityLayer && this.identityLayer.recordSnapshot) {
      const lastSnap = this._pendingSnapshots.get(id) || 0;
      if (Date.now() - lastSnap >= this._snapshotInterval) {
        this._pendingSnapshots.set(id, Date.now());
        this.identityLayer.recordSnapshot(id, this._buildSnapshot(t));
      }
    }
    this._save();
    if (this.onChange) this.onChange();
  }

  recordLifeEvent(id, type, description, data = {}) {
    const t = this.twins.get(id);
    if (!t) return;
    const event = { time: Date.now(), type, description, data };
    t.lifeEvents.push(event);
    const lifecycleTransitions = ['germination', 'seedling', 'juvenile', 'flowering', 'fruiting', 'senescence', 'death'];
    if (lifecycleTransitions.includes(type)) {
      t.lifecycle.lifecycleStage = type;
      t.lifecycle.transitions.push({ time: event.time, stage: type, description, data });
      if (this.identityLayer && this.identityLayer.recordTransition) {
        this.identityLayer.recordTransition(id, type, { description, data, time: event.time });
      }
      if (type === 'death') {
        t.lifecycle.deathDate = event.time;
      }
    }
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

  _buildSnapshot(t) {
    return {
      healthScore: t.state.healthScore,
      stressIndex: t.state.stressIndex,
      spikeRate: t.state.spikeRate,
      growthRate: t.state.growthRate,
      energyBalance: t.state.energyBalance,
      lifecycleStage: t.lifecycle ? t.lifecycle.lifecycleStage : 'unknown',
      electricalSignature: t.state.electricalSignature.slice(-10),
      time: Date.now()
    };
  }

  _save() {
    try {
      const data = {};
      this.twins.forEach((v, k) => {
        data[k] = { ...v, events: v.events.slice(-1000) };
      });
      localStorage.setItem('bioecho_twins', JSON.stringify(data));
      if (this.localDB) {
        Object.entries(data).forEach(([k, v]) => this.localDB.saveOrganism(v).catch(() => {}));
      }
    } catch {}
  }

  async _load() {
    let loaded = false;
    if (this.localDB) {
      try {
        const dbOrganisms = await this.localDB.getAllOrganisms();
        if (dbOrganisms && dbOrganisms.length > 0) {
          dbOrganisms.forEach(o => this.twins.set(o.id, o));
          loaded = true;
        }
      } catch {}
    }
    if (!loaded) {
      try {
        const raw = localStorage.getItem('bioecho_twins');
        if (raw) {
          const data = JSON.parse(raw);
          Object.entries(data).forEach(([k, v]) => this.twins.set(k, v));
          if (this.localDB && Object.keys(data).length > 0) {
            Object.values(data).forEach(v => this.localDB.saveOrganism(v).catch(() => {}));
          }
        }
      } catch {}
    }
  }

  getStateHistory(organismId, since, until, limit) {
    if (this.identityLayer && this.identityLayer.getStateHistory) {
      return this.identityLayer.getStateHistory(organismId, { since, until, limit });
    }
    return [];
  }

  getStageHistory(organismId) {
    const t = this.twins.get(organismId);
    if (!t || !t.lifecycle) return [];
    return t.lifecycle.transitions || [];
  }

  recordSnapshot(organismId) {
    const t = this.twins.get(organismId);
    if (!t) return null;
    const snapshot = this._buildSnapshot(t);
    if (this.identityLayer && this.identityLayer.recordSnapshot) {
      this.identityLayer.recordSnapshot(organismId, snapshot);
    }
    return snapshot;
  }

  getOrganismTimeline(organismId) {
    const t = this.twins.get(organismId);
    if (!t) return [];
    const items = [];
    if (t.lifecycle && t.lifecycle.transitions) {
      t.lifecycle.transitions.forEach(tr =>
        items.push({ time: tr.time, type: 'transition', data: tr })
      );
    }
    t.events.slice(-500).forEach(e =>
      items.push({ time: e.time, type: 'event', data: e })
    );
    t.lifeEvents.forEach(e =>
      items.push({ time: e.time, type: 'lifeEvent', data: e })
    );
    if (this.identityLayer && this.identityLayer.getStateHistory) {
      const snapshots = this.identityLayer.getStateHistory(organismId, {});
      if (snapshots && snapshots.length) {
        snapshots.forEach(s =>
          items.push({ time: s.time, type: 'snapshot', data: s })
        );
      }
    }
    items.sort((a, b) => a.time - b.time);
    return items;
  }

  getOrganismIdentity(organismId) {
    const t = this.twins.get(organismId);
    if (!t) return null;
    return {
      id: t.id,
      name: t.name,
      species: t.species,
      type: t.type,
      createdAt: t.createdAt,
      lastUpdate: t.lastUpdate,
      lifecycle: t.lifecycle || {},
      location: t.location || { latitude: null, longitude: null, indoor: false, container: null, climateZone: null },
      identityVersion: t.identityVersion || 1,
      identityChecksum: t.identityChecksum || '',
      state: {
        healthScore: t.state.healthScore,
        stressIndex: t.state.stressIndex,
        spikeRate: t.state.spikeRate,
        growthRate: t.state.growthRate,
        energyBalance: t.state.energyBalance
      },
      lifeEventsCount: t.lifeEvents.length,
      eventsCount: t.events.length
    };
  }

  markDeceased(organismId, date, cause) {
    const t = this.twins.get(organismId);
    if (!t) return;
    t.lifecycle.lifecycleStage = 'deceased';
    t.lifecycle.deathDate = date || Date.now();
    t.lifecycle.deathCause = cause || null;
    t.lifecycle.transitions.push({ time: date || Date.now(), stage: 'deceased', description: cause || 'Deceased' });
    this._save();
    if (this.onChange) this.onChange();
  }

  recordPropagation(organismId, childId, method, date) {
    const parent = this.twins.get(organismId);
    if (!parent) return;
    parent.lifecycle.parentOrganismId = parent.lifecycle.parentOrganismId;
    const child = this.twins.get(childId);
    if (!child) return;
    child.lifecycle.parentOrganismId = organismId;
    child.lifecycle.propagationMethod = method || null;
    child.lifecycle.acquisitionDate = date || Date.now();
    this._save();
    if (this.onChange) this.onChange();
  }

  delete(id) { this.twins.delete(id); this._save(); if (this.onChange) this.onChange(); }
}
