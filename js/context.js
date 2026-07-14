// BioEcho Context Engine
// Merges organism state, species knowledge, environment, history, and user actions.

class ContextEngine {
  constructor(twinEngine, speciesDB) {
    this.twin = twinEngine;
    this.species = speciesDB;
    this.environment = {
      temperature: null, humidity: null, lightLevel: null,
      soilMoisture: null, airPressure: null, windSpeed: null,
      lastUpdated: null
    };
    this.userActions = []; // { time, type, details }
    this.maxActions = 200;
  }

  // Update environment from external sensor or manual input
  updateEnvironment(data) {
    Object.assign(this.environment, data, { lastUpdated: Date.now() });
  }

  // Record a user action (watering, pruning, moving, etc.)
  recordAction(type, details) {
    this.userActions.push({ time: Date.now(), type, details });
    if (this.userActions.length > this.maxActions) this.userActions.shift();
  }

  // Get full context for an organism at a given time
  getContext(organismId, timestamp) {
    const t = timestamp || Date.now();
    const twin = this.twin.getTwin(organismId);
    const speciesProfile = twin ? this.species.getProfile(twin.species) : null;

    // Recent history (last 24h)
    const recentEvents = twin ? twin.events.filter(e => e.time > t - 86400000) : [];
    const recentActions = this.userActions.filter(a => a.time > t - 86400000);

    // Daily rhythm (what time is it in the organism's day?)
    const hourOfDay = new Date(t).getHours();
    const isDaytime = hourOfDay >= 6 && hourOfDay < 20;

    // Stress trend (last 6 hours vs previous 6 hours)
    const last6h = recentEvents.filter(e => e.time > t - 21600000);
    const prev6h = recentEvents.filter(e => e.time > t - 43200000 && e.time <= t - 21600000);
    const stressNow = last6h.filter(e => ['water_stress','wounding','temperature_shock'].includes(e.classification)).length;
    const stressPrev = prev6h.filter(e => ['water_stress','wounding','temperature_shock'].includes(e.classification)).length;
    const stressTrend = stressNow > stressPrev ? 'increasing' : stressNow < stressPrev ? 'decreasing' : 'stable';

    return {
      organism: twin ? {
        id: twin.id, name: twin.name, species: twin.species,
        healthScore: twin.state.healthScore,
        stressIndex: twin.state.stressIndex,
        ageDays: Math.floor((t - twin.createdAt) / 86400000),
        totalEvents: twin.events.length
      } : null,
      species: speciesProfile ? {
        name: speciesProfile.commonName,
        scientificName: speciesProfile.scientificName,
        expectedVoltageRange: speciesProfile.voltageRange,
        typicalRecoveryTime: speciesProfile.recoveryTime,
        dailyRhythm: speciesProfile.rhythm,
        notes: speciesProfile.notes
      } : null,
      environment: { ...this.environment },
      time: {
        timestamp: t,
        hourOfDay,
        isDaytime,
        dayOfWeek: new Date(t).getDay()
      },
      history: {
        recentEvents: recentEvents.length,
        recentActions: recentActions.length,
        stressTrend,
        lastStressEvent: recentEvents.filter(e => e.classification !== 'resting').slice(-1)[0] || null,
        lastUserAction: recentActions.slice(-1)[0] || null
      },
      metadata: {
        contextVersion: 1,
        generatedAt: t
      }
    };
  }

  // Get a summary suitable for logging with each event
  getEventContext(organismId) {
    const ctx = this.getContext(organismId);
    return {
      temperature: ctx.environment.temperature,
      humidity: ctx.environment.humidity,
      lightLevel: ctx.environment.lightLevel,
      soilMoisture: ctx.environment.soilMoisture,
      hourOfDay: ctx.time.hourOfDay,
      isDaytime: ctx.time.isDaytime,
      stressTrend: ctx.history.stressTrend,
      recentEvents: ctx.history.recentEvents,
      recentActions: ctx.history.recentActions
    };
  }
}
