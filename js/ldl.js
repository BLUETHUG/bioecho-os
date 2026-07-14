// BioEcho LDL v3 — Living Design Language
// Nature IS the interface. Technology disappears into nature.

const LDL = {
  colors: {
    forest: '#0F3D2E', moss: '#3E6B48', fern: '#6FA36F',
    bark: '#6E5843', soil: '#8A6A4A', river: '#5FA8D3',
    sky: '#BFDFF6', sunset: '#E7A95A', moon: '#D9E3EC',
    cream: '#F5F0E8', white: '#FFFFFF', black: '#000000'
  },
  easing: {
    biological: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    gentle: (t) => 1 - Math.pow(1 - t, 4),
    organic: (t) => t * t * (3 - 2 * t),
    spring: (t) => 1 - Math.cos(t * Math.PI * 4.5) * Math.exp(-t * 6)
  },
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
  currentHour: new Date().getHours() + new Date().getMinutes() / 60,
  currentSeason: null,
  currentTime: null,
  init() {
    this.currentSeason = this.getSeason();
    this.currentTime = this.getTimeOfDay(this.currentHour);
  }
};
