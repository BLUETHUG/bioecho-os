// BioEcho Living Tree — Home Screen Centerpiece
// Every feature grows from one tree. The tree changes with the user's journey.

class LivingTree {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d');
    this.x = 0;
    this.y = 0;
    this.trunkHeight = 0;
    this.branches = [];
    this.leaves = [];
    this.features = new Map();
    this.time = 0;
    this.grown = false;
    this.growthProgress = 0;
    this.hoveredFeature = null;
    this.onFeatureClick = null;
    this.windPhase = 0;
  }

  initialize() {
    if (!this.canvas) return;
    this.x = this.canvas.width / 2;
    this.y = this.canvas.height * 0.75;
    this.trunkHeight = this.canvas.height * 0.35;
    this._initFeatures();
    this._growTree();
  }

  _initFeatures() {
    const features = [
      { id: 'lens', label: 'Lens', icon: 'dew', angle: -0.6, dist: 0.7, side: 'left' },
      { id: 'care', label: 'Care', icon: 'sprout', angle: -0.3, dist: 0.55, side: 'left' },
      { id: 'earth', label: 'Earth', icon: 'seed', angle: 0.3, dist: 0.55, side: 'right' },
      { id: 'research', label: 'Research', icon: 'rings', angle: 0.6, dist: 0.7, side: 'right' },
      { id: 'community', label: 'Community', icon: 'flock', angle: -0.15, dist: 0.85, side: 'left' },
      { id: 'timeline', label: 'Timeline', icon: 'vine', angle: 0.15, dist: 0.85, side: 'right' }
    ];

    for (const f of features) {
      const bx = this.x + Math.sin(f.angle) * this.trunkHeight * f.dist;
      const by = this.y - this.trunkHeight * f.dist * 0.8;
      this.features.set(f.id, {
        ...f, bx, by, leafX: bx, leafY: by,
        grown: false, hover: false, alpha: 0, scale: 0
      });
    }
  }

  _growTree() {
    this.grown = false;
    this.growthProgress = 0;
    const grow = () => {
      this.growthProgress += 0.008;
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
    for (const [, f] of this.features) {
      setTimeout(() => { f.grown = true; }, delay);
      delay += 300;
    }
  }

  update(dt) {
    this.time += dt;
    this.windPhase += 0.02;

    for (const [, f] of this.features) {
      if (f.grown) {
        f.alpha = Math.min(1, f.alpha + 0.03);
        f.scale = Math.min(1, f.scale + 0.04);
      }
      const sway = Math.sin(this.windPhase + f.bx * 0.01) * 2;
      f.leafX = f.bx + sway;
      f.leafY = f.by + Math.cos(this.windPhase * 0.7 + f.by * 0.01) * 1;
    }
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    this._drawRoots(ctx);
    this._drawTrunk(ctx);
    this._drawBranches(ctx);
    this._drawCanopy(ctx);
    this._drawFeatures(ctx);
    this._drawSunRays(ctx);
  }

  _drawRoots(ctx) {
    const progress = Math.min(1, this.growthProgress * 3);
    if (progress <= 0) return;
    ctx.strokeStyle = 'rgba(110,88,67,0.3)';
    ctx.lineWidth = 2;
    const roots = [
      { dx: -40, dy: 20 }, { dx: 30, dy: 25 }, { dx: -20, dy: 30 },
      { dx: 50, dy: 15 }, { dx: -60, dy: 10 }, { dx: 10, dy: 35 }
    ];
    for (const root of roots) {
      const len = progress;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.quadraticCurveTo(
        this.x + root.dx * 0.5 * len, this.y + root.dy * 0.5,
        this.x + root.dx * len, this.y + root.dy * len
      );
      ctx.stroke();
    }
  }

  _drawTrunk(ctx) {
    const progress = Math.min(1, this.growthProgress * 2);
    if (progress <= 0) return;
    const trunkTop = this.y - this.trunkHeight * progress;
    const sway = Math.sin(this.windPhase) * 3;

    ctx.fillStyle = '#2A1A0A';
    ctx.beginPath();
    ctx.moveTo(this.x - 6, this.y);
    ctx.quadraticCurveTo(this.x - 4 + sway * 0.3, this.y - this.trunkHeight * 0.5, this.x - 3 + sway, trunkTop);
    ctx.lineTo(this.x + 3 + sway, trunkTop);
    ctx.quadraticCurveTo(this.x + 4 + sway * 0.3, this.y - this.trunkHeight * 0.5, this.x + 6, this.y);
    ctx.fill();

    ctx.strokeStyle = 'rgba(110,88,67,0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const ty = this.y - this.trunkHeight * progress * (0.2 + i * 0.15);
      ctx.beginPath();
      ctx.moveTo(this.x - 4, ty);
      ctx.lineTo(this.x + 4, ty + 3);
      ctx.stroke();
    }
  }

  _drawBranches(ctx) {
    if (this.growthProgress < 0.4) return;
    const branchProgress = Math.min(1, (this.growthProgress - 0.4) / 0.3);
    ctx.strokeStyle = '#2A1A0A';
    ctx.lineWidth = 2;

    for (const [, f] of this.features) {
      const startX = this.x + Math.sin(f.angle) * 8;
      const startY = this.y - this.trunkHeight * 0.6;
      const endX = f.bx;
      const endY = f.by;
      const sway = Math.sin(this.windPhase + f.angle) * 2;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(
        startX + (endX - startX) * 0.5 + sway,
        startY + (endY - startY) * 0.3,
        startX + (endX - startX) * branchProgress,
        startY + (endY - startY) * branchProgress
      );
      ctx.stroke();
    }
  }

  _drawCanopy(ctx) {
    const progress = Math.min(1, (this.growthProgress - 0.3) / 0.4);
    if (progress <= 0) return;
    const season = LDL.currentSeason;
    const colors = {
      spring: ['#6FA36F', '#3E6B48', '#8BC48B'],
      summer: ['#3E6B48', '#2A5A3A', '#4A7A4A'],
      autumn: ['#8A6A4A', '#6E5843', '#A07848'],
      winter: ['#4A3A2A', '#3A2A1A', '#5A4A3A']
    };
    const palette = colors[season] || colors.spring;

    const canopyY = this.y - this.trunkHeight - 10;
    const canopyR = this.trunkHeight * 0.4;

    for (let i = 0; i < 3; i++) {
      const r = canopyR * (0.7 + i * 0.15) * progress;
      const ox = Math.sin(this.windPhase + i) * 3;
      const oy = Math.cos(this.windPhase * 0.7 + i) * 2;
      ctx.fillStyle = palette[i % palette.length];
      ctx.globalAlpha = 0.6 + i * 0.1;
      ctx.beginPath();
      ctx.arc(this.x + ox, canopyY + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawFeatures(ctx) {
    for (const [, f] of this.features) {
      if (f.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = f.alpha;
      const scale = f.scale;
      const x = f.leafX;
      const y = f.leafY;

      // Leaf shape behind icon
      ctx.fillStyle = f.hover ? 'rgba(111,163,111,0.2)' : 'rgba(111,163,111,0.08)';
      ctx.beginPath();
      ctx.ellipse(x, y, 28 * scale, 18 * scale, f.angle * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = f.hover ? 'rgba(111,163,111,0.3)' : 'rgba(111,163,111,0.12)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Icon
      ctx.fillStyle = f.hover ? '#E7A95A' : '#6FA36F';
      ctx.font = `${14 * scale}px Inter, system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this._getIcon(f.icon), x, y - 2);

      // Label
      ctx.fillStyle = f.hover ? '#F5F0E8' : 'rgba(245,240,232,0.6)';
      ctx.font = `300 ${10 * scale}px Inter, system-ui`;
      ctx.fillText(f.label, x, y + 14);

      ctx.restore();
    }
  }

  _drawSunRays(ctx) {
    const tod = LDL.timeOfDay[LDL.currentTime];
    if (tod.ambient < 0.3) return;
    const sunX = this.canvas.width * 0.7;
    const sunY = 30;
    ctx.save();
    ctx.globalAlpha = 0.03 * tod.ambient;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 0.5 - Math.PI * 0.25;
      const len = 200 + Math.sin(this.time * 0.3 + i) * 30;
      ctx.strokeStyle = '#E7A95A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(angle) * len, sunY + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  _getIcon(type) {
    const icons = { dew: '💧', sprout: '🌱', seed: '🌍', rings: '🌳', vine: '🌿', flock: '🕊' };
    return icons[type] || '●';
  }

  hitTest(mx, my) {
    for (const [id, f] of this.features) {
      const dx = mx - f.leafX;
      const dy = my - f.leafY;
      if (dx * dx + dy * dy < 900) {
        return id;
      }
    }
    return null;
  }

  setHover(featureId) {
    for (const [id, f] of this.features) {
      f.hover = id === featureId;
    }
    this.hoveredFeature = featureId;
  }
}
