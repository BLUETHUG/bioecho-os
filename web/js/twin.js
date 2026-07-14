// BioEcho Digital Twin — Stateful organism model

class DigitalTwin {
  constructor(id, name, species, type = 'plant') {
    this.id = id;
    this.name = name;
    this.species = species;
    this.type = type;
    this.createdAt = Date.now();
    this.state = {
      healthScore: 1.0,
      growthRate: 0.5,       // cm/day
      waterUsage: 10,        // mL/day
      photosynthesisRate: 15, // µmol CO₂/m²/s
      energyBalance: 100,    // net kJ/day
      stressIndex: 0,
      electricalSignature: [],
      spikeRate: 0,          // spikes per minute
      lastUpdateTime: Date.now()
    };
    this.baseline = {
      restingAmplitude: 5,   // µV
      restingFrequency: 0.5, // Hz
      noiseFloor: 2           // µV
    };
    this.events = [];
    this.plants = null; // parent PlantManager reference for history
    this.predictions = {
      nextWateringTime: null,
      expectedStressTime: null,
      growthForecast: []
    };
  }

  updateBaseline(amplitude, frequency, noise) {
    // Slowly adapt baseline
    const alpha = 0.001;
    this.baseline.restingAmplitude += alpha * (amplitude - this.baseline.restingAmplitude);
    this.baseline.restingFrequency += alpha * (frequency - this.baseline.restingFrequency);
    this.baseline.noiseFloor += alpha * (noise - this.baseline.noiseFloor);
  }

  recordEvent(event) {
    this.events.push(event);
    if (this.events.length > 10000) this.events.shift();

    // Update state based on event
    this.state.lastUpdateTime = Date.now();

    // Update electrical signature (keep last 100 values)
    if (event.featureVector) {
      this.state.electricalSignature.push(event.featureVector.amplitude);
      if (this.state.electricalSignature.length > 100) this.state.electricalSignature.shift();
    }

    // Calculate spike rate (spikes in last 5 minutes)
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const recentEvents = this.events.filter(e =>
      e.timestamp > fiveMinAgo && e.type === 'spike'
    ).length;
    this.state.spikeRate = recentEvents / 5;

    // Update stress index
    if (event.classification === 'water_stress') {
      this.state.stressIndex = Math.min(1, this.state.stressIndex + 0.1);
      this.state.healthScore = Math.max(0, this.state.healthScore - 0.02);
    } else if (event.classification === 'wounding') {
      this.state.stressIndex = Math.min(1, this.state.stressIndex + 0.2);
      this.state.healthScore = Math.max(0, this.state.healthScore - 0.05);
    } else if (event.classification === 'resting' || event.classification === 'touch_response') {
      this.state.stressIndex = Math.max(0, this.state.stressIndex - 0.01);
    }

    // Generate predictions
    this._updatePredictions();
  }

  _updatePredictions() {
    // Simple heuristic predictions
    const recentEvents = this.events.slice(-50);
    const stressEvents = recentEvents.filter(e =>
      ['water_stress', 'temperature_shock'].includes(e.classification)
    );

    if (stressEvents.length > 2) {
      const trend = 'stress_increasing';
      if (this.baseline.restingAmplitude > 10) {
        this.predictions.expectedStressTime = Date.now() + 3600000 * (30 - this.state.stressIndex * 20); // 10-30 hours
      }
    } else {
      this.predictions.expectedStressTime = null;
    }
  }

  getSummary() {
    return {
      id: this.id,
      name: this.name,
      species: this.species,
      healthScore: this.state.healthScore,
      stressIndex: this.state.stressIndex,
      spikeRate: this.state.spikeRate,
      noiseFloor: this.baseline.noiseFloor,
      totalEvents: this.events.length,
      lastUpdate: this.state.lastUpdateTime
    };
  }

  toJSON() {
    return {
      id: this.id, name: this.name, species: this.species, type: this.type,
      createdAt: this.createdAt,
      state: this.state, baseline: this.baseline, predictions: this.predictions,
      eventCount: this.events.length
    };
  }
}

class PlantManager {
  constructor() {
    this.plants = new Map();
    this.activePlantId = null;
    this.onChange = null;
  }

  addPlant(id, name, species) {
    const plant = new DigitalTwin(id, name, species, 'plant');
    this.plants.set(id, plant);
    if (!this.activePlantId) this.activePlantId = id;
    if (this.onChange) this.onChange();
    return plant;
  }

  removePlant(id) {
    this.plants.delete(id);
    if (this.activePlantId === id) {
      this.activePlantId = this.plants.keys().next().value || null;
    }
    if (this.onChange) this.onChange();
  }

  getActive() { return this.plants.get(this.activePlantId); }
  setActive(id) { this.activePlantId = id; if (this.onChange) this.onChange(); }
  getAll() { return Array.from(this.plants.values()); }
  get count() { return this.plants.size; }

  recordEvent(plantId, event) {
    const plant = this.plants.get(plantId);
    if (plant) {
      plant.recordEvent(event);
      if (this.onChange) this.onChange();
    }
  }

  updateBaseline(plantId, amplitude, frequency, noise) {
    const plant = this.plants.get(plantId);
    if (plant) plant.updateBaseline(amplitude, frequency, noise);
  }

  getAllSummaries() {
    return this.getAll().map(p => p.getSummary());
  }
}
