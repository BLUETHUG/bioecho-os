// BioEcho World v3.1 — Dense, rich, immersive forest
// The world IS the interface. Pure visuals. No text.

class WorldV3 {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.time = 0;
    this.windPhase = 0;
    this.trees = [];
    this.grass = [];
    this.stars = [];
    this.particles = [];
    this.birds = [];
    this.butterflies = [];
    this.streamRipples = [];
    this.sunAngle = 0;
    this.mouseX = -1;
    this.mouseY = -1;
    this.clouds = [];
    this.fireflies = [];
    this.mushrooms = [];
    this.flowers = [];
  }

  initialize() {
    if (!this.canvas) return;
    this.resize();
    this._generate();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  _generate() {
    this.trees = [];
    // 5 depth layers for parallax depth
    for (let depth = 0; depth < 5; depth++) {
      const count = [6, 10, 14, 18, 12][depth];
      for (let i = 0; i < count; i++) {
        this.trees.push({
          x: Math.random() * this.width * 1.1 - this.width * 0.05,
          depth,
          height: (100 - depth * 15) + Math.random() * (70 - depth * 8),
          width: (14 - depth * 2) + Math.random() * (10 - depth),
          canopyR: (25 - depth * 3) + Math.random() * (18 - depth * 2),
          sway: Math.random() * Math.PI * 2,
          swaySpeed: 0.8 + Math.random() * 0.4,
          type: Math.random() > 0.25 ? 'deciduous' : 'conifer',
          canopyLayers: 2 + Math.floor(Math.random() * 2)
        });
      }
    }
    this.trees.sort((a, b) => a.depth - b.depth);

    this.grass = [];
    for (let i = 0; i < 500; i++) {
      this.grass.push({
        x: Math.random() * this.width * 1.1,
        h: 6 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
        depth: Math.random(),
        curve: 0.3 + Math.random() * 0.7
      });
    }

    this.flowers = [];
    for (let i = 0; i < 30; i++) {
      this.flowers.push({
        x: Math.random() * this.width,
        y: this.height * 0.65 + Math.random() * this.height * 0.08,
        size: 2 + Math.random() * 3,
        color: ['#D4A0D4', '#E7A95A', '#BFDFF6', '#6FA36F', '#F5F0E8'][Math.floor(Math.random() * 5)],
        phase: Math.random() * Math.PI * 2,
        petals: 4 + Math.floor(Math.random() * 3)
      });
    }

    this.mushrooms = [];
    for (let i = 0; i < 15; i++) {
      this.mushrooms.push({
        x: Math.random() * this.width,
        y: this.height * 0.7 + Math.random() * this.height * 0.05,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#8A6A4A' : '#A07848'
      });
    }

    this.clouds = [];
    for (let i = 0; i < 8; i++) {
      this.clouds.push({
        x: Math.random() * this.width * 1.5 - this.width * 0.25,
        y: 15 + Math.random() * 100,
        w: 70 + Math.random() * 130,
        h: 20 + Math.random() * 35,
        speed: 0.05 + Math.random() * 0.15,
        opacity: 0.12 + Math.random() * 0.12
      });
    }

    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.45,
        r: 0.3 + Math.random() * 1.8,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 1 + Math.random() * 3
      });
    }

    this.birds = [];
    for (let i = 0; i < 6; i++) {
      this.birds.push({
        x: Math.random() * this.width,
        y: 40 + Math.random() * 180,
        speed: 0.3 + Math.random() * 0.6,
        wingPhase: Math.random() * Math.PI * 2,
        wingSpeed: 3 + Math.random() * 2,
        size: 0.8 + Math.random() * 0.4
      });
    }

    this.butterflies = [];
    for (let i = 0; i < 5; i++) {
      this.butterflies.push({
        x: Math.random() * this.width,
        y: this.height * 0.3 + Math.random() * this.height * 0.3,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3,
        wingPhase: Math.random() * Math.PI * 2,
        color: ['#E7A95A', '#D4A0D4', '#BFDFF6', '#6FA36F', '#F5F0E8'][Math.floor(Math.random() * 5)],
        size: 2 + Math.random() * 2
      });
    }

    this.fireflies = [];
    for (let i = 0; i < 20; i++) {
      this.fireflies.push({
        x: Math.random() * this.width,
        y: this.height * 0.2 + Math.random() * this.height * 0.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.15,
        phase: Math.random() * Math.PI * 2,
        glow: 0
      });
    }
  }

  update(dt, timeOfDay, season) {
    this.time += dt;
    this.windPhase += 0.012;
    const tod = LDL.timeOfDay[timeOfDay] || LDL.timeOfDay.noon;
    this.sunAngle = (new Date().getHours() / 24) * Math.PI;

    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * (1 + Math.sin(this.windPhase * 0.3) * 0.3);
      if (cloud.x > this.width + 150) cloud.x = -cloud.w;
    }

    for (const bird of this.birds) {
      bird.x += bird.speed;
      bird.wingPhase += dt * bird.wingSpeed;
      if (bird.x > this.width + 40) {
        bird.x = -40;
        bird.y = 40 + Math.random() * 180;
      }
    }

    for (const b of this.butterflies) {
      b.x += b.vx + Math.sin(this.time * 2 + b.wingPhase) * 0.3;
      b.y += b.vy + Math.cos(this.time * 1.5 + b.wingPhase) * 0.2;
      b.wingPhase += dt * 5;
      if (b.x < -20) b.x = this.width + 20;
      if (b.x > this.width + 20) b.x = -20;
      if (b.y < this.height * 0.15) b.vy = Math.abs(b.vy);
      if (b.y > this.height * 0.65) b.vy = -Math.abs(b.vy);
    }

    const isNight = tod.ambient < 0.3;
    for (const f of this.fireflies) {
      f.x += f.vx + Math.sin(this.time + f.phase) * 0.1;
      f.y += f.vy + Math.cos(this.time * 0.7 + f.phase) * 0.08;
      f.phase += dt * 0.5;
      f.glow = isNight ? (Math.sin(f.phase * 2) * 0.5 + 0.5) : 0;
      if (f.x < 0) f.x = this.width;
      if (f.x > this.width) f.x = 0;
      if (f.y < this.height * 0.1) f.vy = Math.abs(f.vy);
      if (f.y > this.height * 0.65) f.vy = -Math.abs(f.vy);
    }

    if (Math.random() < 0.004) {
      this.streamRipples.push({
        x: this.width * 0.55 + Math.random() * this.width * 0.4,
        y: this.height * 0.78 + Math.random() * 12,
        r: 0, maxR: 6 + Math.random() * 14, age: 0
      });
    }
    this.streamRipples = this.streamRipples.filter(r => {
      r.age += dt;
      r.r = r.maxR * Math.min(1, r.age / 1.5);
      return r.age < 1.5;
    });

    if (Math.random() < 0.015) {
      this.particles.push({
        x: Math.random() * this.width,
        y: this.height * 0.15 + Math.random() * this.height * 0.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.05 + Math.random() * 0.15,
        life: 1,
        type: Math.random() > 0.4 ? 'pollen' : Math.random() > 0.5 ? 'dust' : 'seed',
        size: 1 + Math.random() * 2
      });
    }
    this.particles = this.particles.filter(p => {
      p.x += p.vx + Math.sin(this.windPhase + p.y * 0.008) * 0.15;
      p.y += p.vy;
      p.life -= 0.002;
      return p.life > 0 && p.y < this.height + 10;
    });
  }

  render(timeOfDay, season) {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.width;
    const h = this.height;
    const tod = LDL.timeOfDay[timeOfDay] || LDL.timeOfDay.noon;

    ctx.clearRect(0, 0, w, h);

    this._drawSky(ctx, w, h, tod);
    this._drawStars(ctx, w, h, tod);
    this._drawSun(ctx, w, h, tod);
    this._drawMoon(ctx, w, h, tod);
    this._drawClouds(ctx, w, h, tod);
    this._drawSunRays(ctx, w, h, tod);
    this._drawDistantHills(ctx, w, h, tod, season);

    // Trees depth 0-1 (distant)
    this._drawTreeLayer(ctx, w, h, tod, season, 0);
    this._drawTreeLayer(ctx, w, h, tod, season, 1);

    // Stream
    this._drawStream(ctx, w, h, tod);

    // Trees depth 2 (mid)
    this._drawTreeLayer(ctx, w, h, tod, season, 2);

    // Grass mid
    this._drawGrassLayer(ctx, w, h, tod, season, 0.4);

    // Trees depth 3 (near-mid)
    this._drawTreeLayer(ctx, w, h, tod, season, 3);

    // Flowers + mushrooms
    this._drawFlowers(ctx, w, h, tod);
    this._drawMushrooms(ctx, w, h, tod);

    // Grass near
    this._drawGrassLayer(ctx, w, h, tod, season, 0.7);

    // Fog
    this._drawFog(ctx, w, h, tod);

    // Trees depth 4 (foreground, blurred)
    this._drawTreeLayer(ctx, w, h, tod, season, 4);

    // Foreground grass
    this._drawForeground(ctx, w, h, tod, season);

    // Stream ripples
    this._drawStreamRipples(ctx, w, h, tod);

    // Butterflies
    this._drawButterflies(ctx, w, h, tod);

    // Birds
    this._drawBirds(ctx, w, h, tod);

    // Particles
    this._drawParticles(ctx, w, h, tod);

    // Fireflies
    this._drawFireflies(ctx, w, h, tod);

    // Mouse glow
    this._drawMouseGlow(ctx, w, h, tod);

    // Vignette
    this._drawVignette(ctx, w, h, tod);
  }

  _drawSky(ctx, w, h, tod) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, tod.skyTop);
    grad.addColorStop(0.35, tod.skyMid);
    grad.addColorStop(1, tod.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  _drawStars(ctx, w, h, tod) {
    if (tod.ambient > 0.5) return;
    const alpha = Math.max(0, (0.5 - tod.ambient) * 2.5);
    ctx.save();
    for (const star of this.stars) {
      const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinkle) * 0.4 + 0.6;
      ctx.globalAlpha = alpha * twinkle * 0.7;
      ctx.fillStyle = '#F5F0E8';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawSun(ctx, w, h, tod) {
    if (tod.ambient < 0.15) return;
    const sunX = w * 0.5 + Math.cos(this.sunAngle) * w * 0.35;
    const sunY = h * 0.08 + Math.sin(this.sunAngle) * h * -0.15;
    const r = 25 + tod.ambient * 15;
    ctx.save();
    // Outer glow
    const grad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, r * 4);
    grad.addColorStop(0, `rgba(231,169,90,${0.25 * tod.ambient})`);
    grad.addColorStop(0.3, `rgba(231,169,90,${0.1 * tod.ambient})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, r * 4, 0, Math.PI * 2);
    ctx.fill();
    // Sun disc
    ctx.globalAlpha = tod.ambient * 0.9;
    ctx.fillStyle = '#E7A95A';
    ctx.beginPath();
    ctx.arc(sunX, sunY, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawMoon(ctx, w, h, tod) {
    if (tod.ambient > 0.4) return;
    const moonX = w * 0.75;
    const moonY = h * 0.12;
    const alpha = Math.max(0, (0.4 - tod.ambient) * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    // Moon glow
    const grad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 50);
    grad.addColorStop(0, 'rgba(217,227,236,0.15)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 50, 0, Math.PI * 2);
    ctx.fill();
    // Moon disc
    ctx.fillStyle = '#D9E3EC';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 12, 0, Math.PI * 2);
    ctx.fill();
    // Crescent shadow
    ctx.fillStyle = LDL.timeOfDay.night.skyTop;
    ctx.beginPath();
    ctx.arc(moonX + 4, moonY - 1, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawSunRays(ctx, w, h, tod) {
    if (tod.ambient < 0.25) return;
    const sunX = w * 0.5 + Math.cos(this.sunAngle) * w * 0.35;
    const sunY = h * 0.08 + Math.sin(this.sunAngle) * h * -0.15;
    ctx.save();
    ctx.globalAlpha = 0.025 * tod.ambient;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 0.5 + 0.2;
      const len = 250 + Math.sin(this.time * 0.15 + i * 0.7) * 50;
      const spread = 12 + Math.sin(this.time * 0.25 + i) * 4;
      ctx.fillStyle = 'rgba(231,169,90,0.12)';
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(angle - 0.015) * len, sunY + Math.sin(angle - 0.015) * len);
      ctx.lineTo(sunX + Math.cos(angle + 0.015) * len + spread, sunY + Math.sin(angle + 0.015) * len + spread);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _drawClouds(ctx, w, h, tod) {
    ctx.save();
    for (const cloud of this.clouds) {
      const isNight = tod.ambient < 0.3;
      ctx.globalAlpha = cloud.opacity * (isNight ? 0.3 : 1);
      const baseColor = isNight ? '40,40,60' : '245,240,232';
      ctx.fillStyle = `rgba(${baseColor},0.4)`;
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, cloud.w * 0.5, cloud.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloud.x - cloud.w * 0.22, cloud.y + 6, cloud.w * 0.32, cloud.h * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloud.x + cloud.w * 0.28, cloud.y + 4, cloud.w * 0.38, cloud.h * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawDistantHills(ctx, w, h, tod, season) {
    const alpha = tod.ambient;
    ctx.fillStyle = `rgba(15,61,46,${0.12 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.58);
    for (let x = 0; x <= w; x += 15) {
      ctx.lineTo(x, h * 0.53 + Math.sin(x * 0.004) * 25 + Math.sin(x * 0.011) * 12);
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();

    ctx.fillStyle = `rgba(15,61,46,${0.2 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.63);
    for (let x = 0; x <= w; x += 12) {
      ctx.lineTo(x, h * 0.6 + Math.sin(x * 0.007 + 1) * 18 + Math.sin(x * 0.016) * 9);
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();

    ctx.fillStyle = `rgba(62,107,72,${0.15 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.67);
    for (let x = 0; x <= w; x += 10) {
      ctx.lineTo(x, h * 0.65 + Math.sin(x * 0.009 + 2) * 12 + Math.sin(x * 0.02) * 6);
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  }

  _drawTreeLayer(ctx, w, h, tod, season, targetDepth) {
    const palette = {
      spring: ['#2A5A3A', '#3E6B48', '#6FA36F', '#8BC48B'],
      summer: ['#1A4A2A', '#2A5A3A', '#3E6B48', '#4A7A4A'],
      autumn: ['#6E5843', '#8A6A4A', '#A07848', '#C49A6C'],
      winter: ['#3A2A1A', '#4A3A2A', '#2A1A0A', '#5A4A3A']
    };
    const colors = palette[season] || palette.spring;
    const groundY = h * (0.66 + (4 - targetDepth) * 0.025);

    for (const tree of this.trees) {
      if (tree.depth !== targetDepth) continue;
      const depthAlpha = [0.3, 0.45, 0.65, 0.85, 1.0][tree.depth];
      const sway = Math.sin(this.windPhase * tree.swaySpeed + tree.sway) * (4 - tree.depth * 0.6);
      const baseY = groundY + (4 - tree.depth) * 12;

      // Trunk
      const trunkGrad = ctx.createLinearGradient(tree.x, baseY, tree.x, baseY - tree.height);
      trunkGrad.addColorStop(0, `rgba(42,26,10,${depthAlpha * tod.ambient})`);
      trunkGrad.addColorStop(1, `rgba(60,40,20,${depthAlpha * tod.ambient * 0.8})`);
      ctx.fillStyle = trunkGrad;
      const trunkW = tree.width * (1 + (4 - tree.depth) * 0.15);
      ctx.beginPath();
      ctx.moveTo(tree.x - trunkW * 0.5, baseY);
      ctx.lineTo(tree.x - trunkW * 0.3 + sway * 0.3, baseY - tree.height);
      ctx.lineTo(tree.x + trunkW * 0.3 + sway * 0.3, baseY - tree.height);
      ctx.lineTo(tree.x + trunkW * 0.5, baseY);
      ctx.fill();

      // Canopy
      if (tree.type === 'deciduous') {
        for (let layer = 0; layer < tree.canopyLayers; layer++) {
          const layerR = tree.canopyR * (1 - layer * 0.15);
          const layerY = baseY - tree.height - layer * 8;
          const colorIdx = layer % colors.length;
          ctx.fillStyle = colors[colorIdx];
          ctx.globalAlpha = depthAlpha * tod.ambient * (0.55 - layer * 0.08);
          ctx.beginPath();
          ctx.arc(tree.x + sway + layer * 2, layerY, layerR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else {
        // Conifer layers
        for (let layer = 0; layer < 3; layer++) {
          const layerW = tree.canopyR * (1.2 - layer * 0.3);
          const layerH = tree.height * 0.3;
          const layerY = baseY - tree.height * 0.4 - layer * tree.height * 0.2;
          ctx.fillStyle = `rgba(26,74,42,${depthAlpha * tod.ambient * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(tree.x + sway * (1 - layer * 0.2), layerY - layerH);
          ctx.lineTo(tree.x - layerW + sway * 0.5, layerY);
          ctx.lineTo(tree.x + layerW + sway * 0.5, layerY);
          ctx.fill();
        }
      }
    }
  }

  _drawStream(ctx, w, h, tod) {
    const streamY = h * 0.77;
    const streamH = h * 0.055;
    const grad = ctx.createLinearGradient(0, streamY, 0, streamY + streamH);
    const reflectivity = tod.ambient > 0.4 ? 0.35 : 0.15;
    grad.addColorStop(0, `rgba(95,168,211,${reflectivity * tod.ambient * 0.6})`);
    grad.addColorStop(0.3, `rgba(95,168,211,${reflectivity * tod.ambient})`);
    grad.addColorStop(0.7, `rgba(95,168,211,${reflectivity * 1.2 * tod.ambient})`);
    grad.addColorStop(1, `rgba(95,168,211,${reflectivity * 0.4 * tod.ambient})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, streamY);
    for (let x = 0; x <= w; x += 6) {
      const wave = Math.sin(x * 0.012 + this.time * 0.7) * 2.5 + Math.sin(x * 0.025 + this.time * 1.1) * 1.2;
      ctx.lineTo(x, streamY + wave);
    }
    for (let x = w; x >= 0; x -= 6) {
      const wave = Math.sin(x * 0.012 + this.time * 0.7 + 1) * 2;
      ctx.lineTo(x, streamY + streamH + wave);
    }
    ctx.closePath();
    ctx.fill();

    // Water surface highlights
    ctx.save();
    ctx.globalAlpha = 0.08 * tod.ambient;
    for (let i = 0; i < 8; i++) {
      const lx = (i / 8) * w + Math.sin(this.time * 0.5 + i * 1.3) * 25;
      ctx.strokeStyle = '#F5F0E8';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(lx, streamY + 3);
      ctx.lineTo(lx + 12 + Math.sin(this.time + i) * 5, streamY + 4);
      ctx.stroke();
    }
    ctx.restore();

    // Reflection of trees
    ctx.save();
    ctx.globalAlpha = 0.06 * tod.ambient;
    ctx.scale(1, -0.3);
    ctx.translate(0, -(streamY + streamH) * 4.3);
    ctx.restore();
  }

  _drawStreamRipples(ctx, w, h, tod) {
    ctx.save();
    for (const ripple of this.streamRipples) {
      const alpha = (1 - ripple.r / ripple.maxR) * 0.25 * tod.ambient;
      ctx.strokeStyle = `rgba(191,223,246,${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(ripple.x, ripple.y, ripple.r, ripple.r * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawGrassLayer(ctx, w, h, tod, season, depthThreshold) {
    const groundY = h * 0.66 + (1 - depthThreshold) * h * 0.08;
    const grassColor = season === 'winter' ? '#4A3A2A' : season === 'autumn' ? '#7A5A3A' : '#4A7A4A';

    for (const blade of this.grass) {
      if (Math.abs(blade.depth - depthThreshold) > 0.15) continue;
      const wind = Math.sin(this.windPhase + blade.phase) * (3 + blade.curve * 2);
      const alpha = (0.3 + blade.depth * 0.5) * tod.ambient;
      ctx.strokeStyle = grassColor;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 0.5 + blade.depth * 1;
      ctx.beginPath();
      ctx.moveTo(blade.x, groundY);
      ctx.quadraticCurveTo(blade.x + wind * 0.6, groundY - blade.h * 0.5, blade.x + wind, groundY - blade.h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawFlowers(ctx, w, h, tod) {
    ctx.save();
    for (const flower of this.flowers) {
      const sway = Math.sin(this.windPhase + flower.phase) * 2;
      const openP = Math.sin(this.time * 0.3 + flower.phase) * 0.2 + 0.8;
      ctx.globalAlpha = 0.5 * tod.ambient;
      ctx.fillStyle = flower.color;
      for (let p = 0; p < flower.petals; p++) {
        const angle = (p / flower.petals) * Math.PI * 2 + this.time * 0.1;
        const pr = flower.size * openP;
        ctx.beginPath();
        ctx.ellipse(
          flower.x + sway + Math.cos(angle) * pr * 0.5,
          flower.y + Math.sin(angle) * pr * 0.5,
          pr * 0.4, pr * 0.2, angle, 0, Math.PI * 2
        );
        ctx.fill();
      }
      ctx.fillStyle = '#E7A95A';
      ctx.globalAlpha = 0.4 * tod.ambient;
      ctx.beginPath();
      ctx.arc(flower.x + sway, flower.y, flower.size * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawMushrooms(ctx, w, h, tod) {
    ctx.save();
    for (const m of this.mushrooms) {
      ctx.globalAlpha = 0.35 * tod.ambient;
      // Stem
      ctx.fillStyle = '#F5F0E8';
      ctx.fillRect(m.x - 1, m.y - m.size, 2, m.size);
      // Cap
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y - m.size, m.size * 0.8, m.size * 0.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawFog(ctx, w, h, tod) {
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    const fogIntensity = hour < 7 ? 0.35 : hour > 18 ? 0.25 : 0.06;
    if (fogIntensity <= 0) return;

    // Layered fog
    for (let i = 0; i < 3; i++) {
      const fogY = h * (0.5 + i * 0.1);
      const fogH = h * 0.15;
      const grad = ctx.createLinearGradient(0, fogY, 0, fogY + fogH);
      const drift = Math.sin(this.time * 0.1 + i) * 20;
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, `rgba(191,223,246,${fogIntensity * tod.ambient * (1 - i * 0.2)})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(drift, fogY, w, fogH);
    }
  }

  _drawForeground(ctx, w, h, tod, season) {
    const groundY = h * 0.88;
    const groundColor = season === 'winter' ? 'rgba(58,42,26,' : season === 'autumn' ? 'rgba(110,88,67,' : 'rgba(62,107,72,';
    ctx.fillStyle = groundColor + `${0.25 * tod.ambient})`;
    ctx.fillRect(0, groundY, w, h - groundY);

    // Foreground grass blades (big, close)
    const grassColor = season === 'winter' ? '#3A2A1A' : '#2A5A3A';
    for (let i = 0; i < 50; i++) {
      const x = (i / 50) * w;
      const bladeH = 18 + Math.random() * 25;
      const wind = Math.sin(this.windPhase + i * 0.4) * 4;
      ctx.strokeStyle = grassColor;
      ctx.globalAlpha = 0.45 * tod.ambient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.quadraticCurveTo(x + wind * 0.7, groundY - bladeH * 0.5, x + wind * 1.3, groundY - bladeH);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawButterflies(ctx, w, h, tod) {
    if (tod.ambient < 0.3) return;
    ctx.save();
    for (const b of this.butterflies) {
      const wingAngle = Math.sin(b.wingPhase) * 0.6;
      ctx.globalAlpha = 0.5 * tod.ambient;
      ctx.fillStyle = b.color;
      // Left wing
      ctx.beginPath();
      ctx.ellipse(b.x - b.size, b.y, b.size, b.size * 0.6, wingAngle, 0, Math.PI * 2);
      ctx.fill();
      // Right wing
      ctx.beginPath();
      ctx.ellipse(b.x + b.size, b.y, b.size, b.size * 0.6, -wingAngle, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.fillStyle = 'rgba(110,88,67,0.5)';
      ctx.fillRect(b.x - 0.5, b.y - b.size * 0.5, 1, b.size);
    }
    ctx.restore();
  }

  _drawBirds(ctx, w, h, tod) {
    if (tod.ambient < 0.25) return;
    ctx.save();
    ctx.strokeStyle = `rgba(15,61,46,${0.35 * tod.ambient})`;
    ctx.lineWidth = 1.2;
    for (const bird of this.birds) {
      const wingY = Math.sin(bird.wingPhase) * 5 * bird.size;
      const s = bird.size;
      ctx.beginPath();
      ctx.moveTo(bird.x - 6 * s, bird.y + wingY);
      ctx.quadraticCurveTo(bird.x - 2 * s, bird.y - 1, bird.x, bird.y);
      ctx.quadraticCurveTo(bird.x + 2 * s, bird.y - 1, bird.x + 6 * s, bird.y + wingY);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawParticles(ctx, w, h, tod) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 0.35 * tod.ambient;
      if (p.type === 'pollen') {
        ctx.fillStyle = '#E7A95A';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'seed') {
        ctx.fillStyle = '#F5F0E8';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 0.5, p.size, Math.sin(this.time + p.x) * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(245,240,232,0.5)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawFireflies(ctx, w, h, tod) {
    ctx.save();
    for (const f of this.fireflies) {
      if (f.glow <= 0) continue;
      // Outer glow
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 15);
      grad.addColorStop(0, `rgba(231,169,90,${f.glow * 0.4})`);
      grad.addColorStop(0.5, `rgba(231,169,90,${f.glow * 0.1})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 15, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.fillStyle = `rgba(245,240,232,${f.glow * 0.8})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawMouseGlow(ctx, w, h, tod) {
    if (this.mouseX < 0) return;
    const grad = ctx.createRadialGradient(this.mouseX, this.mouseY, 0, this.mouseX, this.mouseY, 80);
    grad.addColorStop(0, `rgba(231,169,90,${0.04 * tod.ambient})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, 80, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawVignette(ctx, w, h, tod) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.85);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, `rgba(10,20,15,${0.35 + (1 - tod.ambient) * 0.35})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  setMouse(x, y) {
    this.mouseX = x;
    this.mouseY = y;
  }
}
