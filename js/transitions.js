// BioEcho Vine Transitions — Nothing simply appears. Everything grows.

class VineTransition {
  constructor(container) {
    this.container = container;
    this.active = false;
    this.progress = 0;
    this.vines = [];
    this.leaves = [];
    this.onComplete = null;
  }

  growIn(targetEl, callback) {
    if (this.active) return;
    this.active = true;
    this.progress = 0;
    this.onComplete = callback;
    this.targetEl = targetEl;
    this.vines = [];
    this.leaves = [];

    const rect = targetEl.getBoundingClientRect();
    const parentRect = this.container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - parentRect.left;
    const cy = rect.top + rect.height / 2 - parentRect.top;

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      this.vines.push({
        sx: cx + Math.cos(angle) * 5,
        sy: cy + Math.sin(angle) * 5,
        ex: cx + Math.cos(angle) * (20 + Math.random() * 15),
        ey: cy + Math.sin(angle) * (20 + Math.random() * 15),
        progress: 0,
        delay: i * 0.1
      });
      if (Math.random() > 0.3) {
        this.leaves.push({
          x: cx + Math.cos(angle) * 18,
          y: cy + Math.sin(angle) * 18,
          angle: angle + Math.PI / 2,
          scale: 0,
          delay: i * 0.1 + 0.3
        });
      }
    }

    targetEl.style.opacity = '0';
    targetEl.style.transform = 'scale(0.9)';
    this._animate();
  }

  foldOut(targetEl, callback) {
    if (this.active) return;
    this.active = true;
    this.progress = 1;
    this.onComplete = callback;
    this.targetEl = targetEl;
    this.leaves = [];
    this.vines = [];

    const rect = targetEl.getBoundingClientRect();
    const parentRect = this.container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - parentRect.left;
    const cy = rect.top + rect.height / 2 - parentRect.top;

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this.leaves.push({
        x: cx + Math.cos(angle) * 25,
        y: cy + Math.sin(angle) * 25,
        angle, scale: 1, delay: 0
      });
    }

    this._animateReverse();
  }

  _animate() {
    const step = () => {
      this.progress += 0.025;
      if (this.progress >= 1) {
        this.progress = 1;
        this.active = false;
        if (this.targetEl) {
          this.targetEl.style.opacity = '1';
          this.targetEl.style.transform = 'scale(1)';
        }
        if (this.onComplete) this.onComplete();
        return;
      }

      for (const vine of this.vines) {
        vine.progress = Math.max(0, Math.min(1, (this.progress - vine.delay) / 0.6));
      }
      for (const leaf of this.leaves) {
        leaf.scale = Math.max(0, Math.min(1, (this.progress - leaf.delay) / 0.4));
      }

      if (this.targetEl) {
        const ease = 1 - Math.pow(1 - this.progress, 3);
        this.targetEl.style.opacity = String(Math.min(1, this.progress * 2));
        this.targetEl.style.transform = `scale(${0.9 + ease * 0.1})`;
      }

      this._renderVines();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _animateReverse() {
    const step = () => {
      this.progress -= 0.03;
      if (this.progress <= 0) {
        this.progress = 0;
        this.active = false;
        if (this.targetEl) {
          this.targetEl.style.opacity = '0';
          this.targetEl.style.transform = 'scale(0.9)';
        }
        if (this.onComplete) this.onComplete();
        return;
      }

      for (const leaf of this.leaves) {
        leaf.scale = this.progress;
      }

      if (this.targetEl) {
        this.targetEl.style.opacity = String(this.progress);
        this.targetEl.style.transform = `scale(${0.9 + this.progress * 0.1})`;
      }

      this._renderVines();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _renderVines() {
    let svg = this.container.querySelector('.vine-overlay');
    if (!svg) {
      svg = document.createElement('div');
      svg.className = 'vine-overlay';
      svg.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:100';
      this.container.appendChild(svg);
    }

    let html = '<svg width="100%" height="100%" style="position:absolute;inset:0">';
    for (const vine of this.vines) {
      const px = vine.sx + (vine.ex - vine.sx) * vine.progress;
      const py = vine.sy + (vine.ey - vine.sy) * vine.progress;
      html += `<path d="M${vine.sx},${vine.sy}Q${vine.sx + (vine.ex - vine.sx) * 0.3},${vine.sy + (vine.ey - vine.sy) * 0.5} ${px},${py}" stroke="rgba(62,107,72,0.4)" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    }
    for (const leaf of this.leaves) {
      if (leaf.scale <= 0) continue;
      const s = leaf.scale * 6;
      html += `<ellipse cx="${leaf.x}" cy="${leaf.y}" rx="${s}" ry="${s * 0.6}" fill="rgba(111,163,111,0.2)" transform="rotate(${leaf.angle * 180 / Math.PI},${leaf.x},${leaf.y})"/>`;
    }
    html += '</svg>';
    svg.innerHTML = html;

    setTimeout(() => {
      if (svg.parentNode) svg.remove();
    }, 2000);
  }
}

class WowMoment {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d');
    this.phase = 'seed';
    this.progress = 0;
    this.done = false;
    this.onDone = null;
  }

  start(callback) {
    this.done = false;
    this.phase = 'seed';
    this.progress = 0;
    this.onDone = callback;
    this._animate();
  }

  _animate() {
    const step = () => {
      this.progress += 0.006;

      if (this.phase === 'seed' && this.progress >= 1) {
        this.phase = 'root';
        this.progress = 0;
      } else if (this.phase === 'root' && this.progress >= 1) {
        this.phase = 'crack';
        this.progress = 0;
      } else if (this.phase === 'crack' && this.progress >= 1) {
        this.phase = 'sapling';
        this.progress = 0;
      } else if (this.phase === 'sapling' && this.progress >= 1) {
        this.phase = 'pullback';
        this.progress = 0;
      } else if (this.phase === 'pullback' && this.progress >= 1) {
        this.phase = 'bloom';
        this.progress = 0;
      } else if (this.phase === 'bloom' && this.progress >= 1) {
        this.done = true;
        if (this.onDone) this.onDone();
        return;
      }

      this._render();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);

    if (this.phase === 'seed') {
      const p = 1 - Math.pow(1 - this.progress, 3);
      ctx.save();
      ctx.globalAlpha = p;
      ctx.fillStyle = '#6E5843';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 8 * p, 12 * p, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(111,163,111,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 12 * p);
      ctx.quadraticCurveTo(cx + 3, cy - 20 * p, cx, cy - 28 * p);
      ctx.stroke();
      ctx.restore();
    } else if (this.phase === 'root') {
      ctx.fillStyle = '#6E5843';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 8, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      const p = this.progress;
      ctx.strokeStyle = 'rgba(110,88,67,0.5)';
      ctx.lineWidth = 1.5;
      const roots = [[-30, 25], [25, 30], [-15, 35], [40, 20], [-50, 15]];
      for (const [rx, ry] of roots) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + 10);
        ctx.quadraticCurveTo(cx + rx * 0.4 * p, cy + 15 + ry * 0.5 * p, cx + rx * p, cy + 10 + ry * p);
        ctx.stroke();
      }
    } else if (this.phase === 'crack') {
      const p = this.progress;
      ctx.fillStyle = '#0F3D2E';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = `rgba(138,106,74,${p * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 40 * p, cy);
      for (let i = 0; i < 8; i++) {
        ctx.lineTo(cx - 40 * p + i * 10 * p, cy + (Math.random() - 0.5) * 8 * p);
      }
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - 20 * p + i * 15 * p, cy);
        ctx.lineTo(cx - 15 * p + i * 15 * p, cy - 10 * p - i * 5);
        ctx.stroke();
      }
    } else if (this.phase === 'sapling') {
      ctx.fillStyle = '#0F3D2E';
      ctx.fillRect(0, 0, w, h);
      const p = this.progress;
      const groundY = cy + 40;
      ctx.strokeStyle = '#2A1A0A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, groundY);
      ctx.lineTo(cx, groundY - 60 * p);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(111,163,111,0.6)';
      ctx.lineWidth = 1.5;
      const topY = groundY - 60 * p;
      if (p > 0.3) {
        const lp = Math.min(1, (p - 0.3) / 0.7);
        ctx.beginPath();
        ctx.moveTo(cx, topY + 15);
        ctx.quadraticCurveTo(cx - 15 * lp, topY + 5, cx - 20 * lp, topY - 5 * lp);
        ctx.stroke();
        ctx.fillStyle = 'rgba(111,163,111,0.15)';
        ctx.beginPath();
        ctx.ellipse(cx - 18 * lp, topY - 3 * lp, 8 * lp, 4 * lp, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p > 0.5) {
        const rp = Math.min(1, (p - 0.5) / 0.5);
        ctx.beginPath();
        ctx.moveTo(cx, topY + 10);
        ctx.quadraticCurveTo(cx + 12 * rp, topY, cx + 18 * rp, topY - 8 * rp);
        ctx.stroke();
        ctx.fillStyle = 'rgba(111,163,111,0.15)';
        ctx.beginPath();
        ctx.ellipse(cx + 16 * rp, topY - 6 * rp, 7 * rp, 3.5 * rp, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(138,106,74,0.3)';
      ctx.fillRect(0, groundY, w, h - groundY);
    } else if (this.phase === 'pullback') {
      const p = this.progress;
      const scale = 1 + p * 3;
      const fog = p * 0.4;
      ctx.fillStyle = `rgba(15,61,46,${1 - fog})`;
      ctx.fillRect(0, 0, w, h);
      const treeY = cy + 40 - 60 / scale;
      ctx.save();
      ctx.translate(cx, treeY);
      ctx.scale(scale, scale);
      ctx.strokeStyle = '#2A1A0A';
      ctx.lineWidth = 3 / scale;
      ctx.beginPath();
      ctx.moveTo(0, 40);
      ctx.lineTo(0, -20);
      ctx.stroke();
      ctx.fillStyle = 'rgba(62,107,72,0.3)';
      ctx.beginPath();
      ctx.arc(0, -25, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = `rgba(191,223,246,${fog})`;
      ctx.fillRect(0, 0, w, h);
    } else if (this.phase === 'bloom') {
      const p = this.progress;
      ctx.fillStyle = '#0F3D2E';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = p;
      this._drawMiniForest(ctx, w, h, p);
      ctx.globalAlpha = 1;
    }
  }

  _drawMiniForest(ctx, w, h, p) {
    const groundY = h * 0.7;
    ctx.fillStyle = `rgba(62,107,72,0.15)`;
    ctx.fillRect(0, groundY, w, h - groundY);
    for (let i = 0; i < 12; i++) {
      const x = w * 0.1 + (i / 12) * w * 0.8;
      const treeH = 30 + Math.random() * 40;
      const sway = Math.sin(Date.now() * 0.001 + i) * 2;
      ctx.fillStyle = `rgba(42,26,10,${0.3 + Math.random() * 0.2})`;
      ctx.fillRect(x - 1.5, groundY - treeH, 3, treeH);
      ctx.fillStyle = `rgba(62,107,72,${0.2 + Math.random() * 0.15})`;
      ctx.beginPath();
      ctx.arc(x + sway, groundY - treeH - 10, 12 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
