// BioEcho Emergency Intelligence Engine
// Detect emergencies, find vets, first aid, medical passport.

class EmergencyEngine {
  constructor(twinEngine, speciesDB, localDB) {
    this.twinEngine = twinEngine;
    this.speciesDB = speciesDB;
    this.localDB = localDB;
    this.emergencyHistory = new Map();
    this.vetDatabase = this._initVetDB();
    this.firstAidDB = this._initFirstAidDB();
  }

  async detectEmergency(organismId, signal) {
    const twin = this.twinEngine.getTwin(organismId);
    if (!twin) return null;
    const state = twin.state || {};
    const species = this.speciesDB.getSpecies(twin.species);
    const symptoms = [];

    if ((state.stressIndex || 0) > 0.8) symptoms.push('extreme_stress');
    if ((state.healthScore || 1) < 0.2) symptoms.push('critical_health');
    if ((state.spikeRate || 0) > 20) symptoms.push('electrical_distress');
    if ((state.spikeRate || 0) === 0 && state.healthScore < 0.3) symptoms.push('no_signal');
    if (state.temperature > 40 || state.temperature < 5) symptoms.push('temperature_extreme');

    if (symptoms.length === 0) return null;

    const severity = symptoms.includes('critical_health') || symptoms.includes('no_signal') ? 'critical' :
      symptoms.includes('extreme_stress') || symptoms.includes('electrical_distress') ? 'high' : 'medium';

    const emergency = {
      id: `emg-${Date.now().toString(36)}`,
      organismId, type: this._classifyEmergency(symptoms),
      severity, symptoms, timestamp: Date.now(),
      species: species?.commonName || twin.species,
      recommendedAction: this._getFirstAid(symptoms, twin.species),
      nearbyVets: this._findNearbyVets(twin.location),
      firstAid: this.firstAidDB.get(this._classifyEmergency(symptoms)) || this.firstAidDB.get('general_stress')
    };

    const history = this.emergencyHistory.get(organismId) || [];
    history.push(emergency);
    this.emergencyHistory.set(organismId, history);

    return emergency;
  }

  async findNearestVet(location) {
    if (!location?.latitude) return this.vetDatabase.slice(0, 5);
    return this.vetDatabase
      .map(v => ({ ...v, distance: this._haversine(location.latitude, location.longitude, v.lat, v.lon) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }

  async getFirstAid(emergencyType) {
    return this.firstAidDB.get(emergencyType) || this.firstAidDB.get('general_stress');
  }

  async generateReport(organismId, emergency) {
    const twin = this.twinEngine.getTwin(organismId);
    const identity = this.twinEngine.getOrganismIdentity(organismId);
    return {
      reportId: `rpt-${Date.now().toString(36)}`,
      organism: { id: organismId, name: twin?.name || organismId, species: twin?.species },
      identity: identity || {},
      emergency,
      generatedAt: Date.now(),
      format: 'bioecho-emergency-report-v1'
    };
  }

  async getMedicalPassport(organismId) {
    const twin = this.twinEngine.getTwin(organismId);
    const identity = this.twinEngine.getOrganismIdentity(organismId);
    if (!twin) return null;
    return {
      organismId, species: twin.species || 'unknown',
      name: twin.name || organismId,
      age: twin.createdAt ? Math.floor((Date.now() - twin.createdAt) / 86400000) : null,
      medicalHistory: (this.emergencyHistory.get(organismId) || []).map(e => ({
        date: e.timestamp, type: e.type, severity: e.severity, symptoms: e.symptoms
      })),
      vaccinations: [], allergies: [],
      currentMedications: [], emergencyContacts: []
    };
  }

  _classifyEmergency(symptoms) {
    if (symptoms.includes('no_signal') || symptoms.includes('critical_health')) return 'critical_distress';
    if (symptoms.includes('electrical_distress')) return 'electrical_anomaly';
    if (symptoms.includes('temperature_extreme')) return 'thermal_stress';
    if (symptoms.includes('extreme_stress')) return 'severe_stress';
    return 'general_stress';
  }

  _getFirstAid(symptoms, species) {
    if (symptoms.includes('no_signal')) return 'Check electrode connections. Verify sensor is properly attached.';
    if (symptoms.includes('extreme_stress')) return 'Remove stressor. Provide shade/water. Allow 30min recovery.';
    if (symptoms.includes('temperature_extreme')) return 'Move to moderate temperature. Avoid rapid temperature changes.';
    return 'Monitor closely. Record symptoms. Reduce handling.';
  }

  _findNearbyVets(location) {
    if (!location?.latitude) return this.vetDatabase.slice(0, 3);
    return this.vetDatabase
      .map(v => ({ ...v, distance: this._haversine(location.latitude, location.longitude, v.lat, v.lon) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }

  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  _initVetDB() {
    return [
      { id: 'v1', name: 'Green Valley Veterinary', specialty: 'plants', lat: 40.7128, lon: -74.006, phone: '+1-555-0101', rating: 4.8 },
      { id: 'v2', name: 'Botanical Health Center', specialty: 'plants', lat: 51.5074, lon: -0.1278, phone: '+44-20-7946-0101', rating: 4.6 },
      { id: 'v3', name: 'Urban Pet Clinic', specialty: 'animals', lat: 34.0522, lon: -118.2437, phone: '+1-555-0202', rating: 4.5 },
      { id: 'v4', name: 'Nature Care Hospital', specialty: 'general', lat: 35.6762, lon: 139.6503, phone: '+81-3-1234-5678', rating: 4.7 },
      { id: 'v5', name: 'Eco Wellness Vet', specialty: 'exotic', lat: -33.8688, lon: 151.2093, phone: '+61-2-9876-5432', rating: 4.9 }
    ];
  }

  _initFirstAidDB() {
    const db = new Map();
    db.set('critical_distress', { title: 'Critical Distress', steps: ['Stop all interaction immediately', 'Check sensor/electrode connections', 'Verify power supply', 'If no signal recovery in 5min, consult specialist', 'Document the event for analysis'], urgency: 'critical' });
    db.set('electrical_anomaly', { title: 'Electrical Anomaly', steps: ['Disconnect electrodes', 'Check for short circuits', 'Verify grounding', 'Re-calibrate sensor', 'Reconnect and test'], urgency: 'high' });
    db.set('thermal_stress', { title: 'Thermal Stress', steps: ['Move organism to moderate temperature', 'Avoid ice or direct heat', 'Allow gradual temperature adjustment', 'Monitor recovery over 2 hours'], urgency: 'high' });
    db.set('severe_stress', { title: 'Severe Stress', steps: ['Identify and remove stressor', 'Provide water and shade', 'Reduce handling', 'Monitor for 30 minutes', 'Record recovery time'], urgency: 'medium' });
    db.set('general_stress', { title: 'General Stress', steps: ['Monitor organism closely', 'Record symptoms and timing', 'Ensure adequate water and light', 'Reduce environmental changes'], urgency: 'low' });
    return db;
  }

  getStats() {
    let total = 0;
    for (const [, history] of this.emergencyHistory) total += history.length;
    return { totalEmergencies: total, organismsAffected: this.emergencyHistory.size };
  }
}
