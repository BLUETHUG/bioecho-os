// BioEcho Environmental Engine
// Provides environmental context: light cycles, seasonal patterns, weather integration.

class EnvironmentEngine {
  constructor() {
    this.current = {
      temperature: null,
      humidity: null,
      lightLevel: null,
      soilMoisture: null,
      airPressure: null,
      windSpeed: null,
      uvIndex: null,
      co2: null,
      lastUpdated: null
    };
    this.history = [];
    this.maxHistory = 1000;
    this.sunriseHour = 6;
    this.sunsetHour = 20;
    this.latitude = null;
    this.longitude = null;
  }

  // Update from external sensor data
  update(data) {
    Object.assign(this.current, data, { lastUpdated: Date.now() });
    this.history.push({ ...this.current });
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  // Set location for sunrise/sunset calculation
  setLocation(lat, lon) {
    this.latitude = lat;
    this.longitude = lon;
    this._calculateSunTimes();
  }

  _calculateSunTimes() {
    if (this.latitude === null) return;
    // Simplified sunrise/sunset based on latitude and day of year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
    const latRad = this.latitude * Math.PI / 180;
    const declRad = declination * Math.PI / 180;
    const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(declRad)) * 180 / Math.PI;
    this.sunriseHour = 12 - hourAngle / 15;
    this.sunsetHour = 12 + hourAngle / 15;
  }

  // Get current light phase
  getLightPhase(hour) {
    const h = hour !== undefined ? hour : new Date().getHours();
    if (h >= this.sunriseHour - 1 && h < this.sunriseHour + 1) return 'dawn';
    if (h >= this.sunriseHour + 1 && h < 12) return 'morning';
    if (h >= 12 && h < this.sunsetHour - 2) return 'afternoon';
    if (h >= this.sunsetHour - 2 && h < this.sunsetHour + 1) return 'dusk';
    return 'night';
  }

  // Get seasonal phase (Northern Hemisphere)
  getSeasonalPhase() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  // Estimate light level from time of day (if no sensor)
  estimateLightLevel(hour) {
    const h = hour !== undefined ? hour : new Date().getHours();
    if (h < this.sunriseHour || h > this.sunsetHour) return 10; // moonlight
    const midday = (this.sunriseHour + this.sunsetHour) / 2;
    const progress = (h - this.sunriseHour) / (this.sunsetHour - this.sunriseHour);
    // Bell curve centered on midday
    const deviation = Math.abs(progress - 0.5) * 2;
    const maxLux = 100000; // full sunlight
    const minLux = 1000;   // twilight
    return minLux + (maxLux - minLux) * Math.cos(deviation * Math.PI / 2);
  }

  // Get environmental context for the Context Engine
  getContext() {
    return {
      current: { ...this.current },
      lightPhase: this.getLightPhase(),
      season: this.getSeasonalPhase(),
      estimatedLightLevel: this.estimateLightLevel(),
      sunriseHour: Math.round(this.sunriseHour * 10) / 10,
      sunsetHour: Math.round(this.sunsetHour * 10) / 10,
      dayLength: Math.round((this.sunsetHour - this.sunriseHour) * 10) / 10,
      location: this.latitude !== null ? { lat: this.latitude, lon: this.longitude } : null,
      lastUpdated: this.current.lastUpdated
    };
  }

  // Get trend (is temperature rising, falling, stable?)
  getTrend(metric, windowMinutes = 30) {
    const cutoff = Date.now() - windowMinutes * 60000;
    const recent = this.history.filter(h => h.lastUpdated > cutoff);
    if (recent.length < 2) return 'insufficient_data';

    const values = recent.map(h => h[metric]).filter(v => v !== null && v !== undefined);
    if (values.length < 2) return 'insufficient_data';

    const first = values.slice(0, Math.floor(values.length / 2));
    const second = values.slice(Math.floor(values.length / 2));
    const avgFirst = first.reduce((s,v) => s+v, 0) / first.length;
    const avgSecond = second.reduce((s,v) => s+v, 0) / second.length;

    const change = avgSecond - avgFirst;
    const threshold = Math.abs(avgFirst) * 0.05; // 5% change

    if (change > threshold) return 'rising';
    if (change < -threshold) return 'falling';
    return 'stable';
  }

  // Predict next watering need based on soil moisture trend
  predictWateringNeed() {
    if (this.current.soilMoisture === null) return null;
    const trend = this.getTrend('soilMoisture', 60);
    if (trend === 'falling' && this.current.soilMoisture < 40) {
      const rate = this._getChangeRate('soilMoisture');
      if (rate > 0) {
        const hoursUntilCritical = (this.current.soilMoisture - 20) / rate;
        return {
          needed: true,
          urgency: hoursUntilCritical < 2 ? 'soon' : hoursUntilCritical < 6 ? 'today' : 'not_urgent',
          estimatedHours: Math.round(hoursUntilCritical),
          currentMoisture: this.current.soilMoisture
        };
      }
    }
    return { needed: false, currentMoisture: this.current.soilMoisture };
  }

  _getChangeRate(metric, windowMinutes = 120) {
    const cutoff = Date.now() - windowMinutes * 60000;
    const recent = this.history.filter(h => h.lastUpdated > cutoff && h[metric] !== null);
    if (recent.length < 2) return 0;
    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeDiffHours = (last.lastUpdated - first.lastUpdated) / 3600000;
    if (timeDiffHours <= 0) return 0;
    return (last[metric] - first[metric]) / timeDiffHours;
  }
}
