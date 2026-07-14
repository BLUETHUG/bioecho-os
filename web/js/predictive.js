// BioEcho Predictive Intelligence Engine
// Predict events, forecast needs, detect anomalies, health trajectory.

class PredictiveEngine {
  constructor(twinEngine, speciesDB, contextEngine, localDB) {
    this.twinEngine = twinEngine;
    this.speciesDB = speciesDB;
    this.contextEngine = contextEngine;
    this.localDB = localDB;
    this.anomalyHistory = new Map();
    this.predictionCache = new Map();
  }

  async predictNextEvent(organismId) {
    const twin = this.twinEngine.getTwin(organismId);
    if (!twin) return null;
    const state = twin.state || {};
    const events = twin.events || [];
    const recent = events.slice(-50);
    const predictions = [];

    const watering = this._predictWatering(state, recent);
    if (watering) predictions.push(watering);

    const stress = this._predictStress(state, recent);
    if (stress) predictions.push(stress);

    const growth = this._predictGrowthMilestone(state, recent);
    if (growth) predictions.push(growth);

    const dormancy = this._predictDormancy(organismId, state);
    if (dormancy) predictions.push(dormancy);

    predictions.sort((a, b) => a.estimatedTime - b.estimatedTime);
    return predictions[0] || { type: 'no_prediction', confidence: 0, reasoning: ['Insufficient data'] };
  }

  async forecastNeeds(organismId) {
    const twin = this.twinEngine.getTwin(organismId);
    if (!twin) return null;
    const state = twin.state || {};
    const species = this.speciesDB.getSpecies(twin.species);
    const care = species?.careRequirements || {};

    const watering = {
      needed: (state.soilMoisture || 50) < 30,
      estimatedHours: this._hoursUntilWatering(state),
      urgency: (state.soilMoisture || 50) < 20 ? 'critical' : (state.soilMoisture || 50) < 30 ? 'soon' : 'adequate',
      currentMoisture: state.soilMoisture || null
    };

    const light = {
      needed: true,
      currentVsOptimal: this._lightRatio(state, care),
      recommendation: this._lightRecommendation(state, care)
    };

    const temperature = {
      risk: this._temperatureRisk(state, care),
      expectedChange: this._temperatureTrend(state),
      optimalRange: care.temperature || [15, 30]
    };

    const careActivities = this._getOverdueActivities(twin, species);

    return { watering, light, temperature, care: careActivities };
  }

  async detectAnomalies(organismId, windowSize) {
    const twin = this.twinEngine.getTwin(organismId);
    if (!twin) return [];
    const state = twin.state || {};
    const window = windowSize || 20;
    const anomalies = [];

    const metrics = [
      { key: 'spikeRate', label: 'Spike Rate', baseline: this._getBaseline(organismId, 'spikeRate'), current: state.spikeRate },
      { key: 'healthScore', label: 'Health Score', baseline: this._getBaseline(organismId, 'healthScore'), current: state.healthScore },
      { key: 'stressIndex', label: 'Stress Index', baseline: this._getBaseline(organismId, 'stressIndex'), current: state.stressIndex },
      { key: 'growthRate', label: 'Growth Rate', baseline: this._getBaseline(organismId, 'growthRate'), current: state.growthRate }
    ];

    for (const m of metrics) {
      if (m.baseline === null || m.current === undefined) continue;
      const deviation = Math.abs(m.current - m.baseline.mean) / (m.baseline.std || 1);
      if (deviation > 2) {
        const severity = deviation > 3 ? 'high' : deviation > 2.5 ? 'medium' : 'low';
        anomalies.push({
          type: `unusual_${m.key}`,
          severity,
          description: `${m.label} is ${deviation.toFixed(1)}σ from baseline`,
          baseline: m.baseline.mean,
          observed: m.current,
          deviation,
          firstObserved: Date.now(),
          frequency: this._getAnomalyFrequency(organismId, m.key)
        });
      }
    }

    const history = this.anomalyHistory.get(organismId) || [];
    history.push(...anomalies);
    if (history.length > 100) history.splice(0, history.length - 100);
    this.anomalyHistory.set(organismId, history);

    return anomalies;
  }

  async predictHealth(organismId, horizonDays) {
    const twin = this.twinEngine.getTwin(organismId);
    if (!twin) return null;
    const state = twin.state || {};
    const horizon = horizonDays || 30;
    const trajectory = [];

    let health = state.healthScore || 0.5;
    let stress = state.stressIndex || 0.2;
    let growth = state.growthRate || 0;

    for (let day = 0; day <= horizon; day++) {
      const noise = (Math.random() - 0.5) * 0.05;
      health = Math.max(0, Math.min(1, health + growth * 0.01 - stress * 0.005 + noise));
      stress = Math.max(0, Math.min(1, stress + (Math.random() - 0.5) * 0.02));
      growth = growth + (Math.random() - 0.5) * 0.001;

      if (day % 5 === 0) {
        trajectory.push({
          day,
          timestamp: Date.now() + day * 86400000,
          health: parseFloat(health.toFixed(3)),
          stress: parseFloat(stress.toFixed(3)),
          growth: parseFloat(growth.toFixed(4)),
          risk: health < 0.3 ? 'high' : health < 0.5 ? 'medium' : 'low'
        });
      }
    }

    const finalHealth = trajectory[trajectory.length - 1]?.health || health;
    return {
      organismId,
      horizonDays: horizon,
      trajectory,
      summary: {
        currentHealth: state.healthScore || 0.5,
        predictedHealth: finalHealth,
        trend: finalHealth > (state.healthScore || 0.5) ? 'improving' : finalHealth < (state.healthScore || 0.5) ? 'declining' : 'stable',
        riskLevel: finalHealth < 0.3 ? 'high' : finalHealth < 0.5 ? 'medium' : 'low',
        recommendations: this._getHealthRecommendations(state, finalHealth)
      }
    };
  }

  async seasonalForecast(organismId, season) {
    const twin = this.twinEngine.getTwin(organismId);
    if (!twin) return null;
    const species = this.speciesDB.getSpecies(twin.species);
    const seasonal = species?.ecology?.seasonalBehavior || {};
    const s = season || this._getCurrentSeason();

    const behavior = seasonal[s] || { activity: 'unknown', dormancy: false };
    return {
      season: s,
      organismId,
      activity: behavior.activity || 'moderate',
      dormancy: behavior.dormancy || false,
      recommendations: this._getSeasonalRecommendations(behavior, s),
      expectedChanges: this._getExpectedChanges(behavior, s)
    };
  }

  _predictWatering(state, events) {
    const moisture = state.soilMoisture;
    if (moisture === null || moisture === undefined) return null;
    const hoursLeft = this._hoursUntilWatering(state);
    if (hoursLeft <= 0) {
      return { type: 'watering_needed', confidence: 0.9, estimatedTime: Date.now(), reasoning: [`Soil moisture at ${moisture.toFixed(0)}%`], recommendedAction: 'Water plant immediately' };
    }
    return { type: 'watering_needed', confidence: 0.7, estimatedTime: Date.now() + hoursLeft * 3600000, reasoning: [`Soil moisture declining`, `Estimated ${hoursLeft.toFixed(0)}h remaining`], recommendedAction: `Water within ${hoursLeft.toFixed(0)} hours` };
  }

  _predictStress(state, events) {
    if ((state.stressIndex || 0) > 0.6) {
      return { type: 'stress_event', confidence: 0.8, estimatedTime: Date.now(), reasoning: [`Stress index at ${(state.stressIndex).toFixed(2)}`], recommendedAction: 'Check environmental conditions' };
    }
    return null;
  }

  _predictGrowthMilestone(state, events) {
    if ((state.growthRate || 0) > 0.01) {
      return { type: 'growth_milestone', confidence: 0.5, estimatedTime: Date.now() + 7 * 86400000, reasoning: ['Active growth detected'], recommendedAction: 'Monitor for leaf unfurling or new growth' };
    }
    return null;
  }

  _predictDormancy(organismId, state) {
    const season = this._getCurrentSeason();
    if (season === 'winter' && (state.growthRate || 0) < 0.001) {
      return { type: 'dormancy_period', confidence: 0.6, estimatedTime: Date.now(), reasoning: ['Winter season with minimal growth'], recommendedAction: 'Reduce watering and fertilization' };
    }
    return null;
  }

  _hoursUntilWatering(state) {
    const moisture = state.soilMoisture || 50;
    const rate = state.growthRate || 0.005;
    const depletionRate = 2 + rate * 200;
    const hours = Math.max(0, (moisture - 20) / depletionRate * 24);
    return parseFloat(hours.toFixed(1));
  }

  _getBaseline(organismId, metric) {
    const twin = this.twinEngine.getTwin(organismId);
    if (!twin) return null;
    const events = twin.events || [];
    if (events.length < 5) return null;
    const values = events.slice(-30).map(e => e.state?.[metric]).filter(v => v !== undefined);
    if (values.length < 3) return null;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) || 0.1;
    return { mean, std, count: values.length };
  }

  _getAnomalyFrequency(organismId, metric) {
    const history = this.anomalyHistory.get(organismId) || [];
    return history.filter(a => a.type === `unusual_${metric}`).length;
  }

  _lightRatio(state, care) {
    const current = state.lightLevel || 200;
    const optimal = care.light === 'full_sun' ? 800 : care.light === 'partial_shade' ? 400 : 200;
    return current / optimal;
  }

  _lightRecommendation(state, care) {
    const ratio = this._lightRatio(state, care);
    if (ratio < 0.5) return 'Insufficient light — move to brighter location';
    if (ratio > 1.5) return 'Excessive light — provide shade';
    return 'Light levels adequate';
  }

  _temperatureRisk(state, care) {
    const temp = state.temperature || 22;
    const range = care.temperature || [15, 30];
    return temp < range[0] - 5 || temp > range[1] + 5;
  }

  _temperatureTrend(state) {
    const temp = state.temperature || 22;
    if (temp < 10) return 'cold_stress';
    if (temp > 35) return 'heat_stress';
    return 'normal';
  }

  _getOverdueActivities(twin, species) {
    const activities = [];
    const lastWatered = twin.lastWatered || 0;
    const hoursSinceWater = (Date.now() - lastWatered) / 3600000;
    if (hoursSinceWater > 48) activities.push({ activity: 'watering', overdue: true, hoursOverdue: hoursSinceWater - 48 });
    return { activities, overdue: activities.filter(a => a.overdue) };
  }

  _getHealthRecommendations(state, predictedHealth) {
    const recs = [];
    if (predictedHealth < 0.3) recs.push('Critical health — immediate intervention needed');
    if ((state.stressIndex || 0) > 0.5) recs.push('Reduce stress factors — check water, light, temperature');
    if ((state.growthRate || 0) < 0.001) recs.push('Minimal growth — check root health and nutrients');
    if (recs.length === 0) recs.push('Continue current care routine');
    return recs;
  }

  _getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  _getSeasonalRecommendations(behavior, season) {
    const recs = [];
    if (behavior.dormancy) recs.push('Reduce watering — plant is dormant');
    if (season === 'spring') recs.push('Increase watering and fertilization for growth season');
    if (season === 'summer') recs.push('Monitor for heat stress and water evaporation');
    if (season === 'autumn') recs.push('Prepare for dormancy — reduce fertilization');
    return recs;
  }

  _getExpectedChanges(behavior, season) {
    const changes = [];
    if (behavior.flowering) changes.push('Flowering expected');
    if (behavior.fruiting) changes.push('Fruiting period');
    if (behavior.dormancy) changes.push('Dormancy period — reduced activity');
    return changes;
  }

  getStats() {
    const totalAnomalies = Array.from(this.anomalyHistory.values()).reduce((a, h) => a + h.length, 0);
    return { totalAnomalies, organismsTracked: this.anomalyHistory.size };
  }
}
