// BioEcho LDL v4 — Living Design Language + Material System
// Nature IS the interface. Technology disappears into nature.

const LDL = {
  colors: {
    forest: '#0F3D2E', moss: '#3E6B48', fern: '#6FA36F', leaf: '#8BC48B',
    bark: '#6E5843', soil: '#8A6A4A', river: '#5FA8D3',
    sky: '#BFDFF6', sunset: '#E7A95A', moon: '#D9E3EC',
    cream: '#F5F0E8', white: '#FFFFFF', black: '#000000',
    void: '#060E0A', abyss: '#0A1A12', deep: '#0F3D2E'
  },

  // ─── Easing ───
  easing: {
    biological: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    gentle: (t) => 1 - Math.pow(1 - t, 4),
    organic: (t) => t * t * (3 - 2 * t),
    spring: (t) => 1 - Math.cos(t * Math.PI * 4.5) * Math.exp(-t * 6),
    wind: (t) => Math.sin(t * Math.PI * 2) * (1 - t) * 0.5 + t,
    root: (t) => Math.pow(t, 0.6) * (1 + Math.sin(t * Math.PI * 3) * 0.1)
  },

  // ─── Motion Tokens ───
  motion: {
    leaf_sway: { duration: '6-12s', easing: 'wind' },
    root_growth: { duration: '1.8s', easing: 'root' },
    bloom: { duration: '900ms', easing: 'spring' },
    breathe: { duration: '4s', easing: 'organic' },
    unfurl: { duration: '1.2s', easing: 'biological' },
    fade_in: { duration: '0.8s', easing: 'gentle' }
  },

  // ─── Living Materials ───
  materials: {
    frosted_dew_glass: {
      background: 'rgba(10,26,18,0.55)',
      border: 'rgba(111,163,111,0.08)',
      blur: '32px',
      saturate: '1.2',
      glow: 'rgba(111,163,111,0.03)',
      description: 'Morning condensation, tiny refraction, soft bloom'
    },
    wet_stone: {
      background: 'rgba(20,30,25,0.7)',
      border: 'rgba(110,88,67,0.12)',
      blur: '16px',
      saturate: '1.1',
      glow: 'rgba(110,88,67,0.02)',
      description: 'Research, charts, scientific panels — solid, grounded'
    },
    tree_bark: {
      background: 'rgba(42,26,10,0.6)',
      border: 'rgba(110,88,67,0.15)',
      blur: '8px',
      saturate: '1.0',
      groove: true,
      description: 'Navigation, buttons, tabs — organic, textured'
    },
    water_surface: {
      background: 'rgba(10,30,40,0.4)',
      border: 'rgba(95,168,211,0.08)',
      blur: '24px',
      saturate: '1.3',
      ripple: true,
      description: 'Search, lens, timeline — fluid, reflective'
    },
    moss: {
      background: 'rgba(30,60,40,0.6)',
      border: 'rgba(62,107,72,0.12)',
      blur: '12px',
      saturate: '1.15',
      description: 'Notifications, hints, achievements — soft, living'
    },
    leaf_veins: {
      background: 'rgba(15,40,25,0.5)',
      border: 'rgba(111,163,111,0.06)',
      blur: '20px',
      saturate: '1.1',
      pattern: 'vein',
      description: 'Progress indicators, connections, relationships'
    }
  },

  // ─── Ecosystem Tokens ───
  ecosystem: {
    butterfly_density: { dawn: 0.1, morning: 0.8, noon: 0.6, afternoon: 0.7, twilight: 0.3, night: 0 },
    bird_activity: { dawn: 0.9, morning: 0.7, noon: 0.3, afternoon: 0.4, twilight: 0.6, night: 0.1 },
    fireflies: { dawn: 0, morning: 0, noon: 0, afternoon: 0, twilight: 0.6, night: 1, deep_night: 0.4 },
    pollen: { spring: 0.8, summer: 0.4, autumn: 0.2, winter: 0 },
    bloom_intensity: { spring: 0.9, summer: 0.7, autumn: 0.3, winter: 0 },
    wind_sensitivity: { dawn: 0.5, morning: 0.6, noon: 0.9, afternoon: 0.7, twilight: 0.4, night: 0.3 }
  },

  // ─── Lighting Presets ───
  lighting: {
    dawn: { temperature: 'warm', fog: 'high', bloom: 'low', shadows: 'long', sun_elevation: 0.15 },
    morning: { temperature: 'neutral', fog: 'medium', bloom: 'medium', shadows: 'medium', sun_elevation: 0.4 },
    noon: { temperature: 'neutral', fog: 'low', bloom: 'high', shadows: 'short', sun_elevation: 0.8 },
    afternoon: { temperature: 'warm', fog: 'low', bloom: 'high', shadows: 'medium', sun_elevation: 0.6 },
    golden: { temperature: 'warm', fog: 'medium', bloom: 'medium', shadows: 'long', sun_elevation: 0.25 },
    twilight: { temperature: 'cool', fog: 'high', bloom: 'low', shadows: 'none', sun_elevation: 0.05 },
    night: { temperature: 'cool', fog: 'medium', bloom: 'none', shadows: 'none', sun_elevation: -0.2 },
    deep_night: { temperature: 'cool', fog: 'low', bloom: 'none', shadows: 'none', sun_elevation: -0.4 }
  },

  // ─── Time of Day ───
  timeOfDay: {
    midnight: { ambient: 0.05, temp: 4000, skyTop: '#0A0A1A', skyMid: '#1A1A2E', skyBottom: '#2A2A3E', fog: 0.1, shadows: 'long' },
    dawn: { ambient: 0.3, temp: 3000, skyTop: '#1A1A3E', skyMid: '#4A3A5E', skyBottom: '#E7A95A', fog: 0.4, shadows: 'long' },
    morning: { ambient: 0.7, temp: 4500, skyTop: '#BFDFF6', skyMid: '#87CEEB', skyBottom: '#E8F4FD', fog: 0.1, shadows: 'medium' },
    noon: { ambient: 1.0, temp: 5500, skyTop: '#5FA8D3', skyMid: '#87CEEB', skyBottom: '#BFDFF6', fog: 0.0, shadows: 'short' },
    afternoon: { ambient: 0.8, temp: 5000, skyTop: '#87CEEB', skyMid: '#BFDFF6', skyBottom: '#E8F4FD', fog: 0.05, shadows: 'medium' },
    golden: { ambient: 0.6, temp: 2800, skyTop: '#4A3A5E', skyMid: '#E7A95A', skyBottom: '#D4764E', fog: 0.15, shadows: 'long' },
    twilight: { ambient: 0.25, temp: 2500, skyTop: '#1A1A3E', skyMid: '#3A2A5E', skyBottom: '#6A4A7E', fog: 0.3, shadows: 'none' },
    night: { ambient: 0.08, temp: 4000, skyTop: '#0A0A1A', skyMid: '#0F0F2E', skyBottom: '#1A1A2E', fog: 0.2, shadows: 'none' }
  },

  // ─── Helpers ───
  getTimeOfDay(hour) {
    if (hour < 4) return 'midnight';
    if (hour < 6) return 'dawn';
    if (hour < 10) return 'morning';
    if (hour < 14) return 'noon';
    if (hour < 16) return 'afternoon';
    if (hour < 19) return 'golden';
    if (hour < 21) return 'twilight';
    return 'night';
  },
  getSeason() {
    const m = new Date().getMonth();
    if (m >= 2 && m <= 4) return 'spring';
    if (m >= 5 && m <= 7) return 'summer';
    if (m >= 8 && m <= 10) return 'autumn';
    return 'winter';
  },
  getEcosystemValue(system, timeOfDay) {
    const values = this.ecosystem[system];
    return values ? (values[timeOfDay] || 0) : 0;
  },
  getMaterial(name) {
    return this.materials[name] || this.materials.frosted_dew_glass;
  },
  getLighting(timeOfDay) {
    return this.lighting[timeOfDay] || this.lighting.noon;
  },
  getMaterialCSS(name) {
    const mat = this.getMaterial(name);
    return {
      background: mat.background,
      border: `1px solid ${mat.border}`,
      backdropFilter: `blur(${mat.blur}) saturate(${mat.saturate})`,
      boxShadow: `inset 0 1px 0 rgba(245,240,232,0.02), 0 0 0 1px ${mat.border}`
    };
  },
  currentHour: new Date().getHours() + new Date().getMinutes() / 60,
  currentSeason: null,
  currentTime: null,
  init() {
    this.currentSeason = this.getSeason();
    this.currentTime = this.getTimeOfDay(this.currentHour);
  }
};
