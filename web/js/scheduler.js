class LivingWorldScheduler {
  constructor() {
    this.hour = 8;
    this.daySpeed = 0.008;
    this.time = 0;
    this.currentPhase = 'morning';
    this.phaseStartTime = 0;
    this.weather = 'clear';
    this.weatherTimer = 0;
    this.weatherDuration = 3 + Math.random() * 4;
    this.listeners = {};
    this.activeEvents = new Set();
    this.eventLog = [];
    this.lastPhaseEvent = null;
    this.rainAccumulation = 0;
    this.windTarget = 0.3;
    this.cloudCover = 0.1;
    this.moonPhase = 0;
    this.season = 'spring';
    this.dayCount = 0;

    this.phases = [
      { id: 'deep_night',  start: 0,  end: 5,   label: 'Deep Night',    ambient: 0.04, temp: 8,  events: ['stillness', 'owls_active'] },
      { id: 'dawn',        start: 5,  end: 7,   label: 'Sunrise',       ambient: 0.25, temp: 12, events: ['bird_chorus', 'dew_formation', 'sky_brightens'] },
      { id: 'morning',     start: 7,  end: 10,  label: 'Morning Light', ambient: 0.6,  temp: 18, events: ['bees_active', 'flowers_open', 'butterflies_warm', 'pollen_release'] },
      { id: 'noon',        start: 10, end: 14,  label: 'Midday',        ambient: 0.95, temp: 24, events: ['wind_rises', 'leaves_respond', 'sun_zenith'] },
      { id: 'afternoon',   start: 14, end: 17,  label: 'Golden Hour',   ambient: 0.7,  temp: 22, events: ['evening_chorus', 'shadows_lengthen'] },
      { id: 'twilight',    start: 17, end: 20,  label: 'Dusk',          ambient: 0.3,  temp: 16, events: ['fireflies_emerge', 'sky_darkens'] },
      { id: 'night',       start: 20, end: 24,  label: 'Night',         ambient: 0.06, temp: 10, events: ['moon_visible', 'stars_prominent', 'night_pollinators'] }
    ];

    this.weatherTypes = {
      clear:    { cloud: 0.05, wind: 0.2, rain: 0, fog: 0.02, label: 'Clear', weight: 40 },
      partly:   { cloud: 0.35, wind: 0.3, rain: 0, fog: 0.05, label: 'Partly Cloudy', weight: 25 },
      cloudy:   { cloud: 0.65, wind: 0.4, rain: 0, fog: 0.1,  label: 'Cloudy', weight: 15 },
      overcast: { cloud: 0.85, wind: 0.4, rain: 0.1, fog: 0.3, label: 'Overcast', weight: 8 },
      light_rain: { cloud: 0.8, wind: 0.5, rain: 0.4, fog: 0.35, label: 'Light Rain', weight: 5 },
      rain:     { cloud: 0.9,  wind: 0.6, rain: 0.8, fog: 0.4, label: 'Rain', weight: 3 },
      storm:    { cloud: 0.95, wind: 0.85, rain: 1, fog: 0.25, lightning: true, label: 'Storm', weight: 1 },
      fog:      { cloud: 0.5,  wind: 0.05, rain: 0, fog: 0.85, label: 'Fog', weight: 3 }
    };

    this._initSeason();
    this._initMoonPhase();
  }

  _initSeason() {
    const m = new Date().getMonth();
    if (m >= 2 && m <= 4) this.season = 'spring';
    else if (m >= 5 && m <= 7) this.season = 'summer';
    else if (m >= 8 && m <= 10) this.season = 'autumn';
    else this.season = 'winter';
  }

  _initMoonPhase() {
    const now = new Date();
    const lunarCycle = 29.53;
    const knownNewMoon = new Date('2024-01-11').getTime();
    const daysSince = (now.getTime() - knownNewMoon) / 86400000;
    this.moonPhase = (daysSince % lunarCycle) / lunarCycle;
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    for (const cb of this.listeners[event]) cb(data || {});
    this.eventLog.push({ event, time: this.hour, phase: this.currentPhase });
    if (this.eventLog.length > 200) this.eventLog.shift();
  }

  update(dt) {
    this.time += dt;
    this.hour = (8 + this.time * this.daySpeed) % 24;
    if (this.hour < 0.1 && this.lastPhaseEvent !== 'day_change') {
      this.dayCount++;
      this.lastPhaseEvent = 'day_change';
    }
    if (this.hour > 0.5) this.lastPhaseEvent = null;

    const prevPhase = this.currentPhase;
    for (const phase of this.phases) {
      if (this.hour >= phase.start && this.hour < phase.end) {
        this.currentPhase = phase.id;
        if (prevPhase !== phase.id) {
          this.phaseStartTime = this.time;
          this._onPhaseChange(phase, prevPhase);
        }
        break;
      }
    }

    this.weatherTimer += dt * this.daySpeed * 2;
    if (this.weatherTimer > this.weatherDuration) {
      this._changeWeather();
    }

    const weatherData = this.weatherTypes[this.weather] || this.weatherTypes.clear;
    this.cloudCover += (weatherData.cloud - this.cloudCover) * 0.01;
    this.windTarget = weatherData.wind;
    if (weatherData.rain > 0) {
      this.rainAccumulation = Math.min(1, this.rainAccumulation + dt * 0.001 * weatherData.rain);
    } else {
      this.rainAccumulation = Math.max(0, this.rainAccumulation - dt * 0.002);
    }
  }

  _onPhaseChange(newPhase, oldPhase) {
    const phaseDef = this.phases.find(p => p.id === newPhase);
    if (!phaseDef) return;
    this.emit('phase_change', { from: oldPhase, to: newPhase, phase: phaseDef });
    for (const event of phaseDef.events) {
      setTimeout(() => this.emit(event, { phase: newPhase }), 500 + Math.random() * 1500);
    }
    this.activeEvents.clear();
  }

  _changeWeather() {
    const weights = {};
    for (const [type, def] of Object.entries(this.weatherTypes)) {
      let w = def.weight;
      if (type === 'rain' || type === 'storm' || type === 'light_rain') {
        if (this.season === 'spring') w *= 2;
        else if (this.season === 'summer') w *= 1.5;
        else if (this.season === 'winter') w *= 0.3;
      }
      if (type === 'fog' && (this.hour < 7 || this.hour > 19)) w *= 3;
      if (type === 'clear' && this.hour > 10 && this.hour < 16) w *= 2;
      weights[type] = w;
    }
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const [type, w] of Object.entries(weights)) {
      r -= w;
      if (r <= 0) {
        if (type !== this.weather) {
          this.weather = type;
          this.emit('weather_change', { weather: type, data: this.weatherTypes[type] });
        }
        break;
      }
    }
    this.weatherTimer = 0;
    this.weatherDuration = 2 + Math.random() * 6;
  }

  getCurrentPhase() {
    return this.phases.find(p => p.id === this.currentPhase) || this.phases[2];
  }

  getWeather() {
    return this.weatherTypes[this.weather] || this.weatherTypes.clear;
  }

  getAmbientLight() {
    const phase = this.getCurrentPhase();
    const weather = this.getWeather();
    let light = phase.ambient;
    light *= (1 - weather.cloud * 0.3);
    if (weather.rain > 0.5) light *= 0.7;
    return Math.max(0.02, light);
  }

  getWindStrength() {
    const phase = this.getCurrentPhase();
    const weather = this.getWeather();
    let wind = weather.wind;
    if (phase.id === 'noon') wind += 0.15;
    if (phase.id === 'afternoon') wind += 0.1;
    const gust = Math.sin(this.time * 0.3 + this.hour * 2) * 0.2 + 0.5;
    return Math.min(1, wind * gust);
  }

  shouldRain() {
    return this.getWeather().rain > 0.3;
  }

  shouldShowLightning() {
    return this.weather === 'storm' && Math.random() < 0.002;
  }

  getGreeting() {
    const phase = this.currentPhase;
    const greetings = {
      deep_night: 'The forest rests. Listen to the silence.',
      dawn: 'The world is waking. Birds begin their chorus.',
      morning: 'Life stirs. Bees dance, flowers unfurl.',
      noon: 'The forest hums at full light.',
      afternoon: 'Golden warmth. Shadows stretch long.',
      twilight: 'Fireflies emerge. Day gives way to night.',
      night: 'Stars above. Night pollinators roam.'
    };
    return greetings[phase] || 'The forest breathes.';
  }

  getSeasonName() {
    const names = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };
    return names[this.season] || 'Spring';
  }

  getMoonIllumination() {
    return 1 - Math.cos(this.moonPhase * Math.PI * 2) * 0.5 + 0.5;
  }
}
