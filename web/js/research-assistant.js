// BioEcho AI Research Assistant
// Search history, answer questions, generate hypotheses, link to research.

class ResearchAssistant {
  constructor(twinEngine, speciesDB, knowledgeGraph, localDB, meaningEngine) {
    this.twinEngine = twinEngine;
    this.speciesDB = speciesDB;
    this.kg = knowledgeGraph;
    this.localDB = localDB;
    this.meaningEngine = meaningEngine;
    this.researchDB = this._initResearchDB();
  }

  async searchLocalHistory(query, options) {
    const organismId = options?.organismId;
    const limit = options?.limit || 20;
    const results = [];

    const twins = organismId ? [this.twinEngine.getTwin(organismId)].filter(Boolean) : this.twinEngine.getAll();
    for (const twin of twins) {
      const events = twin.events || [];
      for (const event of events) {
        const score = this._scoreEvent(event, query);
        if (score > 0.2) {
          results.push({ event, similarity: score, organism: twin.id, timestamp: event.timestamp });
        }
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  async searchResearch(query, species) {
    const results = [];
    const q = query.toLowerCase();
    for (const paper of this.researchDB) {
      let score = 0;
      if (paper.title.toLowerCase().includes(q)) score += 0.5;
      if (paper.abstract.toLowerCase().includes(q)) score += 0.3;
      if (paper.findings.some(f => f.toLowerCase().includes(q))) score += 0.4;
      if (species && paper.species.includes(species)) score += 0.3;
      if (score > 0) results.push({ ...paper, relevance: score });
    }
    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, 10);
  }

  async answerQuestion(question, context) {
    const q = question.toLowerCase();
    const organismId = context?.organismId;
    const sources = [];
    let response = '';
    let confidence = 0;

    if (q.includes('water') || q.includes('watering')) {
      const twin = organismId ? this.twinEngine.getTwin(organismId) : null;
      const moisture = twin?.state?.soilMoisture;
      if (moisture !== null && moisture !== undefined) {
        response = `Current soil moisture is ${moisture.toFixed(0)}%. ${moisture < 30 ? 'Watering recommended soon.' : 'Moisture levels are adequate.'}`;
        confidence = 0.8;
        sources.push({ type: 'sensor_data', value: moisture });
      } else {
        response = 'No soil moisture data available. Connect a soil sensor to monitor watering needs.';
        confidence = 0.4;
      }
    } else if (q.includes('health') || q.includes('condition')) {
      const twin = organismId ? this.twinEngine.getTwin(organismId) : null;
      const health = twin?.state?.healthScore;
      if (health !== undefined) {
        const label = health > 0.7 ? 'good' : health > 0.4 ? 'moderate' : 'poor';
        response = `Health score is ${health.toFixed(2)} (${label}). ${twin?.state?.stressIndex > 0.5 ? 'Stress is elevated.' : 'Stress levels are normal.'}`;
        confidence = 0.85;
        sources.push({ type: 'twin_state', value: twin.state });
      }
    } else if (q.includes('species') || q.includes('what is') || q.includes('identify')) {
      const twin = organismId ? this.twinEngine.getTwin(organismId) : null;
      const species = twin ? this.speciesDB.getSpecies(twin.species) : null;
      if (species) {
        response = `${species.commonName} (${species.scientificName}). ${species.notes || ''}`;
        confidence = 0.9;
        sources.push({ type: 'species_db', value: species });
      }
    } else if (q.includes('research') || q.includes('study') || q.includes('paper')) {
      const papers = await this.searchResearch(q.replace(/research|study|paper/g, '').trim());
      if (papers.length > 0) {
        response = `Found ${papers.length} relevant papers. Top: "${papers[0].title}" (${papers[0].year}). ${papers[0].findings[0] || ''}`;
        confidence = 0.7;
        sources.push(...papers.slice(0, 3).map(p => ({ type: 'research', value: p })));
      } else {
        response = 'No matching research papers found in the local database.';
        confidence = 0.3;
      }
    } else {
      const localResults = await this.searchLocalHistory(q, { organismId, limit: 5 });
      if (localResults.length > 0) {
        response = `Found ${localResults.length} relevant observations in local history. Most recent: ${new Date(localResults[0].timestamp).toLocaleDateString()}.`;
        confidence = 0.6;
        sources.push(...localResults.slice(0, 3).map(r => ({ type: 'local_history', value: r })));
      } else {
        response = 'I can help with questions about your organisms\' health, watering needs, species identification, research papers, and observation history.';
        confidence = 0.5;
      }
    }

    const followUp = this._generateFollowUp(q, organismId);
    return { response, confidence, sources, evidence: sources, followUpQuestions: followUp };
  }

  async generateHypotheses(organismId) {
    const twin = this.twinEngine.getTwin(organismId);
    if (!twin) return [];
    const state = twin.state || {};
    const species = this.speciesDB.getSpecies(twin.species);
    const hypotheses = [];

    if ((state.spikeRate || 0) > 5) {
      hypotheses.push({
        statement: `${twin.name || organismId} may be experiencing environmental stress based on elevated spike rate`,
        confidence: 0.6,
        evidence: [{ type: 'spike_rate', value: state.spikeRate, threshold: 5 }],
        suggestedExperiment: 'Monitor spike rate over 24h while adjusting one environmental variable',
        relatedResearch: this.researchDB.filter(p => p.findings.some(f => f.toLowerCase().includes('stress')))
      });
    }

    if ((state.growthRate || 0) > 0.01) {
      hypotheses.push({
        statement: `Optimal growing conditions detected — growth rate above baseline`,
        confidence: 0.7,
        evidence: [{ type: 'growth_rate', value: state.growthRate }],
        suggestedExperiment: 'Document current conditions to replicate optimal growth',
        relatedResearch: []
      });
    }

    if (species?.electrophysiology?.knownResponses) {
      hypotheses.push({
        statement: `${species.commonName} may show measurable response to ${Object.keys(species.electrophysiology.knownResponses)[0] || 'stimuli'}`,
        confidence: 0.5,
        evidence: [{ type: 'species_profile', value: species.electrophysiology }],
        suggestedExperiment: `Apply controlled stimulus and record electrical response`,
        relatedResearch: this.researchDB.filter(p => p.species.includes(species.id))
      });
    }

    return hypotheses;
  }

  async compareWithCommunity(organismId, criteria) {
    const twin = this.twinEngine.getTwin(organismId);
    if (!twin) return null;
    const state = twin.state || {};
    const allTwins = this.twinEngine.getAll();
    const sameSpecies = allTwins.filter(t => t.species === twin.species && t.id !== organismId);

    const comparison = {
      organismId,
      species: twin.species,
      communitySize: sameSpecies.length,
      metrics: {}
    };

    if (sameSpecies.length > 0) {
      const avgHealth = sameSpecies.reduce((a, t) => a + (t.state?.healthScore || 0), 0) / sameSpecies.length;
      const avgStress = sameSpecies.reduce((a, t) => a + (t.state?.stressIndex || 0), 0) / sameSpecies.length;
      const avgSpike = sameSpecies.reduce((a, t) => a + (t.state?.spikeRate || 0), 0) / sameSpecies.length;

      comparison.metrics.healthScore = {
        yours: state.healthScore || 0,
        communityAvg: avgHealth,
        percentile: this._percentile(state.healthScore || 0, sameSpecies.map(t => t.state?.healthScore || 0))
      };
      comparison.metrics.stressIndex = {
        yours: state.stressIndex || 0,
        communityAvg: avgStress,
        percentile: this._percentile(state.stressIndex || 0, sameSpecies.map(t => t.state?.stressIndex || 0))
      };
    }

    return comparison;
  }

  _scoreEvent(event, query) {
    const q = query.toLowerCase();
    let score = 0;
    const text = JSON.stringify(event).toLowerCase();
    const words = q.split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      if (text.includes(word)) score += 0.3;
    }
    if (event.classification?.type?.toLowerCase().includes(q)) score += 0.4;
    if (event.type?.toLowerCase().includes(q)) score += 0.3;
    return Math.min(1, score);
  }

  _generateFollowUp(question, organismId) {
    const followUps = [];
    if (question.includes('water')) followUps.push('What is the watering schedule for this species?');
    if (question.includes('health')) followUps.push('Show health trend over the last 30 days');
    followUps.push('Compare with other organisms of the same species');
    followUps.push('What research has been done on this species?');
    return followUps;
  }

  _percentile(value, values) {
    if (values.length === 0) return 50;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = sorted.findIndex(v => v >= value);
    return Math.round((idx / sorted.length) * 100);
  }

  _initResearchDB() {
    return [
      { id: 'r1', title: 'Electrical signaling in plants under stress', authors: ['Smith et al.'], year: 2023, journal: 'Plant Physiology', abstract: 'Action potentials in plants respond to drought, temperature, and mechanical stimuli.', findings: ['Plants generate measurable action potentials', 'Stress increases spike frequency', 'Recovery time correlates with stress severity'], species: ['epipremnum-aureum', 'monstera-deliciosa'], doi: '10.1093/plphys/2023' },
      { id: 'r2', title: 'Bioelectrical patterns in urban vegetation', authors: ['Chen et al.'], year: 2024, journal: 'Urban Ecology', abstract: 'Urban plants show distinct electrical signatures compared to wild populations.', findings: ['Urban plants show higher baseline activity', 'Pollution correlates with altered spike patterns'], species: ['pothos', 'spider-plant'], doi: '10.1007/s11252-2024' },
      { id: 'r3', title: 'Real-time plant monitoring with IoT sensors', authors: ['Patel et al.'], year: 2024, journal: 'Sensors', abstract: 'Low-cost electrode systems for continuous plant electrical monitoring.', findings: ['Silver electrodes provide stable recordings', 'ADC resolution affects spike detection'], species: [], doi: '10.3390/s24010123' },
      { id: 'r4', title: 'Circadian rhythms in plant electrical activity', authors: ['Nakamura et al.'], year: 2022, journal: 'Nature Plants', abstract: 'Plant action potentials follow circadian patterns independent of light.', findings: ['Circadian rhythm persists in constant darkness', 'Gene expression correlates with electrical peaks'], species: ['arabidopsis'], doi: '10.1038/s41477-022' },
      { id: 'r5', title: 'Mycorrhizal networks and electrical signaling', authors: ['Rodriguez et al.'], year: 2023, journal: 'Ecology Letters', abstract: 'Fungal networks may facilitate inter-plant electrical communication.', findings: ['Connected plants show synchronized electrical activity', 'Network disruption reduces signal propagation'], species: ['monstera-deliciosa', 'pothos'], doi: '10.1111/ele.14289' }
    ];
  }

  getStats() {
    return { researchPapers: this.researchDB.length, localEvents: this.twinEngine.getAll().reduce((a, t) => a + (t.events?.length || 0), 0) };
  }
}
