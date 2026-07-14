// BioEcho World v4 — Living Ecosystem Simulation
// Everything is connected. Wind flows through everything.

class WorldV4 {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.time = 0;
    this.wind = { strength: 0.5, target: 0.5, gust: 0, gustTimer: 0 };
    this.mouseX = -1;
    this.mouseY = -1;
    this.mouseGlow = 0;

    // Layer systems
    this.stars = [];
    this.clouds = [];
    this.mountains = [];
    this.farTrees = [];
    this.midTrees = [];
    this.stream = { y: 0, ripples: [] };
    this.nearTrees = [];
    this.flowers = [];
    this.grass = [];
    this.foregroundGrass = [];
    this.butterflies = [];
    this.birds = [];
    this.particles = [];
    this.fireflies = [];
    this.mushrooms = [];
    this.leaves = [];
    this.rain = [];
    this.isRaining = false;
    this.rainTimer = 0;
  }

  initialize() {
    this.resize();
    this._generate();
  }

  resize() {
    this.w = this.canvas.width = window.innerWidth;
    this.h = this.canvas.height = window.innerHeight;
  }

  _generate() {
    const W = this.w, H = this.h;

    // Stars
    this.stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.5,
      r: 0.3 + Math.random() * 2, phase: Math.random() * 6.28, speed: 0.5 + Math.random() * 2
    }));

    // Clouds
    this.clouds = Array.from({ length: 10 }, () => ({
      x: Math.random() * W * 1.5 - W * 0.25, y: 10 + Math.random() * 120,
      w: 80 + Math.random() * 160, h: 20 + Math.random() * 40,
      speed: 0.02 + Math.random() * 0.08, opacity: 0.08 + Math.random() * 0.1,
      drift: Math.random() * 6.28
    }));

    // Mountains
    this.mountains = [
      { color: 'rgba(15,61,46,0.12)', y: 0.52, freq: 0.003, amp: 30, detail: 0.008, detailAmp: 12 },
      { color: 'rgba(15,61,46,0.18)', y: 0.57, freq: 0.005, amp: 22, detail: 0.012, detailAmp: 8 },
      { color: 'rgba(62,107,72,0.12)', y: 0.62, freq: 0.007, amp: 15, detail: 0.018, detailAmp: 5 }
    ];

    // Far trees (depth 0-1)
    this.farTrees = [];
    for (let i = 0; i < 20; i++) {
      this.farTrees.push({
        x: Math.random() * W * 1.1 - W * 0.05,
        depth: Math.random() > 0.5 ? 0 : 1,
        h: 50 + Math.random() * 40, w: 6 + Math.random() * 4,
        canopyR: 14 + Math.random() * 10, sway: Math.random() * 6.28,
        type: Math.random() > 0.3 ? 'd' : 'c'
      });
    }
    this.farTrees.sort((a, b) => a.depth - b.depth);

    // Stream
    this.stream.y = H * 0.76;
    this.stream.w = H * 0.06;

    // Mid trees (depth 2)
    this.midTrees = Array.from({ length: 16 }, () => ({
      x: Math.random() * W * 1.1,
      h: 70 + Math.random() * 50, w: 10 + Math.random() * 6,
      canopyR: 20 + Math.random() * 14, sway: Math.random() * 6.28,
      type: Math.random() > 0.25 ? 'd' : 'c', layers: 2 + Math.floor(Math.random() * 2)
    }));

    // Near trees (depth 3)
    this.nearTrees = Array.from({ length: 12 }, () => ({
      x: Math.random() * W * 1.1,
      h: 90 + Math.random() * 60, w: 14 + Math.random() * 8,
      canopyR: 28 + Math.random() * 16, sway: Math.random() * 6.28,
      type: Math.random() > 0.2 ? 'd' : 'c', layers: 3
    }));

    // Flowers
    this.flowers = Array.from({ length: 40 }, () => ({
      x: Math.random() * W, y: H * 0.64 + Math.random() * H * 0.08,
      size: 2 + Math.random() * 3, phase: Math.random() * 6.28,
      color: ['#D4A0D4', '#E7A95A', '#BFDFF6', '#6FA36F', '#F5F0E8', '#c9a0dc'][Math.floor(Math.random() * 6)],
      petals: 4 + Math.floor(Math.random() * 3), bloom: 1, bloomTarget: 1
    }));

    // Mushrooms
    this.mushrooms = Array.from({ length: 18 }, () => ({
      x: Math.random() * W, y: H * 0.69 + Math.random() * H * 0.04,
      size: 2 + Math.random() * 4, color: Math.random() > 0.5 ? '#8A6A4A' : '#A07848'
    }));

    // Grass layers
    this.grass = Array.from({ length: 600 }, () => ({
      x: Math.random() * W * 1.1, h: 5 + Math.random() * 18,
      phase: Math.random() * 6.28, depth: Math.random(), curve: 0.3 + Math.random() * 0.7
    }));

    this.foregroundGrass = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, h: 15 + Math.random() * 25,
      phase: Math.random() * 6.28
    }));

    // Butterflies
    this.butterflies = Array.from({ length: 8 }, () => ({
      x: Math.random() * W, y: H * 0.25 + Math.random() * H * 0.35,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.25,
      phase: Math.random() * 6.28, size: 2 + Math.random() * 2.5,
      color: ['#E7A95A', '#D4A0D4', '#BFDFF6', '#6FA36F', '#F5F0E8', '#c9a0dc'][Math.floor(Math.random() * 6)]
    }));

    // Birds
    this.birds = Array.from({ length: 8 }, () => ({
      x: Math.random() * W, y: 30 + Math.random() * 200,
      speed: 0.3 + Math.random() * 0.7, wingPhase: Math.random() * 6.28,
      wingSpeed: 3 + Math.random() * 2, size: 0.7 + Math.random() * 0.5
    }));

    // Fireflies
    this.fireflies = Array.from({ length: 25 }, () => ({
      x: Math.random() * W, y: H * 0.15 + Math.random() * H * 0.5,
      vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.1,
      phase: Math.random() * 6.28, glow: 0
    }));

    // Falling leaves
    this.leaves = [];

    // Rain
    this.rain = [];
  }

  update(dt, timeOfDay) {
    this.time += dt;
    const tod = LDL.timeOfDay[timeOfDay] || LDL.timeOfDay.noon;

    // Wind system — gusts connect everything
    this.wind.gustTimer += dt;
    if (this.wind.gustTimer > 3 + Math.random() * 8) {
      this.wind.target = 0.3 + Math.random() * 0.7;
      this.wind.gustTimer = 0;
    }
    this.wind.strength += (this.wind.target - this.wind.strength) * 0.02;
    this.wind.gust = Math.sin(this.time * 0.5) * 0.2 * this.wind.strength;

    // Clouds
    for (const c of this.clouds) {
      c.x += c.speed * (1 + this.wind.strength * 0.5);
      c.drift += dt * 0.1;
      if (c.x > this.w + 200) c.x = -c.w - 50;
    }

    // Birds — respond to wind
    for (const b of this.birds) {
      b.x += b.speed + this.wind.gust * 0.3;
      b.y += Math.sin(this.time + b.wingPhase) * 0.2;
      b.wingPhase += dt * b.wingSpeed * (1 + this.wind.strength * 0.3);
      if (b.x > this.w + 50) { b.x = -50; b.y = 30 + Math.random() * 200; }
    }

    // Butterflies — erratic, wind-affected
    for (const b of this.butterflies) {
      b.x += b.vx + this.wind.gust * 0.5 + Math.sin(this.time * 2 + b.phase) * 0.3;
      b.y += b.vy + Math.cos(this.time * 1.5 + b.phase) * 0.2;
      b.phase += dt * 5;
      if (b.x < -30) b.x = this.w + 30;
      if (b.x > this.w + 30) b.x = -30;
      if (b.y < this.h * 0.1) b.vy = Math.abs(b.vy);
      if (b.y > this.h * 0.65) b.vy = -Math.abs(b.vy);
    }

    // Fireflies — active at dusk/night
    const isNight = tod.ambient < 0.35;
    for (const f of this.fireflies) {
      f.x += f.vx + Math.sin(this.time * 0.7 + f.phase) * 0.08;
      f.y += f.vy + Math.cos(this.time * 0.5 + f.phase) * 0.06;
      f.phase += dt * 0.4;
      f.glow = isNight ? (Math.sin(f.phase * 2) * 0.5 + 0.5) : Math.max(0, f.glow - 0.01);
      if (f.x < 0) f.x = this.w;
      if (f.x > this.w) f.x = 0;
      if (f.y < this.h * 0.1) f.vy = Math.abs(f.vy);
      if (f.y > this.h * 0.65) f.vy = -Math.abs(f.vy);
    }

    // Stream ripples
    if (Math.random() < 0.005 + this.wind.strength * 0.003) {
      this.stream.ripples.push({
        x: this.w * 0.5 + Math.random() * this.w * 0.45,
        y: this.stream.y + Math.random() * this.stream.w,
        r: 0, maxR: 5 + Math.random() * 12, age: 0
      });
    }
    this.stream.ripples = this.stream.ripples.filter(r => {
      r.age += dt; r.r = r.maxR * Math.min(1, r.age / 1.2);
      return r.age < 1.2;
    });

    // Particles — pollen, seeds, dust
    if (Math.random() < 0.02) {
      this.particles.push({
        x: Math.random() * this.w, y: this.h * 0.1 + Math.random() * this.h * 0.5,
        vx: (Math.random() - 0.5) * 0.15 + this.wind.gust * 0.2,
        vy: -0.02 + Math.random() * 0.1, life: 1,
        type: ['pollen', 'seed', 'dust'][Math.floor(Math.random() * 3)],
        size: 0.8 + Math.random() * 2
      });
    }
    this.particles = this.particles.filter(p => {
      p.x += p.vx + this.wind.gust * 0.15;
      p.y += p.vy;
      p.life -= 0.002;
      return p.life > 0 && p.y < this.h + 10;
    });

    // Falling leaves — wind-triggered
    if (this.wind.strength > 0.6 && Math.random() < 0.01 * this.wind.strength) {
      this.leaves.push({
        x: Math.random() * this.w, y: -10,
        vx: this.wind.gust * 0.8 + (Math.random() - 0.5) * 0.3,
        vy: 0.3 + Math.random() * 0.5, rot: Math.random() * 6.28,
        rotSpeed: (Math.random() - 0.5) * 3, life: 1,
        color: ['#8A6A4A', '#6FA36F', '#E7A95A', '#3E6B48'][Math.floor(Math.random() * 4)]
      });
    }
    this.leaves = this.leaves.filter(l => {
      l.x += l.vx + Math.sin(this.time + l.rot) * 0.2;
      l.y += l.vy;
      l.rot += l.rotSpeed * dt;
      l.life -= 0.003;
      return l.life > 0 && l.y < this.h + 20;
    });

    // Rain system
    this.rainTimer += dt;
    if (!this.isRaining && this.rainTimer > 30 + Math.random() * 60) {
      this.isRaining = true;
      this.rainTimer = 0;
      // Bloom flowers during rain
      for (const f of this.flowers) f.bloomTarget = 1.3;
    }
    if (this.isRaining && this.rainTimer > 5 + Math.random() * 8) {
      this.isRaining = false;
      this.rainTimer = 0;
      for (const f of this.flowers) f.bloomTarget = 1;
    }
    if (this.isRaining) {
      for (let i = 0; i < 3; i++) {
        this.rain.push({
          x: Math.random() * this.w, y: -5,
          speed: 4 + Math.random() * 3, length: 8 + Math.random() * 12
        });
      }
    }
    this.rain = this.rain.filter(r => {
      r.y += r.speed;
      r.x += this.wind.gust * 0.5;
      return r.y < this.h + 20;
    });

    // Flower bloom animation
    for (const f of this.flowers) {
      f.bloom += (f.bloomTarget - f.bloom) * 0.02;
    }
  }

  render(timeOfDay, season) {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.w, H = this.h;
    const tod = LDL.timeOfDay[timeOfDay] || LDL.timeOfDay.noon;

    ctx.clearRect(0, 0, W, H);

    // Layer 1: Sky
    this._sky(ctx, W, H, tod);
    // Layer 2: Stars
    this._stars(ctx, W, H, tod);
    // Layer 3: Sun/Moon
    this._celestial(ctx, W, H, tod);
    // Layer 4: Clouds
    this._clouds(ctx, W, H, tod);
    // Layer 5: Sun rays
    this._rays(ctx, W, H, tod);
    // Layer 6: Mountains
    this._mountains(ctx, W, H, tod, season);
    // Layer 7: Far trees
    this._treeLayer(ctx, W, H, tod, season, this.farTrees, 0.35, 0.65);
    // Layer 8: Stream
    this._stream(ctx, W, H, tod);
    // Layer 9: Mid trees
    this._treeLayer(ctx, W, H, tod, season, this.midTrees, 0.6, 0.85);
    // Layer 10: Grass mid
    this._grassLayer(ctx, W, H, tod, season, 0.35, 0.7);
    // Layer 11: Near trees
    this._treeLayer(ctx, W, H, tod, season, this.nearTrees, 0.8, 1.0);
    // Layer 12: Flowers + mushrooms
    this._flora(ctx, W, H, tod);
    // Layer 13: Grass near
    this._grassLayer(ctx, W, H, tod, season, 0.7, 1.0);
    // Layer 14: Fog
    this._fog(ctx, W, H, tod);
    // Layer 15: Stream ripples
    this._ripples(ctx, W, H, tod);
    // Layer 16: Butterflies
    this._butterflies(ctx, W, H, tod);
    // Layer 17: Birds
    this._birds(ctx, W, H, tod);
    // Layer 18: Particles
    this._particles(ctx, W, H, tod);
    // Layer 19: Falling leaves
    this._leaves(ctx, W, H, tod);
    // Layer 20: Rain
    this._rain(ctx, W, H, tod);
    // Layer 21: Fireflies
    this._fireflies(ctx, W, H, tod);
    // Layer 22: Foreground grass
    this._fgGrass(ctx, W, H, tod, season);
    // Layer 23: Mouse glow
    this._mouseGlow(ctx, W, H, tod);
    // Layer 24: Vignette
    this._vignette(ctx, W, H, tod);
  }

  _sky(ctx, W, H, tod) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, tod.skyTop);
    g.addColorStop(0.35, tod.skyMid);
    g.addColorStop(1, tod.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  _stars(ctx, W, H, tod) {
    if (tod.ambient > 0.5) return;
    const a = Math.max(0, (0.5 - tod.ambient) * 2.5);
    ctx.save();
    for (const s of this.stars) {
      const tw = Math.sin(this.time * s.speed + s.phase) * 0.4 + 0.6;
      ctx.globalAlpha = a * tw * 0.7;
      ctx.fillStyle = '#F5F0E8';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 6.28);
      ctx.fill();
    }
    ctx.restore();
  }

  _celestial(ctx, W, H, tod) {
    if (tod.ambient >= 0.15) {
      const sunAngle = (new Date().getHours() / 24) * Math.PI;
      const sx = W * 0.5 + Math.cos(sunAngle) * W * 0.35;
      const sy = H * 0.08 + Math.sin(sunAngle) * H * -0.15;
      const r = 22 + tod.ambient * 12;
      ctx.save();
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 4);
      g.addColorStop(0, `rgba(231,169,90,${0.2 * tod.ambient})`);
      g.addColorStop(0.4, `rgba(231,169,90,${0.06 * tod.ambient})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, r * 4, 0, 6.28); ctx.fill();
      ctx.globalAlpha = tod.ambient * 0.85;
      ctx.fillStyle = '#E7A95A';
      ctx.beginPath(); ctx.arc(sx, sy, r * 0.35, 0, 6.28); ctx.fill();
      ctx.restore();
    }
    if (tod.ambient < 0.4) {
      const mx = W * 0.78, my = H * 0.1;
      const a = Math.max(0, (0.4 - tod.ambient) * 2.5);
      ctx.save(); ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, 45);
      g.addColorStop(0, 'rgba(217,227,236,0.12)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(mx, my, 45, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#D9E3EC';
      ctx.beginPath(); ctx.arc(mx, my, 10, 0, 6.28); ctx.fill();
      ctx.fillStyle = tod.skyTop;
      ctx.beginPath(); ctx.arc(mx + 3, my - 1, 8, 0, 6.28); ctx.fill();
      ctx.restore();
    }
  }

  _rays(ctx, W, H, tod) {
    if (tod.ambient < 0.25) return;
    const sunAngle = (new Date().getHours() / 24) * Math.PI;
    const sx = W * 0.5 + Math.cos(sunAngle) * W * 0.35;
    const sy = H * 0.08 + Math.sin(sunAngle) * H * -0.15;
    ctx.save();
    ctx.globalAlpha = 0.02 * tod.ambient;
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 0.45 + 0.2;
      const len = 220 + Math.sin(this.time * 0.12 + i * 0.6) * 40;
      const sp = 10 + Math.sin(this.time * 0.2 + i) * 3;
      ctx.fillStyle = 'rgba(231,169,90,0.1)';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(angle - 0.012) * len, sy + Math.sin(angle - 0.012) * len);
      ctx.lineTo(sx + Math.cos(angle + 0.012) * len + sp, sy + Math.sin(angle + 0.012) * len + sp);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  _clouds(ctx, W, H, tod) {
    ctx.save();
    const night = tod.ambient < 0.3;
    for (const c of this.clouds) {
      ctx.globalAlpha = c.opacity * (night ? 0.25 : 1);
      const col = night ? '40,40,60' : '245,240,232';
      ctx.fillStyle = `rgba(${col},0.35)`;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w * 0.5, c.h * 0.5, 0, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.ellipse(c.x - c.w * 0.2, c.y + 5, c.w * 0.3, c.h * 0.3, 0, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.25, c.y + 3, c.w * 0.35, c.h * 0.35, 0, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  }

  _mountains(ctx, W, H, tod, season) {
    for (const m of this.mountains) {
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.moveTo(0, H * m.y);
      for (let x = 0; x <= W; x += 8) {
        const y = H * m.y + Math.sin(x * m.freq) * m.amp + Math.sin(x * m.detail) * m.detailAmp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    }
  }

  _treeLayer(ctx, W, H, tod, season, trees, alphaBase, alphaTop) {
    const palettes = {
      spring: ['#2A5A3A', '#3E6B48', '#6FA36F', '#8BC48B'],
      summer: ['#1A4A2A', '#2A5A3A', '#3E6B48', '#4A7A4A'],
      autumn: ['#6E5843', '#8A6A4A', '#A07848', '#C49A6C'],
      winter: ['#3A2A1A', '#4A3A2A', '#2A1A0A']
    };
    const colors = palettes[season] || palettes.spring;
    const groundY = H * 0.67;

    for (const t of trees) {
      const depth01 = (t.depth !== undefined) ? t.depth / 2 : 0.5;
      const alpha = alphaBase + (alphaTop - alphaBase) * depth01;
      const sway = Math.sin(this.time * (0.8 + t.sway * 0.1) + t.sway) * (3 + this.wind.gust * 4);
      const baseY = groundY + (1 - depth01) * 20;

      // Trunk
      const tg = ctx.createLinearGradient(t.x, baseY, t.x, baseY - t.h);
      tg.addColorStop(0, `rgba(42,26,10,${alpha * tod.ambient})`);
      tg.addColorStop(1, `rgba(60,40,20,${alpha * tod.ambient * 0.8})`);
      ctx.fillStyle = tg;
      const tw = t.w * (1 + (1 - depth01) * 0.2);
      ctx.beginPath();
      ctx.moveTo(t.x - tw * 0.5, baseY);
      ctx.lineTo(t.x - tw * 0.3 + sway * 0.3, baseY - t.h);
      ctx.lineTo(t.x + tw * 0.3 + sway * 0.3, baseY - t.h);
      ctx.lineTo(t.x + tw * 0.5, baseY);
      ctx.fill();

      // Canopy
      if (t.type === 'd') {
        const layers = t.layers || 2;
        for (let l = 0; l < layers; l++) {
          const r = t.canopyR * (1 - l * 0.12);
          const ly = baseY - t.h - l * 7;
          ctx.fillStyle = colors[l % colors.length];
          ctx.globalAlpha = alpha * tod.ambient * (0.5 - l * 0.06);
          ctx.beginPath();
          ctx.arc(t.x + sway + l * 1.5, ly, r, 0, 6.28);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else {
        for (let l = 0; l < 3; l++) {
          const lw = t.canopyR * (1.1 - l * 0.25);
          const ly = baseY - t.h * 0.35 - l * t.h * 0.18;
          ctx.fillStyle = `rgba(26,74,42,${alpha * tod.ambient * 0.45})`;
          ctx.beginPath();
          ctx.moveTo(t.x + sway * (1 - l * 0.15), ly - t.h * 0.25);
          ctx.lineTo(t.x - lw + sway * 0.4, ly);
          ctx.lineTo(t.x + lw + sway * 0.4, ly);
          ctx.fill();
        }
      }
    }
  }

  _stream(ctx, W, H, tod) {
    const y = this.stream.y, h = this.stream.w;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    const ref = tod.ambient > 0.4 ? 0.3 : 0.12;
    g.addColorStop(0, `rgba(95,168,211,${ref * tod.ambient * 0.5})`);
    g.addColorStop(0.4, `rgba(95,168,211,${ref * tod.ambient})`);
    g.addColorStop(0.8, `rgba(95,168,211,${ref * 1.3 * tod.ambient})`);
    g.addColorStop(1, `rgba(95,168,211,${ref * 0.4 * tod.ambient})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 5) {
      ctx.lineTo(x, y + Math.sin(x * 0.01 + this.time * 0.6) * 2 + Math.sin(x * 0.022 + this.time) * 1);
    }
    for (let x = W; x >= 0; x -= 5) {
      ctx.lineTo(x, y + h + Math.sin(x * 0.01 + this.time * 0.6 + 1) * 1.5);
    }
    ctx.closePath(); ctx.fill();
    // Surface highlights
    ctx.save(); ctx.globalAlpha = 0.06 * tod.ambient;
    for (let i = 0; i < 6; i++) {
      const lx = (i / 6) * W + Math.sin(this.time * 0.4 + i * 1.5) * 20;
      ctx.strokeStyle = '#F5F0E8'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(lx, y + 2); ctx.lineTo(lx + 10, y + 3); ctx.stroke();
    }
    ctx.restore();
  }

  _ripples(ctx, W, H, tod) {
    ctx.save();
    for (const r of this.stream.ripples) {
      const a = (1 - r.r / r.maxR) * 0.2 * tod.ambient;
      ctx.strokeStyle = `rgba(191,223,246,${a})`; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, 6.28); ctx.stroke();
    }
    ctx.restore();
  }

  _grassLayer(ctx, W, H, tod, season, dMin, dMax) {
    const groundY = H * 0.67;
    const col = season === 'winter' ? '#4A3A2A' : season === 'autumn' ? '#7A5A3A' : '#4A7A4A';
    for (const b of this.grass) {
      if (b.depth < dMin || b.depth > dMax) continue;
      const wind = Math.sin(this.time * 1.2 + b.phase) * (2 + this.wind.gust * 5) * b.curve;
      ctx.strokeStyle = col;
      ctx.globalAlpha = (0.2 + b.depth * 0.5) * tod.ambient;
      ctx.lineWidth = 0.4 + b.depth * 0.8;
      ctx.beginPath();
      ctx.moveTo(b.x, groundY);
      ctx.quadraticCurveTo(b.x + wind * 0.5, groundY - b.h * 0.5, b.x + wind, groundY - b.h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _flora(ctx, W, H, tod) {
    ctx.save();
    for (const f of this.flowers) {
      const sway = Math.sin(this.time * 1.1 + f.phase) * 1.5 * this.wind.strength;
      ctx.globalAlpha = 0.45 * tod.ambient;
      ctx.fillStyle = f.color;
      for (let p = 0; p < f.petals; p++) {
        const a = (p / f.petals) * 6.28 + this.time * 0.05;
        const r = f.size * f.bloom;
        ctx.beginPath();
        ctx.ellipse(f.x + sway + Math.cos(a) * r * 0.4, f.y + Math.sin(a) * r * 0.4, r * 0.35, r * 0.18, a, 0, 6.28);
        ctx.fill();
      }
      ctx.fillStyle = '#E7A95A'; ctx.globalAlpha = 0.35 * tod.ambient;
      ctx.beginPath(); ctx.arc(f.x + sway, f.y, f.size * 0.2, 0, 6.28); ctx.fill();
    }
    for (const m of this.mushrooms) {
      ctx.globalAlpha = 0.3 * tod.ambient;
      ctx.fillStyle = '#F5F0E8';
      ctx.fillRect(m.x - 1, m.y - m.size, 2, m.size);
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y - m.size, m.size * 0.7, m.size * 0.4, 0, Math.PI, 6.28);
      ctx.fill();
    }
    ctx.restore();
  }

  _fog(ctx, W, H, tod) {
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    const intensity = hour < 7 ? 0.3 : hour > 18 ? 0.2 : 0.04;
    if (intensity <= 0) return;
    for (let i = 0; i < 3; i++) {
      const fy = H * (0.48 + i * 0.1);
      const fh = H * 0.12;
      const g = ctx.createLinearGradient(0, fy, 0, fy + fh);
      const drift = Math.sin(this.time * 0.08 + i) * 15;
      g.addColorStop(0, 'transparent');
      g.addColorStop(0.5, `rgba(191,223,246,${intensity * tod.ambient * (1 - i * 0.15)})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(drift, fy, W, fh);
    }
  }

  _butterflies(ctx, W, H, tod) {
    if (tod.ambient < 0.25) return;
    ctx.save();
    for (const b of this.butterflies) {
      const wing = Math.sin(b.phase) * 0.55;
      ctx.globalAlpha = 0.45 * tod.ambient;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.ellipse(b.x - b.size, b.y, b.size, b.size * 0.55, wing, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.ellipse(b.x + b.size, b.y, b.size, b.size * 0.55, -wing, 0, 6.28); ctx.fill();
      ctx.fillStyle = 'rgba(110,88,67,0.4)';
      ctx.fillRect(b.x - 0.4, b.y - b.size * 0.4, 0.8, b.size * 0.8);
    }
    ctx.restore();
  }

  _birds(ctx, W, H, tod) {
    if (tod.ambient < 0.2) return;
    ctx.save();
    ctx.strokeStyle = `rgba(15,61,46,${0.3 * tod.ambient})`;
    ctx.lineWidth = 1.1;
    for (const b of this.birds) {
      const wy = Math.sin(b.wingPhase) * 4.5 * b.size;
      const s = b.size;
      ctx.beginPath();
      ctx.moveTo(b.x - 5 * s, b.y + wy);
      ctx.quadraticCurveTo(b.x - 1.5 * s, b.y - 0.8, b.x, b.y);
      ctx.quadraticCurveTo(b.x + 1.5 * s, b.y - 0.8, b.x + 5 * s, b.y + wy);
      ctx.stroke();
    }
    ctx.restore();
  }

  _particles(ctx, W, H, tod) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 0.3 * tod.ambient;
      if (p.type === 'pollen') {
        ctx.fillStyle = '#E7A95A';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.6, 0, 6.28); ctx.fill();
      } else if (p.type === 'seed') {
        ctx.fillStyle = '#F5F0E8';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 0.4, p.size, Math.sin(this.time + p.x) * 0.3, 0, 6.28);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(245,240,232,0.4)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.3, 0, 6.28); ctx.fill();
      }
    }
    ctx.restore();
  }

  _leaves(ctx, W, H, tod) {
    ctx.save();
    for (const l of this.leaves) {
      ctx.globalAlpha = l.life * 0.6;
      ctx.fillStyle = l.color;
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, 6.28); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  _rain(ctx, W, H, tod) {
    if (this.rain.length === 0) return;
    ctx.save();
    ctx.strokeStyle = `rgba(191,223,246,${0.15 * tod.ambient})`;
    ctx.lineWidth = 0.7;
    for (const r of this.rain) {
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + this.wind.gust * 0.3, r.y + r.length);
      ctx.stroke();
    }
    ctx.restore();
  }

  _fireflies(ctx, W, H, tod) {
    ctx.save();
    for (const f of this.fireflies) {
      if (f.glow <= 0.05) continue;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 14);
      g.addColorStop(0, `rgba(231,169,90,${f.glow * 0.35})`);
      g.addColorStop(0.5, `rgba(231,169,90,${f.glow * 0.08})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, 14, 0, 6.28); ctx.fill();
      ctx.fillStyle = `rgba(245,240,232,${f.glow * 0.75})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, 1.5, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  }

  _fgGrass(ctx, W, H, tod, season) {
    const gy = H * 0.88;
    const col = season === 'winter' ? '#3A2A1A' : '#2A5A3A';
    ctx.fillStyle = `rgba(62,107,72,${0.2 * tod.ambient})`;
    ctx.fillRect(0, gy, W, H - gy);
    for (const b of this.foregroundGrass) {
      const wind = Math.sin(this.time * 1.2 + b.phase) * (3 + this.wind.gust * 5);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.4 * tod.ambient;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(b.x, gy);
      ctx.quadraticCurveTo(b.x + wind * 0.6, gy - b.h * 0.5, b.x + wind * 1.2, gy - b.h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _mouseGlow(ctx, W, H, tod) {
    if (this.mouseX < 0) return;
    const g = ctx.createRadialGradient(this.mouseX, this.mouseY, 0, this.mouseX, this.mouseY, 70);
    g.addColorStop(0, `rgba(231,169,90,${0.035 * tod.ambient})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(this.mouseX, this.mouseY, 70, 0, 6.28); ctx.fill();
  }

  _vignette(ctx, W, H, tod) {
    const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.22, W / 2, H / 2, W * 0.85);
    g.addColorStop(0, 'transparent');
    g.addColorStop(1, `rgba(10,20,15,${0.3 + (1 - tod.ambient) * 0.35})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  setMouse(x, y) { this.mouseX = x; this.mouseY = y; }
}
