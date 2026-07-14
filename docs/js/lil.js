// Living Interface Language (LIL) — BioEcho Design System
// Every animation has a biological reason. Nothing teleports. Growth is gradual.

const LIL = {
  // Seasonal color palettes
  seasons: {
    spring: { bg: '#0a1a0f', primary: '#4ade80', secondary: '#86efac', accent: '#fbbf24', warm: '#fb923c', particle: '#bbf7d0', fog: 'rgba(74,222,128,0.03)' },
    summer: { bg: '#0a1a0f', primary: '#22c55e', secondary: '#4ade80', accent: '#facc15', warm: '#f97316', particle: '#dcfce7', fog: 'rgba(34,197,94,0.03)' },
    autumn: { bg: '#1a0f0a', primary: '#f59e0b', secondary: '#fbbf24', accent: '#ef4444', warm: '#dc2626', particle: '#fef3c7', fog: 'rgba(245,158,11,0.03)' },
    winter: { bg: '#0a0f1a', primary: '#93c5fd', secondary: '#bfdbfe', accent: '#a78bfa', warm: '#c4b5fd', particle: '#dbeafe', fog: 'rgba(147,197,253,0.03)' }
  },

  // Time-of-day palette
  timeOfDay: {
    dawn:    { sky: '#1a1033', horizon: '#ff6b35', ambient: 0.3, warmth: 0.7 },
    morning: { sky: '#1a2744', horizon: '#87ceeb', ambient: 0.6, warmth: 0.5 },
    noon:    { sky: '#1a3a5c', horizon: '#87ceeb', ambient: 1.0, warmth: 0.0 },
    evening: { sky: '#2d1b4e', horizon: '#ff6b35', ambient: 0.5, warmth: 0.8 },
    night:   { sky: '#0a0a1a', horizon: '#1a1033', ambient: 0.15, warmth: 0.2 }
  },

  // Biological motion curves
  easing: {
    grow:      (t) => 1 - Math.pow(1 - t, 3),           // slow start, fast end (growth)
    breathe:   (t) => (Math.sin(t * Math.PI * 2) + 1) / 2, // oscillation
    sway:      (t) => Math.sin(t * Math.PI * 2) * 0.5 + 0.5, // wind sway
    unfurl:    (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, // leaf unfurl
    drift:     (t) => t + Math.sin(t * Math.PI * 4) * 0.02, // particle drift
    pulse:     (t) => (Math.sin(t * Math.PI * 2) + 1) / 2, // pulse
    fade:      (t) => t * t, // natural fade
    elastic:   (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1
  },

  // Wind physics
  wind: {
    speed: 0.5,
    direction: 0,
    turbulence: 0.1,
    gustFrequency: 0.02,
    gustStrength: 0.3,
    apply(x, y, time, strength) {
      const gust = Math.sin(time * this.gustFrequency) * this.gustStrength;
      const windX = Math.cos(this.direction) * (this.speed + gust) * strength;
      const windY = Math.sin(this.direction) * (this.speed + gust) * 0.3 * strength;
      const turbX = Math.sin(time * 0.7 + x * 0.01) * this.turbulence * strength;
      const turbY = Math.cos(time * 0.5 + y * 0.01) * this.turbulence * strength;
      return { x: windX + turbX, y: windY + turbY };
    }
  },

  // Particle system
  particles: {
    leaves: [],
    fireflies: [],
    rain: [],
    snow: [],
    pollen: [],
    maxLeaves: 15,
    maxFireflies: 20,
    maxRain: 100,
    maxSnow: 60,
    maxPollen: 30
  },

  // Current season (auto-detected)
  currentSeason: 'spring',
  currentTime: 'noon',
  ambientLight: 1.0,

  // Detect current season
  detectSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) this.currentSeason = 'spring';
    else if (month >= 5 && month <= 7) this.currentSeason = 'summer';
    else if (month >= 8 && month <= 10) this.currentSeason = 'autumn';
    else this.currentSeason = 'winter';
    return this.currentSeason;
  },

  // Detect time of day
  detectTime() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 7) this.currentTime = 'dawn';
    else if (hour >= 7 && hour < 12) this.currentTime = 'morning';
    else if (hour >= 12 && hour < 17) this.currentTime = 'noon';
    else if (hour >= 17 && hour < 20) this.currentTime = 'evening';
    else this.currentTime = 'night';
    return this.currentTime;
  },

  // Get current palette
  getPalette() {
    return this.seasons[this.currentSeason] || this.seasons.spring;
  },

  getTimePalette() {
    return this.timeOfDay[this.currentTime] || this.timeOfDay.noon;
  },

  // Create a biological animation
  animate(element, type, duration, delay) {
    const ease = this.easing[type] || this.easing.grow;
    const start = performance.now() + (delay || 0);
    const dur = duration || 1000;

    return new Promise(resolve => {
      const tick = (now) => {
        const elapsed = now - start;
        if (elapsed < 0) { requestAnimationFrame(tick); return; }
        const progress = Math.min(1, elapsed / dur);
        const eased = ease(progress);
        element.style.opacity = eased;
        if (progress < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  },

  // Create ripple effect (Living Touch)
  createRipple(x, y, container, color) {
    const ripple = document.createElement('div');
    ripple.className = 'lil-ripple';
    ripple.style.cssText = `left:${x}px;top:${y}px;border-color:${color || this.getPalette().primary}`;
    container.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
    return ripple;
  },

  // Create growth line (vine/tendril)
  createGrowthLine(startX, startY, endX, endY, container, color, duration) {
    const line = document.createElement('div');
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    line.className = 'lil-growth-line';
    line.style.cssText = `left:${startX}px;top:${startY}px;width:${length}px;transform:rotate(${angle}deg);background:${color || this.getPalette().primary}`;
    container.appendChild(line);
    line.style.animationDuration = (duration || 1000) + 'ms';
    line.addEventListener('animationend', () => line.remove());
    return line;
  }
};

LIL.detectSeason();
LIL.detectTime();
