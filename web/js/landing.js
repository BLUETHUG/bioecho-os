// BioEcho Landing v4 — The Journey: Seed → Root → Crack → Sapling → Forest → Reveal

class LandingSequence {
  constructor(seedCanvas) {
    this.seed = seedCanvas;
    this.seedCtx = seedCanvas?.getContext('2d');
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

    // Canvas dimensions for dynamic scaling
    this.sw = this.seed?.width || 200;
    this.sh = this.seed?.height || 200;
    this.cx = this.sw / 2;
    this.cy = this.sh / 2 + 10 * (this.sh / 200);

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
    const W = window.innerWidth, H = window.innerHeight;
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

    try {
      const dt = 0.016;
      this.t += dt;

      if (this.phase === 'pulse') this._updatePulse(dt);
      else if (this.phase === 'root') this._updateRoot(dt);
      else if (this.phase === 'crack') this._updateCrack(dt);
      else if (this.phase === 'sapling') this._updateSapling(dt);
      else if (this.phase === 'zoomout') this._updateZoom(dt);
      else if (this.phase === 'forest') this._updateForest(dt);
    } catch (e) {
      console.error('Landing sequence error:', e);
    }

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
    const s = this.sw / 200; // scale factor
    const W = this.sw, H = this.sh;
    const cx = this.cx, cy = this.cy;
    ctx.clearRect(0, 0, W, H);

    const pulse = Math.sin(this.pulseTime * 1.5) * 0.15 + 1;
    const breathe = Math.sin(this.pulseTime * 0.8) * 0.05 + 1;

    // Outer glow — breathing
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 65 * s * breathe);
    g.addColorStop(0, 'rgba(111,163,111,0.1)');
    g.addColorStop(0.5, 'rgba(111,163,111,0.04)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 65 * s * breathe, 0, 6.28); ctx.fill();

    // Seed body
    ctx.fillStyle = '#8A6A4A';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 11 * s * pulse, 16 * s * pulse, 0, 0, 6.28);
    ctx.fill();

    // Seed highlight
    ctx.fillStyle = 'rgba(245,240,232,0.12)';
    ctx.beginPath();
    ctx.ellipse(cx - 2 * s, cy - 3 * s, 4 * s * pulse, 7 * s * pulse, -0.2, 0, 6.28);
    ctx.fill();

    // Tiny sprout
    ctx.strokeStyle = 'rgba(111,163,111,0.6)';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 16 * s * pulse);
    ctx.quadraticCurveTo(cx + 3 * s, cy - 24 * s * pulse, cx, cy - 32 * s * pulse);
    ctx.stroke();

    // Leaf
    ctx.fillStyle = 'rgba(111,163,111,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx + 3 * s, cy - 27 * s * pulse, 3.5 * s * pulse, 1.8 * s * pulse, 0.3, 0, 6.28);
    ctx.fill();
  }

  _updateRoot(dt) {
    this.t += dt * 0.8;
    const progress = Math.min(1, this.t / 2);
    const s = this.sw / 200;

    this._drawPulse();

    const ctx = this.seedCtx;
    const cx = this.cx, cy = this.cy;

    ctx.strokeStyle = 'rgba(110,88,67,0.5)';
    ctx.lineWidth = 1.5 * s;
    for (const root of this.roots) {
      root.progress = progress;
      const len = root.len * s * progress;
      const endX = cx + Math.sin(root.angle) * len;
      const endY = cy + Math.cos(root.angle) * len * 0.5 + 5 * s;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 12 * s);
      ctx.quadraticCurveTo(
        cx + Math.sin(root.angle) * len * 0.4 + root.curve * s * 0.3,
        cy + 12 * s + len * 0.3,
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
    const s = this.sw / 200;
    const cx = this.cx, cy = this.cy;
    ctx.strokeStyle = 'rgba(110,88,67,0.5)';
    ctx.lineWidth = 1.5 * s;
    for (const root of this.roots) {
      const len = root.len * s;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 12 * s);
      ctx.quadraticCurveTo(
        cx + Math.sin(root.angle) * len * 0.4 + root.curve * s * 0.3,
        cy + 12 * s + len * 0.3,
        cx + Math.sin(root.angle) * len,
        cy + 12 * s + Math.cos(root.angle) * len * 0.5 + 5 * s
      );
      ctx.stroke();
    }

    // Ground cracks
    ctx.strokeStyle = `rgba(138,106,74,${progress * 0.6})`;
    ctx.lineWidth = 1.5 * s;
    for (const crack of this.cracks) {
      crack.progress = progress;
      const len = crack.len * s * progress;
      ctx.beginPath();
      ctx.moveTo(cx + crack.x * s, cy + 18 * s);
      ctx.lineTo(
        cx + crack.x * s + Math.cos(crack.angle) * len,
        cy + 18 * s + Math.sin(crack.angle) * len
      );
      ctx.stroke();
    }

    // Ground lifts slightly
    if (progress > 0.5) {
      const lift = (progress - 0.5) * 2 * 3 * s;
      ctx.fillStyle = `rgba(138,106,74,${(progress - 0.5) * 0.3})`;
      ctx.fillRect(cx - 30 * s, cy + 15 * s - lift, 60 * s, 5 * s);
    }

    if (progress >= 1) {
      this.phase = 'sapling';
      this.t = 0;
    }
  }

  _updateSapling(dt) {
    this.t += dt;
    const progress = Math.min(1, this.t / 2.5);
    const s = this.sw / 200;

    const ctx = this.seedCtx;
    ctx.clearRect(0, 0, this.sw, this.sh);

    // Ground
    const baseY = this.sh * 0.65;
    ctx.fillStyle = 'rgba(138,106,74,0.3)';
    ctx.fillRect(0, baseY, this.sw, this.sh * 0.35);

    // Sapling trunk grows
    this.saplingH = 60 * s * progress;
    const cx = this.cx;

    ctx.strokeStyle = '#2A1A0A';
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.lineTo(cx, baseY - this.saplingH);
    ctx.stroke();

    // Leaves grow
    if (progress > 0.3) {
      const leafP = (progress - 0.3) / 0.7;

      ctx.strokeStyle = 'rgba(62,107,72,0.6)';
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(cx, baseY - this.saplingH * 0.6);
      ctx.quadraticCurveTo(cx - 12 * s * leafP, baseY - this.saplingH * 0.65, cx - 18 * s * leafP, baseY - this.saplingH * 0.7);
      ctx.stroke();

      ctx.fillStyle = 'rgba(111,163,111,0.25)';
      ctx.beginPath();
      ctx.ellipse(cx - 16 * s * leafP, baseY - this.saplingH * 0.68, 7 * s * leafP, 3.5 * s * leafP, -0.3, 0, 6.28);
      ctx.fill();

      ctx.strokeStyle = 'rgba(62,107,72,0.6)';
      ctx.beginPath();
      ctx.moveTo(cx, baseY - this.saplingH * 0.75);
      ctx.quadraticCurveTo(cx + 10 * s * leafP, baseY - this.saplingH * 0.78, cx + 16 * s * leafP, baseY - this.saplingH * 0.82);
      ctx.stroke();

      ctx.fillStyle = 'rgba(111,163,111,0.25)';
      ctx.beginPath();
      ctx.ellipse(cx + 14 * s * leafP, baseY - this.saplingH * 0.8, 6 * s * leafP, 3 * s * leafP, 0.3, 0, 6.28);
      ctx.fill();

      if (progress > 0.6) {
        const topP = (progress - 0.6) / 0.4;
        ctx.fillStyle = `rgba(111,163,111,${0.2 * topP})`;
        ctx.beginPath();
        ctx.arc(cx, baseY - this.saplingH - 5 * s, 8 * s * topP, 0, 6.28);
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
    const s = this.sw / 200;

    this.zoom = 1 + progress * 4;
    this.offsetY = progress * 80 * s;

    const ctx = this.seedCtx;
    ctx.clearRect(0, 0, this.sw, this.sh);
    ctx.save();
    const pivotX = this.cx, pivotY = this.sh * 0.7;
    ctx.translate(pivotX, pivotY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-pivotX, -pivotY + this.offsetY);

    // Ground
    const baseY = this.sh * 0.65;
    ctx.fillStyle = 'rgba(138,106,74,0.3)';
    ctx.fillRect(-50 * s, baseY, this.sw + 100 * s, this.sh * 0.35);

    // Sapling
    const cx = this.cx;
    ctx.strokeStyle = '#2A1A0A';
    ctx.lineWidth = 2.5 * s / this.zoom;
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.lineTo(cx, baseY - 60 * s);
    ctx.stroke();

    // Leaves
    ctx.fillStyle = 'rgba(111,163,111,0.25)';
    ctx.beginPath(); ctx.ellipse(cx - 16 * s, baseY - 42 * s, 7 * s, 3.5 * s, -0.3, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 14 * s, baseY - 48 * s, 6 * s, 3 * s, 0.3, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, baseY - 65 * s, 8 * s, 0, 6.28); ctx.fill();

    // Background trees
    if (progress > 0.3) {
      const treeAlpha = (progress - 0.3) / 0.7;
      ctx.globalAlpha = treeAlpha * 0.3;
      for (let i = 0; i < 8; i++) {
        const tx = -40 * s + i * 30 * s + Math.sin(i * 1.5) * 15 * s;
        const th = (30 + Math.random() * 20) * s;
        ctx.fillStyle = '#1A4A2A';
        ctx.fillRect(tx - 2 * s, baseY + 5 * s - th, 4 * s, th);
        ctx.beginPath();
        ctx.arc(tx, baseY + 5 * s - th - 8 * s, 10 * s, 0, 6.28);
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
    const progress = Math.min(1, this.t / 2);

    if (progress >= 1) {
      this.done = true;
      if (this.onDone) this.onDone();
    }
  }
}
