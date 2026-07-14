// BioEcho Verification Chain Engine
// Full provenance for every observation. Trust is the product.

class VerificationChain {
  constructor(localDB, identityLayer) {
    this.localDB = localDB;
    this.identityLayer = identityLayer;
    this.chains = new Map();
    this.levels = { raw: 0, validated: 1, peer_reviewed: 2, published: 3 };
  }

  async createChain(observationId, sensorId, calibration, dspPipeline) {
    const chain = {
      id: this._uuid(),
      observationId,
      steps: [],
      overallConfidence: 0,
      verificationLevel: 'raw',
      checksum: '',
      createdAt: Date.now()
    };
    await this.addStep(chain.id, {
      step: 'sensor_capture',
      timestamp: Date.now(),
      sensorId,
      calibration: calibration || { score: 0, timestamp: 0 },
      rawDataHash: this._hash(JSON.stringify({ sensorId, calibration }))
    });
    if (dspPipeline) {
      await this.addStep(chain.id, {
        step: 'dsp_processing',
        timestamp: Date.now(),
        pipeline: dspPipeline.name || 'default',
        filters: dspPipeline.filters || [],
        version: dspPipeline.version || '1.0'
      });
    }
    this.chains.set(chain.id, chain);
    await this.localDB.saveProvenance({
      id: chain.id,
      organismId: observationId,
      observationId,
      sensorId,
      calibration,
      dspPipeline: dspPipeline || null,
      confidence: 0,
      level: 'raw',
      checksum: '',
      createdAt: chain.createdAt
    });
    return chain;
  }

  async addStep(chainId, stepData) {
    const chain = this.chains.get(chainId);
    if (!chain) return null;
    const step = { ...stepData, stepIndex: chain.steps.length };
    chain.steps.push(step);
    chain.overallConfidence = this._computeConfidence(chain);
    chain.verificationLevel = this._determineLevel(chain);
    chain.checksum = this._hash(JSON.stringify(chain.steps));
    if (this.localDB) {
      const existing = await this.localDB.getProvenanceById(chainId).catch(() => null);
      if (existing) {
        existing.confidence = chain.overallConfidence;
        existing.level = chain.verificationLevel;
        existing.checksum = chain.checksum;
        await this.localDB.saveProvenance(existing);
      }
    }
    return step;
  }

  async completeChain(chainId, evidence) {
    const chain = this.chains.get(chainId);
    if (!chain) return null;
    if (evidence) {
      await this.addStep(chainId, {
        step: 'evidence_validation',
        timestamp: Date.now(),
        valid: evidence.valid,
        artifacts: evidence.artifacts || [],
        adjustedConfidence: evidence.adjustedConfidence || chain.overallConfidence
      });
    }
    await this.addStep(chainId, {
      step: 'classification',
      timestamp: Date.now(),
      model: evidence?.model || 'local',
      version: evidence?.version || '1.0',
      confidence: evidence?.adjustedConfidence || chain.overallConfidence
    });
    chain.completedAt = Date.now();
    return chain;
  }

  async getChain(chainId) {
    if (this.chains.has(chainId)) return this.chains.get(chainId);
    if (this.localDB) {
      const prov = await this.localDB.getProvenanceById(chainId).catch(() => null);
      if (prov) {
        const chain = this._provToChain(prov);
        this.chains.set(chainId, chain);
        return chain;
      }
    }
    return null;
  }

  async getChainsByObservation(observationId) {
    const results = [];
    for (const [, chain] of this.chains) {
      if (chain.observationId === observationId) results.push(chain);
    }
    if (this.localDB) {
      const provs = await this.localDB.getProvenanceByOrganism(observationId, 100).catch(() => []);
      for (const p of provs) {
        if (!results.find(r => r.id === p.id)) results.push(this._provToChain(p));
      }
    }
    return results;
  }

  async verifyChainIntegrity(chainId) {
    const chain = await this.getChain(chainId);
    if (!chain) return { valid: false, error: 'Chain not found' };
    const expectedChecksum = this._hash(JSON.stringify(chain.steps));
    const valid = chain.checksum === expectedChecksum;
    return {
      valid,
      chainId,
      steps: chain.steps.length,
      level: chain.verificationLevel,
      confidence: chain.overallConfidence,
      checksumMatch: valid,
      timestamp: chain.createdAt
    };
  }

  getLevel(level) { return this.levels[level] || 0; }
  canPromote(currentLevel, reviews) {
    const cur = this.levels[currentLevel] || 0;
    if (cur === 0 && reviews >= 1) return 'validated';
    if (cur === 1 && reviews >= 3) return 'peer_reviewed';
    if (cur === 2 && reviews >= 5) return 'published';
    return null;
  }

  getStats() {
    const counts = { raw: 0, validated: 0, peer_reviewed: 0, published: 0 };
    let totalConfidence = 0;
    for (const [, chain] of this.chains) {
      counts[chain.verificationLevel] = (counts[chain.verificationLevel] || 0) + 1;
      totalConfidence += chain.overallConfidence;
    }
    return {
      totalChains: this.chains.size,
      byLevel: counts,
      avgConfidence: this.chains.size > 0 ? totalConfidence / this.chains.size : 0
    };
  }

  _computeConfidence(chain) {
    if (chain.steps.length === 0) return 0;
    let total = 0;
    for (const step of chain.steps) {
      if (step.confidence) total += step.confidence;
      else if (step.calibration?.score) total += step.calibration.score;
      else if (step.valid) total += 0.8;
      else total += 0.5;
    }
    return Math.min(1, total / chain.steps.length);
  }

  _determineLevel(chain) {
    const stepNames = chain.steps.map(s => s.step);
    if (stepNames.includes('user_confirmation')) return 'peer_reviewed';
    if (stepNames.includes('evidence_validation') && stepNames.includes('classification')) return 'validated';
    return 'raw';
  }

  _provToChain(prov) {
    return {
      id: prov.id,
      observationId: prov.observationId || prov.organismId,
      steps: [
        { step: 'sensor_capture', sensorId: prov.sensorId, calibration: prov.calibration, timestamp: prov.createdAt },
        prov.dspPipeline ? { step: 'dsp_processing', ...prov.dspPipeline, timestamp: prov.createdAt } : null,
        { step: 'classification', confidence: prov.confidence, timestamp: prov.createdAt }
      ].filter(Boolean),
      overallConfidence: prov.confidence || 0,
      verificationLevel: prov.level || 'raw',
      checksum: prov.checksum || '',
      createdAt: prov.createdAt
    };
  }

  _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
    return 'vc-' + Math.abs(h).toString(36);
  }

  _uuid() {
    return 'vc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
  }
}
