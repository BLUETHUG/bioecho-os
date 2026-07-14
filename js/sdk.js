// BioEcho SDK — Plugin Architecture
// Register custom sensors, classifiers, visualizations, data sources.

class BioEchoSDK {
  constructor() {
    this.plugins = new Map();
    this.sensors = new Map();
    this.classifiers = new Map();
    this.visualizations = new Map();
    this.dataSources = new Map();
    this.exports = new Map();
  }

  static registerSensor(config) {
    const sensor = {
      id: config.id || `sensor-${Date.now()}`,
      name: config.name || 'Custom Sensor',
      type: config.type || 'generic',
      connect: config.connect || (() => Promise.resolve({ status: 'connected' })),
      readSample: config.readSample || (() => ({ value: 0, timestamp: Date.now() })),
      disconnect: config.disconnect || (() => {}),
      getCapabilities: config.getCapabilities || (() => ({ sampleRate: 100, channels: 1 })),
      version: config.version || '1.0.0'
    };
    return sensor;
  }

  static registerClassifier(config) {
    return {
      id: config.id || `classifier-${Date.now()}`,
      name: config.name || 'Custom Classifier',
      classify: config.classify || (() => ({ type: 'unknown', confidence: 0 })),
      train: config.train || (() => ({ success: true })),
      getModelInfo: config.getModelInfo || (() => ({ version: '1.0', accuracy: 0 })),
      version: config.version || '1.0.0'
    };
  }

  static registerVisualization(config) {
    return {
      id: config.id || `viz-${Date.now()}`,
      name: config.name || 'Custom Visualization',
      render: config.render || (() => {}),
      getOptions: config.getOptions || (() => []),
      version: config.version || '1.0.0'
    };
  }

  static registerDataSource(config) {
    return {
      id: config.id || `source-${Date.now()}`,
      name: config.name || 'Custom Data Source',
      fetch: config.fetch || (() => Promise.resolve([])),
      getSchema: config.getSchema || (() => ({})),
      version: config.version || '1.0.0'
    };
  }

  static registerExport(config) {
    return {
      id: config.id || `export-${Date.now()}`,
      name: config.name || 'Custom Export',
      format: config.format || 'json',
      export: config.export || ((data) => JSON.stringify(data)),
      version: config.version || '1.0.0'
    };
  }

  addPlugin(type, plugin) {
    if (!this.plugins.has(type)) this.plugins.set(type, new Map());
    this.plugins.get(type).set(plugin.id, plugin);
    return plugin;
  }

  getPlugin(type, id) {
    return this.plugins.get(type)?.get(id);
  }

  getAllPlugins(type) {
    if (type) return Array.from(this.plugins.get(type)?.values() || []);
    const all = [];
    for (const [, map] of this.plugins) all.push(...map.values());
    return all;
  }

  removePlugin(type, id) {
    return this.plugins.get(type)?.delete(id);
  }

  getStats() {
    const counts = {};
    for (const [type, map] of this.plugins) counts[type] = map.size;
    return { totalPlugins: Array.from(this.plugins.values()).reduce((a, m) => a + m.size, 0), byType: counts };
  }
}
