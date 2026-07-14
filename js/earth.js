// BioEcho Earth — Globe Visualization Engine
// Real-time biological observations mapped on a globe.

class BioEchoEarth {
  constructor(knowledgeGraph, twinEngine, citizenScience) {
    this.kg = knowledgeGraph;
    this.twinEngine = twinEngine;
    this.citizenScience = citizenScience;
    this.layers = new Map();
    this.dataPoints = [];
    this.visible = true;
    this.centerLat = 20;
    this.centerLon = 0;
    this.zoom = 1;
    this._initLayers();
  }

  _initLayers() {
    this.layers.set('organisms', { name: 'Organisms', visible: true, color: '#22c55e', points: [] });
    this.layers.set('observations', { name: 'Observations', visible: true, color: '#3b82f6', points: [] });
    this.layers.set('species', { name: 'Species Distribution', visible: false, color: '#a855f7', points: [] });
    this.layers.set('missions', { name: 'Community Missions', visible: true, color: '#f59e0b', points: [] });
    this.layers.set('conservation', { name: 'Conservation Areas', visible: false, color: '#ef4444', points: [] });
  }

  async loadData() {
    this.dataPoints = [];

    const twins = this.twinEngine.getAll();
    for (const twin of twins) {
      if (twin.location?.latitude && twin.location?.longitude) {
        const point = {
          id: twin.id, layer: 'organisms',
          lat: twin.location.latitude, lon: twin.location.longitude,
          label: twin.name || twin.id, type: twin.species || 'unknown',
          data: { health: twin.state?.healthScore, stress: twin.state?.stressIndex }
        };
        this.dataPoints.push(point);
        this.layers.get('organisms').points.push(point);
      }
    }

    if (this.citizenScience) {
      const stats = this.citizenScience.getStats();
      const subs = Array.from(this.citizenScience.submissions.values());
      for (const sub of subs) {
        if (sub.location?.latitude && sub.location?.longitude) {
          const point = {
            id: sub.id, layer: 'observations',
            lat: sub.location.latitude, lon: sub.location.longitude,
            label: sub.speciesId || 'observation', type: sub.verificationLevel,
            data: { reviews: sub.reviewCount, level: sub.verificationLevel }
          };
          this.dataPoints.push(point);
          this.layers.get('observations').points.push(point);
        }
      }
    }

    this._generateSampleMissions();
    return this.dataPoints.length;
  }

  _generateSampleMissions() {
    const missions = [
      { id: 'm1', name: 'Urban Tree Canopy Survey', lat: 40.7128, lon: -74.006, participants: 234, target: 500 },
      { id: 'm2', name: 'Pollinator Watch Spring', lat: 51.5074, lon: -0.1278, participants: 891, target: 1000 },
      { id: 'm3', name: 'Coral Reef Monitoring', lat: -16.5, lon: -151.7, participants: 156, target: 300 },
      { id: 'm4', name: 'Amazon Biodiversity', lat: -3.4653, lon: -62.2159, participants: 67, target: 200 },
      { id: 'm5', name: 'City Garden Network', lat: 35.6762, lon: 139.6503, participants: 1203, target: 2000 }
    ];
    const missionsLayer = this.layers.get('missions');
    for (const m of missions) {
      const point = { id: m.id, layer: 'missions', lat: m.lat, lon: m.lon, label: m.name, type: 'mission', data: m };
      this.dataPoints.push(point);
      missionsLayer.points.push(point);
    }
  }

  toggleLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) layer.visible = !layer.visible;
    return layer?.visible;
  }

  getVisiblePoints() {
    const points = [];
    for (const [, layer] of this.layers) {
      if (layer.visible) points.push(...layer.points);
    }
    return points;
  }

  getLayerStats() {
    const stats = {};
    for (const [id, layer] of this.layers) {
      stats[id] = { name: layer.name, visible: layer.visible, count: layer.points.length, color: layer.color };
    }
    return stats;
  }

  getStats() {
    return {
      totalPoints: this.dataPoints.length,
      layers: this.layers.size,
      visibleLayers: Array.from(this.layers.values()).filter(l => l.visible).length
    };
  }
}
