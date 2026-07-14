// BioEcho Ambient Environment Engine
// Morning dew. Afternoon warmth. Evening fireflies. Night sounds.

class AmbientEngine {
  constructor() {
    this.timeOfDay = 'noon';
    this.season = 'spring';
    this.weather = 'clear';
    this.temperature = 22;
    this.humidity = 50;
    this.lastUpdate = 0;
    this.listeners = [];
  }

  update() {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();

    if (hour >= 5 && hour < 7) this.timeOfDay = 'dawn';
    else if (hour >= 7 && hour < 12) this.timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) this.timeOfDay = 'noon';
    else if (hour >= 17 && hour < 20) this.timeOfDay = 'evening';
    else this.timeOfDay = 'night';

    if (month >= 2 && month <= 4) this.season = 'spring';
    else if (month >= 5 && month <= 7) this.season = 'summer';
    else if (month >= 8 && month <= 10) this.season = 'autumn';
    else this.season = 'winter';

    this._notify();
  }

  getAmbientConfig() {
    const configs = {
      dawn:     { brightness: 0.35, warmth: 0.7, particles: ['pollen'], sound: 'birds_dawn', fog: true },
      morning:  { brightness: 0.65, warmth: 0.4, particles: ['pollen', 'leaves'], sound: 'birds_morning', fog: false },
      noon:     { brightness: 1.0, warmth: 0.0, particles: ['pollen'], sound: 'birds_noon', fog: false },
      evening:  { brightness: 0.45, warmth: 0.8, particles: ['fireflies', 'leaves'], sound: 'crickets', fog: true },
      night:    { brightness: 0.15, warmth: 0.2, particles: ['fireflies', 'stars'], sound: 'night_ambient', fog: false }
    };
    return configs[this.timeOfDay] || configs.noon;
  }

  getSeasonalEffects() {
    const effects = {
      spring: { leafColor: '#4ade80', falling: false, blooming: true, fruiting: false },
      summer: { leafColor: '#22c55e', falling: false, blooming: false, fruiting: true },
      autumn: { leafColor: '#f59e0b', falling: true, blooming: false, fruiting: false },
      winter: { leafColor: '#9ca3af', falling: true, blooming: false, fruiting: false }
    };
    return effects[this.season] || effects.spring;
  }

  getGreeting() {
    const greetings = {
      dawn: 'The world is waking up',
      morning: 'Good morning — your garden is active',
      noon: 'Peak sunlight — plants are photosynthesizing',
      evening: 'The fireflies are emerging',
      night: 'Your organisms are resting'
    };
    return greetings[this.timeOfDay] || '';
  }

  onTimeChange(callback) { this.listeners.push(callback); }
  _notify() { this.listeners.forEach(cb => cb(this.timeOfDay, this.season)); }
}
