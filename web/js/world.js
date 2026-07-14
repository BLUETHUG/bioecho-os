// BioEcho World v3 — Multi-depth forest, sun rays, volumetric fog, stream with ripples

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
    this.streamRipples = [];
    this.sunAngle = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.clouds = [];
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
    for (let depth = 0; depth < 4; depth++) {
      const count = [8, 12, 15, 10][depth];
      for (let i = 0; i < count; i++) {
        this.trees.push({
          x: Math.random() * this.width,
          depth,
          height: (80 - depth * 15) + Math.random() * (60 - depth * 10),
          width: (12 - depth * 2) + Math.random() * (8 - depth),
          canopyR: (20 - depth * 3) + Math.random() * (15 - depth * 2),
          sway: Math.random() * Math.PI * 2,
          type: Math.random() > 0.3 ? 'deciduous' : 'conifer'
        });
      }
    }
    this.trees.sort((a, b) => a.depth - b.depth);

    this.grass = [];
    for (let i = 0; i < 300; i++) {
      this.grass.push({
        x: Math.random() * this.width,
        h: 8 + Math.random() * 15,
        phase: Math.random() * Math.PI * 2,
        depth: Math.random()
      });
    }

    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: Math.random() * this.width * 1.5 - this.width * 0.25,
        y: 20 + Math.random() * 80,
        w: 60 + Math.random() * 100,
        h: 20 + Math.random() * 30,
        speed: 0.1 + Math.random() * 0.2,
        opacity: 0.15 + Math.random() * 0.15
      });
    }

    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.4,
        r: 0.5 + Math.random() * 1.5,
        twinkle: Math.random() * Math.PI * 2
      });
    }

    this.birds = [];
    for (let i = 0; i < 4; i++) {
      this.birds.push({
        x: Math.random() * this.width,
        y: 50 + Math.random() * 150,
        speed: 0.5 + Math.random() * 0.8,
        wingPhase: Math.random() * Math.PI * 2,
        wingSpeed: 3 + Math.random() * 2
      });
    }
  }

  update(dt, timeOfDay, season) {
    this.time += dt;
    this.windPhase += 0.015;
    const tod = LDL.timeOfDay[timeOfDay] || LDL.timeOfDay.noon;

    this.sunAngle = (timeOfDay / 24) * Math.PI;

    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * (1 + this.windPhase * 0.1);
      if (cloud.x > this.width + 100) cloud.x = -cloud.w;
    }

    for (const bird of this.birds) {
      bird.x += bird.speed;
      bird.wingPhase += dt * bird.wingSpeed;
      if (bird.x > this.width + 30) {
        bird.x = -30;
        bird.y = 50 + Math.random() * 150;
      }
    }

    if (Math.random() < 0.003) {
      this.streamRipples.push({
        x: this.width * 0.6 + Math.random() * this.width * 0.35,
        y: this.height * 0.78 + Math.random() * 10,
        r: 0, maxR: 8 + Math.random() * 12, age: 0
      });
    }
    this.streamRipples = this.streamRipples.filter(r => {
      r.age += dt;
      r.r = r.maxR * Math.min(1, r.age / 1.5);
      return r.age < 1.5;
    });

    if (Math.random() < 0.01) {
      this.particles.push({
        x: Math.random() * this.width,
        y: this.height * 0.2 + Math.random() * this.height * 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1 + Math.random() * 0.2,
        life: 1,
        type: Math.random() > 0.5 ? 'pollen' : 'seed'
      });
    }
    this.particles = this.particles.filter(p => {
      p.x += p.vx + Math.sin(this.windPhase + p.y * 0.01) * 0.2;
      p.y += p.vy;
      p.life -= 0.003;
      return p.life > 0;
    });
  }

  render(timeOfDay, season) {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.width;
    const h = this.height;
    const tod = LDL.timeOfDay[timeOfDay] || LDL.timeOfDay.noon;

    ctx.clearRect(0, 0, w, h);

    this._drawSky(ctx, w, h, tod, timeOfDay);
    this._drawStars(ctx, w, h, tod);
    this._drawSun(ctx, w, h, tod, timeOfDay);
    this._drawClouds(ctx, w, h, tod);
    this._drawSunRays(ctx, w, h, tod, timeOfDay);
    this._drawDistantHills(ctx, w, h, tod, season);
    this._drawTrees(ctx, w, h, tod, season, 0);
    this._drawStream(ctx, w, h, tod, timeOfDay);
    this._drawTrees(ctx, w, h, tod, season, 1);
    this._drawGrass(ctx, w, h, tod, season, 1);
    this._drawTrees(ctx, w, h, tod, season, 2);
    this._drawFog(ctx, w, h, tod, timeOfDay);
    this._drawGrass(ctx, w, h, tod, season, 2);
    this._drawParticles(ctx, w, h, tod);
    this._drawBirds(ctx, w, h, tod);
    this._drawStreamRipples(ctx, w, h, tod);
    this._drawTrees(ctx, w, h, tod, season, 3);
    this._drawForegroundGrass(ctx, w, h, tod, season);
    this._drawVignette(ctx, w, h, tod);
  }

  _drawSky(ctx, w, h, tod, hour) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, tod.skyTop);
    grad.addColorStop(0.4, tod.skyMid);
    grad.addColorStop(1, tod.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  _drawStars(ctx, w, h, tod) {
    if (tod.ambient > 0.5) return;
    ctx.save();
    const alpha = Math.max(0, (0.5 - tod.ambient) * 2);
    for (const star of this.stars) {
      const twinkle = Math.sin(this.time * 2 + star.twinkle) * 0.3 + 0.7;
      ctx.globalAlpha = alpha * twinkle * 0.6;
      ctx.fillStyle = '#F5F0E8';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawSun(ctx, w, h, tod, hour) {
    if (tod.ambient < 0.2) return;
    const sunX = w * 0.5 + Math.cos(this.sunAngle) * w * 0.3;
    const sunY = h * 0.1 + Math.sin(this.sunAngle) * h * -0.2;
    const r = 30 + tod.ambient * 10;
    ctx.save();
    const grad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, r * 3);
    grad.addColorStop(0, `rgba(231,169,90,${0.3 * tod.ambient})`);
    grad.addColorStop(0.5, `rgba(231,169,90,${0.1 * tod.ambient})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(sunX - r * 3, sunY - r * 3, r * 6, r * 6);
    ctx.globalAlpha = tod.ambient * 0.8;
    ctx.fillStyle = '#E7A95A';
    ctx.beginPath();
    ctx.arc(sunX, sunY, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawSunRays(ctx, w, h, tod, hour) {
    if (tod.ambient < 0.3) return;
    const sunX = w * 0.5 + Math.cos(this.sunAngle) * w * 0.3;
    const sunY = h * 0.1 + Math.sin(this.sunAngle) * h * -0.2;
    ctx.save();
    ctx.globalAlpha = 0.02 * tod.ambient;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 0.4 + 0.3;
      const len = 300 + Math.sin(this.time * 0.2 + i * 0.5) * 40;
      const spread = 15 + Math.sin(this.time * 0.3 + i) * 5;
      ctx.fillStyle = 'rgba(231,169,90,0.15)';
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(angle - 0.02) * len, sunY + Math.sin(angle - 0.02) * len);
      ctx.lineTo(sunX + Math.cos(angle + 0.02) * len + spread, sunY + Math.sin(angle + 0.02) * len + spread);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _drawClouds(ctx, w, h, tod) {
    ctx.save();
    for (const cloud of this.clouds) {
      ctx.globalAlpha = cloud.opacity * (tod.ambient > 0.3 ? 1 : 0.3);
      const tint = tod.ambient > 0.6 ? 'rgba(245,240,232,' : 'rgba(191,223,246,';
      ctx.fillStyle = tint + '0.5)';
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, cloud.w * 0.5, cloud.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloud.x - cloud.w * 0.2, cloud.y + 5, cloud.w * 0.3, cloud.h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloud.x + cloud.w * 0.25, cloud.y + 3, cloud.w * 0.35, cloud.h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawDistantHills(ctx, w, h, tod, season) {
    const hillColor = season === 'winter' ? 'rgba(74,58,42,' : 'rgba(15,61,46,';
    ctx.fillStyle = hillColor + `${0.15 * tod.ambient})`;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.6);
    for (let x = 0; x <= w; x += 20) {
      ctx.lineTo(x, h * 0.55 + Math.sin(x * 0.005) * 20 + Math.sin(x * 0.012) * 10);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
    ctx.fillStyle = hillColor + `${0.25 * tod.ambient})`;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.65);
    for (let x = 0; x <= w; x += 15) {
      ctx.lineTo(x, h * 0.62 + Math.sin(x * 0.008 + 1) * 15 + Math.sin(x * 0.018) * 8);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
  }

  _drawTrees(ctx, w, h, tod, season, targetDepth) {
    const palette = {
      spring: ['#3E6B48', '#6FA36F', '#8BC48B'],
      summer: ['#2A5A3A', '#3E6B48', '#4A7A4A'],
      autumn: ['#8A6A4A', '#6E5843', '#A07848'],
      winter: ['#4A3A2A', '#3A2A1A', '#2A1A0A']
    };
    const colors = palette[season] || palette.spring;
    const groundY = h * 0.68;

    for (const tree of this.trees) {
      if (tree.depth !== targetDepth) continue;
      const depthAlpha = [0.4, 0.6, 0.8, 1.0][tree.depth];
      const sway = Math.sin(this.windPhase + tree.sway) * (3 - tree.depth * 0.5);
      const baseY = groundY + (3 - tree.depth) * 15;
      const trunkColor = `rgba(42,26,10,${depthAlpha * tod.ambient})`;

      ctx.fillStyle = trunkColor;
      ctx.fillRect(tree.x - tree.width / 2 + sway * 0.3, baseY - tree.height, tree.width, tree.height);

      if (tree.type === 'deciduous') {
        const canopyColor = colors[Math.floor(tree.swarrow || 0) % colors.length];
        ctx.fillStyle = canopyColor;
        ctx.globalAlpha = depthAlpha * tod.ambient * 0.7;
        ctx.beginPath();
        ctx.arc(tree.x + sway, baseY - tree.height - tree.canopyR * 0.5, tree.canopyR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = `rgba(42,90,58,${depthAlpha * tod.ambient * 0.6})`;
        ctx.beginPath();
        ctx.moveTo(tree.x + sway, baseY - tree.height - 20);
        ctx.lineTo(tree.x - tree.canopyR * 0.7 + sway * 0.5, baseY - tree.height * 0.3);
        ctx.lineTo(tree.x + tree.canopyR * 0.7 + sway * 0.5, baseY - tree.height * 0.3);
        ctx.fill();
      }
    }
  }

  _drawStream(ctx, w, h, tod, hour) {
    const streamY = h * 0.77;
    const streamH = h * 0.06;
    const grad = ctx.createLinearGradient(0, streamY, 0, streamY + streamH);
    const reflectivity = hour > 6 && hour < 18 ? 0.4 : 0.2;
    grad.addColorStop(0, `rgba(95,168,211,${reflectivity * tod.ambient})`);
    grad.addColorStop(0.5, `rgba(95,168,211,${reflectivity * 1.5 * tod.ambient})`);
    grad.addColorStop(1, `rgba(95,168,211,${reflectivity * 0.5 * tod.ambient})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, streamY);
    for (let x = 0; x <= w; x += 8) {
      const wave = Math.sin(x * 0.015 + this.time * 0.8) * 2 + Math.sin(x * 0.03 + this.time * 1.2) * 1;
      ctx.lineTo(x, streamY + wave);
    }
    for (let x = w; x >= 0; x -= 8) {
      const wave = Math.sin(x * 0.015 + this.time * 0.8 + 1) * 1.5;
      ctx.lineTo(x, streamY + streamH + wave);
    }
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 5; i++) {
      const lx = (i / 5) * w + Math.sin(this.time + i) * 20;
      ctx.strokeStyle = 'rgba(245,240,232,0.5)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(lx, streamY + 2);
      ctx.lineTo(lx + 15, streamY + 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawStreamRipples(ctx, w, h, tod) {
    ctx.save();
    for (const ripple of this.streamRipples) {
      const alpha = (1 - ripple.r / ripple.maxR) * 0.3 * tod.ambient;
      ctx.strokeStyle = `rgba(191,223,246,${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(ripple.x, ripple.y, ripple.r, ripple.r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawGrass(ctx, w, h, tod, season, depth) {
    const groundY = h * 0.68 + (2 - depth) * 15;
    const grassColors = {
      spring: '#6FA36F', summer: '#4A7A4A', autumn: '#8A6A4A', winter: '#5A4A3A'
    };
    const color = grassColors[season] || grassColors.spring;

    for (const blade of this.grass) {
      if (Math.abs(blade.depth - (2 - depth) / 3) > 0.2) continue;
      const wind = Math.sin(this.windPhase + blade.phase) * 4;
      const alpha = [0.3, 0.5, 0.7][depth] * tod.ambient;
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = depth === 0 ? 0.5 : depth === 1 ? 1 : 1.5;
      ctx.beginPath();
      ctx.moveTo(blade.x, groundY);
      ctx.quadraticCurveTo(blade.x + wind, groundY - blade.h * 0.6, blade.x + wind * 1.5, groundY - blade.h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawForegroundGrass(ctx, w, h, tod, season) {
    const groundY = h * 0.88;
    const grassColors = { spring: '#3E6B48', summer: '#2A5A3A', autumn: '#6E5843', winter: '#3A2A1A' };
    const color = grassColors[season] || grassColors.spring;
    ctx.fillStyle = `rgba(62,107,72,${0.2 * tod.ambient})`;
    ctx.fillRect(0, groundY, w, h - groundY);
    for (let i = 0; i < 40; i++) {
      const x = (i / 40) * w;
      const bladeH = 15 + Math.random() * 20;
      const wind = Math.sin(this.windPhase + i * 0.5) * 3;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.5 * tod.ambient;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.quadraticCurveTo(x + wind, groundY - bladeH * 0.6, x + wind * 1.5, groundY - bladeH);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawFog(ctx, w, h, tod, hour) {
    const fogIntensity = hour < 7 ? 0.3 : hour > 18 ? 0.2 : 0.05;
    if (fogIntensity <= 0) return;
    const grad = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.8);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, `rgba(191,223,246,${fogIntensity * tod.ambient})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, h * 0.5, w, h * 0.3);
  }

  _drawParticles(ctx, w, h, tod) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 0.4 * tod.ambient;
      ctx.fillStyle = p.type === 'pollen' ? '#E7A95A' : '#F5F0E8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.type === 'pollen' ? 1.5 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawBirds(ctx, w, h, tod) {
    if (tod.ambient < 0.3) return;
    ctx.strokeStyle = `rgba(15,61,46,${0.4 * tod.ambient})`;
    ctx.lineWidth = 1.2;
    for (const bird of this.birds) {
      const wingY = Math.sin(bird.wingPhase) * 4;
      ctx.beginPath();
      ctx.moveTo(bird.x - 5, bird.y + wingY);
      ctx.quadraticCurveTo(bird.x - 1, bird.y - 1, bird.x, bird.y);
      ctx.quadraticCurveTo(bird.x + 1, bird.y - 1, bird.x + 5, bird.y + wingY);
      ctx.stroke();
    }
  }

  _drawVignette(ctx, w, h, tod) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, `rgba(15,30,20,${0.3 + (1 - tod.ambient) * 0.3})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  setMouse(x, y) {
    this.mouseX = x;
    this.mouseY = y;
  }
}
