// BioEcho Living World — Persistent Ecosystem Canvas
// One world. No pages. The camera moves, the world never disappears.

class LivingWorld {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas?.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.time = 0;
    this.particles = [];
    this.organisms = [];
    this.cameraX = 0;
    this.cameraY = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.zoom = 1;
    this.layers = [];
    this.running = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.frameCount = 0;
    this.fps = 0;
    this.lastFpsTime = 0;
    this.fpsCount = 0;
  }

  async initialize() {
    if (!this.canvas) return false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._onWorldClick(x, y);
    });
    this._initLayers();
    this._initParticles();
    return true;
  }

  resize() {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  _initLayers() {
    this.layers = [
      { name: 'sky', draw: (ctx, w, h, t) => this._drawSky(ctx, w, h, t) },
      { name: 'mountains', draw: (ctx, w, h, t) => this._drawMountains(ctx, w, h, t) },
      { name: 'trees', draw: (ctx, w, h, t) => this._drawTrees(ctx, w, h, t) },
      { name: 'ground', draw: (ctx, w, h, t) => this._drawGround(ctx, w, h, t) },
      { name: 'particles', draw: (ctx, w, h, t) => this._drawParticles(ctx, w, h, t) },
      { name: 'ui', draw: (ctx, w, h, t) => {} }
    ];
  }

  _initParticles() {
    this.particles = [];
    const palette = LIL.getPalette();
    const season = LIL.currentSeason;

    if (season === 'autumn' || season === 'spring') {
      for (let i = 0; i < LIL.particles.maxLeaves; i++) {
        this.particles.push({
          type: 'leaf', x: Math.random() * this.width, y: Math.random() * this.height * 0.7,
          size: 3 + Math.random() * 5, speed: 0.2 + Math.random() * 0.5,
          rotation: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 2,
          color: season === 'autumn' ? ['#f59e0b', '#ef4444', '#dc2626', '#f97316'][Math.floor(Math.random() * 4)] : palette.particle,
          wobble: Math.random() * Math.PI * 2
        });
      }
    }

    if (LIL.currentTime === 'night' || LIL.currentTime === 'evening') {
      for (let i = 0; i < LIL.particles.maxFireflies; i++) {
        this.particles.push({
          type: 'firefly', x: Math.random() * this.width, y: this.height * 0.3 + Math.random() * this.height * 0.5,
          size: 2 + Math.random() * 2, speed: 0.1 + Math.random() * 0.3,
          phase: Math.random() * Math.PI * 2, glowIntensity: 0.5 + Math.random() * 0.5
        });
      }
    }

    if (LIL.currentSeason === 'winter') {
      for (let i = 0; i < LIL.particles.maxSnow; i++) {
        this.particles.push({
          type: 'snow', x: Math.random() * this.width, y: -10 + Math.random() * this.height,
          size: 1 + Math.random() * 3, speed: 0.3 + Math.random() * 0.7,
          wobble: Math.random() * Math.PI * 2
        });
      }
    }

    for (let i = 0; i < LIL.particles.maxPollen; i++) {
      this.particles.push({
        type: 'pollen', x: Math.random() * this.width, y: Math.random() * this.height,
        size: 1 + Math.random() * 1.5, speed: 0.05 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  start() {
    this.running = true;
    this._loop();
  }

  stop() { this.running = false; }

  _loop() {
    if (!this.running) return;
    this.time += 0.016;
    this.frameCount++;
    this.fpsCount++;
    if (performance.now() - this.lastFpsTime > 1000) {
      this.fps = this.fpsCount;
      this.fpsCount = 0;
      this.lastFpsTime = performance.now();
    }

    this.cameraX += (this.targetX - this.cameraX) * 0.02;
    this.cameraY += (this.targetY - this.cameraY) * 0.02;

    this.ctx.clearRect(0, 0, this.width, this.height);
    for (const layer of this.layers) {
      if (layer.name !== 'ui') layer.draw(this.ctx, this.width, this.height, this.time);
    }

    this._updateParticles();
    requestAnimationFrame(() => this._loop());
  }

  _drawSky(ctx, w, h, t) {
    const timePal = LIL.getTimePalette();
    const seasonPal = LIL.getPalette();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, timePal.sky);
    grad.addColorStop(0.6, timePal.horizon);
    grad.addColorStop(1, seasonPal.bg);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (LIL.currentTime === 'night') {
      for (let i = 0; i < 50; i++) {
        const sx = (i * 137.5 + t * 0.1) % w;
        const sy = (i * 73.7) % (h * 0.5);
        const flicker = 0.3 + Math.sin(t * 2 + i) * 0.3;
        ctx.fillStyle = `rgba(255,255,255,${flicker})`;
        ctx.fillRect(sx, sy, 1, 1);
      }
    }
  }

  _drawMountains(ctx, w, h, t) {
    const seasonPal = LIL.getPalette();
    ctx.fillStyle = seasonPal.bg;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.6);
    for (let x = 0; x <= w; x += 20) {
      const y = h * 0.6 - Math.sin(x * 0.005 + 1) * 60 - Math.sin(x * 0.01) * 30;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
  }

  _drawTrees(ctx, w, h, t) {
    const palette = LIL.getPalette();
    const treePositions = [
      { x: w * 0.1, h: 120 }, { x: w * 0.25, h: 150 }, { x: w * 0.4, h: 100 },
      { x: w * 0.55, h: 140 }, { x: w * 0.7, h: 110 }, { x: w * 0.85, h: 130 },
      { x: w * 0.15, h: 80 }, { x: w * 0.6, h: 90 }, { x: w * 0.9, h: 100 }
    ];
    const groundY = h * 0.65;

    for (const tree of treePositions) {
      const sway = Math.sin(t * 0.5 + tree.x * 0.01) * 3 * LIL.wind.speed;
      ctx.fillStyle = '#3d2914';
      ctx.fillRect(tree.x - 4, groundY - tree.h * 0.4, 8, tree.h * 0.4);
      ctx.beginPath();
      ctx.arc(tree.x + sway, groundY - tree.h * 0.6, tree.h * 0.35, 0, Math.PI * 2);
      const green = LIL.currentSeason === 'winter' ? '#4a6741' : LIL.currentSeason === 'autumn' ? '#c2703e' : palette.primary;
      ctx.fillStyle = green;
      ctx.fill();
      if (LIL.currentSeason === 'spring') {
        for (let b = 0; b < 5; b++) {
          const bx = tree.x + sway + (Math.sin(b * 2.5) * tree.h * 0.25);
          const by = groundY - tree.h * 0.6 + (Math.cos(b * 3) * tree.h * 0.2);
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(bx, by, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  _drawGround(ctx, w, h, t) {
    const palette = LIL.getPalette();
    const groundY = h * 0.65;
    const grad = ctx.createLinearGradient(0, groundY, 0, h);
    grad.addColorStop(0, LIL.currentSeason === 'winter' ? '#e8f0e8' : '#1a3a1a');
    grad.addColorStop(1, palette.bg);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= w; x += 10) {
      const y = groundY + Math.sin(x * 0.02 + t * 0.1) * 5 + Math.sin(x * 0.005) * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    for (let i = 0; i < 20; i++) {
      const gx = (i * 50 + Math.sin(t * 0.2 + i) * 2) % w;
      const gy = groundY + 20 + Math.sin(gx * 0.02) * 10 + i * 3;
      const sway = Math.sin(t * 0.8 + gx * 0.05) * 2;
      ctx.strokeStyle = palette.primary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + sway, gy - 15, gx + sway * 1.5, gy - 25);
      ctx.stroke();
    }
  }

  _drawParticles(ctx, w, h, t) {
    for (const p of this.particles) {
      if (p.type === 'leaf') {
        p.y += p.speed;
        p.x += Math.sin(t + p.wobble) * 0.5 + LIL.wind.speed * 0.5;
        p.rotation += p.rotSpeed;
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
        if (p.x > w + 10) p.x = -10;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'firefly') {
        p.x += Math.sin(t * 0.3 + p.phase) * p.speed;
        p.y += Math.cos(t * 0.2 + p.phase) * p.speed * 0.5;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < h * 0.2) p.y = h * 0.8;
        if (p.y > h * 0.8) p.y = h * 0.2;
        const glow = (Math.sin(t * 2 + p.phase) + 1) / 2 * p.glowIntensity;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 8);
        grad.addColorStop(0, `rgba(250,204,21,${glow})`);
        grad.addColorStop(0.5, `rgba(250,204,21,${glow * 0.3})`);
        grad.addColorStop(1, 'rgba(250,204,21,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x - p.size * 8, p.y - p.size * 8, p.size * 16, p.size * 16);
        ctx.fillStyle = `rgba(255,255,200,${glow})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'snow') {
        p.y += p.speed;
        p.x += Math.sin(t * 0.5 + p.wobble) * 0.3;
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'pollen') {
        p.x += Math.sin(t * 0.1 + p.phase) * p.speed;
        p.y += Math.cos(t * 0.15 + p.phase) * p.speed;
        if (p.x < 0 || p.x > w) p.phase += Math.PI;
        if (p.y < 0 || p.y > h) p.phase += Math.PI / 2;
        ctx.fillStyle = 'rgba(250,204,21,0.3)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _updateParticles() {
    // handled in draw
  }

  _onWorldClick(x, y) {
    if (this.onWorldClick) this.onWorldClick(x, y, this.cameraX + x, this.cameraY + y);
  }

  moveTo(x, y) { this.targetX = x - this.width / 2; this.targetY = y - this.height / 2; }
  getCameraCenter() { return { x: this.cameraX + this.width / 2, y: this.cameraY + this.height / 2 }; }
}
