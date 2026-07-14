// BioEcho Landing v4 — The Journey: Seed → Root → Crack → Sapling → Forest → Reveal

class LandingSequence {
  constructor(seedCanvas, worldCanvas) {
    this.seed = seedCanvas;
    this.seedCtx = seedCanvas?.getContext('2d');
    this.world = worldCanvas;
    this.worldCtx = worldCanvas?.getContext('2d');
    this.phase = 'pulse'; // pulse → root → crack → sapling → zoomout → forest → done
    this.t = 0;
    this.done = false;
    this.onDone = null;

    // Pulse state
    this.pulseTime = 0;

    // Root state
    this.roots = [];

    // Crack state
    this.cracks = [];

    // Sapling state
    this.saplingH = 0;
    this.leaves = [];

    // Zoom state
    this.zoom = 1;
    this.offsetY = 0;

    // Forest state
    this.forestTrees = [];
    this.forestGrass = [];
    this.forestClouds = [];
    this.forestBirds = [];
    this.forestParticles = [];
    this.forestTime = 0;
  }

  start(callback) {
    this.onDone = callback;
    this.phase = 'pulse';
    this.t = 0;
    this._initRoots();
    this._initCracks();
    this._initForest();
    this._loop();
  }

  _initRoots() {
    this.roots = [];
    const angles = [-0.8, -0.4, -0.15, 0.15, 0.4, 0.8];
    for (const a of angles) {
      this.roots.push({
        angle: a, len: 20 + Math.random() * 30,
        curve: (Math.random() - 0.5) * 15,
        progress: 0
      });
    }
  }

  _initCracks() {
    this.cracks = [];
    for (let i = 0; i < 6; i++) {
      this.cracks.push({
        x: (Math.random() - 0.5) * 80,
        y: (Math.random() - 0.5) * 20,
        len: 15 + Math.random() * 25,
        angle: (Math.random() - 0.5) * 0.8,
        progress: 0
      });
    }
  }

  _initForest() {
    const W = this.world.width, H = this.world.height;
    this.forestTrees = Array.from({ length: 30 }, () => ({
      x: Math.random() * W, h: 40 + Math.random() * 80,
      w: 4 + Math.random() * 6, canopyR: 12 + Math.random() * 20,
      sway: Math.random() * 6.28
    }));
    this.forestGrass = Array.from({ length: 200 }, () => ({
      x: Math.random() * W, h: 4 + Math.random() * 12,
      phase: Math.random() * 6.28
    }));
    this.forestClouds = Array.from({ length: 5 }, () => ({
      x: Math.random() * W, y: 20 + Math.random() * 60,
      w: 50 + Math.random() * 80, speed: 0.02 + Math.random() * 0.04
    }));
    this.forestBirds = Array.from({ length: 4 }, () => ({
      x: Math.random() * W, y: 20 + Math.random() * 80,
      speed: 0.5 + Math.random() * 0.5, wing: Math.random() * 6.28
    }));
  }

  _loop() {
    if (this.done) return;

    const dt = 0.016;
    this.t += dt;

    if (this.phase === 'pulse') this._updatePulse(dt);
    else if (this.phase === 'root') this._updateRoot(dt);
    else if (this.phase === 'crack') this._updateCrack(dt);
    else if (this.phase === 'sapling') this._updateSapling(dt);
    else if (this.phase === 'zoomout') this._updateZoom(dt);
    else if (this.phase === 'forest') this._updateForest(dt);

    requestAnimationFrame(() => this._loop());
  }

  _updatePulse(dt) {
    this.pulseTime += dt;
    this._drawPulse();

    if (this.pulseTime > 3) {
      this.phase = 'root';
      this.t = 0;
    }
  }

  _drawPulse() {
    const ctx = this.seedCtx;
    const W = 200, H = 200;
    const cx = W / 2, cy = H / 2 + 10;
    ctx.clearRect(0, 0, W, H);

    const pulse = Math.sin(this.pulseTime * 1.5) * 0.15 + 1;
    const breathe = Math.sin(this.pulseTime * 0.8) * 0.05 + 1;

    // Outer glow — breathing
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 65 * breathe);
    g.addColorStop(0, 'rgba(111,163,111,0.1)');
    g.addColorStop(0.5, 'rgba(111,163,111,0.04)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 65 * breathe, 0, 6.28); ctx.fill();

    // Seed body
    ctx.fillStyle = '#8A6A4A';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 11 * pulse, 16 * pulse, 0, 0, 6.28);
    ctx.fill();

    // Seed highlight
    ctx.fillStyle = 'rgba(245,240,232,0.12)';
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy - 3, 4 * pulse, 7 * pulse, -0.2, 0, 6.28);
    ctx.fill();

    // Tiny sprout
    ctx.strokeStyle = 'rgba(111,163,111,0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 16 * pulse);
    ctx.quadraticCurveTo(cx + 3, cy - 24 * pulse, cx, cy - 32 * pulse);
    ctx.stroke();

    // Leaf
    ctx.fillStyle = 'rgba(111,163,111,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy - 27 * pulse, 3.5 * pulse, 1.8 * pulse, 0.3, 0, 6.28);
    ctx.fill();
  }

  _updateRoot(dt) {
    this.t += dt * 0.8;
    const progress = Math.min(1, this.t / 2);

    this._drawPulse();

    const ctx = this.seedCtx;
    const cx = 100, cy = 110;

    // Draw roots growing
    ctx.strokeStyle = 'rgba(110,88,67,0.5)';
    ctx.lineWidth = 1.5;
    for (const root of this.roots) {
      root.progress = progress;
      const len = root.len * progress;
      const endX = cx + Math.sin(root.angle) * len;
      const endY = cy + Math.cos(root.angle) * len * 0.5 + 5;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 12);
      ctx.quadraticCurveTo(
        cx + Math.sin(root.angle) * len * 0.4 + root.curve * 0.3,
        cy + 12 + len * 0.3,
        endX, endY
      );
      ctx.stroke();
    }

    if (progress >= 1) {
      this.phase = 'crack';
      this.t = 0;
    }
  }

  _updateCrack(dt) {
    this.t += dt;
    const progress = Math.min(1, this.t / 1.5);

    this._drawPulse();

    // Draw roots (static)
    const ctx = this.seedCtx;
    const cx = 100, cy = 110;
    ctx.strokeStyle = 'rgba(110,88,67,0.5)';
    ctx.lineWidth = 1.5;
    for (const root of this.roots) {
      const len = root.len;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 12);
      ctx.quadraticCurveTo(
        cx + Math.sin(root.angle) * len * 0.4 + root.curve * 0.3,
        cy + 12 + len * 0.3,
        cx + Math.sin(root.angle) * len,
        cy + 12 + Math.cos(root.angle) * len * 0.5 + 5
      );
      ctx.stroke();
    }

    // Ground cracks
    ctx.strokeStyle = `rgba(138,106,74,${progress * 0.6})`;
    ctx.lineWidth = 1.5;
    for (const crack of this.cracks) {
      crack.progress = progress;
      const len = crack.len * progress;
      ctx.beginPath();
      ctx.moveTo(cx + crack.x, cy + 18);
      ctx.lineTo(
        cx + crack.x + Math.cos(crack.angle) * len,
        cy + 18 + Math.sin(crack.angle) * len
      );
      ctx.stroke();
    }

    // Ground lifts slightly
    if (progress > 0.5) {
      const lift = (progress - 0.5) * 2 * 3;
      ctx.fillStyle = `rgba(138,106,74,${(progress - 0.5) * 0.3})`;
      ctx.fillRect(cx - 30, cy + 15 - lift, 60, 5);
    }

    if (progress >= 1) {
      this.phase = 'sapling';
      this.t = 0;
    }
  }

  _updateSapling(dt) {
    this.t += dt;
    const progress = Math.min(1, this.t / 2.5);

    // Fade out seed
    const ctx = this.seedCtx;
    ctx.clearRect(0, 0, 200, 200);

    // Ground
    ctx.fillStyle = 'rgba(138,106,74,0.3)';
    ctx.fillRect(0, 130, 200, 70);

    // Sapling trunk grows
    this.saplingH = 60 * progress;
    const cx = 100, baseY = 128;

    ctx.strokeStyle = '#2A1A0A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.lineTo(cx, baseY - this.saplingH);
    ctx.stroke();

    // Leaves grow
    if (progress > 0.3) {
      const leafP = (progress - 0.3) / 0.7;

      // Left branch + leaf
      ctx.strokeStyle = 'rgba(62,107,72,0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, baseY - this.saplingH * 0.6);
      ctx.quadraticCurveTo(cx - 12 * leafP, baseY - this.saplingH * 0.65, cx - 18 * leafP, baseY - this.saplingH * 0.7);
      ctx.stroke();

      ctx.fillStyle = 'rgba(111,163,111,0.25)';
      ctx.beginPath();
      ctx.ellipse(cx - 16 * leafP, baseY - this.saplingH * 0.68, 7 * leafP, 3.5 * leafP, -0.3, 0, 6.28);
      ctx.fill();

      // Right branch + leaf
      ctx.strokeStyle = 'rgba(62,107,72,0.6)';
      ctx.beginPath();
      ctx.moveTo(cx, baseY - this.saplingH * 0.75);
      ctx.quadraticCurveTo(cx + 10 * leafP, baseY - this.saplingH * 0.78, cx + 16 * leafP, baseY - this.saplingH * 0.82);
      ctx.stroke();

      ctx.fillStyle = 'rgba(111,163,111,0.25)';
      ctx.beginPath();
      ctx.ellipse(cx + 14 * leafP, baseY - this.saplingH * 0.8, 6 * leafP, 3 * leafP, 0.3, 0, 6.28);
      ctx.fill();

      // Top leaf cluster
      if (progress > 0.6) {
        const topP = (progress - 0.6) / 0.4;
        ctx.fillStyle = `rgba(111,163,111,${0.2 * topP})`;
        ctx.beginPath();
        ctx.arc(cx, baseY - this.saplingH - 5, 8 * topP, 0, 6.28);
        ctx.fill();
      }
    }

    if (progress >= 1) {
      this.phase = 'zoomout';
      this.t = 0;
    }
  }

  _updateZoom(dt) {
    this.t += dt;
    const progress = Math.min(1, this.t / 3);

    // Camera pulls back
    this.zoom = 1 + progress * 4;
    this.offsetY = progress * 80;

    const ctx = this.seedCtx;
    ctx.clearRect(0, 0, 200, 200);
    ctx.save();
    ctx.translate(100, 140);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-100, -140 + this.offsetY);

    // Ground
    ctx.fillStyle = 'rgba(138,106,74,0.3)';
    ctx.fillRect(-50, 130, 300, 70);

    // Sapling (static)
    const cx = 100, baseY = 128;
    ctx.strokeStyle = '#2A1A0A';
    ctx.lineWidth = 2.5 / this.zoom;
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.lineTo(cx, baseY - 60);
    ctx.stroke();

    // Leaves
    ctx.fillStyle = 'rgba(111,163,111,0.25)';
    ctx.beginPath(); ctx.ellipse(cx - 16, baseY - 42, 7, 3.5, -0.3, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 14, baseY - 48, 6, 3, 0.3, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, baseY - 65, 8, 0, 6.28); ctx.fill();

    // Background trees appear as we zoom out
    if (progress > 0.3) {
      const treeAlpha = (progress - 0.3) / 0.7;
      ctx.globalAlpha = treeAlpha * 0.3;
      for (let i = 0; i < 8; i++) {
        const tx = -40 + i * 30 + Math.sin(i * 1.5) * 15;
        const th = 30 + Math.random() * 20;
        ctx.fillStyle = '#1A4A2A';
        ctx.fillRect(tx - 2, baseY + 5 - th, 4, th);
        ctx.beginPath();
        ctx.arc(tx, baseY + 5 - th - 8, 10, 0, 6.28);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    if (progress >= 1) {
      this.phase = 'forest';
      this.t = 0;
    }
  }

  _updateForest(dt) {
    this.t += dt;
    this.forestTime += dt;
    const progress = Math.min(1, this.t / 2);

    const ctx = this.worldCtx;
    const W = this.world.width, H = this.world.height;
    ctx.clearRect(0, 0, W, H);

    // Sky gradient fades in
    const skyAlpha = progress;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(95,168,211,${skyAlpha})`);
    g.addColorStop(0.5, `rgba(135,206,235,${skyAlpha})`);
    g.addColorStop(1, `rgba(184,212,184,${skyAlpha})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Ground
    ctx.fillStyle = `rgba(62,107,72,${0.15 * progress})`;
    ctx.fillRect(0, H * 0.65, W, H * 0.35);

    // Forest trees grow in
    const treeAlpha = Math.min(1, progress * 1.5);
    for (const tree of this.forestTrees) {
      const sway = Math.sin(this.forestTime + tree.sway) * 2;
      ctx.fillStyle = `rgba(42,26,10,${0.4 * treeAlpha})`;
      ctx.fillRect(tree.x - tree.w / 2, H * 0.65 - tree.h, tree.w, tree.h);
      ctx.fillStyle = `rgba(62,107,72,${0.3 * treeAlpha})`;
      ctx.beginPath();
      ctx.arc(tree.x + sway, H * 0.65 - tree.h - tree.canopyR * 0.4, tree.canopyR, 0, 6.28);
      ctx.fill();
    }

    // Grass
    ctx.strokeStyle = `rgba(74,122,74,${0.3 * progress})`;
    ctx.lineWidth = 0.8;
    for (const blade of this.forestGrass) {
      const wind = Math.sin(this.forestTime * 1.2 + blade.phase) * 2;
      ctx.beginPath();
      ctx.moveTo(blade.x, H * 0.66);
      ctx.quadraticCurveTo(blade.x + wind * 0.5, H * 0.66 - blade.h * 0.5, blade.x + wind, H * 0.66 - blade.h);
      ctx.stroke();
    }

    // Clouds drift
    for (const c of this.forestClouds) {
      c.x += c.speed;
      if (c.x > W + 100) c.x = -c.w;
      ctx.fillStyle = `rgba(245,240,232,${0.15 * progress})`;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.w * 0.4, c.w * 0.12, 0, 0, 6.28);
      ctx.fill();
    }

    // Birds
    for (const b of this.forestBirds) {
      b.x += b.speed;
      b.wing += dt * 4;
      if (b.x > W + 30) { b.x = -30; b.y = 20 + Math.random() * 80; }
      const wy = Math.sin(b.wing) * 4;
      ctx.strokeStyle = `rgba(15,61,46,${0.3 * progress})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x - 4, b.y + wy);
      ctx.quadraticCurveTo(b.x - 1, b.y - 0.5, b.x, b.y);
      ctx.quadraticCurveTo(b.x + 1, b.y - 0.5, b.x + 4, b.y + wy);
      ctx.stroke();
    }

    // Vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.7);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, `rgba(10,20,15,${0.3 * progress})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    if (progress >= 1) {
      this.done = true;
      if (this.onDone) this.onDone();
    }
  }
}
