// ═══════════════════════════════════════════════════════════════
// BioEcho Landing — The Growing World
// Seed → Heartbeat → Roots → Crack → Sapling → Forest → Rise
// ═══════════════════════════════════════════════════════════════

class LandingSequence {
  constructor(seedCanvas) {
    this.canvas = seedCanvas;
    this.ctx = seedCanvas?.getContext('2d');
    this.phase = 'idle';
    this.t = 0;
    this.totalDuration = 9;
    this.done = false;
    this.onDone = null;

    // Seed
    this.seedOpacity = 0;
    this.seedScale = 0;

    // Heartbeat
    this.heartbeatRings = [];
    this.heartbeatActive = false;

    // Roots
    this.roots = [];
    this.rootProgress = 0;

    // Crack
    this.cracks = [];
    this.crackProgress = 0;

    // Sapling
    this.saplingH = 0;
    this.leaves = [];

    // Forest
    this.forestTrees = [];
    this.forestProgress = 0;

    // Birds
    this.birds = [];

    // Sun
    this.sunAlpha = 0;
    this.sunRays = [];

    // Particles
    this.particles = [];

    // Ground line
    this.groundY = 0;

    // Dust
    this.dustMotes = [];
  }

  start(onDone) {
    this.onDone = onDone;
    this.phase = 'seed';
    this.t = 0;
    this._initScene();
    this._loop();
  }

  _initScene() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.groundY = H * 0.62;
    const cx = W / 2;
    const cy = this.groundY;

    // Initialize roots
    const rootCount = 8;
    for (let i = 0; i < rootCount; i++) {
      const angle = (i / rootCount) * Math.PI + (Math.random() - 0.5) * 0.4;
      this.roots.push({
        segments: [],
        angle,
        length: 40 + Math.random() * 60,
        speed: 0.6 + Math.random() * 0.4,
        thickness: 1.5 + Math.random() * 1
      });
    }

    // Initialize cracks
    const crackCount = 5;
    for (let i = 0; i < crackCount; i++) {
      const angle = (i / crackCount) * Math.PI * 2 + Math.random() * 0.5;
      this.cracks.push({
        segments: [],
        angle,
        length: 20 + Math.random() * 30,
        speed: 0.8 + Math.random() * 0.4
      });
    }

    // Initialize forest trees
    for (let i = 0; i < 12; i++) {
      const tx = cx + (Math.random() - 0.5) * W * 0.8;
      const dist = Math.abs(tx - cx) / (W * 0.4);
      this.forestTrees.push({
        x: tx,
        h: 60 + Math.random() * 80 - dist * 30,
        w: 8 + Math.random() * 12,
        canopyR: 20 + Math.random() * 30,
        delay: dist * 0.4 + Math.random() * 0.2,
        color: `hsl(${130 + Math.random() * 20}, ${40 + Math.random() * 20}%, ${18 + Math.random() * 10}%)`
      });
    }

    // Initialize birds
    for (let i = 0; i < 6; i++) {
      this.birds.push({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy - 50 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 1.5,
        wingPhase: Math.random() * Math.PI * 2,
        size: 2 + Math.random() * 2
      });
    }

    // Sun rays
    for (let i = 0; i < 8; i++) {
      this.sunRays.push({
        angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.8,
        width: 2 + Math.random() * 4,
        alpha: 0.03 + Math.random() * 0.04
      });
    }

    // Dust motes
    for (let i = 0; i < 30; i++) {
      this.dustMotes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.5 + Math.random() * 1.5,
        speed: 0.1 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  _loop() {
    if (this.done) return;
    const dt = 1 / 60;
    this.t += dt;
    this._update(dt);
    this._draw();
    requestAnimationFrame(() => this._loop());
  }

  _update(dt) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cx = W / 2;
    const cy = this.groundY;
    const progress = Math.min(1, this.t / this.totalDuration);

    // Phase transitions
    if (this.t < 1.5) this.phase = 'seed';
    else if (this.t < 2.5) this.phase = 'heartbeat';
    else if (this.t < 4) this.phase = 'roots';
    else if (this.t < 5) this.phase = 'crack';
    else if (this.t < 6.5) this.phase = 'sapling';
    else if (this.t < 8) this.phase = 'forest';
    else if (this.t < 9) this.phase = 'rise';
    else this.phase = 'done';

    // Seed
    this.seedOpacity = Math.min(1, this.t / 0.8);
    this.seedScale = Math.min(1, this.t / 1.2);

    // Heartbeat
    if (this.phase === 'heartbeat' || (this.phase === 'seed' && this.t > 1)) {
      if (!this.heartbeatActive) {
        this.heartbeatActive = true;
        this._spawnHeartbeat();
      }
    }
    this.heartbeatRings = this.heartbeatRings.filter(r => {
      r.radius += r.speed * dt * 60;
      r.alpha -= 0.008;
      return r.alpha > 0;
    });

    // Roots
    if (this.t > 2.5) {
      this.rootProgress = Math.min(1, (this.t - 2.5) / 1.5);
    }

    // Cracks
    if (this.t > 4) {
      this.crackProgress = Math.min(1, (this.t - 4) / 1);
    }

    // Sapling
    if (this.t > 5) {
      this.saplingH = Math.min(1, (this.t - 5) / 1.5);
    }

    // Forest
    if (this.t > 6.5) {
      this.forestProgress = Math.min(1, (this.t - 6.5) / 1.5);
    }

    // Birds
    if (this.t > 7) {
      for (const b of this.birds) {
        b.x += b.vx;
        b.y += b.vy;
        b.wingPhase += 0.15;
      }
    }

    // Sun
    if (this.t > 7.5) {
      this.sunAlpha = Math.min(0.6, (this.t - 7.5) / 1.5);
    }

    // Dust
    for (const d of this.dustMotes) {
      d.x += Math.sin(d.phase + this.t * 0.5) * 0.2;
      d.y -= d.speed;
      d.phase += 0.01;
      if (d.y < -10) { d.y = H + 10; d.x = Math.random() * W; }
    }

    // Particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.alpha -= 0.01;
      return p.alpha > 0;
    });

    // Done
    if (this.phase === 'done' && !this.done) {
      this.done = true;
      if (this.onDone) this.onDone();
    }
  }

  _spawnHeartbeat() {
    const cx = this.canvas.width / 2;
    const cy = this.groundY;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.heartbeatRings.push({
          x: cx, y: cy,
          radius: 5,
          speed: 1.5 + i * 0.3,
          alpha: 0.4 - i * 0.1
        });
      }, i * 200);
    }
  }

  _draw() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const ctx = this.ctx;
    const cx = W / 2;
    const cy = this.groundY;

    ctx.clearRect(0, 0, W, H);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    const nightBlend = Math.max(0, 1 - this.t / 6);
    bg.addColorStop(0, `rgba(6,14,10,${0.9 + nightBlend * 0.1})`);
    bg.addColorStop(0.6, `rgba(10,26,18,${0.95})`);
    bg.addColorStop(1, `rgba(15,61,46,${0.3 + nightBlend * 0.3})`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Ground
    const groundGrad = ctx.createLinearGradient(0, cy, 0, H);
    groundGrad.addColorStop(0, 'rgba(30,50,35,0.6)');
    groundGrad.addColorStop(1, 'rgba(15,30,20,0.9)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, cy, W, H - cy);

    // Ground line
    ctx.strokeStyle = 'rgba(111,163,111,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    for (let x = 0; x < W; x += 4) {
      ctx.lineTo(x, cy + Math.sin(x * 0.02 + this.t * 0.5) * 1.5);
    }
    ctx.stroke();

    // Dust motes
    for (const d of this.dustMotes) {
      ctx.fillStyle = `rgba(245,240,232,${0.05 + Math.sin(d.phase + this.t) * 0.03})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heartbeat rings
    for (const r of this.heartbeatRings) {
      ctx.strokeStyle = `rgba(111,163,111,${r.alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Roots
    if (this.rootProgress > 0) {
      this._drawRoots(ctx, cx, cy);
    }

    // Cracks
    if (this.crackProgress > 0) {
      this._drawCracks(ctx, cx, cy);
    }

    // Forest trees
    if (this.forestProgress > 0) {
      this._drawForest(ctx, W, H, cx, cy);
    }

    // Sapling
    if (this.saplingH > 0) {
      this._drawSapling(ctx, cx, cy);
    }

    // Birds
    if (this.t > 7) {
      this._drawBirds(ctx);
    }

    // Sun
    if (this.sunAlpha > 0) {
      this._drawSun(ctx, W, cx);
    }

    // Seed
    if (this.seedOpacity > 0 && this.t < 4) {
      this._drawSeed(ctx, cx, cy);
    }

    // Particles
    for (const p of this.particles) {
      ctx.fillStyle = `rgba(111,163,111,${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vignette
    const vig = ctx.createRadialGradient(cx, H / 2, H * 0.2, cx, H / 2, H * 0.8);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(6,14,10,0.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  _drawSeed(ctx, cx, cy) {
    const s = this.seedScale;
    const breathe = Math.sin(this.t * 2) * 0.08 + 1;
    const pulse = this.t > 1 ? Math.sin((this.t - 1) * 6) * 0.05 + 1 : 1;
    const scale = s * breathe * pulse;

    // Glow
    const glow = ctx.createRadialGradient(cx, cy - 20, 0, cx, cy - 20, 40 * scale);
    glow.addColorStop(0, `rgba(111,163,111,${0.15 * this.seedOpacity})`);
    glow.addColorStop(0.5, `rgba(111,163,111,${0.05 * this.seedOpacity})`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy - 20, 40 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Seed body
    ctx.fillStyle = `rgba(245,240,232,${this.seedOpacity * 0.9})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 20, 10 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = `rgba(255,255,255,${this.seedOpacity * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy - 23, 4 * scale, 7 * scale, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawRoots(ctx, cx, cy) {
    for (const root of this.roots) {
      const progress = Math.min(1, this.rootProgress / root.speed);
      if (progress <= 0) continue;

      const len = root.length * progress;
      const segCount = Math.floor(len / 5);

      ctx.strokeStyle = `rgba(110,88,67,${0.4 * progress})`;
      ctx.lineWidth = root.thickness * progress;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);

      let rx = cx, ry = cy;
      for (let i = 0; i < segCount; i++) {
        const t = i / segCount;
        const wobble = Math.sin(t * 8 + root.angle * 3) * 3;
        rx += Math.cos(root.angle) * 5 + wobble * 0.3;
        ry += Math.sin(root.angle) * 3 + 2;
        ctx.lineTo(rx, ry);

        // Sub-roots
        if (i > 2 && i % 3 === 0 && progress > 0.5) {
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          const subAngle = root.angle + (Math.random() - 0.5) * 1;
          ctx.lineTo(rx + Math.cos(subAngle) * 12, ry + Math.sin(subAngle) * 8);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(rx, ry);
        }
      }
      ctx.stroke();
    }
  }

  _drawCracks(ctx, cx, cy) {
    for (const crack of this.cracks) {
      const progress = Math.min(1, this.crackProgress / crack.speed);
      if (progress <= 0) continue;

      const len = crack.length * progress;
      ctx.strokeStyle = `rgba(111,163,111,${0.2 * progress})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);

      let x = cx, y = cy;
      const segs = Math.floor(len / 4);
      for (let i = 0; i < segs; i++) {
        x += Math.cos(crack.angle) * 4 + (Math.random() - 0.5) * 2;
        y += Math.sin(crack.angle) * 2 + 1;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Glow particles at crack tips
      if (progress > 0.3) {
        ctx.fillStyle = `rgba(111,163,111,${0.15 * progress})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawSapling(ctx, cx, cy) {
    const h = 60 * this.saplingH;
    const sway = Math.sin(this.t * 1.5) * 2 * this.saplingH;

    // Trunk
    ctx.strokeStyle = `rgba(110,88,67,${this.saplingH})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + sway, cy - h * 0.6, cx + sway * 0.5, cy - h);
    ctx.stroke();

    // Leaves
    if (this.saplingH > 0.5) {
      const leafAlpha = (this.saplingH - 0.5) * 2;
      const leafCount = 3;
      for (let i = 0; i < leafCount; i++) {
        const ly = cy - h + i * 8;
        const side = i % 2 === 0 ? 1 : -1;
        const leafSway = Math.sin(this.t * 2 + i) * 3;

        ctx.fillStyle = `rgba(111,163,111,${leafAlpha * 0.6})`;
        ctx.beginPath();
        ctx.ellipse(
          cx + sway * 0.5 + side * (8 + leafSway),
          ly,
          6, 3,
          side * 0.5, 0, Math.PI * 2
        );
        ctx.fill();
      }

      // Top leaves cluster
      ctx.fillStyle = `rgba(139,196,139,${leafAlpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(cx + sway * 0.5, cy - h - 4, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawForest(ctx, W, H, cx, cy) {
    for (const tree of this.forestTrees) {
      const p = Math.max(0, Math.min(1, (this.forestProgress - tree.delay) / 0.6));
      if (p <= 0) continue;

      const h = tree.h * p;
      const w = tree.w * p;
      const canopyR = tree.canopyR * p;
      const sway = Math.sin(this.t * 0.8 + tree.x * 0.01) * 1.5 * p;

      // Trunk
      ctx.fillStyle = `rgba(60,45,30,${p * 0.7})`;
      ctx.beginPath();
      ctx.moveTo(tree.x - w / 2, cy);
      ctx.lineTo(tree.x - w / 4 + sway * 0.3, cy - h);
      ctx.lineTo(tree.x + w / 4 + sway * 0.3, cy - h);
      ctx.lineTo(tree.x + w / 2, cy);
      ctx.fill();

      // Canopy
      ctx.fillStyle = tree.color.replace(')', `,${p * 0.7})`).replace('hsl', 'hsla');
      ctx.beginPath();
      ctx.arc(tree.x + sway, cy - h - canopyR * 0.3, canopyR, 0, Math.PI * 2);
      ctx.fill();

      // Canopy highlight
      ctx.fillStyle = `rgba(139,196,139,${p * 0.15})`;
      ctx.beginPath();
      ctx.arc(tree.x + sway - canopyR * 0.2, cy - h - canopyR * 0.5, canopyR * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawBirds(ctx) {
    for (const b of this.birds) {
      const wingY = Math.sin(b.wingPhase) * 4;
      ctx.strokeStyle = `rgba(245,240,232,0.4)`;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';

      // Left wing
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.quadraticCurveTo(b.x - b.size * 2, b.y - wingY, b.x - b.size * 4, b.y + wingY * 0.5);
      ctx.stroke();

      // Right wing
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.quadraticCurveTo(b.x + b.size * 2, b.y - wingY, b.x + b.size * 4, b.y + wingY * 0.5);
      ctx.stroke();
    }
  }

  _drawSun(ctx, W, cx) {
    const sunX = cx + 40;
    const sunY = 40;
    const sunR = 30;

    // Sun glow
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3);
    glow.addColorStop(0, `rgba(231,169,90,${this.sunAlpha * 0.3})`);
    glow.addColorStop(0.3, `rgba(231,169,90,${this.sunAlpha * 0.1})`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 3, 0, Math.PI * 2);
    ctx.fill();

    // Sun disc
    ctx.fillStyle = `rgba(245,240,232,${this.sunAlpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Rays
    for (const ray of this.sunRays) {
      ctx.save();
      ctx.translate(sunX, sunY);
      ctx.rotate(ray.angle + Math.sin(this.t * 0.3) * 0.02);
      ctx.fillStyle = `rgba(231,169,90,${ray.alpha * this.sunAlpha})`;
      ctx.beginPath();
      ctx.moveTo(-ray.width / 2, 0);
      ctx.lineTo(0, -200);
      ctx.lineTo(ray.width / 2, 0);
      ctx.fill();
      ctx.restore();
    }

    // Spawn particles near sun
    if (Math.random() < 0.1 && this.sunAlpha > 0.2) {
      this.particles.push({
        x: sunX + (Math.random() - 0.5) * 40,
        y: sunY + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.3 - Math.random() * 0.3,
        r: 0.5 + Math.random(),
        alpha: 0.3
      });
    }
  }
}
