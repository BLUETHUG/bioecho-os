// Living Design Language (LDL) — BioEcho Design System
// Technology disappeared into nature. Apple minimalism + Ghibli warmth + NatGeo authenticity.

const LDL = {
  // ═══════════════════════════════════════════
  // COLOR PALETTE — Earth tones, not neon
  // ═══════════════════════════════════════════
  colors: {
    forest:   '#0F3D2E',  // Deep forest — primary background
    moss:     '#3E6B48',  // Moss — secondary
    fern:     '#6FA36F',  // Fern — accent, growth
    bark:     '#6E5843',  // Bark — warm neutral
    soil:     '#8A6A4A',  // Soil — warm accent
    river:    '#5FA8D3',  // River — cool accent, water
    sky:      '#BFDFF6',  // Morning sky — light
    sunset:   '#E7A95A',  // Sunset — golden hour
    moon:     '#D9E3EC',  // Moon — night, cool white
    cream:    '#F5F0E8',  // Cream — text on dark
    shadow:   '#0A0A0A',  // Deep shadow
    fog:      'rgba(15,61,46,0.03)', // Fog overlay
  },

  // Seasonal palettes — no neon, earthy
  seasons: {
    spring: { bg: '#0F3D2E', leaf: '#6FA36F', accent: '#E7A95A', bloom: '#D4A0D4', particle: '#BFDFF6' },
    summer: { bg: '#0F3D2E', leaf: '#3E6B48', accent: '#5FA8D3', bloom: '#E7A95A', particle: '#6FA36F' },
    autumn: { bg: '#1A1208', leaf: '#8A6A4A', accent: '#E7A95A', bloom: '#6E5843', particle: '#D9E3EC' },
    winter: { bg: '#0A0F1A', leaf: '#6E5843', accent: '#5FA8D3', bloom: '#BFDFF6', particle: '#D9E3EC' }
  },

  // Time-of-day — light physics
  timeOfDay: {
    dawn:     { sky: '#1A1033', horizon: '#E7A95A', ambient: 0.3, warmth: 0.8, shadowLen: 1.5, shadowDir: 0.2 },
    morning:  { sky: '#BFDFF6', horizon: '#F5F0E8', ambient: 0.7, warmth: 0.4, shadowLen: 1.2, shadowDir: 0.3 },
    noon:     { sky: '#5FA8D3', horizon: '#BFDFF6', ambient: 1.0, warmth: 0.0, shadowLen: 0.3, shadowDir: 0.0 },
    evening:  { sky: '#6E5843', horizon: '#E7A95A', ambient: 0.5, warmth: 0.9, shadowLen: 2.0, shadowDir: -0.2 },
    night:    { sky: '#0A0A0A', horizon: '#0F3D2E', ambient: 0.1, warmth: 0.1, shadowLen: 0, shadowDir: 0 }
  },

  // ═══════════════════════════════════════════
  // TYPOGRAPHY — Big, calm, confident
  // ═══════════════════════════════════════════
  type: {
    hero:     { size: '48px', weight: '300', spacing: '-0.5px', lineHeight: '1.1', family: 'Inter, system-ui, sans-serif' },
    heading:  { size: '28px', weight: '400', spacing: '-0.3px', lineHeight: '1.2' },
    subhead:  { size: '18px', weight: '400', spacing: '0', lineHeight: '1.4' },
    body:     { size: '15px', weight: '400', spacing: '0', lineHeight: '1.6' },
    caption:  { size: '12px', weight: '400', spacing: '0.3px', lineHeight: '1.4' },
    tiny:     { size: '10px', weight: '500', spacing: '0.5px', lineHeight: '1.3' },
  },

  // ═══════════════════════════════════════════
  // BIOLOGICAL MOTION — Every animation has a reason
  // ═══════════════════════════════════════════
  easing: {
    grow:       (t) => 1 - Math.pow(1 - t, 3),
    breathe:    (t) => (Math.sin(t * Math.PI * 2) + 1) / 2,
    sway:       (t) => Math.sin(t * Math.PI * 2) * 0.5 + 0.5,
    unfurl:     (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    drift:      (t) => t + Math.sin(t * Math.PI * 4) * 0.02,
    pulse:      (t) => (Math.sin(t * Math.PI * 2) + 1) / 2,
    fade:       (t) => t * t,
    elastic:    (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
    unfurlLeaf: (t) => { const c4 = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; }
  },

  // ═══════════════════════════════════════════
  // WIND ENGINE — Physics, not random
  // ═══════════════════════════════════════════
  wind: {
    baseSpeed: 0.3,
    direction: Math.PI * 0.25, // 45 degrees
    turbulence: 0.08,
    gustFreq: 0.015,
    gustStr: 0.2,
    leafSway: 0.4,
    grassSway: 0.6,
    apply(x, y, time, strength) {
      const gust = Math.sin(time * this.gustFreq) * this.gustStr;
      const base = this.baseSpeed + gust;
      return {
        x: Math.cos(this.direction) * base * strength + Math.sin(time * 0.7 + x * 0.01) * this.turbulence * strength,
        y: Math.sin(this.direction) * base * 0.2 * strength + Math.cos(time * 0.5 + y * 0.01) * this.turbulence * strength
      };
    }
  },

  // ═══════════════════════════════════════════
  // LIGHT PHYSICS
  // ═══════════════════════════════════════════
  light: {
    getSunAngle(time) { return Math.sin(time * 0.1) * 0.5 + 0.5; },
    getShadowLength(time) { return 0.3 + (1 - this.getSunAngle(time)) * 1.7; },
    getShadowColor(time) {
      const angle = this.getSunAngle(time);
      const warmth = angle > 0.7 ? 'rgba(231,169,90,' : angle < 0.3 ? 'rgba(95,168,211,' : 'rgba(15,61,46,';
      return warmth + (0.1 + (1 - angle) * 0.15) + ')';
    },
    getSkyGradient(time) {
      const pal = LDL.timeOfDay[LDL.detectTime()];
      return { top: pal.sky, bottom: pal.horizon };
    }
  },

  // ═══════════════════════════════════════════
  // WATER PHYSICS
  // ═══════════════════════════════════════════
  water: {
    rippleDecay: 0.95,
    rippleSpeed: 2,
    flowSpeed: 0.5,
    reflectionBlur: 0.3,
    createRipple(x, y, radius) {
      return { x, y, radius: radius || 5, maxRadius: 60, decay: this.rippleDecay, age: 0 };
    },
    updateRipple(ripple, dt) {
      ripple.radius += this.rippleSpeed * dt;
      ripple.age += dt;
      return ripple.radius < ripple.maxRadius;
    }
  },

  // ═══════════════════════════════════════════
  // DETECTION
  // ═══════════════════════════════════════════
  detectSeason() {
    const m = new Date().getMonth();
    if (m >= 2 && m <= 4) return 'spring';
    if (m >= 5 && m <= 7) return 'summer';
    if (m >= 8 && m <= 10) return 'autumn';
    return 'winter';
  },
  detectTime() {
    const h = new Date().getHours();
    if (h >= 5 && h < 7) return 'dawn';
    if (h >= 7 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'noon';
    if (h >= 17 && h < 20) return 'evening';
    return 'night';
  },
  currentSeason: 'spring',
  currentTime: 'noon',

  // ═══════════════════════════════════════════
  // MICRO-ANIMATIONS
  // ═══════════════════════════════════════════
  micro: {
    createRipple(x, y, container, color) {
      const el = document.createElement('div');
      el.className = 'ldl-ripple';
      el.style.cssText = `left:${x}px;top:${y}px;border-color:${color || LDL.colors.fern}`;
      container.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    },
    growLeaf(x, y, container) {
      const el = document.createElement('div');
      el.className = 'ldl-leaf-grow';
      el.style.cssText = `left:${x}px;top:${y}px`;
      container.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    },
    bloomFlower(x, y, container) {
      const el = document.createElement('div');
      el.className = 'ldl-flower-bloom';
      el.style.cssText = `left:${x}px;top:${y}px`;
      container.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    },
    butterflyFly(x, y, container) {
      const el = document.createElement('div');
      el.className = 'ldl-butterfly';
      el.style.cssText = `left:${x}px;top:${y}px`;
      container.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }
  },

  // ═══════════════════════════════════════════
  // LOADING STATES — Never spinner
  // ═══════════════════════════════════════════
  loading: {
    vine: 'Growing vine...',
    seed: 'Floating seed...',
    ripple: 'Water ripple...',
    firefly: 'Firefly...',
    flower: 'Opening flower...'
  },

  init() {
    this.currentSeason = this.detectSeason();
    this.currentTime = this.detectTime();
  }
};

LDL.init();
