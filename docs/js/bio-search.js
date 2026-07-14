// BioEcho Biological Search Engine
// Full-text, temporal, comparative, and pattern search across all data.

class BioSearchEngine {
  constructor(twinEngine, speciesDB, knowledgeGraph, localDB, contextEngine) {
    this.twinEngine = twinEngine;
    this.speciesDB = speciesDB;
    this.kg = knowledgeGraph;
    this.localDB = localDB;
    this.contextEngine = contextEngine;
    this.index = { events: [], organisms: [], species: [] };
    this._buildIndex();
  }

  _buildIndex() {
    this.index.organisms = this.twinEngine.getAll().map(t => ({
      id: t.id, type: 'organism', text: `${t.id} ${t.species || ''} ${t.name || ''}`.toLowerCase(),
      data: t, timestamp: t.createdAt
    }));

    for (const twin of this.twinEngine.getAll()) {
      for (const event of (twin.events || [])) {
        this.index.events.push({
          id: event.id, type: 'event', organismId: twin.id,
          text: `${event.type || ''} ${event.classification?.type || ''} ${event.classification?.label || ''} ${JSON.stringify(event.state || {})}`.toLowerCase(),
          data: event, timestamp: event.timestamp
        });
      }
    }

    for (const [id, species] of this.speciesDB.profiles) {
      this.index.species.push({
        id, type: 'species',
        text: `${id} ${species.commonName} ${species.scientificName} ${species.family || ''} ${species.notes || ''}`.toLowerCase(),
        data: species
      });
    }
  }

  rebuildIndex() { this._buildIndex(); }

  async search(query, filters) {
    const q = (query || '').toLowerCase().trim();
    const limit = filters?.limit || 30;
    const type = filters?.type;
    let results = [];

    const allItems = [...this.index.organisms, ...this.index.events, ...this.index.species];
    for (const item of allItems) {
      if (type && item.type !== type) continue;
      if (filters?.organismId && item.organismId !== filters.organismId && item.id !== filters.organismId) continue;
      if (filters?.timeRange) {
        const ts = item.timestamp || 0;
        if (ts < filters.timeRange[0] || ts > filters.timeRange[1]) continue;
      }

      let score = 0;
      if (q) {
        const words = q.split(/\s+/).filter(w => w.length > 1);
        for (const w of words) {
          if (item.text.includes(w)) score += 0.3;
        }
        if (item.text.startsWith(q)) score += 0.2;
      } else {
        score = 0.5;
      }

      if (score > 0.1) results.push({ ...item, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async searchTemporal(criteria) {
    const start = criteria?.start || Date.now() - 7 * 86400000;
    const end = criteria?.end || Date.now();
    const eventType = criteria?.eventType;
    const organismId = criteria?.organismId;

    const results = this.index.events.filter(e => {
      if (e.timestamp < start || e.timestamp > end) return false;
      if (eventType && e.data?.type !== eventType) return false;
      if (organismId && e.organismId !== organismId) return false;
      return true;
    });

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  async searchComparative(criteria) {
    const organismIds = criteria?.organismIds || [];
    if (organismIds.length < 2) return { error: 'Need at least 2 organisms to compare' };

    const comparisons = {};
    for (const id of organismIds) {
      const twin = this.twinEngine.getTwin(id);
      if (twin) {
        comparisons[id] = {
          state: twin.state || {},
          eventCount: (twin.events || []).length,
          species: twin.species,
          name: twin.name
        };
      }
    }

    const metrics = ['healthScore', 'stressIndex', 'spikeRate', 'growthRate'];
    const summaries = {};
    for (const m of metrics) {
      const values = Object.values(comparisons).map(c => c.state[m]).filter(v => v !== undefined);
      if (values.length > 0) {
        summaries[m] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          spread: Math.max(...values) - Math.min(...values)
        };
      }
    }

    return { organisms: comparisons, summaries };
  }

  async searchPattern(pattern) {
    const type = pattern?.type;
    const minConfidence = pattern?.minConfidence || 0;
    const results = [];

    for (const item of this.index.events) {
      const event = item.data;
      if (!event) continue;
      let match = false;

      if (type && event.type !== type) continue;
      if (event.classification?.confidence >= minConfidence) match = true;
      if (event.state?.stressIndex > 0.6) match = true;

      if (match) results.push(item);
    }

    return results.slice(0, pattern?.limit || 30);
  }

  async searchCrossEntity(criteria) {
    const q = (criteria?.query || '').toLowerCase();
    const results = [];

    if (this.kg) {
      const nodes = Array.from(this.kg.nodes.values());
      for (const node of nodes) {
        const text = JSON.stringify(node.data || {}).toLowerCase();
        if (q && text.includes(q)) {
          results.push({ entityType: node.type, id: node.id, data: node.data, source: 'knowledge_graph' });
        }
      }
    }

    for (const item of [...this.index.organisms, ...this.index.species]) {
      if (item.text.includes(q)) {
        results.push({ entityType: item.type, id: item.id, data: item.data, source: 'local_index' });
      }
    }

    return results.slice(0, criteria?.limit || 30);
  }

  getStats() {
    return {
      totalIndexed: this.index.events.length + this.index.organisms.length + this.index.species.length,
      events: this.index.events.length,
      organisms: this.index.organisms.length,
      species: this.index.species.length
    };
  }
}
