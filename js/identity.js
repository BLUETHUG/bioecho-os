// BioEcho Living Identity Layer
// Persistent, evolving organism identities with lifecycle tracking, state history, and provenance.

class LivingIdentityLayer {
  constructor(localDB) {
    this.localDB = localDB;
    this.organisms = new Map();
  }

  async init() {
    if (this.localDB) {
      const all = await this.localDB.getAllOrganisms();
      all.forEach(o => this.organisms.set(o.id, o));
    }
  }

  _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(16).padStart(8, '0');
  }

  generateOrganismId(name, speciesId, userId, birthDate) {
    const seed = `${name}-${speciesId}-${userId}-${birthDate || ''}`;
    const h = this._hash(seed);
    const ts = Date.now().toString(36);
    return `${h.substring(0, 8)}-${ts.substring(0, 4)}`;
  }

  createOrganism(id, twin) {
    const org = {
      id,
      name: twin.name,
      species: twin.species,
      type: twin.type,
      createdAt: twin.createdAt || Date.now(),
      lifecycle: twin.lifecycle || {
        lifecycleStage: 'mature',
        birthDate: null,
        acquisitionDate: Date.now(),
        deathDate: null,
        parentOrganismId: null,
        propagationMethod: null,
        transitions: []
      },
      location: twin.location || { latitude: null, longitude: null, indoor: false, container: null, climateZone: null },
      state: twin.state || { healthScore: 1.0, stressIndex: 0, spikeRate: 0, growthRate: 0, energyBalance: 100 },
      baseline: twin.baseline || { amplitude: 5, freq: 0.5, noise: 2 },
      identityVersion: twin.identityVersion || 1,
      identityChecksum: '',
      lastUpdate: Date.now()
    };
    this.organisms.set(id, org);
    if (this.localDB) this.localDB.saveOrganism(org).catch(() => {});
    return org;
  }

  getOrganism(id) { return this.organisms.get(id) || null; }
  getAllOrganisms() { return Array.from(this.organisms.values()); }

  updateOrganism(id, changes) {
    const org = this.organisms.get(id);
    if (!org) return;
    Object.assign(org, changes);
    org.lastUpdate = Date.now();
    if (this.localDB) this.localDB.saveOrganism(org).catch(() => {});
  }

  deleteOrganism(id) {
    this.organisms.delete(id);
    if (this.localDB) this.localDB.deleteOrganism(id).catch(() => {});
  }

  archiveOrganism(id, cause) {
    const org = this.organisms.get(id);
    if (!org) return;
    org.lifecycle.lifecycleStage = 'deceased';
    org.lifecycle.deathDate = Date.now();
    org.lifecycle.deathCause = cause || null;
    org.lifecycle.transitions.push({
      time: Date.now(),
      stage: 'deceased',
      description: cause || 'Archived',
      data: {}
    });
    if (this.localDB) this.localDB.saveOrganism(org).catch(() => {});
  }

  getCurrentStage(id) {
    const org = this.organisms.get(id);
    return org?.lifecycle?.lifecycleStage || 'unknown';
  }

  getStageHistory(id) {
    const org = this.organisms.get(id);
    return org?.lifecycle?.transitions || [];
  }

  predictNextStage(id) {
    const org = this.organisms.get(id);
    if (!org) return null;
    const stages = ['germination', 'seedling', 'vegetative', 'mature', 'flowering', 'fruiting', 'senescent', 'dormant'];
    const current = org.lifecycle.lifecycleStage;
    const idx = stages.indexOf(current);
    if (idx < 0 || idx >= stages.length - 1) return null;
    return {
      stage: stages[idx + 1],
      estimatedDate: Date.now() + 30 * 86400000,
      confidence: 0.3
    };
  }

  recordTransition(id, stage, details = {}) {
    const org = this.organisms.get(id);
    if (!org) return;
    const transition = {
      time: details.time || Date.now(),
      from: org.lifecycle.lifecycleStage,
      to: stage,
      trigger: details.trigger || null,
      description: details.description || '',
      data: details.data || {}
    };
    org.lifecycle.lifecycleStage = stage;
    org.lifecycle.transitions.push(transition);
    if (stage === 'deceased') org.lifecycle.deathDate = transition.time;
    org.lastUpdate = Date.now();
    if (this.localDB) this.localDB.saveOrganism(org).catch(() => {});
    return transition;
  }

  recordStateSnapshot(organismId, snapshot, trigger = 'event', baseline = null) {
    const org = this.organisms.get(organismId);
    if (!org) return null;
    const previous = org._lastSnapshot || null;
    const data = {
      organismId,
      timestamp: snapshot.time || Date.now(),
      organismState: {
        healthScore: snapshot.healthScore ?? org.state?.healthScore,
        stressIndex: snapshot.stressIndex ?? org.state?.stressIndex,
        spikeRate: snapshot.spikeRate ?? org.state?.spikeRate,
        growthRate: snapshot.growthRate ?? org.state?.growthRate ?? 0,
        energyBalance: snapshot.energyBalance ?? org.state?.energyBalance ?? 100,
        lifecycleStage: snapshot.lifecycleStage ?? org.lifecycle?.lifecycleStage
      },
      baseline: baseline || (snapshot.baseline ? { ...snapshot.baseline } : org.baseline ? { ...org.baseline } : null),
      electricalSignature: snapshot.electricalSignature || [],
      trigger,
      delta: previous ? {
        healthDelta: (data.organismState.healthScore - previous.organismState.healthScore).toFixed(4),
        stressDelta: (data.organismState.stressIndex - previous.organismState.stressIndex).toFixed(4),
        spikeRateDelta: (data.organismState.spikeRate - previous.organismState.spikeRate).toFixed(2)
      } : null
    };
    org._lastSnapshot = data;
    org.state = { ...org.state, ...data.organismState };
    org.lastUpdate = data.timestamp;
    if (this.localDB) {
      this.localDB.saveStateSnapshot(data).catch(() => {});
      this.localDB.saveOrganism(org).catch(() => {});
    }
    return data;
  }

  recordSnapshot(organismId, twinSnapshot) {
    return this.recordStateSnapshot(organismId, {
      healthScore: twinSnapshot.healthScore,
      stressIndex: twinSnapshot.stressIndex,
      spikeRate: twinSnapshot.spikeRate,
      growthRate: twinSnapshot.growthRate,
      energyBalance: twinSnapshot.energyBalance,
      lifecycleStage: twinSnapshot.lifecycleStage,
      time: twinSnapshot.time,
      electricalSignature: twinSnapshot.electricalSignature,
      baseline: twinSnapshot.baseline
    }, 'periodic', twinSnapshot.baseline);
  }

  async getStateHistory(organismId, opts = {}) {
    if (!this.localDB) return [];
    const { since, until, limit = 200 } = opts;
    let snapshots;
    if (since !== undefined && until !== undefined) {
      snapshots = await this.localDB.getStateSnapshotsByTimeRange(organismId, since, until);
    } else {
      snapshots = await this.localDB.getStateSnapshotsByOrganism(organismId, limit);
    }
    return snapshots || [];
  }

  getLatestState(organismId) {
    const org = this.organisms.get(organismId);
    if (!org) return null;
    return {
      healthScore: org.state?.healthScore,
      stressIndex: org.state?.stressIndex,
      spikeRate: org.state?.spikeRate,
      growthRate: org.state?.growthRate ?? 0,
      energyBalance: org.state?.energyBalance ?? 100,
      lifecycleStage: org.lifecycle?.lifecycleStage,
      lastUpdate: org.lastUpdate
    };
  }

  async getStateAt(organismId, timestamp) {
    if (!this.localDB) return null;
    const all = await this.localDB.getStateSnapshotsByOrganism(organismId, 500);
    if (!all || all.length === 0) return null;
    const sorted = all.sort((a, b) => a.timestamp - b.timestamp);
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].timestamp <= timestamp) return sorted[i].organismState;
    }
    return sorted[0]?.organismState || null;
  }

  createProvenance(eventId, sensorId, calibration, dspPipeline, evidenceResult, classifierVersion) {
    const data = {
      id: `prov-${eventId}`,
      eventId,
      organismId: null,
      sensorId: sensorId || 'unknown',
      calibration: calibration ? { score: calibration.score, timestamp: calibration.timestamp || Date.now() } : { score: null, timestamp: null },
      dspPipeline: dspPipeline ? { filters: dspPipeline.filterSettings || {}, threshold: dspPipeline.threshold || 'auto' } : {},
      evidenceValidation: evidenceResult ? { valid: evidenceResult.valid, artifactCount: evidenceResult.artifactCount, adjustedConfidence: evidenceResult.adjustedConfidence } : { valid: true, artifactCount: 0, adjustedConfidence: 0 },
      classification: { version: classifierVersion || '1.0-client', modelHash: null },
      timestamp: Date.now(),
      deviceFingerprint: null,
      checksum: null
    };
    data.checksum = this._hash(JSON.stringify(data));
    if (this.localDB) this.localDB.saveProvenance(data).catch(() => {});
    return data;
  }

  async getProvenance(eventId) {
    if (!this.localDB) return [];
    return this.localDB.getProvenance(eventId) || [];
  }

  verifyProvenanceChain(chain) {
    if (!chain || chain.length === 0) return { valid: false, reason: 'empty chain' };
    const steps = [];
    let valid = true;
    for (const prov of chain) {
      const recalculated = this._hash(JSON.stringify({ ...prov, checksum: null }));
      steps.push({ id: prov.eventId, match: recalculated === prov.checksum });
      if (recalculated !== prov.checksum) valid = false;
    }
    return { valid, steps, chainLength: chain.length };
  }

  async exportIdentity(organismId) {
    const org = this.organisms.get(organismId);
    if (!org) return null;
    const snapshots = await this.getStateHistory(organismId, { limit: 10000 });
    let provenance = [];
    if (this.localDB) provenance = await this.localDB.getProvenanceByOrganism(organismId, 10000);
    return {
      exportDate: new Date().toISOString(),
      identity: { ...org, _lastSnapshot: undefined },
      stateHistory: snapshots,
      provenance,
      checksum: org.identityChecksum || ''
    };
  }

  async importIdentity(data) {
    if (!data?.identity?.id) return null;
    const org = data.identity;
    delete org._lastSnapshot;
    this.organisms.set(org.id, org);
    if (this.localDB) {
      await this.localDB.saveOrganism(org);
      if (data.provenance) {
        for (const p of data.provenance) {
          await this.localDB.saveProvenance(p);
        }
      }
    }
    return org;
  }

  getOrganismStats(organismId) {
    const org = this.organisms.get(organismId);
    if (!org) return null;
    const ageDays = org.createdAt ? Math.floor((Date.now() - org.createdAt) / 86400000) : 0;
    return {
      id: org.id,
      name: org.name,
      species: org.species,
      type: org.type,
      lifecycleStage: org.lifecycle?.lifecycleStage || 'unknown',
      ageDays,
      birthDate: org.lifecycle?.birthDate || null,
      deathDate: org.lifecycle?.deathDate || null,
      transitions: (org.lifecycle?.transitions || []).length,
      healthScore: org.state?.healthScore,
      stressIndex: org.state?.stressIndex,
      spikeRate: org.state?.spikeRate,
      growthRate: org.state?.growthRate ?? 0,
      energyBalance: org.state?.energyBalance ?? 100,
      location: org.location || null,
      identityVersion: org.identityVersion || 1,
      lastUpdate: org.lastUpdate
    };
  }

  getIdentityChecksum(organismId) {
    const org = this.organisms.get(organismId);
    if (!org || !org.identityChecksum) return null;
    return { checksum: org.identityChecksum, version: org.identityVersion || 1 };
  }

  recomputeIdentityChecksum(organismId) {
    const org = this.organisms.get(organismId);
    if (!org) return null;
    const data = JSON.stringify({
      id: org.id, name: org.name, species: org.species, type: org.type,
      lifecycle: org.lifecycle, location: org.location,
      state: org.state, baseline: org.baseline
    });
    const checksum = this._hash(data);
    org.identityChecksum = checksum;
    org.identityVersion = (org.identityVersion || 1) + 1;
    org.lastUpdate = Date.now();
    if (this.localDB) {
      this.localDB.saveOrganism(org).catch(() => {});
      this.localDB.saveIdentityChecksum(organismId, checksum, org.identityVersion).catch(() => {});
    }
    return checksum;
  }
}