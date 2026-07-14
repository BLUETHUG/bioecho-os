// BioEcho Living World — Realistic Forest Clearing
// Not a game. Not 3D RPG. Just a living environment.

class LivingWorld {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas?.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.time = 0;
    this.running = false;
    this.particles = [];
    this.ripples = [];
    this.mouseX = 0;
    this.mouseY = 0;
    this.trees = [];
    this.grassBlades = [];
    this.clouds = [];
    this.stars = [];
    this.birds = [];
    this.onWorldClick = null;
  }

  async initialize() {
    if (!this.canvas) return false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
    });
    this.canvas.addEventListener('click', (e) => {
      const r = this.canvas.getBoundingClientRect();
      if (this.onWorldClick) this.onWorldClick(e.clientX - r.left, e.clientY - r.top);
    });
    this._generateWorld();
    this._initParticles();
    return true;
  }

  resize() {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this._generateWorld();
  }

  _generateWorld() {
    const w = this.width, h = this.height;
    const groundY = h * 0.62;

    this.trees = [];
    const treeCount = Math.floor(w / 120);
    for (let i = 0; i < treeCount; i++) {
      const x = (i / treeCount) * w + (Math.random() - 0.5) * 60;
      const depth = Math.random();
      const treeH = 80 + Math.random() * 100;
      this.trees.push({
        x, baseY: groundY + depth * 20 - 10,
        height: treeH, width: 30 + Math.random() * 20,
        canopyR: treeH * 0.35 + Math.random() * 20,
        sway: Math.random() * Math.PI * 2,
        depth, leafCount: 5 + Math.floor(Math.random() * 5),
        type: Math.random() > 0.3 ? 'deciduous' : 'conifer'
      });
    }
    this.trees.sort((a, b) => a.depth - b.depth);

    this.grassBlades = [];
    for (let i = 0; i < Math.floor(w / 4); i++) {
      this.grassBlades.push({
        x: Math.random() * w,
        y: groundY + Math.random() * (h - groundY) * 0.3,
        height: 8 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2
      });
    }

    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * w * 1.5 - w * 0.25,
        y: 20 + Math.random() * h * 0.2,
        width: 80 + Math.random() * 120,
        height: 20 + Math.random() * 30,
        speed: 0.1 + Math.random() * 0.15
      });
    }

    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * w, y: Math.random() * h * 0.5,
        size: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      });
    }

    this.birds = [];
    for (let i = 0; i < 3; i++) {
      this.birds.push({
        x: -50 + Math.random() * (w + 100),
        y: h * 0.15 + Math.random() * h * 0.2,
        speed: 0.5 + Math.random() * 1,
        wingPhase: Math.random() * Math.PI * 2,
        active: Math.random() > 0.5
      });
    }
  }

  _initParticles() {
    this.particles = [];
    const season = LDL.currentSeason;
    const time = LDL.currentTime;

    if (season === 'autumn') {
      for (let i = 0; i < 12; i++) {
        this.particles.push({
          type: 'leaf', x: Math.random() * this.width, y: Math.random() * this.height * 0.6,
          size: 3 + Math.random() * 4, speed: 0.15 + Math.random() * 0.3,
          rotation: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 1.5,
          color: ['#8A6A4A', '#E7A95A', '#6E5843', '#3E6B48'][Math.floor(Math.random() * 4)],
          wobble: Math.random() * Math.PI * 2
        });
      }
    } else if (season === 'spring') {
      for (let i = 0; i < 8; i++) {
        this.particles.push({
          type: 'blossom', x: Math.random() * this.width, y: Math.random() * this.height * 0.5,
          size: 2 + Math.random() * 3, speed: 0.1 + Math.random() * 0.2,
          color: ['#D4A0D4', '#E7A95A', '#F5F0E8'][Math.floor(Math.random() * 3)],
          wobble: Math.random() * Math.PI * 2
        });
      }
    }

    if (time === 'evening' || time === 'night') {
      for (let i = 0; i < 15; i++) {
        this.particles.push({
          type: 'firefly', x: Math.random() * this.width,
          y: this.height * 0.3 + Math.random() * this.height * 0.4,
          size: 1.5 + Math.random() * 1.5, speed: 0.08 + Math.random() * 0.15,
          phase: Math.random() * Math.PI * 2, glow: 0.5 + Math.random() * 0.5
        });
      }
    }

    for (let i = 0; i < 20; i++) {
      this.particles.push({
        type: 'pollen', x: Math.random() * this.width, y: Math.random() * this.height,
        size: 0.8 + Math.random(), speed: 0.03 + Math.random() * 0.08,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  start() { this.running = true; this._loop(); }
  stop() { this.running = false; }

  _loop() {
    if (!this.running) return;
    this.time += 0.016;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this._drawSky();
    this._drawClouds();
    this._drawStars();
    this._drawMountains();
    this._drawTreesBack();
    this._drawGround();
    this._drawGrass();
    this._drawTreesFront();
    this._drawWater();
    this._drawParticles();
    this._drawBirds();
    this._drawRipples();
    this._drawFog();
    this._drawMouseGlow();
    requestAnimationFrame(() => this._loop());
  }

  _drawSky() {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    const tod = LDL.timeOfDay[LDL.currentTime];
    const grad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    grad.addColorStop(0, tod.sky);
    grad.addColorStop(0.7, tod.horizon);
    grad.addColorStop(1, LDL.colors.forest);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  _drawClouds() {
    const ctx = this.ctx;
    const tod = LDL.timeOfDay[LDL.currentTime];
    if (LDL.currentTime === 'night') return;
    ctx.globalAlpha = 0.3 + tod.ambient * 0.3;
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed;
      if (cloud.x > this.width + cloud.width) cloud.x = -cloud.width;
      ctx.fillStyle = 'rgba(245,240,232,0.4)';
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloud.x - cloud.width * 0.25, cloud.y + 5, cloud.width * 0.35, cloud.height * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloud.x + cloud.width * 0.25, cloud.y + 3, cloud.width * 0.3, cloud.height * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawStars() {
    if (LDL.currentTime !== 'night' && LDL.currentTime !== 'evening') return;
    const ctx = this.ctx;
    for (const star of this.stars) {
      const flicker = 0.4 + Math.sin(this.time * 1.5 + star.phase) * 0.3;
      ctx.fillStyle = `rgba(217,227,236,${flicker})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    if (LDL.currentTime === 'night') {
      const moonX = this.width * 0.8;
      const moonY = this.height * 0.12;
      const grad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 25);
      grad.addColorStop(0, 'rgba(217,227,236,0.9)');
      grad.addColorStop(0.5, 'rgba(217,227,236,0.3)');
      grad.addColorStop(1, 'rgba(217,227,236,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(moonX - 40, moonY - 40, 80, 80);
      ctx.fillStyle = LDL.colors.moon;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawMountains() {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    ctx.fillStyle = '#0A2A1A';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    for (let x = 0; x <= w; x += 15) {
      const y = h * 0.55 - Math.sin(x * 0.003 + 1) * 50 - Math.sin(x * 0.008) * 25 - Math.sin(x * 0.001) * 30;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    ctx.fillStyle = '#0D3322';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.58);
    for (let x = 0; x <= w; x += 12) {
      const y = h * 0.58 - Math.sin(x * 0.004 + 2) * 35 - Math.sin(x * 0.01) * 15;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
  }

  _drawTreesBack() {
    const ctx = this.ctx;
    for (const tree of this.trees) {
      if (tree.depth > 0.5) continue;
      this._drawTree(tree);
    }
  }

  _drawTreesFront() {
    const ctx = this.ctx;
    for (const tree of this.trees) {
      if (tree.depth <= 0.5) continue;
      this._drawTree(tree);
    }
  }

  _drawTree(tree) {
    const ctx = this.ctx;
    const tod = LDL.timeOfDay[LDL.currentTime];
    const season = LDL.currentSeason;
    const sway = Math.sin(this.time * 0.4 + tree.sway) * LDL.wind.leafSway * tree.depth;
    const leafColor = season === 'winter' ? '#4A3A2A' : season === 'autumn' ? '#8A6A4A' : season === 'spring' ? '#6FA36F' : '#3E6B48';
    const trunkColor = season === 'winter' ? '#3A2A1A' : '#2A1A0A';

    ctx.fillStyle = trunkColor;
    ctx.fillRect(tree.x - 4, tree.baseY - tree.height * 0.45, 8, tree.height * 0.45);

    if (tree.type === 'conifer') {
      for (let i = 0; i < 3; i++) {
        const ly = tree.baseY - tree.height * 0.3 - i * tree.height * 0.2;
        const lw = tree.canopyR * (1 - i * 0.25);
        ctx.fillStyle = leafColor;
        ctx.beginPath();
        ctx.moveTo(tree.x + sway, ly - tree.height * 0.15);
        ctx.lineTo(tree.x - lw + sway * 0.5, ly);
        ctx.lineTo(tree.x + lw + sway * 0.5, ly);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = leafColor;
      ctx.beginPath();
      ctx.arc(tree.x + sway, tree.baseY - tree.height * 0.6, tree.canopyR, 0, Math.PI * 2);
      ctx.fill();
      if (season === 'spring') {
        for (let b = 0; b < tree.leafCount; b++) {
          const bx = tree.x + sway + Math.sin(b * 2.5) * tree.canopyR * 0.6;
          const by = tree.baseY - tree.height * 0.6 + Math.cos(b * 3) * tree.canopyR * 0.5;
          ctx.fillStyle = '#D4A0D4';
          ctx.beginPath();
          ctx.arc(bx, by, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const shadowLen = LDL.light.getShadowLength(this.time);
    ctx.fillStyle = `rgba(0,0,0,${0.05 + (1 - tree.depth) * 0.05})`;
    ctx.beginPath();
    ctx.ellipse(tree.x + tree.canopyR * 0.5, tree.baseY + 5, tree.canopyR * 0.8 * shadowLen, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawGround() {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    const groundY = h * 0.62;
    const season = LDL.currentSeason;
    const groundColor = season === 'winter' ? '#C8D8C8' : season === 'autumn' ? '#2A1A0A' : '#0F2A1A';

    const grad = ctx.createLinearGradient(0, groundY - 10, 0, h);
    grad.addColorStop(0, groundColor);
    grad.addColorStop(0.3, '#0A1A0A');
    grad.addColorStop(1, LDL.colors.shadow);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w; x += 8) {
      const y = groundY + Math.sin(x * 0.015 + this.time * 0.05) * 3 + Math.sin(x * 0.004) * 8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
  }

  _drawGrass() {
    const ctx = this.ctx;
    const season = LDL.currentSeason;
    const grassColor = season === 'winter' ? '#8AA08A' : season === 'autumn' ? '#6A5A3A' : '#3A6A3A';
    ctx.strokeStyle = grassColor;
    ctx.lineWidth = 1.2;
    for (const blade of this.grassBlades) {
      const sway = Math.sin(this.time * 0.8 + blade.phase) * LDL.wind.grassSway;
      ctx.beginPath();
      ctx.moveTo(blade.x, blade.y);
      ctx.quadraticCurveTo(blade.x + sway, blade.y - blade.height * 0.6, blade.x + sway * 1.5, blade.y - blade.height);
      ctx.stroke();
    }
  }

  _drawWater() {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    const waterY = h * 0.78;
    const tod = LDL.timeOfDay[LDL.currentTime];

    ctx.fillStyle = `rgba(95,168,211,${0.15 + tod.ambient * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, waterY);
    for (let x = w * 0.2; x <= w * 0.8; x += 5) {
      const y = waterY + Math.sin(x * 0.02 + this.time * 0.8) * 2 + Math.sin(x * 0.05 + this.time * 1.2) * 1;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w * 0.8, waterY + 30);
    ctx.lineTo(w * 0.2, waterY + 30);
    ctx.fill();

    for (let i = 0; i < 8; i++) {
      const rx = w * 0.3 + Math.sin(this.time * 0.3 + i) * w * 0.15;
      const ry = waterY + 5 + Math.sin(this.time * 0.5 + i * 2) * 3;
      ctx.strokeStyle = `rgba(191,223,246,${0.1 + Math.sin(this.time + i) * 0.05})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 15 + Math.sin(this.time + i) * 5, 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      if (p.type === 'leaf' || p.type === 'blossom') {
        p.y += p.speed;
        p.x += Math.sin(this.time + p.wobble) * 0.4 + LDL.wind.baseSpeed * 0.3;
        p.rotation = (p.rotation || 0) + (p.rotSpeed || 0.5);
        if (p.y > this.height + 10) { p.y = -10; p.x = Math.random() * this.width; }
        if (p.x > this.width + 10) p.x = -10;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation || 0) * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'firefly') {
        p.x += Math.sin(this.time * 0.25 + p.phase) * p.speed;
        p.y += Math.cos(this.time * 0.18 + p.phase) * p.speed * 0.5;
        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < this.height * 0.2) p.y = this.height * 0.7;
        if (p.y > this.height * 0.7) p.y = this.height * 0.2;
        const glow = (Math.sin(this.time * 1.8 + p.phase) + 1) / 2 * p.glow;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
        grad.addColorStop(0, `rgba(231,169,90,${glow})`);
        grad.addColorStop(0.5, `rgba(231,169,90,${glow * 0.3})`);
        grad.addColorStop(1, 'rgba(231,169,90,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x - 12, p.y - 12, 24, 24);
        ctx.fillStyle = `rgba(245,240,232,${glow})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'pollen') {
        p.x += Math.sin(this.time * 0.08 + p.phase) * p.speed;
        p.y += Math.cos(this.time * 0.1 + p.phase) * p.speed;
        ctx.fillStyle = 'rgba(231,169,90,0.2)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawBirds() {
    const ctx = this.ctx;
    if (LDL.currentTime === 'night') return;
    for (const bird of this.birds) {
      if (!bird.active) continue;
      bird.x += bird.speed;
      bird.wingPhase += 0.15;
      if (bird.x > this.width + 60) { bird.x = -60; bird.y = this.height * 0.1 + Math.random() * this.height * 0.2; }
      const wingY = Math.sin(bird.wingPhase) * 4;
      ctx.strokeStyle = `rgba(15,61,46,${0.4 + bird.y / this.height * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bird.x - 8, bird.y + wingY);
      ctx.quadraticCurveTo(bird.x - 3, bird.y - 2, bird.x, bird.y);
      ctx.quadraticCurveTo(bird.x + 3, bird.y - 2, bird.x + 8, bird.y + wingY);
      ctx.stroke();
    }
  }

  _drawRipples() {
    const ctx = this.ctx;
    this.ripples = this.ripples.filter(r => {
      r.radius += 1.5;
      r.alpha = Math.max(0, 1 - r.radius / r.maxRadius);
      if (r.alpha <= 0) return false;
      ctx.strokeStyle = `rgba(95,168,211,${r.alpha * 0.4})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    });
  }

  _drawFog() {
    const ctx = this.ctx;
    const tod = LDL.timeOfDay[LDL.currentTime];
    if (!tod) return;
    const fogAlpha = (LDL.currentTime === 'dawn' || LDL.currentTime === 'evening') ? 0.08 : 0.02;
    ctx.fillStyle = `rgba(191,223,246,${fogAlpha})`;
    ctx.fillRect(0, this.height * 0.5, this.width, this.height * 0.5);
  }

  _drawMouseGlow() {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(this.mouseX, this.mouseY, 0, this.mouseX, this.mouseY, 60);
    grad.addColorStop(0, 'rgba(111,163,111,0.06)');
    grad.addColorStop(1, 'rgba(111,163,111,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(this.mouseX - 60, this.mouseY - 60, 120, 120);
  }

  addRipple(x, y) { this.ripples.push({ x, y, radius: 5, maxRadius: 50, alpha: 1 }); }
  getStats() { return { trees: this.trees.length, particles: this.particles.length, birds: this.birds.filter(b => b.active).length }; }
}
