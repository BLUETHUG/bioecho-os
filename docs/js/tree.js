// BioEcho Living Tree v3.1 — Pure visual. No text. Glowing orbs on branches.

class LivingTree {
  constructor(world) {
    this.world = world;
    this.x = 0;
    this.y = 0;
    this.trunkHeight = 0;
    this.features = [];
    this.time = 0;
    this.grown = false;
    this.growthProgress = 0;
    this.hoveredFeature = null;
    this.windPhase = 0;
    this.onFeatureClick = null;
  }

  initialize() {
    if (!this.world?.ctx) return;
    this.x = (this.world.w || this.world.width) * 0.5;
    this.y = (this.world.h || this.world.height) * 0.72;
    this.trunkHeight = (this.world.h || this.world.height) * 0.3;
    this._initFeatures();
    this._growTree();
  }

  _initFeatures() {
    const angles = [-0.65, -0.35, -0.1, 0.1, 0.35, 0.65];
    const dists = [0.72, 0.55, 0.85, 0.85, 0.55, 0.72];
    const icons = ['🌿', '💧', '🌍', '🌳', '🕊', '🌿'];
    const colors = ['#6FA36F', '#5FA8D3', '#E7A95A', '#6E5843', '#D9E3EC', '#8BC48B'];

    this.features = angles.map((angle, i) => ({
      angle, dist: dists[i], icon: icons[i], color: colors[i],
      bx: this.x + Math.sin(angle) * this.trunkHeight * dists[i],
      by: this.y - this.trunkHeight * dists[i] * 0.8,
      leafX: 0, leafY: 0,
      grown: false, alpha: 0, scale: 0,
      hover: false, glowPhase: Math.random() * Math.PI * 2
    }));
  }

  _growTree() {
    this.grown = false;
    this.growthProgress = 0;
    const grow = () => {
      this.growthProgress += 0.006;
      if (this.growthProgress >= 1) {
        this.growthProgress = 1;
        this.grown = true;
        this._revealFeatures();
        return;
      }
      requestAnimationFrame(grow);
    };
    requestAnimationFrame(grow);
  }

  _revealFeatures() {
    let delay = 0;
    for (const f of this.features) {
      setTimeout(() => { f.grown = true; }, delay);
      delay += 400;
    }
  }

  update(dt) {
    this.time += dt;
    this.windPhase += 0.018;

    for (const f of this.features) {
      if (f.grown) {
        f.alpha = Math.min(1, f.alpha + 0.025);
        f.scale = Math.min(1, f.scale + 0.03);
      }
      const sway = Math.sin(this.windPhase + f.bx * 0.008) * 2.5;
      f.leafX = f.bx + sway;
      f.leafY = f.by + Math.cos(this.windPhase * 0.6 + f.by * 0.008) * 1.5;
    }
  }

  render(ctx, tod, cam) {
    if (!ctx) return;
    const ambient = tod?.ambient ?? 1;

    if (cam) {
      const proj = cam.project(this.world.treeWorldX, 0, this.world.treeWorldZ, ctx.canvas.width, ctx.canvas.height);
      if (!proj || proj.z < 10 || proj.z > 600) return;
      this._drawFeatures3D(ctx, ambient, proj);
    } else {
      this._drawRoots(ctx, ambient);
      this._drawTrunk(ctx, ambient);
      this._drawBranches(ctx, ambient);
      this._drawCanopy(ctx, ambient);
      this._drawFeatures(ctx, ambient);
    }
  }

  _drawFeatures3D(ctx, ambient, proj) {
    const s = proj.scale;
    const sway = Math.sin(this.windPhase) * 3 * s;
    const angles = [-0.65, -0.35, -0.1, 0.1, 0.35, 0.65];
    const dists = [0.72, 0.55, 0.85, 0.85, 0.55, 0.72];
    const colors = ['#6FA36F', '#5FA8D3', '#E7A95A', '#6E5843', '#D9E3EC', '#8BC48B'];

    for (let i = 0; i < 6; i++) {
      const f = this.features[i];
      if (f.alpha <= 0) continue;
      const angle = angles[i];
      const dist = dists[i];

      const fx = proj.x + Math.sin(angle) * 60 * s + sway;
      const fy = proj.y - 120 * s * dist;
      const pulse = Math.sin(this.time * 1.5 + f.glowPhase) * 0.15 + 0.85;
      f.leafX = fx;
      f.leafY = fy;

      ctx.save();
      ctx.globalAlpha = f.alpha * ambient;

      ctx.fillStyle = f.hover ? `rgba(111,163,111,0.12)` : `rgba(111,163,111,0.05)`;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 22 * s, 14 * s, angle * 0.2, 0, 6.28);
      ctx.fill();

      const glowGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 18 * s * pulse);
      glowGrad.addColorStop(0, f.hover ? `rgba(231,169,90,0.15)` : `rgba(111,163,111,0.08)`);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(fx, fy, 18 * s * pulse, 0, 6.28);
      ctx.fill();

      ctx.fillStyle = f.hover ? '#E7A95A' : colors[i];
      ctx.globalAlpha = f.alpha * ambient * (f.hover ? 0.9 : 0.6);
      ctx.beginPath();
      ctx.arc(fx, fy, 5 * s * pulse, 0, 6.28);
      ctx.fill();

      ctx.fillStyle = '#F5F0E8';
      ctx.globalAlpha = f.alpha * ambient * 0.3;
      ctx.beginPath();
      ctx.arc(fx - 1, fy - 1, 2 * s, 0, 6.28);
      ctx.fill();

      ctx.restore();
    }
  }

  _drawRoots(ctx, ambient) {
    const progress = Math.min(1, this.growthProgress * 3);
    if (progress <= 0) return;
    ctx.strokeStyle = `rgba(110,88,67,${0.2 * ambient})`;
    ctx.lineWidth = 1.5;
    const roots = [[-45, 22], [35, 28], [-22, 32], [55, 18], [-65, 12], [12, 38]];
    for (const [rx, ry] of roots) {
      const len = progress;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.quadraticCurveTo(
        this.x + rx * 0.4 * len, this.y + ry * 0.5,
        this.x + rx * len, this.y + ry * len
      );
      ctx.stroke();
    }
  }

  _drawTrunk(ctx, ambient) {
    const progress = Math.min(1, this.growthProgress * 2);
    if (progress <= 0) return;
    const trunkTop = this.y - this.trunkHeight * progress;
    const sway = Math.sin(this.windPhase) * 3;

    const grad = ctx.createLinearGradient(this.x, this.y, this.x, trunkTop);
    grad.addColorStop(0, `rgba(42,26,10,${0.7 * ambient})`);
    grad.addColorStop(0.5, `rgba(60,40,20,${0.6 * ambient})`);
    grad.addColorStop(1, `rgba(42,26,10,${0.5 * ambient})`);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(this.x - 7, this.y);
    ctx.quadraticCurveTo(this.x - 5 + sway * 0.3, this.y - this.trunkHeight * 0.5, this.x - 4 + sway, trunkTop);
    ctx.lineTo(this.x + 4 + sway, trunkTop);
    ctx.quadraticCurveTo(this.x + 5 + sway * 0.3, this.y - this.trunkHeight * 0.5, this.x + 7, this.y);
    ctx.fill();

    // Bark texture
    ctx.strokeStyle = `rgba(110,88,67,${0.12 * ambient})`;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 6; i++) {
      const ty = this.y - this.trunkHeight * progress * (0.15 + i * 0.13);
      ctx.beginPath();
      ctx.moveTo(this.x - 5, ty);
      ctx.lineTo(this.x + 5, ty + 2);
      ctx.stroke();
    }
  }

  _drawBranches(ctx, ambient) {
    if (this.growthProgress < 0.35) return;
    const branchProgress = Math.min(1, (this.growthProgress - 0.35) / 0.35);
    ctx.lineWidth = 1.5;

    for (const f of this.features) {
      const startX = this.x + Math.sin(f.angle) * 10;
      const startY = this.y - this.trunkHeight * 0.55;
      const sway = Math.sin(this.windPhase + f.angle) * 2;

      const grad = ctx.createLinearGradient(startX, startY, f.bx, f.by);
      grad.addColorStop(0, `rgba(42,26,10,${0.4 * ambient})`);
      grad.addColorStop(1, `rgba(60,40,20,${0.3 * ambient})`);
      ctx.strokeStyle = grad;

      const endX = startX + (f.bx - startX) * branchProgress;
      const endY = startY + (f.by - startY) * branchProgress;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(
        startX + (f.bx - startX) * 0.4 + sway,
        startY + (f.by - startY) * 0.3,
        endX, endY
      );
      ctx.stroke();
    }
  }

  _drawCanopy(ctx, ambient) {
    const progress = Math.min(1, (this.growthProgress - 0.25) / 0.4);
    if (progress <= 0) return;

    const season = LDL.currentSeason;
    const palettes = {
      spring: ['#2A5A3A', '#3E6B48', '#6FA36F', '#8BC48B'],
      summer: ['#1A4A2A', '#2A5A3A', '#3E6B48', '#4A7A4A'],
      autumn: ['#6E5843', '#8A6A4A', '#A07848', '#C49A6C'],
      winter: ['#3A2A1A', '#4A3A2A', '#2A1A0A']
    };
    const colors = palettes[season] || palettes.spring;
    const canopyY = this.y - this.trunkHeight - 12;
    const baseR = this.trunkHeight * 0.42;

    for (let i = 0; i < colors.length; i++) {
      const r = baseR * (0.65 + i * 0.12) * progress;
      const ox = Math.sin(this.windPhase + i * 0.8) * 3;
      const oy = Math.cos(this.windPhase * 0.6 + i * 0.5) * 2;
      ctx.fillStyle = colors[i];
      ctx.globalAlpha = ambient * (0.45 - i * 0.06);
      ctx.beginPath();
      ctx.arc(this.x + ox, canopyY + oy - i * 6, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawFeatures(ctx, ambient) {
    for (const f of this.features) {
      if (f.alpha <= 0) continue;

      const x = f.leafX;
      const y = f.leafY;
      const s = f.scale;
      const pulse = Math.sin(this.time * 1.5 + f.glowPhase) * 0.15 + 0.85;

      ctx.save();
      ctx.globalAlpha = f.alpha * ambient;

      // Leaf behind orb
      ctx.fillStyle = f.hover ? `rgba(111,163,111,0.12)` : `rgba(111,163,111,0.05)`;
      ctx.beginPath();
      ctx.ellipse(x, y, 22 * s, 14 * s, f.angle * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Glow behind orb
      const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, 18 * s * pulse);
      glowGrad.addColorStop(0, f.hover ? `rgba(231,169,90,0.15)` : `rgba(111,163,111,0.08)`);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(x, y, 18 * s * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Core orb
      ctx.fillStyle = f.hover ? '#E7A95A' : f.color;
      ctx.globalAlpha = f.alpha * ambient * (f.hover ? 0.9 : 0.6);
      ctx.beginPath();
      ctx.arc(x, y, 5 * s * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright spot
      ctx.fillStyle = '#F5F0E8';
      ctx.globalAlpha = f.alpha * ambient * 0.3;
      ctx.beginPath();
      ctx.arc(x - 1, y - 1, 2 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  hitTest(mx, my) {
    for (let i = 0; i < this.features.length; i++) {
      const f = this.features[i];
      const dx = mx - f.leafX;
      const dy = my - f.leafY;
      if (dx * dx + dy * dy < 500) {
        return i;
      }
    }
    return -1;
  }

  setHover(index) {
    this.features.forEach((f, i) => { f.hover = i === index; });
    this.hoveredFeature = index >= 0 ? index : null;
  }
}
